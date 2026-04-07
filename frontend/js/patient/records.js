/**
 * Patient Records Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
    Auth.requireRole('Patient');
    updateNavAuth();

    const recordsContainer = document.getElementById('records-container');

    try {
        const records = await api.get('/portal/patients/me/records');
        if (records.length === 0) {
            recordsContainer.innerHTML = `<div style="text-align: center; color: var(--on-surface-variant); padding: var(--space-8);">No medical records found.</div>`;
            return;
        }

        recordsContainer.innerHTML = records.map(r => {
            const dt = new Date(r.created_at).toLocaleString([], {year:'numeric', month:'long', day:'numeric'});
            
            // Build prescriptions table if any
            let pxHtml = '';
            if (r.prescriptions && r.prescriptions.length > 0) {
                const pxRows = r.prescriptions.map(px => `
                    <tr>
                        <td style="font-weight: 600;">${px.drug_name}</td>
                        <td style="font-family: var(--font-label);">${px.dosage}</td>
                        <td style="font-family: var(--font-label);">${px.frequency}</td>
                    </tr>
                `).join('');
                
                pxHtml = `
                    <div style="margin-top: var(--space-4); background: rgba(12,14,18,0.5); border-radius: var(--radius-md); padding: var(--space-4);">
                        <h4 style="font-family: var(--font-label); color: var(--secondary); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: var(--space-3); font-size: var(--label-sm);">Prescriptions</h4>
                        <table class="data-table" style="background: transparent;">
                            <thead>
                                <tr><th>Drug</th><th>Dosage</th><th>Frequency / Details</th></tr>
                            </thead>
                            <tbody>${pxRows}</tbody>
                        </table>
                    </div>
                `;
            }

            return `
                <div class="card" style="border: 1px solid rgba(68,70,78,0.15);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-4);">
                        <div>
                            <div style="font-family: var(--font-label); font-weight: 500; color: var(--outline); font-size: var(--body-sm); margin-bottom: var(--space-1);">${dt}</div>
                            <h3 style="font-size: var(--title-lg); font-weight: 700;">${r.diagnosis || 'Undiagnosed'}</h3>
                        </div>
                        <div class="badge badge--secondary">${r.doctor_name || 'N/A'}</div>
                    </div>
                    
                    <div style="color: var(--on-surface-variant); font-size: var(--body-md); line-height: 1.6; margin-bottom: var(--space-4);">
                        <strong style="color: var(--on-surface);">Notes/Treatment Plan:</strong><br>
                        ${r.treatment_plan || 'No detailed notes provided.'}
                    </div>
                    
                    ${pxHtml}
                </div>
            `;
        }).join('');
        
    } catch (err) {
        console.error(err);
        recordsContainer.innerHTML = `<div style="text-align: center; color: var(--error); padding: var(--space-8);">Failed to load medical records.</div>`;
    }
});
