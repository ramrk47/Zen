from app.models.assignment import Assignment


def on_assignment_created(assignment: Assignment) -> None:
    # Future: send notification, enqueue background job, etc.
    print(f"[EVENT] Assignment created: {assignment.assignment_code} (id={assignment.id})")


def on_assignment_updated(assignment: Assignment) -> None:
    # Future: status-based automations, reminders, etc.
    print(f"[EVENT] Assignment updated: {assignment.assignment_code} (status={assignment.status})")


def on_assignment_deleted(assignment_id: int) -> None:
    # Future: audit log
    print(f"[EVENT] Assignment deleted: id={assignment_id}")