from healthcare.healthcare.doctype.patient_appointment.patient_appointment import PatientAppointment
import frappe
from frappe.utils import (
	add_to_date,
	flt,
	format_date,
	get_datetime,
	get_link_to_form,
	get_time,
	getdate,
)
from frappe import _

og_function = PatientAppointment.validate_practitioner_unavailability
func2 = PatientAppointment.set_status
def custom_validate_practitioner_unavailability(self):
		scopes = [self.practitioner, self.department, self.service_unit]
		# appointment window
		if self.appointment_datetime:
			start_dt = get_datetime(self.appointment_datetime)
		else:
			if not (self.appointment_date and self.appointment_time):
				frappe.throw(_("Appointment Date and Time are required."))
			start_dt = get_datetime(f"{self.appointment_date} {self.appointment_time}")

		if self.appointment_end_datetime:
			end_dt = get_datetime(self.appointment_end_datetime)
		else:
			end_dt = add_to_date(start_dt, minutes=int(self.duration) or 0)

		if end_dt < start_dt:
			frappe.throw(_("Appointment end must be after start...........@@"))

		rows = frappe.get_all(
			"Practitioner Availability",
			fields=["name", "start_date", "end_date", "start_time", "end_time"],
			filters={"type": "Unavailable", "docstatus": ("!=", 2), "scope": ["in", scopes]},
			order_by="start_date asc, start_time asc",
		)

		conflicts = []
		for r in rows:
			existing_start_date = getdate(r.start_date)
			existing_end_date = getdate(r.end_date)
			existing_start_time = get_time(r.start_time)
			existing_end_time = get_time(r.end_time)

			overlap_start_date = max(getdate(start_dt), existing_start_date)
			overlap_end_date = min(getdate(end_dt), existing_end_date)
			if overlap_start_date <= overlap_end_date:
				# Check if the daily times overlap
				if get_time(start_dt) < existing_end_time and existing_start_time < get_time(end_dt):
					conflicts.append(r["name"])

		if conflicts:
			msg = ", ".join(frappe.bold(n) for n in conflicts)
			frappe.throw(
				_(f"This Appointment conflicts with Practitioner Availability of type 'Unavailable': {msg}.")
			)
def custom_set_status(self):
	pass
PatientAppointment.validate_practitioner_unavailability = custom_validate_practitioner_unavailability
PatientAppointment.set_status = custom_set_status