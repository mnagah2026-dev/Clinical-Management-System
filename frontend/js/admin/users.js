/**
 * Admin User Management Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
    Auth.requireRole('Admin');
    updateNavAuth();

    const tbody = document.getElementById('users-tbody');
    const searchInput = document.getElementById('search-users');
    let allUsers = [];

    // Get current admin's user ID from JWT token
    const currentUserId = Auth.getUserId();

    await loadUsers();

    searchInput.addEventListener('input', () => {
        const q = searchInput.value.toLowerCase().trim();
        const filtered = allUsers.filter(u => 
            u.email.toLowerCase().includes(q) || 
            u.role.toLowerCase().includes(q) ||
            u.id.toLowerCase().includes(q)
        );
        renderUsers(filtered);
    });

    async function loadUsers() {
        try {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center;"><div class="spinner"></div></td></tr>`;
            const data = await api.get('/portal/admin/users');
            allUsers = data.users || [];
            document.getElementById('total-users-cnt').textContent = data.total || allUsers.length;
            renderUsers(allUsers);
        } catch (err) {
            console.error('Failed to load users', err);
            Toast.error('Error fetching users from system.');
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--error);">Failed to load users.</td></tr>`;
        }
    }

    function renderUsers(users) {
        if (users.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--on-surface-variant);">No users found.</td></tr>`;
            return;
        }

        tbody.innerHTML = users.map(u => {
            let roleBadge = 'badge--secondary';
            if (u.role === 'Admin') roleBadge = 'badge--error';
            else if (u.role === 'Nurse') roleBadge = 'badge--primary';
            else if (u.role === 'Patient') roleBadge = 'badge--tertiary';

            const statusHtml = u.is_active 
                ? '<span style="color: var(--success); font-weight: 600;">Active</span>' 
                : '<span style="color: var(--error); font-weight: 600;">Disabled</span>';

            const actionBtn = u.is_active
                ? `<button class="btn btn-ghost btn-sm" style="color: var(--error);" onclick="toggleStatus('${u.id}', false)">Disable</button>`
                : `<button class="btn btn-ghost btn-sm" style="color: var(--success);" onclick="toggleStatus('${u.id}', true)">Enable</button>`;

            let login = 'Never';
            if (u.last_login) {
                const ls = new Date(u.last_login);
                login = ls.toLocaleDateString() + ' ' + ls.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
            }

            return `<tr>
                <td style="font-family: var(--font-label);">${u.id}</td>
                <td>${u.email}</td>
                <td><span class="badge ${roleBadge}">${u.role}</span></td>
                <td>${statusHtml}</td>
                <td style="font-family: var(--font-label); font-size: var(--body-sm);">${login}</td>
                <td>
                    ${u.id !== currentUserId ? actionBtn : '<span style="color: var(--on-surface-variant); font-size: var(--body-sm);">Self</span>'}
                </td>
            </tr>`;
        }).join('');
    }

    window.toggleStatus = async function(userId, isActive) {
        try {
            Toast.info('Updating user status...');
            await api.patch(`/portal/admin/users/${userId}`, { is_active: isActive });
            Toast.success(`User ${isActive ? 'enabled' : 'disabled'} successfully.`);
            loadUsers();
        } catch (err) {
            console.error(err);
            Toast.error(err.detail || `Failed to ${isActive ? 'enable' : 'disable'} user.`);
        }
    };
});
