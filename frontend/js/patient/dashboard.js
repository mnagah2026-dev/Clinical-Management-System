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
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--on-surface-variant);">No appointments found.</td></tr>`;
        } else {
            // Show only the 5 most recent/upcoming
            const recent = appointments.slice(0, 5);
            tbody.innerHTML = recent.map(a => {
                const dt = new Date(a.start_time).toLocaleString([], {year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});
                
                let bClass = 'badge--primary';
                if (a.status === 'completed') bClass = 'badge--success';
                else if (a.status === 'cancelled') bClass = 'badge--error';
                else if (a.status === 'in-progress') bClass = 'badge--warning';

                return `<tr>
                    <td style="font-family: var(--font-label);">${dt}</td>
                    <td>${a.doctor_name}</td>
                    <td><span class="badge ${bClass}">${a.status}</span></td>
                    <td>
                        <a href="/pages/patient/appointments.html" class="btn btn-tertiary">View</a>
                    </td>
                </tr>`;
            }).join('');
            
            initScrollAnimations();
        }

    } catch (err) {
        console.error(err);
        Toast.error('Failed to load dashboard data.');
    }
});
