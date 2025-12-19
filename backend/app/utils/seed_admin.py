from sqlalchemy.orm import Session

from app.models.user import User

# Use your existing security helper if present
try:
    from app.utils.security import get_password_hash
except Exception:
    get_password_hash = None


ADMIN_EMAIL = "admin@zenops.in"
ADMIN_PASSWORD = "admin123"


def seed_admin_if_missing(db: Session) -> None:
    existing = db.query(User).filter(User.email == ADMIN_EMAIL).first()
    if existing:
        return

    if get_password_hash is None:
        raise RuntimeError("get_password_hash() not found. Check app/utils/security.py")

    admin = User(
        email=ADMIN_EMAIL,
        full_name="Admin",
        role="ADMIN",
        is_active=True,
        hashed_password=get_password_hash(ADMIN_PASSWORD),
    )
    db.add(admin)
    db.commit()