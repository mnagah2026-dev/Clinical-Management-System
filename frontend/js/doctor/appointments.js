/**
 * Doctor Appointments Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
    Auth.requireRole('Doctor');
    updateNavAuth();

    const tbody = document.getElementById('doc-appts-tbody');
    const dateFilter = document.getElementById('date-filter');
    
    // Set Default Filter to Today
    dateFilter.value = new Date().toISOString().split('T')[0];

    await loadDoctorAppointments();

    dateFilter.addEventListener('change', loadDoctorAppointments);

    async function loadDoctorAppointments() {
        try {
            const dateStr = dateFilter.value;
            const endpoint = dateStr ? `/portal/doctors/me/appointments?target_date=${dateStr}` : '/portal/doctors/me/appointments';
            
            const appts = await api.get(endpoint);
            
            if (appts.length === 0) {
                tbody.textContent = '';
                const tr = document.createElement('tr');
                const td = document.createElement('td');
                td.colSpan = 6;
                td.style.textAlign = 'center';
                td.style.color = 'var(--on-surface-variant)';
                td.textContent = 'No appointments scheduled for this date.';
                tr.appendChild(td);
                tbody.appendChild(tr);
                return;
            }

            tbody.textContent = '';
            appts.forEach(a => {
                const sDt = new Date(a.start_time);
                let timeFmt = sDt.toLocaleString([], {year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});
                if (dateStr) timeFmt = sDt.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});

                let bClass = 'badge--primary';
                if (a.status === 'completed') bClass = 'badge--success';
                else if (a.status === 'cancelled') bClass = 'badge--error';
                else if (a.status === 'in-progress') bClass = 'badge--warning';
                else if (a.status === 'missed') bClass = 'badge--error';

                const tr = document.createElement('tr');
                
                const tdTime = document.createElement('td');
                tdTime.style.fontFamily = 'var(--font-label)';
                tdTime.textContent = timeFmt;
                
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
                
                const tdStatusCell = document.createElement('td');
                const badge = document.createElement('span');
                badge.className = `badge ${bClass}`;
                badge.textContent = a.status;
                tdStatusCell.appendChild(badge);
                
                const isFinal = ['completed', 'cancelled', 'missed'].includes(a.status);
                const tdSelect = document.createElement('td');
                if (!isFinal) {
                    const sel = document.createElement('select');
                    sel.className = 'input-field';
                    sel.style.padding = 'var(--space-2)';
                    sel.style.minWidth = '140px';
                    sel.onchange = function() { updateAppointmentStatus(a.id, this.value); };
                    
                    const optDefs = [
                        {val: '', text: 'Update...', disabled: true, selected: true},
                        {val: 'scheduled', text: 'Scheduled'},
                        {val: 'in-progress', text: 'In Progress'},
                        {val: 'completed', text: 'Completed'},
                        {val: 'missed', text: 'Missed'},
                        {val: 'cancelled', text: 'Cancelled'}
                    ];
                    optDefs.forEach(def => {
                        const opt = document.createElement('option');
                        opt.value = def.val;
                        opt.textContent = def.text;
                        if (def.disabled) opt.disabled = true;
                        if (def.selected) opt.selected = true;
                        sel.appendChild(opt);
                    });
                    tdSelect.appendChild(sel);
                } else {
                    tdSelect.textContent = '-';
                }
                
                const tdAction = document.createElement('td');
                const btn = document.createElement('button');
                btn.className = 'btn btn-tertiary';
                btn.textContent = 'Consult';
                btn.onclick = () => startConsultation(a.patient_id, a.id);
                if (isFinal) {
                    btn.disabled = true;
                    btn.style.opacity = '0.5';
                }
                tdAction.appendChild(btn);
                
                tr.append(tdTime, tdName, tdNotes, tdStatusCell, tdSelect, tdAction);
                tbody.appendChild(tr);
            });
            
        } catch (err) {
            console.error(err);
            Toast.error('Failed to load appointments.');
            tbody.textContent = '';
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 6;
            td.style.textAlign = 'center';
            td.style.color = 'var(--error)';
            td.textContent = 'Error loading data.';
            tr.appendChild(td);
            tbody.appendChild(tr);
        }
    }

    // Global Action Handlers
    window.updateAppointmentStatus = async function(apptId, newStatus) {
        if (!newStatus) return;
        try {
            await api.patch(`/appointments/${apptId}/status`, { status: newStatus });
            Toast.success('Status updated successfully.');
            loadDoctorAppointments();
        } catch (err) {
            Toast.error(err.detail || 'Failed to update status.');
        }
    };

    window.startConsultation = function(patientId, appointmentId) {
        localStorage.setItem('cms_active_patient', patientId);
        localStorage.setItem('cms_active_appt', appointmentId);
        window.location.href = '/pages/doctor/diagnosis.html';
    };
});
