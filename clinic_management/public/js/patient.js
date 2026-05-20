frappe.ui.form.on('Patient', {
    refresh: function(frm) {

        if (!frm.is_new()) {

            frm.add_custom_button('Patient Appointment', function() {

                frappe.new_doc('Patient Appointment', {
                    patient: frm.doc.name,
                    patient_name: frm.doc.patient_name
                });

            }, 'Create');

        }
    }
});