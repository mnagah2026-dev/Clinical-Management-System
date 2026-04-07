/**
 * Nurse Vitals Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
    Auth.requireRole('Nurse');
    updateNavAuth();

    const activePatientId = localStorage.getItem('cms_active_patient_vitals');
    const wrapperTarget = document.getElementById('vitals-form-wrapper');
    const wrapperNone = document.getElementById('no-patient-alert');

    if (!activePatientId) {
        wrapperTarget.classList.add('hidden');
        wrapperNone.style.display = 'block';
        return;
    }

    let nurseId = null;

    // Prefetch Nurse Profile + Patient Data
    try {
        const [nurseProfile, patients] = await Promise.all([
            api.get('/portal/nurses/me'),
            api.get(`/portal/patients/search?q=${activePatientId}`)
        ]);
        
        nurseId = nurseProfile.id;

        const p = patients.find(x => x.id === activePatientId);
        if (p) {
            document.getElementById('active-patient-name').textContent = `${p.first_name} ${p.last_name}`;
            document.getElementById('active-patient-id').textContent = activePatientId;
            
            // Helpful: Pre-fill height and weight if they exist from past vitals
            try {
                const pastVitals = await api.get(`/portal/patients/${activePatientId}/vitals`);
                if (pastVitals && pastVitals.length > 0) {
                    const last = pastVitals[0];
                    if (last.height) document.getElementById('v-height').value = last.height;
                    // weight can change, but prefill might be nice. Leaving blank to force recording.
                }
            } catch(ign){}
        }
    } catch (e) {
        console.error(e);
        document.getElementById('active-patient-name').textContent = activePatientId;
    }

    // Submit
    document.getElementById('vitals-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!nurseId) {
            Toast.error('Nurse profile not fully loaded. Please refresh.');
            return;
        }

        const payload = {
            patient_id: activePatientId,
            nurse_id: nurseId,
            weight: parseFloat(document.getElementById('v-weight').value),
            height: parseFloat(document.getElementById('v-height').value),
            blood_pressure_systolic: parseInt(document.getElementById('v-sys').value),
            blood_pressure_diastolic: parseInt(document.getElementById('v-dia').value),
            blood_sugar: parseInt(document.getElementById('v-bg').value),
            temperature: parseFloat(document.getElementById('v-temp').value),
            measured_at: new Date().toISOString(),
            notes: document.getElementById('v-notes').value.trim() || null
        };

        const btn = document.getElementById('btn-submit');

        try {
            btn.innerHTML = '<span class="spinner" style="width: 14px; height: 14px; border-width: 2px;"></span> Saving...';
            btn.disabled = true;

            await api.post('/clinical/vitals', payload);
            
            Toast.success('Vital signs recorded successfully.');
            
            localStorage.removeItem('cms_active_patient_vitals');
            
            setTimeout(() => {
                window.location.href = '/pages/nurse/dashboard.html';
            }, 1000);

        } catch (err) {
            console.error(err);
            Toast.error(err.detail || 'Failed to submit vitals.');
            btn.innerHTML = 'Submit Measurements';
            btn.disabled = false;
        }
    });
});
