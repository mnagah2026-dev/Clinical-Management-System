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
            searchResults.textContent = '';
            const sp = document.createElement('div');
            sp.className = 'spinner';
            sp.style.margin = '0 auto';
            searchResults.appendChild(sp);
            const patients = await api.get(`/portal/patients/search?q=${encodeURIComponent(q)}`);
            
            if (patients.length === 0) {
                searchResults.textContent = '';
                const msg = document.createElement('div');
                msg.style.cssText = 'text-align: center; color: var(--on-surface-variant); padding: var(--space-4); font-size: var(--body-sm);';
                msg.textContent = 'No patients found.';
                searchResults.appendChild(msg);
                return;
            }

            searchResults.textContent = '';
            patients.forEach(p => {
                const div = document.createElement('div');
                div.className = 'card card--interactive';
                div.style.padding = 'var(--space-3)';
                div.onclick = () => loadPatientDetails(p);
                
                const nameDiv = document.createElement('div');
                nameDiv.style.fontWeight = '600';
                nameDiv.textContent = p.first_name + ' ' + p.last_name;
                
                const idDiv = document.createElement('div');
                idDiv.style.cssText = 'font-size: var(--label-sm); font-family: var(--font-label); color: var(--outline); margin-top: 4px;';
                idDiv.textContent = 'ID: ' + p.id;
                
                div.append(nameDiv, idDiv);
                searchResults.appendChild(div);
            });
            
        } catch (err) {
            console.error(err);
            Toast.error('Search failed.');
            searchResults.textContent = '';
            const errDiv = document.createElement('div');
            errDiv.style.cssText = 'color: var(--error); padding: var(--space-4);';
            errDiv.textContent = 'Search error.';
            searchResults.appendChild(errDiv);
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
        containerVitals.textContent = '';
        const vSp = document.createElement('div');
        vSp.className = 'spinner';
        containerVitals.appendChild(vSp);
        containerHistory.textContent = '';
        const hSp = document.createElement('div');
        hSp.className = 'spinner';
        containerHistory.appendChild(hSp);

        try {
            const [vitals, history] = await Promise.all([
                api.get(`/portal/patients/${patient.id}/vitals`),
                api.get(`/portal/doctors/me/patients/${patient.id}/records`)
            ]);

            // Render Vitals
            if (vitals.length === 0) {
                containerVitals.textContent = '';
                const sp1 = document.createElement('span');
                sp1.style.color = 'var(--on-surface-variant)';
                sp1.textContent = 'No vital signs recorded yet.';
                containerVitals.appendChild(sp1);
            } else {
                containerVitals.textContent = '';
                vitals.slice(0, 5).forEach(v => {
                    const dt = new Date(v.measured_at).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});
                    
                    let bgTint = 'var(--surface-container-high)';
                    let borderCol = 'var(--outline)';
                    if (v.temperature < 35.0) { borderCol = '#00008B'; bgTint = 'rgba(0,0,139,0.1)'; }
                    else if (v.temperature >= 36.5 && v.temperature <= 37.5) { borderCol = 'var(--success)'; bgTint = 'rgba(122,232,160,0.1)'; }
                    else if (v.temperature >= 37.6 && v.temperature <= 38.4) { borderCol = '#FFD700'; bgTint = 'rgba(255,215,0,0.1)'; }
                    else if (v.temperature >= 38.5 && v.temperature <= 39.9) { borderCol = '#FFA500'; bgTint = 'rgba(255,165,0,0.1)'; }
                    else if (v.temperature >= 40.0) { borderCol = 'var(--error)'; bgTint = 'rgba(255,110,132,0.1)'; }
                    else { borderCol = '#ADD8E6'; bgTint = 'rgba(173,216,230,0.1)'; }

                    const div = document.createElement('div');
                    div.style.cssText = `background: ${bgTint}; border-left: 4px solid ${borderCol}; padding: var(--space-3); border-radius: var(--radius-sm); margin-bottom: var(--space-2); display: flex; flex-wrap: wrap; gap: var(--space-4);`;
                    
                    const headDiv = document.createElement('div');
                    headDiv.style.cssText = 'flex: 1 1 100%; border-bottom: 1px solid rgba(68,70,78,0.2); padding-bottom: 4px; margin-bottom: 4px;';
                    const strVar = document.createElement('strong');
                    strVar.style.cssText = 'color: var(--primary); font-family: var(--font-label);';
                    strVar.textContent = 'Visit #' + v.visit_number;
                    headDiv.appendChild(strVar);
                    headDiv.appendChild(document.createTextNode(' — ' + dt));
                    
                    const addStat = (label, val, unit) => {
                        const d = document.createElement('div');
                        const s1 = document.createElement('strong');
                        s1.textContent = label + ': ';
                        const s2 = document.createElement('span');
                        s2.style.fontFamily = 'var(--font-label)';
                        s2.textContent = val;
                        d.append(s1, s2, document.createTextNode(unit));
                        return d;
                    };
                    
                    div.append(headDiv,
                        addStat('BP', v.blood_pressure_systolic + '/' + v.blood_pressure_diastolic, ''),
                        addStat('Temp', v.temperature, ' °C'),
                        addStat('Sugar', v.blood_sugar || '--', ' mg/dL'),
                        addStat('Weight', v.weight, ' kg'),
                        addStat('Height', v.height || '--', ' cm')
                    );
                    containerVitals.appendChild(div);
                });

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
                containerHistory.textContent = '';
                const sp2 = document.createElement('span');
                sp2.style.color = 'var(--on-surface-variant)';
                sp2.textContent = 'No medical history available.';
                containerHistory.appendChild(sp2);
            } else {
                containerHistory.textContent = '';
                history.forEach(h => {
                    const dt = new Date(h.created_at).toLocaleString([], {year:'numeric', month:'long', day:'numeric'});
                    
                    const div = document.createElement('div');
                    div.style.cssText = 'margin-bottom: var(--space-4); border: 1px solid rgba(68,70,78,0.15); border-radius: var(--radius-md); padding: var(--space-4);';
                    
                    const d1 = document.createElement('div');
                    d1.style.cssText = 'font-family: var(--font-label); font-size: var(--label-sm); color: var(--outline); margin-bottom: var(--space-1);';
                    d1.textContent = dt + ' • Record ID: ' + h.id;
                    
                    const d2 = document.createElement('div');
                    d2.style.cssText = 'font-weight: 700; font-size: 1.1rem; color: var(--on-surface); margin-bottom: var(--space-2);';
                    d2.textContent = h.diagnosis || 'Undiagnosed';
                    
                    const d3 = document.createElement('div');
                    d3.style.cssText = 'color: var(--on-surface-variant); margin-bottom: var(--space-3); line-height: 1.5;';
                    d3.textContent = h.treatment_plan || 'No detailed clinical notes provided.';
                    
                    div.append(d1, d2, d3);
                    
                    if (h.prescriptions && h.prescriptions.length > 0) {
                        const pxDiv = document.createElement('div');
                        pxDiv.style.cssText = 'margin-top: var(--space-2); padding-left: var(--space-3); border-left: 2px solid var(--primary); margin-bottom: var(--space-2);';
                        const pxStr = document.createElement('strong');
                        pxStr.style.cssText = 'color: var(--outline); font-size: 0.8rem; text-transform: uppercase;';
                        pxStr.textContent = 'Prescriptions:';
                        pxDiv.appendChild(pxStr);
                        pxDiv.appendChild(document.createElement('br'));
                        
                        h.prescriptions.forEach(p => {
                            pxDiv.appendChild(document.createTextNode('• ' + p.drug_name + ' — '));
                            const em = document.createElement('em');
                            em.textContent = p.dosage;
                            pxDiv.appendChild(em);
                            pxDiv.appendChild(document.createTextNode(' (' + p.frequency + ')'));
                            pxDiv.appendChild(document.createElement('br'));
                        });
                        div.appendChild(pxDiv);
                    }
                    containerHistory.appendChild(div);
                });
            }

        } catch (err) {
            console.error('Failed to fetch patient details', err);
            containerVitals.textContent = '';
            const e1 = document.createElement('span');
            e1.style.color = 'var(--error)';
            e1.textContent = 'Error loading vitals.';
            containerVitals.appendChild(e1);
            containerHistory.textContent = '';
            const e2 = document.createElement('span');
            e2.style.color = 'var(--error)';
            e2.textContent = 'Error loading history.';
            containerHistory.appendChild(e2);
        }
    };
});
