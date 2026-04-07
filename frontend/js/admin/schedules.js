document.addEventListener('DOMContentLoaded', async () => {
    Auth.requireRole('Admin');
    updateNavAuth();

    let currentDoctorId = null;

    // Load doctors list
    (async () => {
        try {
            const doctors = await api.get('/portal/doctors');
            const sel = document.getElementById('sched-doctor');
            doctors.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.id;
                opt.textContent = `Dr. ${d.first_name} ${d.last_name} (${d.specialization_name || 'N/A'})`;
                sel.appendChild(opt);
            });
        } catch (e) { console.error(e); }
    })();

    window.loadAvailability = async function() {
        currentDoctorId = document.getElementById('sched-doctor').value;
        if (!currentDoctorId) return Toast.error('Please select a doctor.');
        const tbody = document.getElementById('avail-tbody');
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;"><div class="spinner" style="margin:0 auto;"></div></td></tr>';
        try {
            const avails = await api.get(`/portal/admin/availability/${currentDoctorId}`);
            const dayOrder = ['sun','mon','tue','wed','thu','fri','sat'];
            const dayLabel = {sun:'Sunday',mon:'Monday',tue:'Tuesday',wed:'Wednesday',thu:'Thursday',fri:'Friday',sat:'Saturday'};
            avails.sort((a,b) => dayOrder.indexOf(a.day_of_week) - dayOrder.indexOf(b.day_of_week));
            if (avails.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No availability slots found.</td></tr>';
                return;
            }
            tbody.innerHTML = avails.map(a => `
                <tr>
                    <td style="font-weight: 600;">${dayLabel[a.day_of_week] || a.day_of_week}</td>
                    <td>${a.start_time}</td>
                    <td>${a.end_time}</td>
                    <td><span class="badge ${a.is_available ? 'badge--primary' : 'badge--secondary'}">${a.is_available ? 'Active' : 'Disabled'}</span></td>
                    <td>
                        <button class="btn btn-ghost btn-sm" onclick="toggleSlot('${a.id}', ${!a.is_available})">${a.is_available ? 'Disable' : 'Enable'}</button>
                    </td>
                </tr>
            `).join('');
        } catch (e) {
            Toast.error('Failed to load availability.');
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--error);">Error loading data.</td></tr>';
        }
    }

    window.toggleSlot = async function(availId, newState) {
        try {
            await api.patch(`/portal/admin/availability/${availId}`, { is_available: newState });
            Toast.success('Slot updated.');
            loadAvailability();
        } catch (e) { Toast.error('Failed to update slot.'); }
    }

    const addSlotForm = document.getElementById('add-slot-form');
    if (addSlotForm) {
        addSlotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentDoctorId) return Toast.error('Select a doctor first.');
            try {
                await api.post('/portal/admin/availability', {
                    doctor_id: currentDoctorId,
                    day_of_week: document.getElementById('slot-day').value,
                    start_time: document.getElementById('slot-start').value + ':00',
                    end_time: document.getElementById('slot-end').value + ':00',
                    is_available: true
                });
                Toast.success('Slot created.');
                document.getElementById('add-slot-modal').classList.add('hidden');
                document.getElementById('add-slot-form').reset();
                loadAvailability();
            } catch (err) { Toast.error(err.detail || 'Failed to create slot.'); }
        });
    }
});
