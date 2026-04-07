/**
 * Patient Appointments Logic
 */
document.addEventListener('DOMContentLoaded', async () => {
    Auth.requireRole('Patient');
    updateNavAuth();

    const tbody = document.getElementById('appts-tbody');
    const statusFilter = document.getElementById('status-filter');
    const bookingSection = document.getElementById('booking-section');
    const btnOpenBooking = document.getElementById('btn-open-booking');
    const btnCloseBooking = document.getElementById('btn-close-booking');
    
    // Booking Form Elements
    const doctorSelect = document.getElementById('doctor-select');
    const dateSelect = document.getElementById('date-select');
    const slotsContainer = document.getElementById('slots-container');
    const timeSlots = document.getElementById('time-slots');
    const selectedTimeInput = document.getElementById('selected-time');
    const bookingForm = document.getElementById('booking-form');
    const btnSubmitBooking = document.getElementById('btn-submit-booking');

    // 1. Load Initial Data
    await loadAppointments();
    await loadDoctors();

    // Event Listeners
    statusFilter.addEventListener('change', loadAppointments);
    btnOpenBooking.addEventListener('click', () => {
        bookingSection.classList.remove('hidden');
        btnOpenBooking.classList.add('hidden');
    });
    btnCloseBooking.addEventListener('click', () => {
        bookingSection.classList.add('hidden');
        btnOpenBooking.classList.remove('hidden');
        resetBookingForm();
    });

    doctorSelect.addEventListener('change', () => {
        if (doctorSelect.value) {
            dateSelect.disabled = false;
        } else {
            dateSelect.disabled = true;
            dateSelect.value = '';
            slotsContainer.classList.add('hidden');
        }
    });

    dateSelect.addEventListener('change', fetchSlots);

    // Initial check for booking target from directory page
    const targetDoc = localStorage.getItem('cms_booking_target');
    if (targetDoc) {
        localStorage.removeItem('cms_booking_target');
        // Give the DOM a tiny bit to render options then trigger the booking open
        setTimeout(() => {
            btnOpenBooking.click();
            doctorSelect.value = targetDoc;
            doctorSelect.dispatchEvent(new Event('change'));
        }, 500);
    }

    // ── Functions ── 
    async function loadAppointments() {
        try {
            const status = statusFilter.value;
            const endpoint = status ? `/portal/patients/me/appointments?status=${status}` : '/portal/patients/me/appointments';
            const appts = await api.get(endpoint);
            
            if (appts.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--on-surface-variant);">No appointments found.</td></tr>`;
                return;
            }

            tbody.innerHTML = appts.map(a => {
                const dtObj = new Date(a.start_time);
                const dt = dtObj.toLocaleString([], {year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});
                
                let bClass = 'badge--primary';
                if (a.status === 'completed') bClass = 'badge--success';
                else if (a.status === 'cancelled') bClass = 'badge--error';
                else if (a.status === 'in-progress') bClass = 'badge--warning';

                const notes = a.notes ? (a.notes.length > 30 ? a.notes.substring(0,30) + '...' : a.notes) : '-';
                
                let actionHtml = '-';
                // Can only cancel future scheduled appointments
                if (a.status === 'scheduled' && dtObj > new Date()) {
                    actionHtml = `<button class="btn btn-ghost btn-sm" onclick="cancelAppointment('${a.id}')" style="color: var(--error); border-color: rgba(255,110,132,0.3);">Cancel</button>`;
                }

                return `<tr>
                    <td style="font-family: var(--font-label);">${dt}</td>
                    <td>${a.doctor_name}</td>
                    <td><span class="badge ${bClass}">${a.status}</span></td>
                    <td style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${a.notes || ''}">${notes}</td>
                    <td>${actionHtml}</td>
                </tr>`;
            }).join('');
        } catch (err) {
            console.error(err);
            Toast.error('Failed to load appointments.');
        }
    }

    async function loadDoctors() {
        try {
            // Load all doctors for booking
            const doctors = await api.get('/portal/doctors');
            doctorSelect.innerHTML = `<option value="">Choose a doctor...</option>` + 
                doctors.map(d => `<option value="${d.id}">Dr. ${d.first_name} ${d.last_name} - ${d.specialization_name || 'General'}</option>`).join('');
        } catch (err) {
            console.error(err);
        }
    }

    async function fetchSlots() {
        const docId = doctorSelect.value;
        const targetDate = dateSelect.value;
        if (!docId || !targetDate) return;

        try {
            timeSlots.innerHTML = 'Loading slots...';
            slotsContainer.classList.remove('hidden');
            
            const slots = await api.get(`/appointments/slots?doctor_id=${docId}&target_date=${targetDate}`);
            
            if (slots.length === 0) {
                timeSlots.innerHTML = `<span style="color: var(--warning);">No slots available on this date.</span>`;
                btnSubmitBooking.disabled = true;
                return;
            }

            timeSlots.innerHTML = slots.map(s => `
                <button type="button" class="btn btn-ghost btn-sm slot-btn" data-time="${s.start_time}" style="font-family: var(--font-label);">
                    ${s.start_time}
                </button>
            `).join('');

            // Add click listeners to slots
            document.querySelectorAll('.slot-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    document.querySelectorAll('.slot-btn').forEach(b => {
                        b.classList.remove('btn-primary');
                        b.classList.add('btn-ghost');
                    });
                    const targetBtn = e.currentTarget;
                    targetBtn.classList.remove('btn-ghost');
                    targetBtn.classList.add('btn-primary');
                    selectedTimeInput.value = targetBtn.dataset.time;
                    btnSubmitBooking.disabled = false;
                });
            });

        } catch (err) {
            console.error(err);
            timeSlots.innerHTML = `<span style="color: var(--error);">Error loading slots.</span>`;
        }
    }

    // Submit Booking
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            doctor_id: doctorSelect.value,
            appointment_date: dateSelect.value,
            start_time: selectedTimeInput.value,
            notes: document.getElementById('booking-notes').value || ""
        };

        try {
            btnSubmitBooking.innerHTML = '<span class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></span> Booking...';
            btnSubmitBooking.disabled = true;

            await api.post('/appointments/book', payload);
            Toast.success('Appointment booked successfully!');
            
            resetBookingForm();
            btnCloseBooking.click(); // Hide section
            loadAppointments(); // Refresh list

        } catch (err) {
            console.error(err);
            Toast.error(err.detail || 'Failed to book appointment.');
        } finally {
            btnSubmitBooking.innerHTML = 'Confirm Booking';
            btnSubmitBooking.disabled = false;
        }
    });

    function resetBookingForm() {
        bookingForm.reset();
        doctorSelect.value = '';
        dateSelect.value = '';
        dateSelect.disabled = true;
        selectedTimeInput.value = '';
        slotsContainer.classList.add('hidden');
        timeSlots.innerHTML = '';
        btnSubmitBooking.disabled = true;
    }

    // Assign globally to be callable from HTML
    window.cancelAppointment = async function(id) {
        if (!confirm('Are you sure you want to cancel this appointment?')) return;
        try {
            await api.patch(`/appointments/${id}/status`, { status: 'cancelled' });
            Toast.success('Appointment cancelled.');
            loadAppointments();
        } catch (err) {
            Toast.error(err.detail || 'Failed to cancel.');
        }
    };
});
