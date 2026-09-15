"""Municipal Citizen Communication Acknowledgement Drafting Service.

Generates polite, standardized civic grievance acknowledgement drafts for citizen feedback.
SAFETY & ARCHITECTURAL NOTE:
- Purely generates a text draft stored in the database.
- Strictly does NOT connect to SMS, WhatsApp, email, or live municipal dispatch channels.
- All outbound communication remains in 'DRAFT' state requiring explicit human authorization.
"""


def generate_acknowledgement_draft(
    complaint_id: str,
    department: str | None = None,
    category: str | None = None,
    locality: str | None = None,
    ward: str | None = None,
    decision: str | None = None,
    notes: str | None = None,
) -> str:
    """Generate a formal municipal acknowledgement draft for a citizen complaint.

    Args:
        complaint_id: Unique ticket tracking reference (e.g. CMP-1001).
        department: Assigned municipal department (e.g., Water Supply, Drainage).
        category: Specific grievance category (e.g., Water outage, Pothole).
        locality: Canonical or citizen-reported neighborhood locality.
        ward: Municipal administrative ward number if identified.
        decision: Operational review decision ('approve', 'edit', 'reject', or None).
        notes: Optional operator remarks or public instructions.

    Returns:
        A formatted, professional civic acknowledgement message draft.
    """
    dept_str = department.strip() if department else "the designated municipal department"
    cat_str = category.strip().lower() if category else "your reported civic grievance"
    loc_str = locality.strip() if locality else "your area"
    ward_str = f" (Ward {ward})" if ward else ""

    if decision == "reject":
        reason = f" Note: {notes.strip()}." if notes else " It does not fall within standard municipal jurisdiction or lacks actionable details."
        return (
            f"[DRAFT ACKNOWLEDGEMENT]\n"
            f"Dear Citizen, regarding your grievance (Ref: {complaint_id}) for {loc_str}{ward_str}:\n"
            f"After administrative review, this report cannot be routed at this time.{reason}\n"
            f"For further assistance or re-submission, please dial the Municipal Helpline (181) or visit the zonal ward office."
        )

    if decision == "edit":
        return (
            f"[DRAFT ACKNOWLEDGEMENT]\n"
            f"Dear Citizen, your complaint (Ref: {complaint_id}) regarding {cat_str} in {loc_str}{ward_str} "
            f"has been verified and routed to the {dept_str} department for field action.\n"
            f"Your tracking reference is {complaint_id}. Thank you for helping keep our city functioning."
        )

    if decision == "approve":
        return (
            f"[DRAFT ACKNOWLEDGEMENT]\n"
            f"Dear Citizen, your complaint (Ref: {complaint_id}) regarding {cat_str} in {loc_str}{ward_str} "
            f"has been accepted and dispatched to the {dept_str} department for immediate inspection.\n"
            f"Please quote tracking ID {complaint_id} for future status updates."
        )

    # Initial advisory draft generated upon AI triage
    return (
        f"[DRAFT ACKNOWLEDGEMENT]\n"
        f"Dear Citizen, your complaint regarding {cat_str} in {loc_str}{ward_str} "
        f"has been recorded (Ref: {complaint_id}) and forwarded for operator review. "
        f"Assigned preliminary department: {dept_str}."
    )
