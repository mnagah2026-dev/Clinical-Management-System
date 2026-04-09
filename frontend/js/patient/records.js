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
            recordsContainer.textContent = '';
            const msg = document.createElement('div');
            msg.style.cssText = 'text-align: center; color: var(--on-surface-variant); padding: var(--space-8);';
            msg.textContent = 'No medical records found.';
            recordsContainer.appendChild(msg);
            return;
        }

        recordsContainer.textContent = '';
        records.forEach(r => {
            const dt = new Date(r.created_at).toLocaleString([], {year:'numeric', month:'long', day:'numeric'});
            
            const card = document.createElement('div');
            card.className = 'card';
            card.style.border = '1px solid rgba(68,70,78,0.15)';
            
            const headDiv = document.createElement('div');
            headDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-4);';
            
            const infoDiv = document.createElement('div');
            const dtDiv = document.createElement('div');
            dtDiv.style.cssText = 'font-family: var(--font-label); font-weight: 500; color: var(--outline); font-size: var(--body-sm); margin-bottom: var(--space-1);';
            dtDiv.textContent = dt;
            const h3 = document.createElement('h3');
            h3.style.cssText = 'font-size: var(--title-lg); font-weight: 700;';
            h3.textContent = r.diagnosis || 'Undiagnosed';
            infoDiv.append(dtDiv, h3);
            
            const docBadge = document.createElement('div');
            docBadge.className = 'badge badge--secondary';
            docBadge.textContent = r.doctor_name || 'N/A';
            
            headDiv.append(infoDiv, docBadge);
            
            const notesDiv = document.createElement('div');
            notesDiv.style.cssText = 'color: var(--on-surface-variant); font-size: var(--body-md); line-height: 1.6; margin-bottom: var(--space-4);';
            const strongStr = document.createElement('strong');
            strongStr.style.color = 'var(--on-surface)';
            strongStr.textContent = 'Notes/Treatment Plan:';
            notesDiv.appendChild(strongStr);
            notesDiv.appendChild(document.createElement('br'));
            notesDiv.appendChild(document.createTextNode(r.treatment_plan || 'No detailed notes provided.'));
            
            card.append(headDiv, notesDiv);
            
            if (r.prescriptions && r.prescriptions.length > 0) {
                const pxDiv = document.createElement('div');
                pxDiv.style.cssText = 'margin-top: var(--space-4); background: rgba(12,14,18,0.5); border-radius: var(--radius-md); padding: var(--space-4);';
                
                const h4 = document.createElement('h4');
                h4.style.cssText = 'font-family: var(--font-label); color: var(--secondary); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: var(--space-3); font-size: var(--label-sm);';
                h4.textContent = 'Prescriptions';
                pxDiv.appendChild(h4);
                
                const table = document.createElement('table');
                table.className = 'data-table';
                table.style.background = 'transparent';
                
                const thead = document.createElement('thead');
                const headTr = document.createElement('tr');
                ['Drug', 'Dosage', 'Frequency / Details'].forEach(t => {
                    const th = document.createElement('th');
                    th.textContent = t;
                    headTr.appendChild(th);
                });
                thead.appendChild(headTr);
                table.appendChild(thead);
                
                const tbody = document.createElement('tbody');
                r.prescriptions.forEach(px => {
                    const tr = document.createElement('tr');
                    const td1 = document.createElement('td');
                    td1.style.fontWeight = '600';
                    td1.textContent = px.drug_name;
                    const td2 = document.createElement('td');
                    td2.style.fontFamily = 'var(--font-label)';
                    td2.textContent = px.dosage;
                    const td3 = document.createElement('td');
                    td3.style.fontFamily = 'var(--font-label)';
                    td3.textContent = px.frequency;
                    tr.append(td1, td2, td3);
                    tbody.appendChild(tr);
                });
                table.appendChild(tbody);
                pxDiv.appendChild(table);
                card.appendChild(pxDiv);
            }
            recordsContainer.appendChild(card);
        });
        
    } catch (err) {
        console.error(err);
        recordsContainer.textContent = '';
        const md = document.createElement('div');
        md.style.cssText = 'text-align: center; color: var(--error); padding: var(--space-8);';
        md.textContent = 'Failed to load medical records.';
        recordsContainer.appendChild(md);
    }
});
