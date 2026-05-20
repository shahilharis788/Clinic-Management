import frappe
from frappe.utils import getdate, add_days, today
from datetime import timedelta

@frappe.whitelist()
def get_last_week_sales():
    total = 500
    return total or 0

@frappe.whitelist()
def get_clinic_summary():
    today_date = today()

    total_appointments = frappe.db.count(
        "Patient Appointment",
        {"appointment_date": today_date}
    )

    checked_in = frappe.db.count(
        "Patient Appointment",
        {"appointment_date": today_date, "status": "Checked In"}
    )

    engaged = frappe.db.count(
        "Patient Appointment",
        {"appointment_date": today_date, "status": "Engaged"}
    )

    checked_out = frappe.db.count(
        "Patient Appointment",
        {"appointment_date": today_date, "status": "Closed"}
    )

    return {
        "total_appointments": total_appointments,
        "checked_in": checked_in,
        "engaged": engaged,
        "checked_out": checked_out,
        "total_revenue": sum(frappe.db.get_all("Sales Invoice", {"posting_date": today(), "status":["!=", "paid"]}, pluck="grand_total"))
    }

@frappe.whitelist()
def create_sales_invoice_from_encounter(patient, items, name):

    items = frappe.parse_json(items)

    customer = frappe.db.get_value("Patient", patient, "customer")
    
    if not customer:
        frappe.throw("Patient is not linked to a Customer.")

    si = frappe.new_doc("Sales Invoice")
    si.customer = customer
    si.patient = customer
    si.due_date = frappe.utils.today()
    si.custom_patient_encounter = name
    for row in items:
        si.append("items", {
            "item_code": row.get("item_code"),
            "qty": row.get("qty", 1),
            "rate": row.get("rate", 0)
        })

    si.insert(ignore_permissions=True)
    return si.name