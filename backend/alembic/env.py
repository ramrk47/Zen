import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Read DATABASE_URL from environment (your .env value)
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://zen_user:zen_ops_local_123@localhost:5432/zen_ops",
)

# ✅ IMPORTANT: import Base + models so autogenerate can see tables
from app.db import Base  # noqa: E402

# Import all models so they register on Base.metadata
from app.models import Assignment, File, User, Activity  # noqa: F401,E402
from app.models.master_data import Bank, Branch, Client, PropertyType  # noqa: F401,E402

target_metadata = Base.metadata


def get_url() -> str:
    return DATABASE_URL


def run_migrations_offline() -> None:
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    configuration = config.get_section(config.config_ini_section) or {}

    # Force URL from env (ignore alembic.ini placeholder)
    configuration["sqlalchemy.url"] = get_url()

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        future=True,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()