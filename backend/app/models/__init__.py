# backend/app/models/__init__.py
from app.models.user import User
from app.models.assignment import Assignment
from app.models.file import File
from app.models.activity import Activity
# existing imports...
from app.models.rbac import Role, Permission, RolePermission  # ✅ add

# Master Data (tagging engine)
from app.models.master_data import Bank, Branch, Client, PropertyType

__all__ = [
    "User",
    "Assignment",
    "File",
    "Activity",
    "Bank",
    "Branch",
    "Client",
    "PropertyType",
]