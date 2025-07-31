document.addEventListener('DOMContentLoaded', () => {
    const API_URL = "http://localhost:3001/api";

    // --- Views ---
    const loginView = document.getElementById('login-view');
    const setupAccountView = document.getElementById('setup-account-view');
    const forgotPasswordView = document.getElementById('forgot-password-view');
    const resetPasswordView = document.getElementById('reset-password-view');
    const allViews = [loginView, setupAccountView, forgotPasswordView, resetPasswordView];

    // --- Forms ---
    const loginForm = document.getElementById('login-form');
    const setupAccountForm = document.getElementById('setup-account-form');
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const resetPasswordForm = document.getElementById('reset-password-form');

    // --- Links to switch views ---
    const showSetupLink = document.getElementById('show-setup-account');
    const showForgotPasswordLink = document.getElementById('show-forgot-password');
    const showLoginLinks = document.querySelectorAll('.show-login');

    // --- Message Elements ---
    const loginErrorEl = document.getElementById('login-error');
    const setupMessageEl = document.getElementById('setup-account-message');
    const forgotMessageEl = document.getElementById('forgot-message');
    const resetMessageEl = document.getElementById('reset-message');

    // --- View Switching Logic ---
    const switchView = (viewId) => {
        allViews.forEach(view => {
            if (view) {
                view.style.display = view.id === viewId ? 'block' : 'none';
            }
        });
    };

    if(showSetupLink) showSetupLink.addEventListener('click', (e) => { e.preventDefault(); switchView('setup-account-view'); });
    if(showForgotPasswordLink) showForgotPasswordLink.addEventListener('click', (e) => { e.preventDefault(); switchView('forgot-password-view'); });
    showLoginLinks.forEach(link => {
        link.addEventListener('click', (e) => { e.preventDefault(); switchView('login-view'); });
    });

    // --- Login Form Submission ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            loginErrorEl.textContent = '';
            const formData = new FormData(loginForm);
            const data = Object.fromEntries(formData.entries());

            try {
                const response = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);

                localStorage.setItem('accessToken', result.accessToken);
                localStorage.setItem('userRole', result.role);
                localStorage.setItem('fullName', result.fullName);
                localStorage.setItem('scholarNumber', result.scholar_number);
                localStorage.setItem('userId', result.id);

                if (result.role === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'index.html';
                }
            } catch (error) {
                loginErrorEl.textContent = error.message;
            }
        });
    }

    // --- Setup Account Form Submission ---
    if (setupAccountForm) {
        setupAccountForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            setupMessageEl.textContent = '';
            setupMessageEl.style.color = 'red';
            const formData = new FormData(setupAccountForm);
            const data = Object.fromEntries(formData.entries());
            try {
                const response = await fetch(`${API_URL}/auth/setup-account`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                setupMessageEl.textContent = result.message;
                setupMessageEl.style.color = 'green';
                setupAccountForm.reset();
            } catch (error) {
                setupMessageEl.textContent = error.message;
            }
        });
    }

    // --- Forgot Password Form Submission ---
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            forgotMessageEl.textContent = '';
            const email = forgotPasswordForm.email.value;

            try {
                const response = await fetch(`${API_URL}/auth/forgot-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);

                forgotMessageEl.textContent = result.message;
                forgotMessageEl.style.color = 'green';
                switchView('reset-password-view');
            } catch (error) {
                forgotMessageEl.textContent = error.message;
                forgotMessageEl.style.color = 'red';
            }
        });
    }

    // --- Reset Password Form Submission ---
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            resetMessageEl.textContent = '';
            const email = forgotPasswordForm.email.value;
            const otp = resetPasswordForm.otp.value;
            const newPassword = resetPasswordForm.newPassword.value;

            try {
                const response = await fetch(`${API_URL}/auth/reset-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, otp, newPassword }),
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);

                resetMessageEl.textContent = result.message + " Redirecting to login...";
                resetMessageEl.style.color = 'green';
                
                setTimeout(() => {
                    switchView('login-view');
                    resetPasswordForm.reset();
                    forgotPasswordForm.reset();
                }, 2000);

            } catch (error) {
                resetMessageEl.textContent = error.message;
                resetMessageEl.style.color = 'red';
            }
        });
    }
});
