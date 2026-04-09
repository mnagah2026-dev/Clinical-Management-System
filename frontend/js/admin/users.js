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
            tbody.textContent = '';
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 6;
            td.style.textAlign = 'center';
            const sp = document.createElement('div');
            sp.className = 'spinner';
            td.appendChild(sp);
            tr.appendChild(td);
            tbody.appendChild(tr);
            const data = await api.get('/portal/admin/users');
            allUsers = data.users || [];
            document.getElementById('total-users-cnt').textContent = data.total || allUsers.length;
            renderUsers(allUsers);
        } catch (err) {
            console.error('Failed to load users', err);
            Toast.error('Error fetching users from system.');
            tbody.textContent = '';
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 6;
            td.style.textAlign = 'center';
            td.style.color = 'var(--error)';
            td.textContent = 'Failed to load users.';
            tr.appendChild(td);
            tbody.appendChild(tr);
        }
    }

    function renderUsers(users) {
        if (users.length === 0) {
            tbody.textContent = '';
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 6;
            td.style.textAlign = 'center';
            td.style.color = 'var(--on-surface-variant)';
            td.textContent = 'No users found.';
            tr.appendChild(td);
            tbody.appendChild(tr);
            return;
        }

        tbody.textContent = '';
        users.forEach(u => {
            let roleBadge = 'badge--secondary';
            if (u.role === 'Admin') roleBadge = 'badge--error';
            else if (u.role === 'Nurse') roleBadge = 'badge--primary';
            else if (u.role === 'Patient') roleBadge = 'badge--tertiary';

            let login = 'Never';
            if (u.last_login) {
                const ls = new Date(u.last_login);
                login = ls.toLocaleDateString() + ' ' + ls.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
            }

            const tr = document.createElement('tr');
            
            const tdId = document.createElement('td');
            tdId.style.fontFamily = 'var(--font-label)';
            tdId.textContent = u.id;
            
            const tdEmail = document.createElement('td');
            tdEmail.textContent = u.email;
            
            const tdRole = document.createElement('td');
            const roleSpan = document.createElement('span');
            roleSpan.className = `badge ${roleBadge}`;
            roleSpan.textContent = u.role;
            tdRole.appendChild(roleSpan);
            
            const tdStatus = document.createElement('td');
            const statusSpan = document.createElement('span');
            if (u.is_active) {
                statusSpan.style.color = 'var(--success)';
                statusSpan.style.fontWeight = '600';
                statusSpan.textContent = 'Active';
            } else {
                statusSpan.style.color = 'var(--error)';
                statusSpan.style.fontWeight = '600';
                statusSpan.textContent = 'Disabled';
            }
            tdStatus.appendChild(statusSpan);
            
            const tdLogin = document.createElement('td');
            tdLogin.style.fontFamily = 'var(--font-label)';
            tdLogin.style.fontSize = 'var(--body-sm)';
            tdLogin.textContent = login;
            
            const tdAction = document.createElement('td');
            if (u.id !== currentUserId) {
                const btn = document.createElement('button');
                btn.className = 'btn btn-ghost btn-sm';
                btn.style.color = u.is_active ? 'var(--error)' : 'var(--success)';
                btn.textContent = u.is_active ? 'Disable' : 'Enable';
                btn.onclick = () => toggleStatus(u.id, !u.is_active);
                tdAction.appendChild(btn);
            } else {
                const selfSpan = document.createElement('span');
                selfSpan.style.color = 'var(--on-surface-variant)';
                selfSpan.style.fontSize = 'var(--body-sm)';
                selfSpan.textContent = 'Self';
                tdAction.appendChild(selfSpan);
            }
            
            tr.append(tdId, tdEmail, tdRole, tdStatus, tdLogin, tdAction);
            tbody.appendChild(tr);
        });
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
