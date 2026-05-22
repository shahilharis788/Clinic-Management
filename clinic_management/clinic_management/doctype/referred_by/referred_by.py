# Copyright (c) 2026, Tekbee and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class ReferredBy(Document):
	def autoname(self):
		field_map = {
			"Customer": "customer",
			"Patient": "patient",
			"Relative": "relative_name",
			"Social Media": "social_media_platform",
			"Other": "other_reference",
			"Online Platform": "online_platform"
		}

		fieldname = field_map.get(self.type)

		if fieldname and self.get(fieldname):
			self.name = self.get(fieldname)
