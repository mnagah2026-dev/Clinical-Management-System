/**
 * Admin Users — Add User Modal Logic
 * Extends the base users.js with modal form handling
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Load specializations for the modal dropdown
    try {
        const specs = await api.get('/portal/specializations');
        const select = document.getElementById('mu-specialization');
        select.innerHTML = '<option value="">— Select —</option>' + specs.map(s => 
            `<option value="${s.id}">${s.name}</option>`
        ).join('');
    } catch (e) {
        console.error('Failed to load specializations', e);
    }

    // Handle Add User form submit
    const form = document.getElementById('add-user-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            email: document.getElementById('mu-email').value,
            password: document.getElementById('mu-password').value,
            first_name: document.getElementById('mu-fname').value,
            last_name: document.getElementById('mu-lname').value,
            role: document.getElementById('mu-role').value,
            phone: document.getElementById('mu-phone').value || '',
            license_number: document.getElementById('mu-license').value || '',
        };
        if (payload.role === 'Doctor') {
            payload.specialization_id = document.getElementById('mu-specialization').value || null;
        }
        try {
            const res = await api.post('/portal/admin/users', payload);
            Toast.success(`User created (ID: ${res.id}).`);
            document.getElementById('add-user-modal').classList.add('hidden');
            form.reset();
            // Reload users list
            if (typeof loadUsers === 'function') loadUsers();
            else window.location.reload();
        } catch (err) {
            Toast.error(err.detail || 'Failed to create user.');
        }
    });
});
