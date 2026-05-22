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


@frappe.whitelist()
def get_linked_medication_items(medication):
	if not medication:
		return []

	items = frappe.get_all(
		"Medication Linked Item",
		filters={"parent": medication},
		pluck="item"
	)

	return items

#custom_treatment_category is multiselect field in patient encounter and patient doctype


def update_appointment_status(doc, method=None):
	msg = []
	if doc.status == "Completed" and doc.appointment:

		frappe.db.set_value(
			"Patient Appointment",
			doc.appointment,
			"status",
			"Checked Out"
		)

		msg.append(
			f"patient - <b>{doc.patient_name}</b> with appointment "
			f"<b>{doc.appointment}<b> has been checked out"
		)

	if msg:
		frappe.msgprint("<br>".join(msg))

def set_engaged(doc, method=None):
	patient_encounter_category = [row.treatment_category for row in doc.custom_treatment_category]
	exisiting_category = frappe.db.get_all("Treatment Category Detail",{"parent":doc.patient},pluck="treatment_category")
	patient_doc = frappe.get_doc("Patient", doc.patient)
	for category in patient_encounter_category:
		if not category:
			continue
		if category not in exisiting_category:
			patient_doc.append("custom_treatment_category", {
				"treatment_category": category
			})

	patient_doc.save(ignore_permissions=True)
	if not doc.appointment:
		return

	app_status = frappe.db.get_value(
		"Patient Appointment",
		doc.appointment,
		"status"
	)

	if doc.docstatus == 0 and app_status != "Engaged":
		frappe.db.set_value(
			"Patient Appointment",
			doc.appointment,
			"status",
			"Engaged",
		)

		frappe.msgprint(
			f"Patient - <b>{doc.patient_name}</b> with appointment "
			f"<b>{doc.appointment}</b> has been Engaged"
		)
