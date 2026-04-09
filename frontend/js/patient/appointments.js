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
                tbody.textContent = '';
                const tr = document.createElement('tr');
                const td = document.createElement('td');
                td.colSpan = 5;
                td.style.cssText = 'text-align: center; color: var(--on-surface-variant);';
                td.textContent = 'No appointments found.';
                tr.appendChild(td);
                tbody.appendChild(tr);
                return;
            }

            tbody.textContent = '';
            appts.forEach(a => {
                const dtObj = new Date(a.start_time);
                const dt = dtObj.toLocaleString([], {year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});
                
                let bClass = 'badge--primary';
                if (a.status === 'completed') bClass = 'badge--success';
                else if (a.status === 'cancelled') bClass = 'badge--error';
                else if (a.status === 'in-progress') bClass = 'badge--warning';

                const notes = a.notes ? (a.notes.length > 30 ? a.notes.substring(0,30) + '...' : a.notes) : '-';
                
                const tr = document.createElement('tr');
                
                const tdTime = document.createElement('td');
                tdTime.style.fontFamily = 'var(--font-label)';
                tdTime.textContent = dt;
                
                const tdDoc = document.createElement('td');
                tdDoc.textContent = a.doctor_name;
                
                const tdStatus = document.createElement('td');
                const badge = document.createElement('span');
                badge.className = `badge ${bClass}`;
                badge.textContent = a.status;
                tdStatus.appendChild(badge);
                
                const tdNotes = document.createElement('td');
                tdNotes.style.cssText = 'max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
                tdNotes.title = a.notes || '';
                tdNotes.textContent = notes;
                
                const tdAction = document.createElement('td');
                if (a.status === 'scheduled' && dtObj > new Date()) {
                    const btn = document.createElement('button');
                    btn.className = 'btn btn-ghost btn-sm';
                    btn.style.cssText = 'color: var(--error); border-color: rgba(255,110,132,0.3);';
                    btn.textContent = 'Cancel';
                    btn.onclick = () => cancelAppointment(a.id);
                    tdAction.appendChild(btn);
                } else {
                    tdAction.textContent = '-';
                }
                
                tr.append(tdTime, tdDoc, tdStatus, tdNotes, tdAction);
                tbody.appendChild(tr);
            });
        } catch (err) {
            console.error(err);
            Toast.error('Failed to load appointments.');
        }
    }

    async function loadDoctors() {
        try {
            // Load all doctors for booking
            const doctors = await api.get('/portal/doctors');
            doctorSelect.textContent = '';
            const defOpt = document.createElement('option');
            defOpt.value = '';
            defOpt.textContent = 'Choose a doctor...';
            doctorSelect.appendChild(defOpt);
            doctors.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.id;
                opt.textContent = `Dr. ${d.first_name} ${d.last_name} - ${d.specialization_name || 'General'}`;
                doctorSelect.appendChild(opt);
            });
        } catch (err) {
            console.error(err);
        }
    }

    async function fetchSlots() {
        const docId = doctorSelect.value;
        const targetDate = dateSelect.value;
        if (!docId || !targetDate) return;

        try {
            timeSlots.textContent = 'Loading slots...';
            slotsContainer.classList.remove('hidden');
            
            const slots = await api.get(`/appointments/slots?doctor_id=${docId}&target_date=${targetDate}`);
            
            if (slots.length === 0) {
                timeSlots.textContent = '';
                const warnSpan = document.createElement('span');
                warnSpan.style.color = 'var(--warning)';
                warnSpan.textContent = 'No slots available on this date.';
                timeSlots.appendChild(warnSpan);
                btnSubmitBooking.disabled = true;
                return;
            }

            timeSlots.textContent = '';
            slots.forEach(s => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'btn btn-ghost btn-sm slot-btn';
                btn.dataset.time = s.start_time;
                btn.style.fontFamily = 'var(--font-label)';
                btn.textContent = s.start_time;
                timeSlots.appendChild(btn);
            });

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
            timeSlots.textContent = '';
            const errSpan = document.createElement('span');
            errSpan.style.color = 'var(--error)';
            errSpan.textContent = 'Error loading slots.';
            timeSlots.appendChild(errSpan);
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
            btnSubmitBooking.textContent = '';
            const sp = document.createElement('span');
            sp.className = 'spinner';
            sp.style.cssText = 'width: 16px; height: 16px; border-width: 2px;';
            btnSubmitBooking.append(sp, document.createTextNode(' Booking...'));
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
            btnSubmitBooking.textContent = 'Confirm Booking';
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
        timeSlots.textContent = '';
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
