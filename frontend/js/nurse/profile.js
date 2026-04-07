/**
 * Nurse Profile Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
    Auth.requireRole('Nurse');
    updateNavAuth();

    const profileForm = document.getElementById('profile-form');
    const securityForm = document.getElementById('security-form');

    const elFname = document.getElementById('fname');
    const elLname = document.getElementById('lname');
    const elLicense = document.getElementById('shift');
    const elEmail = document.getElementById('email');
    const elPhone = document.getElementById('phone');

    // Load Profile
    try {
        const p = await api.get('/portal/nurses/me');
        elFname.value = p.first_name;
        elLname.value = p.last_name;
        elLicense.value = p.license_number || 'N/A';
        elEmail.value = p.email;
        elPhone.value = p.phone || '';
    } catch (err) {
        console.error(err);
        Toast.error('Failed to load profile details.');
    }

    // Save Profile
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-save-profile');
        
        try {
            btn.innerHTML = '<span class="spinner" style="width: 14px; height: 14px; border-width: 2px; border-color: rgba(255,255,255,0.3) white white white;"></span> Saving...';
            btn.disabled = true;

            await api.patch('/portal/nurses/me', {
                phone: elPhone.value
            });

            Toast.success('Contact details updated successfully.');
        } catch (err) {
            Toast.error(err.detail || 'Update failed.');
        } finally {
            btn.innerHTML = 'Save Contact Details';
            btn.disabled = false;
        }
    });

    // Save Password
    securityForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const pwd = document.getElementById('new-pwd').value;
        const confirm = document.getElementById('confirm-pwd').value;
        
        if (pwd !== confirm) {
            Toast.error('Passwords do not match!');
            return;
        }

        const btn = document.getElementById('btn-save-security');
        
        try {
            btn.innerHTML = '<span class="spinner" style="width: 14px; height: 14px; border-width: 2px;"></span> Updating...';
            btn.disabled = true;

            await api.patch('/portal/nurses/me', { password: pwd });
            Toast.success('Password updated successfully. Please login again.');
            
            setTimeout(() => {
                api.logout();
            }, 2000);
        } catch (err) {
            Toast.error(err.detail || 'Password update failed.');
        } finally {
            btn.innerHTML = 'Update Password';
            btn.disabled = false;
            securityForm.reset();
        }
    });
});
