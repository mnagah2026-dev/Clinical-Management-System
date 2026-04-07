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
                tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--on-surface-variant);">No appointments scheduled for this date.</td></tr>`;
                return;
            }

            tbody.innerHTML = appts.map(a => {
                const sDt = new Date(a.start_time);
                let timeFmt = sDt.toLocaleString([], {year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});
                if (dateStr) timeFmt = sDt.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});

                let bClass = 'badge--primary';
                if (a.status === 'completed') bClass = 'badge--success';
                else if (a.status === 'cancelled') bClass = 'badge--error';
                else if (a.status === 'in-progress') bClass = 'badge--warning';
                else if (a.status === 'missed') bClass = 'badge--error';

                // Status dropdown
                const isFinal = ['completed', 'cancelled', 'missed'].includes(a.status);
                let statusSelectHtml = '-';
                if (!isFinal) {
                    statusSelectHtml = `
                        <select onchange="updateAppointmentStatus('${a.id}', this.value)" class="input-field" style="padding: var(--space-2); min-width: 140px;">
                            <option value="" disabled selected>Update...</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="in-progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="missed">Missed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    `;
                }

                return `<tr>
                    <td style="font-family: var(--font-label);">${timeFmt}</td>
                    <td style="font-weight: 500;">${a.patient_name}</td>
                    <td style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${a.notes || ''}">${a.notes || '-'}</td>
                    <td><span class="badge ${bClass}">${a.status}</span></td>
                    <td>${statusSelectHtml}</td>
                    <td>
                        <button class="btn btn-tertiary" onclick="startConsultation('${a.patient_id}', '${a.id}')" ${isFinal ? 'disabled style="opacity:0.5"' : ''}>Consult</button>
                    </td>
                </tr>`;
            }).join('');
            
        } catch (err) {
            console.error(err);
            Toast.error('Failed to load appointments.');
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--error);">Error loading data.</td></tr>`;
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
