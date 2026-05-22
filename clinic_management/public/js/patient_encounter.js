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
        render_tooth_chart(frm);
    },
    custom_tooth_number_chart(frm) {
        render_tooth_chart(frm);
    }
});

function render_tooth_chart(frm) {
	let image = frm.doc.custom_tooth_number_chart;

	if (image) {
		frm.fields_dict.custom_image.$wrapper.html(`
			<div style="text-align:center;">

				<div style="margin-bottom: 10px;">
					<button class="btn btn-sm btn-default zoom-in">+</button>
					<button class="btn btn-sm btn-default zoom-out">-</button>
					<button class="btn btn-sm btn-default zoom-reset">Reset</button>
				</div>

				<div style="margin-bottom: 10px;">
					<button class="btn btn-sm btn-default move-up">↑</button>
					<br><br>
					<button class="btn btn-sm btn-default move-left">←</button>
					<button class="btn btn-sm btn-default move-right">→</button>
					<br><br>
					<button class="btn btn-sm btn-default move-down">↓</button>
				</div>

				<div 
					id="tooth-chart-container"
					style="
						width: 100%;
						height: 450px;
						overflow: auto;
						border: 1px solid #d1d8dd;
						border-radius: 8px;
						padding: 10px;
						background: #f9f9f9;
						position: relative;
					"
				>
					<img 
						id="tooth-chart-image"
						src="${image}" 
						style="
							width: 600px;
							height: 400px;
							object-fit: contain;
							background: #fff;
							transition: transform 0.2s ease;
							transform: scale(1) translate(0px, 0px);
							transform-origin: center center;
							cursor: grab;
						"
					>
				</div>
			</div>
		`);

		let scale = 1;
		let moveX = 0;
		let moveY = 0;

		const wrapper = frm.fields_dict.custom_image.$wrapper;
		const img = wrapper.find("#tooth-chart-image");

		function update_transform() {
			img.css(
				"transform",
				`translate(${moveX}px, ${moveY}px) scale(${scale})`
			);
		}

		// Zoom
		wrapper.find(".zoom-in").on("click", function () {
			scale += 0.1;
			update_transform();
		});

		wrapper.find(".zoom-out").on("click", function () {
			if (scale > 0.2) {
				scale -= 0.1;
				update_transform();
			}
		});

		wrapper.find(".zoom-reset").on("click", function () {
			scale = 1;
			moveX = 0;
			moveY = 0;
			update_transform();
		});

		// Move controls
		wrapper.find(".move-left").on("click", function () {
			moveX -= 20;
			update_transform();
		});

		wrapper.find(".move-right").on("click", function () {
			moveX += 20;
			update_transform();
		});

		wrapper.find(".move-up").on("click", function () {
			moveY -= 20;
			update_transform();
		});

		wrapper.find(".move-down").on("click", function () {
			moveY += 20;
			update_transform();
		});

		// Double click zoom
		img.on("dblclick", function () {
			scale = scale === 1 ? 2 : 1;
			update_transform();
		});

		// Drag movement
		let isDragging = false;
		let startX, startY;

		img.on("mousedown", function (e) {
			isDragging = true;
			startX = e.pageX - moveX;
			startY = e.pageY - moveY;
			img.css("cursor", "grabbing");
		});

		$(document).on("mousemove", function (e) {
			if (isDragging) {
				moveX = e.pageX - startX;
				moveY = e.pageY - startY;
				update_transform();
			}
		});

		$(document).on("mouseup", function () {
			isDragging = false;
			img.css("cursor", "grab");
		});

	} else {
		frm.fields_dict.custom_image.$wrapper.html("");
	}
}