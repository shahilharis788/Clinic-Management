frappe.ui.form.on('Patient Appointment', {
	refresh: function(frm) {

		//once checked in only patient encounter can be done
		if (!frm.is_new() && frm.doc.status != "Checked In") {

			setTimeout(() => {
				frm.remove_custom_button('Patient Encounter', 'Create');
			}, 300);

		}
       
        
	}
});