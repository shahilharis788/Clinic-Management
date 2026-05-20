frappe.ui.form.on('Patient Encounter', {
    refresh: function(frm) {
        

       frm.set_query("drug_code", "drug_prescription", function(doc, cdt, cdn) {

            let row = locals[cdt][cdn];

            // If medication not selected
            if (!row.medication) {
                return {
                    filters: [
                        ["Item", "is_stock_item", "=", 1],
                        ["Item", "disabled", "=", 0]
                    ]
                };
            }

            // If medication selected
            if (row.medication) {

                let items = [];

                
                frappe.call({
                    method: "clinic_management.tasks.get_linked_medication_items",
                    args: {
                        medication: row.medication
                    },
                    async: false,
                    callback: function(r) {
                        if (r.message) {
                            items = r.message;
                        }
                    }
                });
                return {
                    filters: [
                        ["Item", "name", "in", items]
                    ]
                };
            }

        });


        if (!frm.is_new() && frm.doc.docstatus === 1 && frm.doc.status === "Completed") {

            frm.add_custom_button(__('Sales Invoice'), function() {

                let selected_items = [];

                let d = new frappe.ui.Dialog({
                    title: "Create Sales Invoice",
                    size: "large",
                    fields: [
                        {
                            fieldtype: "Link",
                            label: "Patient",
                            fieldname: "patient",
                            options: "Patient",
                            default: frm.doc.patient,
                            read_only: 1,
                            description: "This Patient will be mapped as Customer in the Sales Invoice."
                        },

                        {
                            fieldtype: "Check",
                            label: "Consultation Fees",
                            fieldname: "consultation"
                        },
                        {
                            fieldtype: "HTML",
                            fieldname: "consultation_table"
                        },

                        { fieldtype: "Section Break" },

                        {
                            fieldtype: "Check",
                            label: "Prescription",
                            fieldname: "prescription"
                        },
                        {
                            fieldtype: "HTML",
                            fieldname: "prescription_table"
                        },

                        { fieldtype: "Section Break" },

                        {
                            fieldtype: "HTML",
                            fieldname: "selected_items_table"
                        }
                    ],
                    primary_action_label: "Create Sales Invoice",
                    primary_action(values) {

                if (!selected_items.length) {
                    frappe.msgprint("Please select at least one item.");
                    return;
                }

                frappe.call({
                    method: "clinic_management.tasks.create_sales_invoice_from_encounter",
                    args: {
                        patient: values.patient,
                        items: selected_items,
                        name: frm.doc.name,
                    },
                    callback: function(r) {
                        if (r.message) {
                            frappe.set_route("Form", "Sales Invoice", r.message);
                        }
                    }
                    });

                    d.hide();
                    }
                });

                function render_selected_items() {

                    if (!selected_items.length) {
                        d.fields_dict.selected_items_table.$wrapper.html("<b>No Items Selected</b>");
                        return;
                    }

                    let rows = selected_items.map((row, index) => {
                        return `
                            <tr>
                                <td>${row.item_code}</td>
                                <td>${row.qty}</td>
                                <td>${row.rate}</td>
                                <td>
                                    <button class="btn btn-xs btn-danger remove-item" data-index="${index}">
                                        Remove
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join("");

                    let html = `
                        <h4>Items To Be Billed</h4>
                        <table class="table table-bordered">
                            <tr>
                                <th>Item</th>
                                <th>Qty</th>
                                <th>Rate</th>
                                <th></th>
                            </tr>
                            ${rows}
                        </table>
                    `;

                    d.fields_dict.selected_items_table.$wrapper.html(html);

                    // Remove handler
                    d.$wrapper.find(".remove-item").click(function() {
                        let index = $(this).data("index");
                        selected_items.splice(index, 1);
                        render_selected_items();
                    });
                }

                // -------------------------
                // CONSULTATION SECTION
                // -------------------------

                d.fields_dict.consultation.$input.on("change", function() {

                    if (!this.checked) {
                        d.fields_dict.consultation_table.$wrapper.empty();
                        return;
                    }

                    frappe.db.get_doc("Healthcare Practitioner", frm.doc.practitioner)
                        .then(practitioner => {

                            let item = practitioner.op_consulting_charge_item;
                            let rate = practitioner.op_consulting_charge || 0;

                            let html = `
                                <table class="table table-bordered">
                                    <tr>
                                        <th>Select</th>
                                        <th>Item</th>
                                        <th>Rate</th>
                                    </tr>
                                    <tr>
                                        <td>
                                            <input type="checkbox"
                                                class="consult-select"
                                                data-item="${item}"
                                                data-rate="${rate}">
                                        </td>
                                        <td>${item}</td>
                                        <td>${rate}</td>
                                    </tr>
                                </table>
                            `;

                            d.fields_dict.consultation_table.$wrapper.html(html);

                            d.$wrapper.find(".consult-select").change(function() {

                                let item_code = $(this).data("item");
                                let rate = parseFloat($(this).data("rate"));

                                if (this.checked) {
                                    selected_items.push({
                                        item_code: item_code,
                                        qty: 1,
                                        rate: rate
                                    });
                                } else {
                                    selected_items = selected_items.filter(i => i.item_code !== item_code);
                                }

                                render_selected_items();
                            });
                        });
                });


                // -------------------------
                // PRESCRIPTION SECTION
                // -------------------------

                d.fields_dict.prescription.$input.on("change", function() {

                    if (!this.checked) {
                        d.fields_dict.prescription_table.$wrapper.empty();
                        return;
                    }

                    let prescriptions = frm.doc.drug_prescription || [];

                    let rows = prescriptions.map(row => {
                        return `
                            <tr>
                                <td>
                                    <input type="checkbox"
                                        class="prescription-select"
                                        data-item="${row.drug_code}"
                                        data-qty="${row.qty || 1}"
                                        data-rate="${row.rate || 0}">
                                </td>
                                <td>${row.drug_code}</td>
                                <td>${row.qty || 1}</td>
                                <td>${row.rate || 0}</td>
                            </tr>
                        `;
                    }).join("");

                    let html = `
                        <table class="table table-bordered">
                            <tr>
                                <th>Select</th>
                                <th>Item</th>
                                <th>Qty</th>
                                <th>Rate</th>
                            </tr>
                            ${rows}
                        </table>
                    `;

                    d.fields_dict.prescription_table.$wrapper.html(html);

                    d.$wrapper.find(".prescription-select").change(function() {

                        let item_code = $(this).data("item");
                        let qty = parseFloat($(this).data("qty"));
                        let rate = parseFloat($(this).data("rate"));

                        if (this.checked) {
                            selected_items.push({
                                item_code: item_code,
                                qty: qty,
                                rate: rate
                            });
                        } else {
                            selected_items = selected_items.filter(i => i.item_code !== item_code);
                        }

                        render_selected_items();
                    });
                });

                render_selected_items();
                d.show();
            }, __('Create'));
        }
    }
});