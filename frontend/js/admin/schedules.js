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
        tbody.textContent = '';
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 5;
        td.style.textAlign = 'center';
        const sp = document.createElement('div');
        sp.className = 'spinner';
        sp.style.margin = '0 auto';
        td.appendChild(sp);
        tr.appendChild(td);
        tbody.appendChild(tr);
        try {
            const avails = await api.get(`/portal/admin/availability/${currentDoctorId}`);
            const dayOrder = ['sun','mon','tue','wed','thu','fri','sat'];
            const dayLabel = {sun:'Sunday',mon:'Monday',tue:'Tuesday',wed:'Wednesday',thu:'Thursday',fri:'Friday',sat:'Saturday'};
            avails.sort((a,b) => dayOrder.indexOf(a.day_of_week) - dayOrder.indexOf(b.day_of_week));
            if (avails.length === 0) {
                tbody.textContent = '';
                const tr = document.createElement('tr');
                const td = document.createElement('td');
                td.colSpan = 5;
                td.style.textAlign = 'center';
                td.textContent = 'No availability slots found.';
                tr.appendChild(td);
                tbody.appendChild(tr);
                return;
            }
            tbody.textContent = '';
            avails.forEach(a => {
                const tr = document.createElement('tr');
                const tdDay = document.createElement('td');
                tdDay.style.fontWeight = '600';
                tdDay.textContent = dayLabel[a.day_of_week] || a.day_of_week;
                
                const tdStart = document.createElement('td');
                tdStart.textContent = a.start_time;
                
                const tdEnd = document.createElement('td');
                tdEnd.textContent = a.end_time;
                
                const tdBadge = document.createElement('td');
                const badgeSpan = document.createElement('span');
                badgeSpan.className = `badge ${a.is_available ? 'badge--primary' : 'badge--secondary'}`;
                badgeSpan.textContent = a.is_available ? 'Active' : 'Disabled';
                tdBadge.appendChild(badgeSpan);
                
                const tdAction = document.createElement('td');
                const actionBtn = document.createElement('button');
                actionBtn.className = 'btn btn-ghost btn-sm';
                actionBtn.textContent = a.is_available ? 'Disable' : 'Enable';
                actionBtn.onclick = () => toggleSlot(a.id, !a.is_available);
                tdAction.appendChild(actionBtn);
                
                tr.append(tdDay, tdStart, tdEnd, tdBadge, tdAction);
                tbody.appendChild(tr);
            });
        } catch (e) {
            Toast.error('Failed to load availability.');
            tbody.textContent = '';
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 5;
            td.style.textAlign = 'center';
            td.style.color = 'var(--error)';
            td.textContent = 'Error loading data.';
            tr.appendChild(td);
            tbody.appendChild(tr);
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
