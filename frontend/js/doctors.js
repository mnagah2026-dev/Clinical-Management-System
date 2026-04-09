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
            grid.textContent = '';
            const md = document.createElement('div');
            md.style.cssText = 'grid-column: 1/-1; text-align: center; color: var(--on-surface-variant); padding: var(--space-12);';
            md.textContent = 'No specialists found matching your criteria.';
            grid.appendChild(md);
            return;
        }

        grid.textContent = '';
        doctors.forEach(d => {
            const card = document.createElement('div');
            card.className = 'card card--interactive animate-on-scroll';
            
            const headDiv = document.createElement('div');
            headDiv.style.cssText = 'display: flex; gap: var(--space-4); align-items: center; margin-bottom: var(--space-4);';
            
            const iconDiv = document.createElement('div');
            iconDiv.style.cssText = 'width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, var(--surface-container-high), var(--surface-container-low)); border: 1px solid rgba(151,169,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: var(--primary);';
            iconDiv.textContent = '🧑‍⚕️';
            
            const infoDiv = document.createElement('div');
            const h3 = document.createElement('h3');
            h3.className = 'card__title';
            h3.style.marginBottom = '0';
            h3.textContent = 'Dr. ' + d.first_name + ' ' + d.last_name;
            const badge = document.createElement('span');
            badge.className = 'badge badge--primary';
            badge.style.marginTop = 'var(--space-2)';
            badge.textContent = d.specialization_name || 'Generalist';
            infoDiv.append(h3, badge);
            
            headDiv.append(iconDiv, infoDiv);
            
            const metaDiv = document.createElement('div');
            metaDiv.className = 'flex flex-col gap-2 text-muted';
            metaDiv.style.cssText = 'font-size: var(--body-sm); margin-bottom: var(--space-6);';
            
            const pDiv = document.createElement('div');
            pDiv.className = 'flex items-center gap-2';
            pDiv.textContent = '📞 ';
            const pSpan = document.createElement('span');
            pSpan.style.fontFamily = 'var(--font-label)';
            pSpan.textContent = d.phone || 'N/A';
            pDiv.appendChild(pSpan);
            
            const lDiv = document.createElement('div');
            lDiv.className = 'flex items-center gap-2';
            lDiv.textContent = '🪪 License: ';
            const lSpan = document.createElement('span');
            lSpan.style.fontFamily = 'var(--font-label)';
            lSpan.textContent = d.license_number || 'N/A';
            lDiv.appendChild(lSpan);
            
            metaDiv.append(pDiv, lDiv);
            card.append(headDiv, metaDiv);
            
            if (Auth.isLoggedIn() && Auth.getRole() === 'Patient') {
                const btn = document.createElement('button');
                btn.className = 'btn btn-secondary btn-sm';
                btn.style.width = '100%';
                btn.textContent = 'Book Appointment';
                btn.onclick = () => bookAppointment(d.id);
                card.appendChild(btn);
            } else {
                const a = document.createElement('a');
                a.href = '/pages/login.html';
                a.className = 'btn btn-ghost btn-sm';
                a.style.width = '100%';
                a.textContent = 'Login to Book';
                card.appendChild(a);
            }
            grid.appendChild(card);
        });
        
        // Re-init animations for new elements
        initScrollAnimations();
    }
});

function bookAppointment(docId) {
    // Save to local storage and redirect to portal dashboard for booking
    localStorage.setItem('cms_booking_target', docId);
    window.location.href = '/pages/patient/appointments.html';
}
