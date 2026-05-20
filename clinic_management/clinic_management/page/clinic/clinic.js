frappe.pages['clinic'].on_page_load = function(wrapper) {

	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: '🦷 Dental Clinic Dashboard',
		single_column: true
	});

	load_dashboard(page);
};

function load_dashboard(page) {

	frappe.call({
		method: "clinic_management.tasks.get_clinic_summary",
		callback: function(r) {

			if (!r.message) return;

			const d = r.message;

			$(page.main).html(`

			<div class="clinic-wrapper">

				<!-- NUMBER CARDS -->
				<div class="card-grid">

					<div class="clinic-card total" data-status="all">
						<h4>Total Appointments</h4>
						<h2>${d.total_appointments}</h2>
					</div>

					<div class="clinic-card checkin" data-status="Checked In">
						<h4>Checked In</h4>
						<h2>${d.checked_in}</h2>
					</div>

					<div class="clinic-card engaged" data-status="Engaged">
						<h4>In Treatment</h4>
						<h2>${d.engaged}</h2>
					</div>

					<div class="clinic-card checkout" data-status="Closed">
						<h4>Checked Out</h4>
						<h2>${d.checked_out}</h2>
					</div>

					<div class="clinic-card checkout" data-status="Revenue">
						<h4>Total Revenue</h4>
						<h2>${d.total_revenue}</h2>
					</div>

				</div>

				
			<style>

				.clinic-wrapper {
					padding:30px;
				}

				.card-grid {
					display:grid;
					grid-template-columns: repeat(auto-fit, minmax(220px,1fr));
					gap:20px;
					margin-bottom:40px;
				}

				.clinic-card {
					padding:25px;
					border-radius:15px;
					color:white;
					cursor:pointer;
					transition:0.3s ease;
					text-align:center;
				}

				.clinic-card:hover {
					transform: translateY(-5px);
				}

				.total { background: linear-gradient(45deg,#2980b9,#6dd5fa); }
				.checkin { background: linear-gradient(45deg,#27ae60,#2ecc71); }
				.engaged { background: linear-gradient(45deg,#f39c12,#f1c40f); }
				.checkout { background: linear-gradient(45deg,#c0392b,#e74c3c); }

				.clinic-card h4 { margin-bottom:10px; }
				.clinic-card h2 { font-size:32px; font-weight:700; }

				.charts-section {
					display:grid;
					grid-template-columns: repeat(auto-fit, minmax(400px,1fr));
					gap:30px;
				}

				.chart-box {
					background:white;
					padding:20px;
					border-radius:12px;
					box-shadow:0 4px 15px rgba(0,0,0,0.08);
				}

				.full-width {
					grid-column: span 2;
				}

			</style>
			`);

			// CLICK REDIRECT
			$(".clinic-card").on("click", function() {

				let status = $(this).data("status");

				if (status === "all") {
					frappe.set_route("List", "Patient Appointment", {
						appointment_date: frappe.datetime.get_today()
					});
				} else {
					frappe.set_route("List", "Patient Appointment", {
						appointment_date: frappe.datetime.get_today(),
						status: status
					});
				}
			});

			render_charts();
		}
	});
}

