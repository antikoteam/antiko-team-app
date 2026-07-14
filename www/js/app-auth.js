import { db, auth, googleProvider, GoogleAuthProvider, signInWithCredential, signInWithPopup, getRedirectResult, collection, getDocs, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "./firebase-config.js";
import { state } from "./app-state.js";
import { setupUserNotifications } from "./notifications.js";

// Load elements on demand or inside handlers
const getElements = () => ({
    navLoginBtn: document.getElementById('nav-login-btn'),
    navDashboardBtn: document.getElementById('nav-dashboard-btn'),
    navAccountBtn: document.getElementById('nav-account-btn'),
    loginModal: document.getElementById('login-modal'),
    loginForm: document.getElementById('login-form'),
    loginBtn: document.getElementById('login-submit-btn'),
    errorDiv: document.getElementById('login-error'),
    accountModal: document.getElementById('account-modal'),
    accountEmail: document.getElementById('account-email'),
    modalLogoutBtn: document.getElementById('modal-logout-btn'),
    privacyModal: document.getElementById('privacy-policy-modal'),
    privacyNextBtn: document.getElementById('privacy-next-btn'),
    privacyCancelBtn: document.getElementById('privacy-cancel-btn'),
    agreeContainer: document.getElementById('agree-container'),
    agreeCheckbox: document.getElementById('agree-checkbox'),
    modalDashBtn: document.getElementById('modal-dashboard-btn'),
    bottomNavAccount: document.getElementById('bottom-nav-account')
});

let hasAgreed = false;

export const openPrivacyModal = () => {
    const els = getElements();
    if (!els.privacyModal) {
        window.location.href = 'index.html?showLogin=1';
        return;
    }
    els.privacyModal.classList.remove('hidden');
    hasAgreed = false;
    
    if (els.agreeCheckbox && els.agreeCheckbox.querySelector('i')) {
        els.agreeCheckbox.querySelector('i').classList.add('hidden');
    }
    
    if (els.privacyNextBtn) {
        els.privacyNextBtn.classList.add('disabled');
        els.privacyNextBtn.style.opacity = '0.5';
        els.privacyNextBtn.style.pointerEvents = 'none';
        els.privacyNextBtn.style.filter = 'grayscale(1)';
    }
};

export function checkAdminStatus(user) {
    if (!user) return;
    const els = getElements();
    const homeDashboardCard = document.getElementById('open-dashboard');
    const userEmailLower = (user.email || "").toLowerCase();
    const isAdmin = state.adminEmails.includes(userEmailLower);

    console.log("Checking admin status for:", userEmailLower, "Result:", isAdmin);

    if (isAdmin) {
        if (els.navDashboardBtn) els.navDashboardBtn.classList.remove('hidden');
        if (els.modalDashBtn) els.modalDashBtn.classList.remove('hidden');
        if (homeDashboardCard) homeDashboardCard.classList.remove('hidden');
        if (typeof window.setupOrderListener === 'function') {
            window.setupOrderListener(true);
        }
    } else {
        if (els.navDashboardBtn) els.navDashboardBtn.classList.add('hidden');
        if (els.modalDashBtn) els.modalDashBtn.classList.add('hidden');
        if (homeDashboardCard) homeDashboardCard.classList.add('hidden');
    }
}

export async function loadDynamicAdmins() {
    try {
        const snap = await getDocs(collection(db, "admins"));
        const dynamicList = snap.docs.map(doc => doc.data().email.toLowerCase());
        state.adminEmails = [...new Set([...state.adminEmails, ...dynamicList])];
        console.log("Admins loaded:", state.adminEmails);

        if (auth.currentUser) {
            checkAdminStatus(auth.currentUser);
        }
    } catch (e) {
        console.error("Error loading dynamic admins:", e);
    }
}

function showError(msg) {
    const els = getElements();
    if (!els.errorDiv) return;
    els.errorDiv.textContent = msg;
    els.errorDiv.classList.remove('hidden');
}

// Initialise auth-related listeners
const initAuthListeners = () => {
    const els = getElements();

    if (els.agreeContainer) {
        els.agreeContainer.onclick = () => {
            hasAgreed = !hasAgreed;
            const checkIcon = els.agreeCheckbox.querySelector('i');
            if (hasAgreed) {
                if (checkIcon) checkIcon.classList.remove('hidden');
                els.privacyNextBtn.classList.remove('disabled');
                els.privacyNextBtn.style.opacity = '1';
                els.privacyNextBtn.style.pointerEvents = 'auto';
                els.privacyNextBtn.style.filter = 'none';
                if (typeof window.playSound === 'function') window.playSound('nav');
            } else {
                if (checkIcon) checkIcon.classList.add('hidden');
                els.privacyNextBtn.classList.add('disabled');
                els.privacyNextBtn.style.opacity = '0.5';
                els.privacyNextBtn.style.pointerEvents = 'none';
                els.privacyNextBtn.style.filter = 'grayscale(1)';
            }
        };
    }

    if (els.privacyNextBtn) {
        els.privacyNextBtn.onclick = () => {
            if (hasAgreed) {
                els.privacyModal.classList.add('hidden');
                els.loginModal.classList.remove('hidden');
                if (typeof window.playSound === 'function') window.playSound('menu');
            }
        };
    }

    if (els.privacyCancelBtn) {
        els.privacyCancelBtn.onclick = () => {
            els.privacyModal.classList.add('hidden');
            if (typeof window.playSound === 'function') window.playSound('back');
        };
    }

    onAuthStateChanged(auth, (user) => {
        const els = getElements();
        if (user) {
            state.currentUser = user;
            checkAdminStatus(user);
            setupUserNotifications(user);

            if (els.navLoginBtn) els.navLoginBtn.classList.add('hidden');
            if (els.navAccountBtn) els.navAccountBtn.classList.remove('hidden');
            if (typeof window.closeModal === 'function') window.closeModal('login-modal');
            else if (els.loginModal) els.loginModal.classList.add('hidden');

            if (els.bottomNavAccount) {
                els.bottomNavAccount.querySelector('i').className = 'ph-fill ph-user-circle';
            }
        } else {
            state.currentUser = null;
            if (els.navLoginBtn) els.navLoginBtn.classList.remove('hidden');
            if (els.navDashboardBtn) els.navDashboardBtn.classList.add('hidden');
            if (els.navAccountBtn) els.navAccountBtn.classList.add('hidden');
            if (els.modalDashBtn) els.modalDashBtn.classList.add('hidden');

            const homeDashboardCard = document.getElementById('open-dashboard');
            if (homeDashboardCard) homeDashboardCard.classList.add('hidden');

            if (els.bottomNavAccount) {
                els.bottomNavAccount.querySelector('i').className = 'ph-fill ph-user-circle';
            }
        }
    });

    if (els.navLoginBtn) {
        els.navLoginBtn.addEventListener('click', () => {
            openPrivacyModal();
        });
    }

    if (els.navDashboardBtn) {
        els.navDashboardBtn.addEventListener('click', () => {
            window.location.href = 'dashboard.html';
        });
    }

    if (els.navAccountBtn) {
        els.navAccountBtn.addEventListener('click', () => {
            if (state.currentUser && els.accountEmail) {
                els.accountEmail.textContent = state.currentUser.email;
            }
            if (els.accountModal) els.accountModal.classList.remove('hidden');
        });
    }

    if (els.modalLogoutBtn) {
        els.modalLogoutBtn.addEventListener('click', async () => {
            sessionStorage.setItem('antiko_signed_out', 'true');
            try {
                if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
                    if (window.Capacitor.Plugins && window.Capacitor.Plugins.FirebaseAuthentication) {
                        await window.Capacitor.Plugins.FirebaseAuthentication.signOut();
                    }
                }
                await signOut(auth);
                els.accountModal.classList.add('hidden');
                if (typeof window.showToast === 'function') window.showToast("تم تسجيل الخروج بنجاح");
            } catch (e) {
                console.error('Logout error:', e);
                signOut(auth).catch(() => {});
                els.accountModal.classList.add('hidden');
            }
        });
    }

    if (els.modalDashBtn) {
        els.modalDashBtn.addEventListener('click', () => {
            window.location.href = 'dashboard.html';
        });
    }

    // Toggle Login/Register Mode
    let authMode = 'login';
    const authToggleBtn = document.getElementById('auth-toggle-btn');
    const authModalTitle = document.getElementById('auth-modal-title');
    const authModalSubtitle = document.getElementById('auth-modal-subtitle');
    const authSubmitText = document.getElementById('auth-submit-text');
    const authToggleMsg = document.getElementById('auth-toggle-msg');

    if (authToggleBtn) {
        authToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            authMode = (authMode === 'login') ? 'register' : 'login';

            if (authMode === 'register') {
                authModalTitle.textContent = "إنشاء حساب جديد";
                authModalSubtitle.textContent = "انضم إلينا الآن واستمتع بخدماتنا";
                authSubmitText.textContent = "تسجيل الحساب";
                authToggleMsg.textContent = "لديك حساب بالفعل؟";
                authToggleBtn.textContent = "تسجيل الدخول";
            } else {
                authModalTitle.textContent = "تسجيل الدخول";
                authModalSubtitle.textContent = "أدخل بياناتك للوصول لحسابك";
                authSubmitText.textContent = "دخول النظام";
                authToggleMsg.textContent = "ليس لديك حساب؟";
                authToggleBtn.textContent = "إنشاء حساب";
            }
        });
    }

    // Google Sign-In Event
    const googleLoginBtn = document.getElementById('google-login-btn');
    if (googleLoginBtn) {
        googleLoginBtn.onclick = async () => {
            if (googleLoginBtn.disabled) return;

            const originalText = googleLoginBtn.innerHTML;
            googleLoginBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> جاري تسجيل الدخول...';
            googleLoginBtn.disabled = true;

            // ✅ استخدام Capacitor.isNativePlatform() الصحيح
            const isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

            try {
                if (isNative && window.Capacitor.Plugins && window.Capacitor.Plugins.FirebaseAuthentication) {
                    // useCredentialManager: false يجبر استخدام Google Sign-In القديم بدل Credential Manager
                    const signInPromise = window.Capacitor.Plugins.FirebaseAuthentication.signInWithGoogle({
                        skipNativeAuth: true,
                        useCredentialManager: false
                    });
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('TIMEOUT')), 60000)
                    );
                    const result = await Promise.race([signInPromise, timeoutPromise]);

                    if (result && result.credential && result.credential.idToken) {
                        const credential = GoogleAuthProvider.credential(result.credential.idToken);
                        await signInWithCredential(auth, credential);
                        const currentEls = getElements();
                        if (currentEls.loginModal) currentEls.loginModal.classList.add('hidden');
                        if (typeof window.showToast === 'function') window.showToast("تم تسجيل الدخول بنجاح");
                    } else {
                        throw new Error('NO_CREDENTIAL');
                    }
                } else {
                    // web: استخدام popup
                    await signInWithPopup(auth, googleProvider);
                    const currentEls = getElements();
                    if (currentEls.loginModal) currentEls.loginModal.classList.add('hidden');
                    if (typeof window.showToast === 'function') window.showToast("تم تسجيل الدخول بنجاح");
                }
            } catch (error) {
                console.error("Google login error:", error);
                const errorStr = String(error.message || error.code || error || '').toLowerCase();
                const isCancelled = error.code === 'auth/popup-closed-by-user' ||
                    errorStr.includes('cancel') ||
                    errorStr.includes('user_cancel') ||
                    errorStr.includes('sign_in_cancelled') ||
                    errorStr.includes('popup-closed') ||
                    errorStr.includes('12501') ||
                    errorStr.includes('closed-by-user');

                if (!isCancelled) {
                    let errorMsg = "حدث خطأ أثناء تسجيل الدخول بجوجل";
                    if (errorStr.includes('timeout')) {
                        errorMsg = "انتهت مهلة تسجيل الدخول، حاول مجدداً.";
                    } else if (errorStr.includes('not_initialized') || errorStr.includes('not initialized')) {
                        errorMsg = "مشكلة في إعدادات النظام. يرجى مراجعة المدير.";
                    } else if (errorStr.includes('network')) {
                        errorMsg = "خطأ في الاتصال. يرجى التحقق من الإنترنت.";
                    }
                    showError(errorMsg);
                    if (typeof window.showToast === 'function') window.showToast(errorMsg, 'error');
                }
            } finally {
                // ✅ الزر يرجع دايماً حتى لو cancel
                googleLoginBtn.innerHTML = originalText;
                googleLoginBtn.disabled = false;
            }
        };
    }

    if (els.loginForm) {
        els.loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            showError('');
            if (els.errorDiv) els.errorDiv.classList.add('hidden');

            const email = document.getElementById('admin-email').value;
            const password = document.getElementById('admin-password').value;

            if (!email || !password) {
                showError('الرجاء إدخال البريد الإلكتروني وكلمة المرور');
                return;
            }

            const originalBtnText = els.loginBtn.innerHTML;
            els.loginBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> جاري تسجيل الدخول...';
            els.loginBtn.disabled = true;

            try {
                if (authMode === 'login') {
                    await signInWithEmailAndPassword(auth, email, password);
                } else {
                    await createUserWithEmailAndPassword(auth, email, password);
                }
                els.loginForm.reset();
                authMode = 'login';
            } catch (error) {
                console.error('Auth error:', error.code, error.message);

                if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                    showError('بيانات الدخول غير صحيحة.');
                } else if (error.code === 'auth/email-already-in-use') {
                    showError('هذا البريد مسجل بالفعل، يرجى تسجيل الدخول.');
                } else if (error.code === 'auth/weak-password') {
                    showError('كلمة المرور ضعيفة جداً.');
                } else if (error.code === 'auth/user-not-found') {
                    showError('الحساب غير موجود، يرجى إنشاء حساب أولاً.');
                } else {
                    showError('خطأ: ' + error.message);
                }
            } finally {
                els.loginBtn.innerHTML = originalBtnText;
                els.loginBtn.disabled = false;
            }
        });
    }
};

// Bind elements and trigger load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initAuthListeners();
        loadDynamicAdmins();
    });
} else {
    initAuthListeners();
    loadDynamicAdmins();
}

// Redirect checks
getRedirectResult(auth).then((result) => {
    if (result && result.user) {
        const wasSignedOut = sessionStorage.getItem('antiko_signed_out');
        if (wasSignedOut === 'true') {
            sessionStorage.removeItem('antiko_signed_out');
            signOut(auth).catch(() => {});
            return;
        }
        const els = getElements();
        if (els.loginModal) els.loginModal.classList.add('hidden');
        if (typeof window.showToast === 'function') window.showToast("تم تسجيل الدخول بنجاح ✅");
    }
}).catch((error) => {
    console.error("Redirect Error:", error);
});

// Auto-open login helper parameter on load
if (new URLSearchParams(window.location.search).get('showLogin') === '1') {
    setTimeout(() => openPrivacyModal(), 800);
}

// Expose globals for window actions
window.openPrivacyModal = openPrivacyModal;
window.handleBottomNavAccount = function() {
    const els = getElements();
    if (els.bottomNavAccount) {
        const navItems = document.querySelectorAll('.mobile-bottom-nav .bottom-nav-item');
        let activeIndex = -1;
        navItems.forEach((item, idx) => {
            if (item.classList.contains('active') && item !== els.bottomNavAccount) {
                activeIndex = idx;
            }
        });
        window._prevActiveBottomNavIndex = activeIndex;

        navItems.forEach(item => item.classList.remove('active'));
        els.bottomNavAccount.classList.add('active');
    }
    if (state.currentUser) {
        if (els.accountEmail) els.accountEmail.textContent = state.currentUser.email;
        if (els.accountModal) els.accountModal.classList.remove('hidden');
    } else {
        openPrivacyModal();
    }
};
