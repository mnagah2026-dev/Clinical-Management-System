/**
 * Nurse Dashboard Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
    Auth.requireRole('Nurse');
    updateNavAuth();

    try {
        const profile = await api.get('/portal/nurses/me');
        if (profile) {
            document.getElementById('welcome-msg').textContent = `Hello, Nurse ${profile.last_name}`;
        }
    } catch(err) {
        console.error(err);
    }

    const searchForm = document.getElementById('patient-search-form');
    const searchInput = document.getElementById('search-query');
    const searchResults = document.getElementById('search-results-list');

    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const q = searchInput.value.trim();
        if (!q) return;

        try {
            searchResults.textContent = '';
            const sp = document.createElement('div');
            sp.className = 'spinner';
            sp.style.cssText = 'grid-column: 1/-1; margin: 0 auto;';
            searchResults.appendChild(sp);
            const patients = await api.get(`/portal/patients/search?q=${encodeURIComponent(q)}`);
            
            if (patients.length === 0) {
                searchResults.textContent = '';
                const emptyMsg = document.createElement('div');
                emptyMsg.style.cssText = 'grid-column: 1/-1; text-align: center; color: var(--on-surface-variant); padding: var(--space-4); font-size: var(--body-sm);';
                emptyMsg.textContent = "No patients found matching '" + q + "'.";
                searchResults.appendChild(emptyMsg);
                return;
            }

            searchResults.textContent = '';
            patients.forEach(p => {
                const card = document.createElement('div');
                card.className = 'card card--interactive';
                card.style.border = '1px solid rgba(68,70,78,0.2)';
                
                const headDiv = document.createElement('div');
                headDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-4);';
                
                const infoDiv = document.createElement('div');
                const nameDiv = document.createElement('div');
                nameDiv.style.cssText = 'font-weight: 600; font-size: 1.1rem;';
                nameDiv.textContent = p.first_name + ' ' + p.last_name;
                const idDiv = document.createElement('div');
                idDiv.style.cssText = 'font-size: var(--label-sm); font-family: var(--font-label); color: var(--outline); margin-top: 4px;';
                idDiv.textContent = 'ID: ' + p.id;
                infoDiv.append(nameDiv, idDiv);
                
                const badge = document.createElement('div');
                badge.className = 'badge badge--primary';
                badge.textContent = p.gender;
                
                headDiv.append(infoDiv, badge);
                
                const actionDiv = document.createElement('div');
                actionDiv.style.cssText = 'display: flex; gap: var(--space-4);';
                const btn = document.createElement('button');
                btn.className = 'btn btn-secondary btn-sm';
                btn.style.flex = '1';
                btn.textContent = 'Log Vitals';
                btn.onclick = () => logVitals(p.id);
                actionDiv.appendChild(btn);
                
                card.append(headDiv, actionDiv);
                searchResults.appendChild(card);
            });
            
        } catch (err) {
            console.error(err);
            Toast.error('Search failed.');
            searchResults.textContent = '';
            const errDiv = document.createElement('div');
            errDiv.style.cssText = 'grid-column: 1/-1; color: var(--error); padding: var(--space-4); text-align: center;';
            errDiv.textContent = 'Search error.';
            searchResults.appendChild(errDiv);
        }
    });

    // Global router to vitals page
    window.logVitals = function(patientId) {
        localStorage.setItem('cms_active_patient_vitals', patientId);
        window.location.href = '/pages/nurse/vitals.html';
    };
});
