import { auth, signInWithEmailAndPassword, onAuthStateChanged } from "./firebase-config.js";

document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.getElementById('login-form');
    const loginBtn = document.getElementById('login-btn');
    const errorDiv = document.getElementById('login-error');

    // Check if already logged in
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in, redirect to dashboard
            window.location.replace('dashboard.html');
        }
    });

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            errorDiv.classList.add('hidden');
            errorDiv.textContent = '';

            const email = document.getElementById('admin-email').value;
            const password = document.getElementById('admin-password').value;

            // Simple validation
            if (!email || !password) {
                showError('الرجاء إدخال البريد الإلكتروني وكلمة المرور');
                return;
            }

            // Update UI
            const originalBtnText = loginBtn.innerHTML;
            loginBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> جاري الدخول...';
            loginBtn.disabled = true;

            try {
                await signInWithEmailAndPassword(auth, email, password);
                // Success! onAuthStateChanged will handle the redirect
            } catch (error) {
                console.error('Login error:', error);
                let errorMsg = 'فشل تسجيل الدخول. تأكد من صحة البيانات.';

                if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                    errorMsg = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
                } else if (error.code === 'auth/too-many-requests') {
                    errorMsg = 'حاولت تسجيل الدخول مرات عديدة. يرجى المحاولة لاحقاً.';
                }

                showError(errorMsg);
                loginBtn.innerHTML = originalBtnText;
                loginBtn.disabled = false;
            }
        });
    }

    function showError(msg) {
        errorDiv.textContent = msg;
        errorDiv.classList.remove('hidden');
    }
});
