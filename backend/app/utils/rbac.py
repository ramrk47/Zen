from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.rbac import Role, Permission, RolePermission


def get_permissions_for_role(db: Session, role_name: str) -> list[str]:
    role_name = (role_name or "").strip().upper()
    if not role_name:
        return []

    # ADMIN gets everything (strong default)
    if role_name == "ADMIN":
        rows = db.query(Permission.code).all()
        return sorted([r[0] for r in rows if r and r[0]])

    q = (
        db.query(Permission.code)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .join(Role, Role.id == RolePermission.role_id)
        .filter(func.upper(Role.name) == role_name)
    )
    rows = q.all()
    return sorted([r[0] for r in rows if r and r[0]])


def seed_rbac_if_empty(db: Session) -> None:
    """
    Seeds minimum RBAC records so permissions exist immediately.
    Safe to run on every startup.
    """
    # If permissions already exist, don't reseed
    if db.query(Permission).first():
        return

    # Core permissions we’ll expand later
    perms = [
        ("users.read", "Can view users list"),
        ("users.create", "Can create users"),
        ("users.update", "Can update roles/active flags"),
        ("assignments.read", "Can view assignments"),
        ("assignments.create", "Can create assignments"),
        ("assignments.update", "Can edit assignments"),
        ("invoices.read", "Can view invoices"),
        ("invoices.create", "Can generate invoices"),
        ("invoices.mark_paid", "Can mark invoices as paid"),
        ("masterdata.edit", "Can edit banks/branches/master data"),
    ]

    perm_objs = []
    for code, desc in perms:
        perm_objs.append(Permission(code=code, description=desc))
    db.add_all(perm_objs)
    db.commit()

    # Roles
    roles = ["ADMIN", "OPS_MANAGER", "ASSISTANT_VALUER", "FIELD_VALUER", "FINANCE", "HR", "EMPLOYEE"]
    role_objs = [Role(name=r) for r in roles]
    db.add_all(role_objs)
    db.commit()

    # Map role -> perms (minimal sensible defaults)
    perm_map = {p.code: p for p in db.query(Permission).all()}
    role_map = {r.name.upper(): r for r in db.query(Role).all()}

    def grant(role: str, codes: list[str]):
        r = role_map.get(role.upper())
        if not r:
            return
        for c in codes:
            p = perm_map.get(c)
            if p:
                db.add(RolePermission(role_id=r.id, permission_id=p.id))

    # Admin gets all (enforced by get_permissions_for_role), but we still map most:
    grant("ADMIN", [p[0] for p in perms])

    grant("HR", ["users.read", "users.create", "users.update"])
    grant("FINANCE", ["assignments.read", "invoices.read", "invoices.create", "invoices.mark_paid"])
    grant("FIELD_VALUER", ["assignments.read"])
    grant("ASSISTANT_VALUER", ["assignments.read", "assignments.create", "assignments.update"])
    grant("OPS_MANAGER", ["assignments.read", "assignments.create", "assignments.update", "masterdata.edit"])
    grant("EMPLOYEE", ["assignments.read"])

    db.commit()