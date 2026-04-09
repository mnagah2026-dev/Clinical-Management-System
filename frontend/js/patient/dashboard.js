/**
 * Patient Dashboard Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
    Auth.requireRole('Patient');

    try {
        const [profile, appointments, records] = await Promise.all([
            api.get('/portal/patients/me'),
            api.get('/portal/patients/me/appointments'),
            api.get('/portal/patients/me/records')
        ]);
        
        // Welcome Msg
        document.getElementById('welcome-msg').textContent = `Welcome, ${profile.first_name}`;
        
        // Next appointment calculation
        const upcoming = appointments.filter(a => a.status === 'scheduled');
        if (upcoming.length > 0) {
            // Sort to find the nearest future appointment
            upcoming.sort((a,b) => new Date(a.start_time) - new Date(b.start_time));
            const next = upcoming[0];
            const dt = new Date(next.start_time);
            document.getElementById('next-appt-time').textContent = dt.toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});
            document.getElementById('next-appt-doctor').textContent = next.doctor_name;
        } else {
            document.getElementById('next-appt-time').textContent = 'None';
            document.getElementById('next-appt-time').style.color = 'var(--on-surface-variant)';
            document.getElementById('next-appt-doctor').textContent = 'No upcoming appointments';
        }

        // Stats
        document.getElementById('total-records').textContent = records.length;
        
        // Active Prescriptions pseudo-check
        let activeRx = 0;
        records.forEach(r => {
            activeRx += r.prescriptions.length;
        });
        document.getElementById('active-prescriptions').textContent = activeRx;

        // Recent Appointments Table
        const tbody = document.getElementById('recent-appts-tbody');
        if (appointments.length === 0) {
            tbody.textContent = '';
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 4;
            td.style.cssText = 'text-align: center; color: var(--on-surface-variant);';
            td.textContent = 'No appointments found.';
            tr.appendChild(td);
            tbody.appendChild(tr);
        } else {
            // Show only the 5 most recent/upcoming
            const recent = appointments.slice(0, 5);
            tbody.textContent = '';
            recent.forEach(a => {
                const dt = new Date(a.start_time).toLocaleString([], {year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});
                
                let bClass = 'badge--primary';
                if (a.status === 'completed') bClass = 'badge--success';
                else if (a.status === 'cancelled') bClass = 'badge--error';
                else if (a.status === 'in-progress') bClass = 'badge--warning';
                
                const tr = document.createElement('tr');
                
                const tdDt = document.createElement('td');
                tdDt.style.fontFamily = 'var(--font-label)';
                tdDt.textContent = dt;
                
                const tdDoc = document.createElement('td');
                tdDoc.textContent = a.doctor_name;
                
                const tdStatus = document.createElement('td');
                const badge = document.createElement('span');
                badge.className = `badge ${bClass}`;
                badge.textContent = a.status;
                tdStatus.appendChild(badge);
                
                const tdAction = document.createElement('td');
                const btn = document.createElement('a');
                btn.href = '/pages/patient/appointments.html';
                btn.className = 'btn btn-tertiary';
                btn.textContent = 'View';
                tdAction.appendChild(btn);
                
                tr.append(tdDt, tdDoc, tdStatus, tdAction);
                tbody.appendChild(tr);
            });
            
            initScrollAnimations();
        }

    } catch (err) {
        console.error(err);
        Toast.error('Failed to load dashboard data.');
    }
});
