/**
 * Doctor - Patient Records Viewer Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
    Auth.requireRole('Doctor');
    updateNavAuth();

    const searchForm = document.getElementById('patient-search-form');
    const searchInput = document.getElementById('search-query');
    const searchResults = document.getElementById('search-results-list');
    const detailsPane = document.getElementById('patient-details-pane');

    // UI Elements for details
    const elName = document.getElementById('pd-name');
    const elId = document.getElementById('pd-id');
    const elDob = document.getElementById('pd-dob');
    const elGender = document.getElementById('pd-gender');
    const containerVitals = document.getElementById('pd-vitals');
    const containerHistory = document.getElementById('pd-history');
    const btnDiagnosis = document.getElementById('btn-start-diagnosis');

    // Handle Search
    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const q = searchInput.value.trim();
        if (!q) return;

        try {
            searchResults.innerHTML = `<div class="spinner" style="margin: 0 auto;"></div>`;
            const patients = await api.get(`/portal/patients/search?q=${encodeURIComponent(q)}`);
            
            if (patients.length === 0) {
                searchResults.innerHTML = `<div style="text-align: center; color: var(--on-surface-variant); padding: var(--space-4); font-size: var(--body-sm);">No patients found.</div>`;
                return;
            }

            searchResults.innerHTML = patients.map(p => `
                <div class="card card--interactive" style="padding: var(--space-3);" onclick='loadPatientDetails(${JSON.stringify(p)})'>
                    <div style="font-weight: 600;">${p.first_name} ${p.last_name}</div>
                    <div style="font-size: var(--label-sm); font-family: var(--font-label); color: var(--outline); margin-top: 4px;">ID: ${p.id}</div>
                </div>
            `).join('');
            
        } catch (err) {
            console.error(err);
            Toast.error('Search failed.');
            searchResults.innerHTML = `<div style="color: var(--error); padding: var(--space-4);">Search error.</div>`;
        }
    });

    // Handle Selecting a Patient
    window.loadPatientDetails = async function(patient) {
        detailsPane.classList.remove('hidden');
        
        elName.textContent = `${patient.first_name} ${patient.last_name}`;
        elId.textContent = `ID: ${patient.id}`;
        elDob.textContent = patient.date_of_birth;
        elGender.textContent = patient.gender;
        
        btnDiagnosis.onclick = (e) => {
            e.preventDefault();
            localStorage.setItem('cms_active_patient', patient.id);
            window.location.href = '/pages/doctor/diagnosis.html';
        };

        // Load concurrent streams (Vitals and History)
        containerVitals.innerHTML = `<div class="spinner"></div>`;
        containerHistory.innerHTML = `<div class="spinner"></div>`;

        try {
            const [vitals, history] = await Promise.all([
                api.get(`/portal/patients/${patient.id}/vitals`),
                api.get(`/portal/doctors/me/patients/${patient.id}/records`)
            ]);

            // Render Vitals
            if (vitals.length === 0) {
                containerVitals.innerHTML = '<span style="color: var(--on-surface-variant);">No vital signs recorded yet.</span>';
            } else {
                containerVitals.innerHTML = vitals.slice(0, 5).map(v => {
                    const dt = new Date(v.measured_at).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});
                    
                    let bgTint = 'var(--surface-container-high)';
                    let borderCol = 'var(--outline)';
                    if (v.temperature < 35.0) { borderCol = '#00008B'; bgTint = 'rgba(0,0,139,0.1)'; }
                    else if (v.temperature >= 36.5 && v.temperature <= 37.5) { borderCol = 'var(--success)'; bgTint = 'rgba(122,232,160,0.1)'; }
                    else if (v.temperature >= 37.6 && v.temperature <= 38.4) { borderCol = '#FFD700'; bgTint = 'rgba(255,215,0,0.1)'; } // Yellow
                    else if (v.temperature >= 38.5 && v.temperature <= 39.9) { borderCol = '#FFA500'; bgTint = 'rgba(255,165,0,0.1)'; } // Orange
                    else if (v.temperature >= 40.0) { borderCol = 'var(--error)'; bgTint = 'rgba(255,110,132,0.1)'; }
                    else { borderCol = '#ADD8E6'; bgTint = 'rgba(173,216,230,0.1)'; } // 35.0 - 36.4 (mild decrease, light blue)

                    return `
                        <div style="background: ${bgTint}; border-left: 4px solid ${borderCol}; padding: var(--space-3); border-radius: var(--radius-sm); margin-bottom: var(--space-2); display: flex; flex-wrap: wrap; gap: var(--space-4);">
                           <div style="flex: 1 1 100%; border-bottom: 1px solid rgba(68,70,78,0.2); padding-bottom: 4px; margin-bottom: 4px;">
                              <strong style="color: var(--primary); font-family: var(--font-label);">Visit #${v.visit_number}</strong> — ${dt}
                           </div>
                           <div><strong>BP:</strong> <span style="font-family: var(--font-label);">${v.blood_pressure_systolic}/${v.blood_pressure_diastolic}</span></div>
                           <div><strong>Temp:</strong> <span style="font-family: var(--font-label);">${v.temperature}</span> °C</div>
                           <div><strong>Sugar:</strong> <span style="font-family: var(--font-label);">${v.blood_sugar || '--'}</span> mg/dL</div>
                           <div><strong>Weight:</strong> <span style="font-family: var(--font-label);">${v.weight}</span> kg</div>
                           <div><strong>Height:</strong> <span style="font-family: var(--font-label);">${v.height || '--'}</span> cm</div>
                        </div>
                    `;
                }).join('');

                // Render Charts (Rule 20)
                if (vitals.length >= 2) {
                    const chartsPane = document.getElementById('pd-charts');
                    chartsPane.classList.remove('hidden');
                    const sorted = [...vitals].reverse();
                    const labels = sorted.map(v => {
                        const d = new Date(v.measured_at);
                        return d.toLocaleDateString([], {month:'short', day:'numeric'});
                    });
                    const chartDefaults = { responsive: true, plugins: { legend: { labels: { color: '#C5C6D0' } } },
                        scales: { x: { ticks: { color: '#72737E' }, grid: { color: 'rgba(68,70,78,0.2)' } },
                                  y: { ticks: { color: '#72737E' }, grid: { color: 'rgba(68,70,78,0.15)' } } } };
                    // Chart 1: BP + Sugar
                    const ctx1 = document.getElementById('chart-bp-sugar');
                    if (window._chart1) window._chart1.destroy();
                    window._chart1 = new Chart(ctx1, { type: 'line', data: {
                        labels, datasets: [
                            { label: 'Systolic', data: sorted.map(v => v.blood_pressure_systolic), borderColor: '#6CB8FF', tension: 0.3, borderWidth: 2, pointRadius: 3 },
                            { label: 'Diastolic', data: sorted.map(v => v.blood_pressure_diastolic), borderColor: '#B5A4FF', tension: 0.3, borderWidth: 2, pointRadius: 3 },
                            { label: 'Blood Sugar', data: sorted.map(v => v.blood_sugar), borderColor: '#7AE8A0', tension: 0.3, borderWidth: 2, pointRadius: 3 }
                        ] }, options: chartDefaults });
                    // Chart 2: Temp + Weight
                    const ctx2 = document.getElementById('chart-temp-weight');
                    if (window._chart2) window._chart2.destroy();
                    window._chart2 = new Chart(ctx2, { type: 'line', data: {
                        labels, datasets: [
                            { label: 'Temp (°C)', data: sorted.map(v => v.temperature), borderColor: '#FF6E84', tension: 0.3, borderWidth: 2, pointRadius: 3 },
                            { label: 'Weight (kg)', data: sorted.map(v => v.weight), borderColor: '#FFD166', tension: 0.3, borderWidth: 2, pointRadius: 3 }
                        ] }, options: chartDefaults });
                }
            }

            // Render History
            if (history.length === 0) {
                containerHistory.innerHTML = '<span style="color: var(--on-surface-variant);">No medical history available.</span>';
            } else {
                containerHistory.innerHTML = history.map(h => {
                    const dt = new Date(h.created_at).toLocaleString([], {year:'numeric', month:'long', day:'numeric'});
                    
                    let pxHtml = '';
                    if (h.prescriptions && h.prescriptions.length > 0) {
                        pxHtml = `<div style="margin-top: var(--space-2); padding-left: var(--space-3); border-left: 2px solid var(--primary); margin-bottom: var(--space-2);">
                            <strong style="color: var(--outline); font-size: 0.8rem; text-transform: uppercase;">Prescriptions:</strong><br>
                            ${h.prescriptions.map(p => `• ${p.drug_name} — <em>${p.dosage}</em> (${p.frequency})`).join('<br>')}
                        </div>`;
                    }

                    return `
                        <div style="margin-bottom: var(--space-4); border: 1px solid rgba(68,70,78,0.15); border-radius: var(--radius-md); padding: var(--space-4);">
                           <div style="font-family: var(--font-label); font-size: var(--label-sm); color: var(--outline); margin-bottom: var(--space-1);">${dt} • Record ID: ${h.id}</div>
                           <div style="font-weight: 700; font-size: 1.1rem; color: var(--on-surface); margin-bottom: var(--space-2);">${h.diagnosis || 'Undiagnosed'}</div>
                           <div style="color: var(--on-surface-variant); margin-bottom: var(--space-3); line-height: 1.5;">${h.treatment_plan || 'No detailed clinical notes provided.'}</div>
                           ${pxHtml}
                        </div>
                    `;
                }).join('');
            }

        } catch (err) {
            console.error('Failed to fetch patient details', err);
            containerVitals.innerHTML = `<span style="color: var(--error);">Error loading vitals.</span>`;
            containerHistory.innerHTML = `<span style="color: var(--error);">Error loading history.</span>`;
        }
    };
});
