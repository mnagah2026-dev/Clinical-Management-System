/**
 * Doctor Profile Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
    Auth.requireRole('Doctor');
    updateNavAuth();

    const profileForm = document.getElementById('profile-form');
    const securityForm = document.getElementById('security-form');

    // Make inputs reactive for fetching
    const elFname = document.getElementById('fname');
    const elLname = document.getElementById('lname');
    const elSpec = document.getElementById('spec_id');
    const elLicense = document.getElementById('license');
    const elEmail = document.getElementById('email');
    const elPhone = document.getElementById('phone');

    // Load Profile
    try {
        const p = await api.get('/portal/doctors/me');
        elFname.value = p.first_name;
        elLname.value = p.last_name;
        elSpec.value = p.specialization_name || '';
        elLicense.value = p.license_number || '';
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
            btn.innerHTML = '<span class="spinner" style="width: 14px; height: 14px; border-width: 2px;"></span> Saving...';
            btn.disabled = true;

            await api.patch('/portal/doctors/me', {
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

            await api.patch('/portal/doctors/me', { password: pwd });
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
