/**
 * Patient Profile Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
    Auth.requireRole('Patient');
    updateNavAuth();

    const profileForm = document.getElementById('profile-form');
    const securityForm = document.getElementById('security-form');

    // Make inputs reactive for fetching
    const elFname = document.getElementById('fname');
    const elLname = document.getElementById('lname');
    const elDob = document.getElementById('dob');
    const elGender = document.getElementById('gender');
    const elEmail = document.getElementById('email');
    const elPhone = document.getElementById('phone');
    const elAddress = document.getElementById('address');

    // Load Profile
    try {
        const p = await api.get('/portal/patients/me');
        elFname.value = p.first_name;
        elLname.value = p.last_name;
        elDob.value = p.date_of_birth;
        elGender.value = p.gender;
        elEmail.value = p.email;
        elPhone.value = p.phone || '';
        elAddress.value = p.address || '';
    } catch (err) {
        console.error(err);
        Toast.error('Failed to load profile.');
    }

    // Save Profile
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-save-profile');
        
        try {
            btn.innerHTML = '<span class="spinner" style="width: 14px; height: 14px; border-width: 2px;"></span> Saving...';
            btn.disabled = true;

            await api.patch('/portal/patients/me', {
                phone: elPhone.value,
                address: elAddress.value
            });

            Toast.success('Profile updated successfully.');
        } catch (err) {
            Toast.error(err.detail || 'Update failed.');
        } finally {
            btn.innerHTML = 'Save Changes';
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

            await api.patch('/portal/patients/me', { password: pwd });
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
