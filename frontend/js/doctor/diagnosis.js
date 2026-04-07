/**
 * Doctor Diagnosis & Prescription Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
    Auth.requireRole('Doctor');
    updateNavAuth();

    const activePatientId = localStorage.getItem('cms_active_patient');
    const activeApptId = localStorage.getItem('cms_active_appt') || 'WALK-IN';
    
    const wrapperTarget = document.getElementById('consultation-form');
    const wrapperNone = document.getElementById('no-patient-alert');
    
    if (!activePatientId) {
        wrapperTarget.classList.add('hidden');
        wrapperNone.style.display = 'block';
        return;
    }

    // Load static lookups
    let drugsLookup = [];
    try {
        const [drugs, docProfile] = await Promise.all([
            api.get('/portal/drugs'),
            api.get('/portal/doctors/me')
        ]);
        
        window.currentDoctorId = docProfile.id;
        drugsLookup = drugs;

    } catch (err) {
        console.error('Failed to load drugs list', err);
        Toast.error('Could not load pharmacology database.');
    }

    // Load Patient Info
    try {
        const patients = await api.get(`/portal/patients/search?q=${activePatientId}`);
        const p = patients.find(x => x.id === activePatientId);
        if (p) {
            document.getElementById('active-patient-name').textContent = `${p.first_name} ${p.last_name}`;
            document.getElementById('active-appt-id').textContent = activeApptId;
        }
    } catch (e) {
        console.error(e);
        document.getElementById('active-patient-name').textContent = activePatientId;
    }

    // Prescription Builder logic
    const rxList = [];
    const containerRx = document.getElementById('rx-list');
    
    document.getElementById('btn-add-drug').addEventListener('click', () => {
        const dName = document.getElementById('drug-name').value.trim();
        const dose = document.getElementById('drug-dosage').value.trim();
        const freq = document.getElementById('drug-freq').value.trim();

        if (!dName) { Toast.warning('Provide a drug name.'); return; }
        if (!dose || !freq) { Toast.warning('Dosage and frequency required.'); return; }

        if (rxList.find(x => x.name.toLowerCase() === dName.toLowerCase())) {
            Toast.warning('Drug already in regimen.');
            return;
        }

        rxList.push({
            name: dName,
            dosage: dose,
            treatment: freq
        });

        renderRxList();
        
        // Reset inputs
        document.getElementById('drug-name').value = '';
        document.getElementById('drug-dosage').value = '';
        document.getElementById('drug-freq').value = '';
    });

    window.removeRx = function(name) {
        const idx = rxList.findIndex(x => x.name === name);
        if (idx > -1) rxList.splice(idx, 1);
        renderRxList();
        document.getElementById('interaction-warnings').innerHTML = ''; // clear warnings if regimen changes
    };

    function renderRxList() {
        if (rxList.length === 0) {
            containerRx.innerHTML = `<div style="text-align: center; color: var(--on-surface-variant); font-size: var(--body-sm); padding: var(--space-4);">No drugs added yet.</div>`;
            return;
        }

        containerRx.innerHTML = rxList.map(r => `
            <div style="background: var(--surface-container-high); padding: var(--space-2) var(--space-4); border-radius: var(--radius-sm); display: flex; justify-content: space-between; align-items: center; border-left: 3px solid var(--secondary);">
               <div>
                  <strong style="color: var(--on-surface); font-size: var(--body-md);">${r.name}</strong>
                  <span style="color: var(--outline); font-size: var(--body-sm); margin-left: var(--space-4); font-family: var(--font-label);">${r.dosage} — ${r.treatment}</span>
               </div>
               <button type="button" class="btn btn-tertiary" style="color: var(--error);" onclick="removeRx('${r.name}')">Remove</button>
            </div>
        `).join('');
    }

    // Analyze Interactions
    document.getElementById('btn-analyze').addEventListener('click', async () => {
        if (rxList.length < 2) {
            Toast.info('At least 2 drugs required to analyze interactions.');
            return;
        }

        const names = rxList.map(r => r.name);
        const warnBox = document.getElementById('interaction-warnings');
        
        try {
            warnBox.innerHTML = '<div class="spinner"></div>';
            
            const warnings = await api.post('/clinical/interactions/check', { drug_names: names });
            
            if (warnings.length === 0) {
                warnBox.innerHTML = `
                    <div style="background: rgba(122,232,160,0.1); border: 1px solid rgba(122,232,160,0.3); padding: var(--space-4); border-radius: var(--radius-md); color: var(--success); display: flex; align-items: flex-start; gap: var(--space-3);">
                       <span style="font-size: 1.2rem;">✅</span>
                       <div>
                          <strong style="display: block; margin-bottom: 2px;">No Known Interactions</strong>
                          <span style="font-size: var(--body-sm);">The current drug combination appears safe based on the CMS pharmacology database.</span>
                       </div>
                    </div>`;
            } else {
                warnBox.innerHTML = warnings.map(w => {
                    let levelColor = 'var(--warning)';
                    let levelBg = 'rgba(255,214,102,0.1)';
                    if (w.severity.toLowerCase() === 'major' || w.severity.toLowerCase() === 'severe') {
                        levelColor = 'var(--error)';
                        levelBg = 'rgba(255,110,132,0.1)';
                    }

                    const drugAObj = drugsLookup.find(x => x.id === w.drug_a);
                    const drugBObj = drugsLookup.find(x => x.id === w.drug_b);
                    const nameA = drugAObj ? drugAObj.name : w.drug_a;
                    const nameB = drugBObj ? drugBObj.name : w.drug_b;

                    return `
                    <div style="background: ${levelBg}; border: 1px solid ${levelColor}; padding: var(--space-4); border-radius: var(--radius-md); margin-bottom: var(--space-2);">
                       <div style="font-weight: 700; color: ${levelColor}; margin-bottom: var(--space-1); text-transform: uppercase; font-size: var(--label-sm); font-family: var(--font-label);">${w.severity} INTERACTION</div>
                       <strong style="color: var(--on-surface); font-size: var(--body-md); display: block; margin-bottom: var(--space-2);">${nameA} + ${nameB}</strong>
                       <p style="font-size: var(--body-sm); color: var(--on-surface-variant); margin-bottom: var(--space-2); line-height: 1.5;">${w.description}</p>
                       <div style="font-size: var(--body-sm); color: var(--on-surface); border-top: 1px solid rgba(68,70,78,0.2); padding-top: var(--space-2); font-family: var(--font-label);">
                          <strong>Management:</strong> ${w.management || 'Clinical monitoring required.'}
                       </div>
                    </div>
                    `;
                }).join('');
            }
        } catch (err) {
            console.error(err);
            warnBox.innerHTML = '<span style="color: var(--error);">Analysis failed network check.</span>';
        }
    });

    // Form Submission
    document.getElementById('diagnosis-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const payload = {
            patient_id: activePatientId,
            doctor_id: window.currentDoctorId,
            appointment_id: activeApptId !== 'WALK-IN' ? activeApptId : `walkin-${Date.now()}`,
            diagnosis: document.getElementById('diag-title').value.trim(),
            notes: document.getElementById('diag-notes').value.trim() || "No notes",
            disease_severity: parseInt(document.getElementById('diag-severity').value, 10) || 1,
            prescriptions: rxList.map(r => ({
                treatment: r.name,
                dosage: `${r.dosage} — ${r.treatment}`
            }))
        };

        const btn = document.getElementById('btn-submit');

        try {
            btn.innerHTML = '<span class="spinner" style="width: 14px; height: 14px; border-width: 2px;"></span> Saving...';
            btn.disabled = true;

            const res = await api.post('/clinical/diagnosis', payload);
            
            Toast.success('Diagnosis successfully recorded.');
            
            // Clean up and optionally redirect back to dashboard
            localStorage.removeItem('cms_active_patient');
            localStorage.removeItem('cms_active_appt');
            
            if (activeApptId !== 'WALK-IN') {
                // Try marking appointment as completed automatically
                try {
                    await api.patch(`/appointments/${activeApptId}/status`, { status: 'completed' });
                } catch(ign){}
            }

            setTimeout(() => {
                window.location.href = '/pages/doctor/dashboard.html';
            }, 1500);

        } catch (err) {
            console.error(err);
            if (err.status === 400 && err.detail && err.detail.conflicts) {
                Toast.error('Critical interaction detected! Diagnosis blocked by system.');
                // Auto trigger analyze view
                document.getElementById('btn-analyze').click();
            } else {
                Toast.error(err.detail || 'Failed to submit diagnosis.');
            }
        } finally {
            if (btn.disabled) {
                btn.innerHTML = 'Finalize Diagnosis';
                btn.disabled = false;
            }
        }
    });
});
