frappe.pages['clinic'].on_page_load = function(wrapper) {

	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: '🦷 Dental Clinic Dashboard',
		single_column: true
	});

	load_dashboard(page);
};

function load_dashboard(page) {

	$(page.main).html(`

	<div class="clinic-wrapper">

		<!-- ACTION CARDS -->
		<div class="action-grid">

			<div class="action-card" data-route="Patient">
				<h2>🧑‍⚕️</h2>
				<h4>New Patient</h4>
			</div>

			<div class="action-card" data-route="Patient Appointment">
				<h2>📅</h2>
				<h4>Book Appointment</h4>
			</div>

			<div class="action-card" data-route="Patient Encounter">
				<h2>🦷</h2>
				<h4>Start Consultation</h4>
			</div>

			<div class="action-card" data-route="Lab Test">
				<h2>🧪</h2>
				<h4>Create Lab Test</h4>
			</div>

		</div>

		<!-- DATE FILTER -->
		<div class="filter-box">
			<div>
				<label>From Date</label>
				<input type="date" id="from_date" class="form-control">
			</div>

			<div>
				<label>To Date</label>
				<input type="date" id="to_date" class="form-control">
			</div>

			<div style="display:flex;align-items:flex-end;">
				<button class="btn btn-primary" id="apply_filter">
					Apply Filter
				</button>
			</div>
		</div>

		<!-- NUMBER CARDS -->
		<div class="card-grid">

			<div class="clinic-card total" data-status="all">
				<h4>Total Appointments</h4>
				<h2 id="total_appointments">0</h2>
			</div>

			<div class="clinic-card checkin" data-status="Checked In">
				<h4>Checked In</h4>
				<h2 id="checked_in">0</h2>
			</div>

			<div class="clinic-card engaged" data-status="Engaged">
				<h4>In Treatment</h4>
				<h2 id="engaged">0</h2>
			</div>

			<div class="clinic-card checkout" data-status="Closed">
				<h4>Checked Out</h4>
				<h2 id="checked_out">0</h2>
			</div>

			<div class="clinic-revenue checkout">
				<h4>Total Revenue</h4>
				<h2 id="total_revenue">0</h2>
			</div>

		</div>

		<!-- LISTS -->

		<div class="section">
			<h3>🧑 Patients</h3>
			<div id="patient_list" class="list-box">Loading...</div>
		</div>

		<div class="section">
			<h3>📅 Appointments</h3>
			<div id="appointment_list" class="list-box">Loading...</div>
		</div>

		<div class="section">
			<h3>🧪 Lab Tests</h3>
			<div id="lab_list" class="list-box">Loading...</div>
		</div>

		<div class="section">
			<h3>💰 Unpaid Invoices</h3>
			<div id="invoice_list" class="list-box">Loading...</div>
		</div>

	</div>

	<style>
	.clinic-wrapper { padding:30px; }

	.action-grid {
		display:grid;
		grid-template-columns: repeat(auto-fit, minmax(200px,1fr));
		gap:20px;
		margin-bottom:35px;
	}

	.action-card {
		background:white;
		padding:20px;
		border-radius:15px;
		text-align:center;
		cursor:pointer;
		box-shadow:0 4px 15px rgba(0,0,0,0.08);
	}

	.filter-box {
		display:flex;
		gap:20px;
		margin-bottom:25px;
		background:white;
		padding:15px;
		border-radius:12px;
		box-shadow:0 2px 10px rgba(0,0,0,0.06);
	}

	.card-grid {
		display:grid;
		grid-template-columns: repeat(auto-fit, minmax(220px,1fr));
		gap:20px;
		margin-bottom:40px;
	}

	.clinic-card, .clinic-revenue {
		padding:25px;
		border-radius:15px;
		color:white;
		cursor:pointer;
		text-align:center;
	}

	.total { background: linear-gradient(45deg,#2980b9,#6dd5fa); }
	.checkin { background: linear-gradient(45deg,#27ae60,#2ecc71); }
	.engaged { background: linear-gradient(45deg,#f39c12,#f1c40f); }
	.checkout { background: linear-gradient(45deg,#c0392b,#e74c3c); }

	.list-box {
		background:white;
		border-radius:12px;
		box-shadow:0 2px 10px rgba(0,0,0,0.06);
		padding:10px;
	}

	.list-item {
		display:flex;
		justify-content:space-between;
		padding:12px;
		border-bottom:1px solid #eee;
		cursor:pointer;
	}

	.badge {
		padding:4px 10px;
		border-radius:20px;
		font-size:12px;
		color:white;
	}

	.green { background:#27ae60; }
	.orange { background:#f39c12; }
	.red { background:#e74c3c; }
	.blue { background:#3498db; }
	</style>
	`);

	// Default today
	let today = frappe.datetime.get_today();
	let from_date = frappe.datetime.add_days(today, -7);

	$("#from_date").val(from_date);
	$("#to_date").val(today);

	// Actions
	$(".action-card").on("click", function() {
		frappe.new_doc($(this).data("route"));
	});

	// Apply Filter
	$("#apply_filter").on("click", function() {
		refresh_dashboard();
	});
	// Number Card Click → Redirect with Filters
	$(".clinic-card").on("click", function() {

    	let status = $(this).data("status");
    	let from_date = $("#from_date").val();
    	let to_date = $("#to_date").val();

    	let filters = {
        	appointment_date: ["between", [from_date, to_date]]
    	};

    	// If not Total (all)
    	if (status && status !== "all") {

        	if (status === "Engaged") {
            
            	filters.status = ["in", ["Open", "Confirmed", "Checked In"]];
        	} else {
            filters.status = status;
        	}
    	}

    	frappe.set_route("List", "Patient Appointment", filters);
	});

	$(".clinic-revenue").on("click", function() {

    	let status = $(this).data("status");
    	let from_date = $("#from_date").val();
    	let to_date = $("#to_date").val();

    	let filters = {
        	posting_date: ["between", [from_date, to_date]]
    	};

    	
    	filters.status = ["not in", ["Paid"]];

    	frappe.set_route("List", "Sales Invoice", filters);
	});


		refresh_dashboard();
	}

function refresh_dashboard() {

	let from_date = $("#from_date").val();
	let to_date = $("#to_date").val();

	load_counts(from_date, to_date);
	load_lists(from_date, to_date);
}

function load_counts(from_date, to_date) {

	// Appointments Count
	frappe.db.get_list("Patient Appointment", {
		filters: [
			["appointment_date", ">=", from_date],
			["appointment_date", "<=", to_date]
		],
		fields: ["name", "status"],
		limit: 1000
	}).then(data => {

		$("#total_appointments").text(data.length);
		$("#checked_in").text(data.filter(d => d.status === "Checked In").length);
		$("#engaged").text(data.filter(d =>["Open", "Confirmed", "Checked In"].includes(d.status)).length);
		$("#checked_out").text(data.filter(d => d.status === "Checked Out").length);
	});

	// Revenue
	frappe.db.get_list("Sales Invoice", {
		filters: [
			["posting_date", ">=", from_date],
			["posting_date", "<=", to_date]
		],
		fields: ["grand_total"],
		limit: 1000
	}).then(data => {

		let total = 0;
		data.forEach(d => total += d.grand_total || 0);
		$("#total_revenue").text(total.toFixed(2));
	});
}

function load_lists(from_date, to_date) {

	// ================= PATIENTS =================
	frappe.db.get_list("Patient", {
		fields: ["name", "patient_name", "creation"],
		filters: [
			["creation", ">=", from_date + " 00:00:00"],
			["creation", "<=", to_date + " 23:59:59"]
		],
		order_by: "creation desc",
		limit: 10
	}).then(data => {

		let html = "";

		data.forEach(d => {
			html += `
			<div class="list-item"
				onclick="frappe.set_route('Form','Patient','${d.name}')">
				<span>${d.patient_name}</span>
				<span class="badge blue">New</span>
			</div>`;
		});

		$("#patient_list").html(html || "No Patients");
	});


	// ================= APPOINTMENTS =================
	frappe.db.get_list("Patient Appointment", {
		filters: [
			["appointment_date", ">=", from_date],
			["appointment_date", "<=", to_date]
		],
		fields: ["name", "patient", "status"],
		order_by: "appointment_date desc",
		limit: 10
	}).then(data => {

		let html = "";

		data.forEach(d => {

			let color = "blue";
			if (d.status === "Completed") color = "green";
			else if (d.status === "Cancelled") color = "red";
			else if (d.status === "Scheduled") color = "orange";
			else if (d.status === "Checked In") color = "green";

			html += `
			<div class="list-item"
				onclick="frappe.set_route('Form','Patient Appointment','${d.name}')">
				<span>${d.patient}</span>
				<span class="badge ${color}">${d.status}</span>
			</div>`;
		});

		$("#appointment_list").html(html || "No Appointments");
	});


	// ================= LAB TESTS =================
	frappe.db.get_list("Lab Test", {
		fields: ["name", "patient", "creation"],
		filters: [
			["creation", ">=", from_date + " 00:00:00"],
			["creation", "<=", to_date + " 23:59:59"]
		],
		order_by: "creation desc",
		limit: 10
	}).then(data => {

		let html = "";

		data.forEach(d => {
			html += `
			<div class="list-item"
				onclick="frappe.set_route('Form','Lab Test','${d.name}')">
				<span>${d.patient}</span>
				<span class="badge orange">Open</span>
			</div>`;
		});

		$("#lab_list").html(html || "No Lab Tests");
	});


	// ================= UNPAID INVOICES =================
	frappe.db.get_list("Sales Invoice", {
		filters: [
			["posting_date", ">=", from_date],
			["posting_date", "<=", to_date],
			["status", "!=", "Paid"]
		],
		fields: ["name", "customer", "grand_total"],
		order_by: "creation desc",
		limit: 10
	}).then(data => {

		let html = "";

		data.forEach(d => {
			html += `
			<div class="list-item"
				onclick="frappe.set_route('Form','Sales Invoice','${d.name}')">
				<span>${d.customer}</span>
				<span class="badge red">${d.grand_total}</span>
			</div>`;
		});

		$("#invoice_list").html(html || "No Unpaid Invoices");
	});
}