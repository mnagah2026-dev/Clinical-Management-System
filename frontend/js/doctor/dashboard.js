/**
 * Doctor Dashboard Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
    Auth.requireRole('Doctor');
    updateNavAuth();

    // Set Date Header
    const todayStr = new Date().toISOString().split('T')[0];
    document.getElementById('current-date').textContent = new Date().toLocaleDateString([], {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'});

    try {
        const [profile, apptsToday] = await Promise.all([
            api.get('/portal/doctors/me'),
            api.get(`/portal/doctors/me/appointments?target_date=${todayStr}`)
        ]);
        
        document.getElementById('welcome-msg').textContent = `Dr. ${profile.last_name}`;

        // Stats Calculation
        document.getElementById('stat-total-today').textContent = apptsToday.length;
        const completed = apptsToday.filter(a => a.status === 'completed').length;
        const pending = apptsToday.filter(a => ['scheduled', 'in-progress'].includes(a.status)).length;
        document.getElementById('stat-completed').textContent = completed;
        document.getElementById('stat-pending').textContent = pending;

        // Next Appointment
        const now = new Date();
        const upcoming = apptsToday.filter(a => new Date(a.start_time) > now && ['scheduled', 'in-progress'].includes(a.status));
        upcoming.sort((a,b) => new Date(a.start_time) - new Date(b.start_time));
        
        if (upcoming.length > 0) {
            const next = upcoming[0];
            const tOpt = {hour:'2-digit', minute:'2-digit'};
            document.getElementById('next-patient-time').textContent = new Date(next.start_time).toLocaleTimeString([], tOpt);
            document.getElementById('next-patient-name').textContent = next.patient_name;
        } else {
            document.getElementById('next-patient-time').textContent = '--:--';
            document.getElementById('next-patient-name').textContent = 'No upcoming patients';
        }

        // Table
        const tbody = document.getElementById('today-appts-tbody');
        if (apptsToday.length === 0) {
            tbody.textContent = '';
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 5;
            td.style.textAlign = 'center';
            td.style.color = 'var(--on-surface-variant)';
            td.textContent = 'No appointments scheduled for today.';
            tr.appendChild(td);
            tbody.appendChild(tr);
        } else {
            tbody.textContent = '';
            apptsToday.forEach(a => {
                const sDt = new Date(a.start_time);
                const sTime = sDt.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
                
                let bClass = 'badge--primary';
                if (a.status === 'completed') bClass = 'badge--success';
                else if (a.status === 'cancelled') bClass = 'badge--error';
                else if (a.status === 'in-progress') bClass = 'badge--warning';

                const tr = document.createElement('tr');
                const tdTime = document.createElement('td');
                tdTime.style.fontFamily = 'var(--font-label)';
                tdTime.textContent = sTime;
                
                const tdName = document.createElement('td');
                tdName.style.fontWeight = '500';
                tdName.textContent = a.patient_name;
                
                const tdNotes = document.createElement('td');
                tdNotes.style.maxWidth = '200px';
                tdNotes.style.whiteSpace = 'nowrap';
                tdNotes.style.overflow = 'hidden';
                tdNotes.style.textOverflow = 'ellipsis';
                tdNotes.title = a.notes || '';
                tdNotes.textContent = a.notes || '-';
                
                const tdStatus = document.createElement('td');
                const badge = document.createElement('span');
                badge.className = `badge ${bClass}`;
                badge.textContent = a.status;
                tdStatus.appendChild(badge);
                
                const tdAction = document.createElement('td');
                const btn = document.createElement('button');
                btn.className = 'btn btn-tertiary';
                btn.textContent = 'Examine';
                btn.onclick = () => startConsultation(a.patient_id, a.id);
                tdAction.appendChild(btn);
                
                tr.append(tdTime, tdName, tdNotes, tdStatus, tdAction);
                tbody.appendChild(tr);
            });
            
            initScrollAnimations();
        }

    } catch (err) {
        console.error(err);
        Toast.error('Failed to load dashboard.');
    }

    // Global action to route to diagnosis with pre-filled patient
    window.startConsultation = function(patientId, appointmentId) {
        localStorage.setItem('cms_active_patient', patientId);
        localStorage.setItem('cms_active_appt', appointmentId);
        window.location.href = '/pages/doctor/diagnosis.html';
    };
});
