"""Routers package.

Do NOT import router modules here.
Importing routers at package import-time can create circular imports (e.g. auth <-> assignments)
that break uvicorn startup.

Routers should be imported explicitly in `app/main.py`.
"""

# Intentionally left without side-effect imports.
