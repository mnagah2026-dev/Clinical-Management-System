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
            searchResults.innerHTML = `<div class="spinner" style="grid-column: 1/-1; margin: 0 auto;"></div>`;
            const patients = await api.get(`/portal/patients/search?q=${encodeURIComponent(q)}`);
            
            if (patients.length === 0) {
                searchResults.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--on-surface-variant); padding: var(--space-4); font-size: var(--body-sm);">No patients found matching '${q}'.</div>`;
                return;
            }

            searchResults.innerHTML = patients.map(p => `
                <div class="card card--interactive" style="border: 1px solid rgba(68,70,78,0.2);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-4);">
                        <div>
                            <div style="font-weight: 600; font-size: 1.1rem;">${p.first_name} ${p.last_name}</div>
                            <div style="font-size: var(--label-sm); font-family: var(--font-label); color: var(--outline); margin-top: 4px;">ID: ${p.id}</div>
                        </div>
                        <div class="badge badge--primary">${p.gender}</div>
                    </div>
                    <div style="display: flex; gap: var(--space-4);">
                        <button class="btn btn-secondary btn-sm" style="flex: 1;" onclick="logVitals('${p.id}')">Log Vitals</button>
                    </div>
                </div>
            `).join('');
            
        } catch (err) {
            console.error(err);
            Toast.error('Search failed.');
            searchResults.innerHTML = `<div style="grid-column: 1/-1; color: var(--error); padding: var(--space-4); text-align: center;">Search error.</div>`;
        }
    });

    // Global router to vitals page
    window.logVitals = function(patientId) {
        localStorage.setItem('cms_active_patient_vitals', patientId);
        window.location.href = '/pages/nurse/vitals.html';
    };
});
