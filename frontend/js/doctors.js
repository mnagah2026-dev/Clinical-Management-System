/**
 * Doctors Directory Page Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('doctors-grid');
    const filter = document.getElementById('specialty-filter');
    const search = document.getElementById('search-input');
    
    // Auth navbar
    updateNavAuth();

    let allDoctors = [];

    // Fetch dependencies
    try {
        const [specs, doctors] = await Promise.all([
            api.get('/portal/specializations'),
            api.get('/portal/doctors')
        ]);
        
        // Populate filter
        specs.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.name;
            filter.appendChild(opt);
        });

        allDoctors = doctors;
        renderDoctors(allDoctors);
    } catch (err) {
        console.error('Failed to load doctors directory:', err);
        grid.innerHTML = `<div style="grid-column: 1 / -1; display: flex; justify-content: center; padding: var(--space-8); color: var(--error);">
            Failed to load doctors. Please try again later.
        </div>`;
    }

    // Event Listeners for Filtering
    filter.addEventListener('change', () => filterDoctors());
    search.addEventListener('input', () => filterDoctors());

    function filterDoctors() {
        const query = search.value.trim().toLowerCase();
        const specialtyId = filter.value;

        const filtered = allDoctors.filter(d => {
            const matchesQuery = (d.first_name + ' ' + d.last_name).toLowerCase().includes(query);
            const matchesSpec = specialtyId ? d.specialization_id === specialtyId : true;
            return matchesQuery && matchesSpec;
        });
        renderDoctors(filtered);
    }

    function renderDoctors(doctors) {
        if (!doctors || doctors.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--on-surface-variant); padding: var(--space-12);">No specialists found matching your criteria.</div>`;
            return;
        }

        grid.innerHTML = doctors.map(d => `
            <div class="card card--interactive animate-on-scroll">
                <div style="display: flex; gap: var(--space-4); align-items: center; margin-bottom: var(--space-4);">
                    <div style="width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, var(--surface-container-high), var(--surface-container-low)); border: 1px solid rgba(151,169,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: var(--primary);">
                        🧑‍⚕️
                    </div>
                    <div>
                        <h3 class="card__title" style="margin-bottom: 0;">Dr. ${d.first_name} ${d.last_name}</h3>
                        <span class="badge badge--primary" style="margin-top: var(--space-2);">${d.specialization_name || 'Generalist'}</span>
                    </div>
                </div>
                <div class="flex flex-col gap-2 text-muted" style="font-size: var(--body-sm); margin-bottom: var(--space-6);">
                    <div class="flex items-center gap-2">📞 <span style="font-family: var(--font-label);">${d.phone || 'N/A'}</span></div>
                    <div class="flex items-center gap-2">🪪 License: <span style="font-family: var(--font-label);">${d.license_number || 'N/A'}</span></div>
                </div>
                ${Auth.isLoggedIn() && Auth.getRole() === 'Patient' ? 
                    `<button class="btn btn-secondary btn-sm" style="width: 100%;" onclick="bookAppointment('${d.id}')">Book Appointment</button>` :
                    `<a href="/pages/login.html" class="btn btn-ghost btn-sm" style="width: 100%;">Login to Book</a>`
                }
            </div>
        `).join('');
        
        // Re-init animations for new elements
        initScrollAnimations();
    }
});

function bookAppointment(docId) {
    // Save to local storage and redirect to portal dashboard for booking
    localStorage.setItem('cms_booking_target', docId);
    window.location.href = '/pages/patient/appointments.html';
}
