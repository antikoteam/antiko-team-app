import { db, auth, googleProvider, GoogleAuthProvider, signInWithCredential, signInWithPopup, signInWithRedirect, getRedirectResult, collection, getDocs, getDoc, doc, addDoc, query, where, orderBy, onSnapshot, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "./firebase-config.js";

document.addEventListener('DOMContentLoaded', async () => {

    // elements
    const loader = document.getElementById('loader');
    const appContent = document.getElementById('app-content');

    // Safety Fallback: Force hide loader after 6 seconds no matter what
    setTimeout(() => {
        if (loader && !loader.classList.contains('hidden')) {
            console.warn("Loading taking too long, forcing hide loader.");
            loader.classList.add('hidden');
            if (appContent) appContent.classList.remove('hidden');
        }
    }, 6000);

    const heroTopText = document.getElementById('hero-top-text');
    const heroTitle = document.getElementById('hero-title');
    const heroSubtitle = document.getElementById('hero-subtitle');
    const servicesGrid = document.getElementById('services-grid');
    const servicesSection = document.getElementById('services-section');

    // Admin Auth Elements
    const navLoginBtn = document.getElementById('nav-login-btn');
    const navDashboardBtn = document.getElementById('nav-dashboard-btn');
    const navAccountBtn = document.getElementById('nav-account-btn');

    const loginModal = document.getElementById('login-modal');
    const loginForm = document.getElementById('login-form');
    const loginBtn = document.getElementById('login-submit-btn');
    const errorDiv = document.getElementById('login-error');

    const accountModal = document.getElementById('account-modal');
    const accountEmail = document.getElementById('account-email');
    const modalLogoutBtn = document.getElementById('modal-logout-btn');

    const mainView = document.getElementById('main-view');
    const dashboardView = document.getElementById('dashboard-view');

    // Privacy Policy Elements
    const privacyModal = document.getElementById('privacy-policy-modal');
    const privacyNextBtn = document.getElementById('privacy-next-btn');
    const privacyCancelBtn = document.getElementById('privacy-cancel-btn');
    const agreeContainer = document.getElementById('agree-container');
    const agreeCheckbox = document.getElementById('agree-checkbox');
    let hasAgreed = false;

    const openPrivacyModal = () => {
        privacyModal.classList.remove('hidden');
        // Reset agreement
        hasAgreed = false;
        if (agreeCheckbox && agreeCheckbox.querySelector('i')) {
            agreeCheckbox.querySelector('i').classList.add('hidden');
        }
        if (privacyNextBtn) {
            privacyNextBtn.classList.add('disabled');
            privacyNextBtn.style.opacity = '0.5';
            privacyNextBtn.style.pointerEvents = 'none';
            privacyNextBtn.style.filter = 'grayscale(1)';
        }
    };

    if (agreeContainer) {
        agreeContainer.onclick = () => {
            hasAgreed = !hasAgreed;
            const checkIcon = agreeCheckbox.querySelector('i');
            if (hasAgreed) {
                if (checkIcon) checkIcon.classList.remove('hidden');
                privacyNextBtn.classList.remove('disabled');
                privacyNextBtn.style.opacity = '1';
                privacyNextBtn.style.pointerEvents = 'auto';
                privacyNextBtn.style.filter = 'none';
                if (typeof playSound === 'function') playSound('nav');
            } else {
                if (checkIcon) checkIcon.classList.add('hidden');
                privacyNextBtn.classList.add('disabled');
                privacyNextBtn.style.opacity = '0.5';
                privacyNextBtn.style.pointerEvents = 'none';
                privacyNextBtn.style.filter = 'grayscale(1)';
            }
        };
    }

    if (privacyNextBtn) {
        privacyNextBtn.onclick = () => {
            if (hasAgreed) {
                privacyModal.classList.add('hidden');
                loginModal.classList.remove('hidden');
                if (typeof playSound === 'function') playSound('menu');
            }
        };
    }

    if (privacyCancelBtn) {
        privacyCancelBtn.onclick = () => {
            privacyModal.classList.add('hidden');
            if (typeof playSound === 'function') playSound('back');
        };
    }

    const adminEmails = [
        "kareem.abdullatif.official@gmail.com",
        "omaranter.abdallah@gmail.com",
        "antiko.cb40b@gmail.com",
        "admin257@gmail.com",
        "kareem9989193@gmail.com"
    ];

    // ==========================================
    // AUTHENTICATION LOGIC
    // ==========================================
    let currentUser = null;
    let selectedGameOrder = { game: null, option: null };
    let adminWhatsApp = ""; // Global to store admin phone

    // --- Auto Update Logic ---
    let currentVersion = localStorage.getItem('site_version') || '0';
    async function checkForUpdates() {
        try {
            const response = await fetch('/version.txt?t=' + Date.now());
            if (response.ok) {
                const newVersion = (await response.text()).trim();
                // If version changed, clear cache and reload
                if (currentVersion !== '0' && currentVersion !== newVersion) {
                    console.log('New update found! Reloading...');
                    localStorage.setItem('site_version', newVersion);
                    window.location.reload(true); // Forced reload
                } else if (currentVersion === '0') {
                    // First time save version
                    localStorage.setItem('site_version', newVersion);
                }
            }
        } catch (e) { console.warn('Update check failed', e); }
    }
    // Check every 3 minutes
    setInterval(checkForUpdates, 180000);
    checkForUpdates(); // Also check on boot

    // --- Audio System (Game-ready) ---
    const sounds = {
        back: new Audio('assets/audio/back.mp3'),
        buy: new Audio('assets/audio/buy.mp3'),
        menu: new Audio('assets/audio/menu.mp3'),
        order: new Audio('assets/audio/order.mp3'),
        nav: new Audio('assets/audio/nav.mp3'),
        bg: new Audio('assets/audio/bg.mp3')
    };

    // تحميل مسبق إجباري (Force Preload)
    Object.values(sounds).forEach(s => {
        s.preload = "auto";
        s.load();
    });

    sounds.bg.loop = true;
    sounds.bg.volume = 0.30; // رفعنا الصوت شوية عشان يكون مسموع وهادي

    window.playSound = function (type) {
        if (!appSettings.soundEnabled) return;
        const s = sounds[type] || sounds.menu;
        // تشغيل مباشر وسريع جداً
        s.currentTime = 0;
        s.play().catch(e => console.log('Audio blocked', e));
    };

    // System Settings Logic
    const appSettings = JSON.parse(localStorage.getItem('antiko_settings')) || {
        soundEnabled: true,
        musicEnabled: true, // تفعيل الموسيقى تلقائياً
        theme: 'dark'
    };
    if (appSettings.musicEnabled === undefined) appSettings.musicEnabled = true;

    // Ensure new defaults exist if they were missing in old localStorage
    if (appSettings.bgMusicEnabled === undefined) appSettings.bgMusicEnabled = true;
    if (appSettings.bgMusicVolume === undefined) appSettings.bgMusicVolume = 50;
    if (appSettings.volume === undefined) appSettings.volume = 50;

    const volumeSlider = document.getElementById('sound-volume');
    const soundToggle = document.getElementById('sound-toggle');
    const volumeLabel = document.getElementById('volume-label');
    const btnNavSettings = document.getElementById('btn-nav-settings');

    const bgVolumeSlider = document.getElementById('bg-sound-volume');
    const bgSoundToggle = document.getElementById('bg-sound-toggle');
    const bgVolumeLabel = document.getElementById('bg-volume-label');

    // Initialize UI from settings
    if (volumeSlider) {
        volumeSlider.value = appSettings.volume;
        if (volumeLabel) volumeLabel.textContent = `${appSettings.volume}%`;
    }
    if (soundToggle) soundToggle.checked = appSettings.soundEnabled;

    if (bgVolumeSlider) {
        bgVolumeSlider.value = appSettings.bgMusicVolume;
        if (bgVolumeLabel) bgVolumeLabel.textContent = `${appSettings.bgMusicVolume}%`;
    }
    if (bgSoundToggle) bgSoundToggle.checked = appSettings.musicEnabled;

    const saveSettings = () => {
        localStorage.setItem('antiko_settings', JSON.stringify(appSettings));
    };

    // --- Background Music Logic ---
    let bgAudio = null;
    const updateBgMusic = () => {
        if (!sounds.bg) return;
        // توحيد الحالة مع زرار الإعدادات
        if (appSettings.musicEnabled) {
            sounds.bg.play().catch(e => {
                console.log("Audio blocked, waiting for click/touch.", e);
                const startAudio = () => {
                    if (appSettings.musicEnabled) {
                        sounds.bg.play().catch(err => console.error(err));
                    }
                    document.removeEventListener('click', startAudio);
                    document.removeEventListener('touchstart', startAudio);
                };
                document.addEventListener('click', startAudio);
                document.addEventListener('touchstart', startAudio);
            });
        } else {
            sounds.bg.pause();
        }
    };

    // Try starting on load (might be blocked)
    updateBgMusic();

    // App State Change (Pause music on background)
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
        window.Capacitor.Plugins.App.addListener('appStateChange', ({ isActive }) => {
            if (!isActive && sounds.bg) {
                sounds.bg.pause();
            } else if (isActive && appSettings.musicEnabled && sounds.bg) {
                sounds.bg.play().catch(() => { });
            }
        });
    }


    onAuthStateChanged(auth, (user) => {
        const modalDashBtn = document.getElementById('modal-dashboard-btn');
        if (user) {
            // Logged in
            currentUser = user;
            // جعل المقارنة غير حساسة لحالة الحروف (Case Insensitive)
            const userEmailLower = (user.email || "").toLowerCase();
            const isAdmin = adminEmails.map(e => e.toLowerCase()).includes(userEmailLower);

            navLoginBtn.classList.add('hidden');
            navAccountBtn.classList.remove('hidden');

            console.log("Logged in as:", userEmailLower, "Is Admin:", isAdmin);

            // Dashboard only for Admins
            if (isAdmin) {
                navDashboardBtn.classList.remove('hidden');
                if (modalDashBtn) modalDashBtn.classList.remove('hidden');
            } else {
                navDashboardBtn.classList.add('hidden');
                if (modalDashBtn) modalDashBtn.classList.add('hidden');
            }

            loginModal.classList.add('hidden');
        } else {
            // Logged out
            currentUser = null;
            navLoginBtn.classList.remove('hidden');
            navDashboardBtn.classList.add('hidden');
            navAccountBtn.classList.add('hidden');

            if (modalDashBtn) modalDashBtn.classList.add('hidden');

            // Kick back to main if in dashboard
            dashboardView.classList.add('hidden');
            mainView.classList.remove('hidden');
        }
    });

    // --- UI Modal & Navigation Listeners ---

    // Login Modal Open
    if (navLoginBtn) {
        navLoginBtn.addEventListener('click', () => {
            openPrivacyModal();
        });
    }

    // Dashboard Toggle
    if (navDashboardBtn) {
        navDashboardBtn.addEventListener('click', () => {
            if (dashboardView.classList.contains('hidden')) {
                // Show Dashboard
                mainView.classList.add('hidden');
                dashboardView.classList.remove('hidden');
                navDashboardBtn.innerHTML = '<i class="ph ph-house"></i> العودة للموقع';
                // Load data
                setTimeout(() => {
                    document.dispatchEvent(new Event('dashboardOpened'));
                }, 100);
            } else {
                // Show Main Site
                dashboardView.classList.add('hidden');
                mainView.classList.remove('hidden');
                navDashboardBtn.innerHTML = '<i class="ph ph-squares-four"></i> لوحة التحكم';
                // Trigger cleanup in dashboard
                document.dispatchEvent(new Event('dashboardClosed'));
                if (typeof loadPublicData === 'function') loadPublicData();
            }
        });
    }

    // Account Modal Open
    if (navAccountBtn) {
        navAccountBtn.addEventListener('click', () => {
            if (currentUser) {
                accountEmail.textContent = currentUser.email;
            }
            accountModal.classList.remove('hidden');
        });
    }

    // Logout Action
    if (modalLogoutBtn) {
        modalLogoutBtn.addEventListener('click', () => {
            signOut(auth).then(() => {
                accountModal.classList.add('hidden');
            });
        });
    }

    // Dashboard Btn inside Account Modal
    const modalDashBtnGlobal = document.getElementById('modal-dashboard-btn');
    if (modalDashBtnGlobal) {
        modalDashBtnGlobal.addEventListener('click', () => {
            accountModal.classList.add('hidden');
            if (navDashboardBtn) navDashboardBtn.click();
        });
    }


    // Toggle between Login and Register
    let authMode = 'login'; // 'login' or 'register'
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

    // Handle Google Login (Optimized for Web & Mobile)
    const googleLoginBtn = document.getElementById('google-login-btn');
    if (googleLoginBtn) {
        googleLoginBtn.onclick = async () => {
            const originalText = googleLoginBtn.innerHTML;
            googleLoginBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> جاري التحقق...';
            googleLoginBtn.disabled = true;

            const isNative = window.Capacitor && window.Capacitor.isNativePlatform();
            const isMobileUA = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            const isMobileApp = isNative || (window.location.protocol === 'file:' && isMobileUA);

            try {
                if (isNative) {
                    // Mobile Native Google Login via capawesome reliable plugin
                    const result = await window.Capacitor.Plugins.FirebaseAuthentication.signInWithGoogle({ useCredentialManager: false });
                    const credential = GoogleAuthProvider.credential(result.credential?.idToken);
                    await signInWithCredential(auth, credential);
                    loginModal.classList.add('hidden');
                } else {
                    // Web Google Login
                    await signInWithPopup(auth, googleProvider);
                    loginModal.classList.add('hidden');
                }
            } catch (error) {
                console.error("Google login error:", error);

                // Specific error handling for Capacitor
                if (isNative && error.message && error.message.includes('NOT_INITIALIZED')) {
                    showError("مشكلة في إعدادات جوجل. يرجى مراجعة مدير النظام.");
                } else if (error.code === 'auth/popup-closed-by-user') {
                    // User closed popup, don't show error toast
                } else {
                    showError("فشل الدخول: " + (error.message || error));
                }
            } finally {
                googleLoginBtn.innerHTML = originalText;
                googleLoginBtn.disabled = false;
            }
        };
    }

    // Capture Redirect Result on Load
    getRedirectResult(auth).catch((error) => {
        console.error("Redirect Error:", error);
    });

    // Handle Auth Form Submit (Unified)
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            errorDiv.classList.add('hidden');
            errorDiv.textContent = '';

            const email = document.getElementById('admin-email').value;
            const password = document.getElementById('admin-password').value;

            if (!email || !password) {
                showError('الرجاء إدخال البريد الإلكتروني وكلمة المرور');
                return;
            }

            const originalBtnText = loginBtn.innerHTML;
            loginBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> جاري التحقق...';
            loginBtn.disabled = true;

            try {
                if (authMode === 'login') {
                    await signInWithEmailAndPassword(auth, email, password);
                } else {
                    await createUserWithEmailAndPassword(auth, email, password);
                }

                loginForm.reset();
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
                loginBtn.innerHTML = originalBtnText;
                loginBtn.disabled = false;
            }
        });
    }

    // Sidebar Toggle Logic (REMOVED - Now handled globally in main-init.js)
    // Redundant code was causing conflicting toggles (closing and opening at once)


    function showError(msg) {
        errorDiv.textContent = msg;
        errorDiv.classList.remove('hidden');
    }

    // ==========================================
    // MOUSE TRAILER EFFECT
    // ==========================================
    const trailer = document.getElementById('mouse-trailer');
    let isMouseMoving = false;
    let timeoutId;
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;

    if (!isMobileDevice) {
        window.addEventListener('mousemove', (e) => {
            isMouseMoving = true;
            trailer.style.opacity = '1';

            // Use requestAnimationFrame for smooth native performance
            requestAnimationFrame(() => {
                trailer.style.left = `${e.clientX}px`;
                trailer.style.top = `${e.clientY}px`;
            });

            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                isMouseMoving = false;
                trailer.style.opacity = '0';
            }, 500); // Fade out after 0.5s of no movement
        });

        // Interactive element hover states
        const interactables = document.querySelectorAll('button, a, .glass-card');
        interactables.forEach(el => {
            el.addEventListener('mouseenter', () => {
                trailer.style.transform = 'translate(-50%, -50%) scale(1.5)';
                trailer.style.background = 'radial-gradient(circle, rgba(255,0,60,0.3) 0%, transparent 60%)';
            });
            el.addEventListener('mouseleave', () => {
                trailer.style.transform = 'translate(-50%, -50%) scale(1)';
                trailer.style.background = 'radial-gradient(circle, rgba(255,0,60,0.15) 0%, transparent 60%)';
            });
        });
    } else {
        if (trailer) trailer.style.display = 'none';
    }

    // ==========================================
    // PUBLIC DATA FETCHING (SERVICES & COUNTRIES)
    // ==========================================
    const countriesSection = document.getElementById('countries-section');
    const countriesGrid = document.getElementById('countries-grid');
    const countriesTitle = document.getElementById('countries-title');

    // Main Menu Buttons
    const btnOpenStore = document.getElementById('open-store');
    const btnOpenTeam = document.getElementById('open-team');
    const backToMainBtn = document.getElementById('back-to-main');
    const backToMainFromTeamBtn = document.getElementById('back-to-main-from-team');
    const backToServicesBtn = document.getElementById('back-to-services-btn');

    const mainMenuSection = document.getElementById('main-menu');
    const siteHero = document.getElementById('site-hero');
    const teamSection = document.getElementById('team-section');

    function navigateTo(sectionId) {
        if (isMobileDevice) window.scrollTo(0, 0);
        else window.scrollTo({ top: 0, behavior: 'smooth' });

        const mainView = document.getElementById('main-view');
        const dashboardView = document.getElementById('dashboard-view');
        const bgLines = document.getElementById('bg-lines');
        const bgEffects = document.querySelector('.bg-effects');

        if (sectionId === 'dashboard-view') {
            if (mainView) mainView.classList.add('hidden');
            if (dashboardView) {
                dashboardView.classList.remove('hidden');
                dashboardView.style.zIndex = '500';
                dashboardView.style.position = 'relative';
                dashboardView.style.backgroundColor = '#000'; // Pure black for better focus

                // Hide distracting lines for better editing UX
                if (bgLines) bgLines.style.display = 'none';
                if (bgEffects) bgEffects.style.display = 'none';

                document.dispatchEvent(new CustomEvent('dashboardOpened'));
            }
            if (siteHero) siteHero.classList.add('hidden');
            return;
        } else {
            if (mainView) mainView.classList.remove('hidden');
            if (dashboardView) {
                dashboardView.classList.add('hidden');
                dashboardView.style.backgroundColor = 'transparent';
            }

            // Restore effects for main site
            if (bgLines) bgLines.style.display = 'block';
            if (bgEffects) bgEffects.style.display = 'block';
        }

        document.querySelectorAll('.page-view').forEach(view => {
            view.classList.add('hidden');
            view.style.display = 'none';
        });

        const target = document.getElementById(sectionId);
        if (target) {
            target.classList.remove('hidden');
            target.style.display = (sectionId === 'main-menu') ? 'grid' : 'block';
        }

        // Branding (Hero)
        if (sectionId === 'main-menu') {
            if (siteHero) {
                siteHero.classList.remove('hidden');
                siteHero.style.display = 'block';
            }
        } else {
            if (siteHero) {
                siteHero.classList.add('hidden');
                siteHero.style.display = 'none';
            }
        }

        let activeNavId = 'btn-nav-home';
        if (sectionId === 'services-section' || sectionId === 'countries-section') activeNavId = 'btn-nav-store';

        if (typeof setActiveNavItem === 'function') setActiveNavItem(activeNavId);

        if (sectionId === 'services-section' || sectionId === 'team-section') {
            loadPublicData();
            if (sectionId === 'team-section' && typeof renderTeamPublic === 'function') renderTeamPublic();
        }
    }
    window.navigateTo = navigateTo;

    // Ensure hero visibility is correct on resize
    window.addEventListener('resize', () => {
        if (siteHero) siteHero.classList.remove('hidden');
    });

    // ==========================================
    // MOBILE BOTTOM NAV LOGIC
    // ==========================================
    const navItems = document.querySelectorAll('.bottom-nav-item');
    const btnNavHome = document.getElementById('btn-nav-home');
    const btnNavStore = document.getElementById('btn-nav-store');
    const btnNavAccount = document.getElementById('btn-nav-account');
    const btnNavAi = document.getElementById('btn-nav-ai');

    function setActiveNavItem(id) {
        navItems.forEach(item => {
            if (item.id === id) item.classList.add('active');
            else item.classList.remove('active');
        });
    }

    if (btnNavHome) btnNavHome.onclick = () => navigateTo('main-menu');
    if (btnNavStore) btnNavStore.onclick = () => navigateTo('services-section');
    if (btnNavAccount) {
        btnNavAccount.onclick = () => {
            if (currentUser) {
                accountEmail.textContent = currentUser.email;
                accountModal.classList.remove('hidden');
            } else {
                openPrivacyModal();
            }
            setActiveNavItem('btn-nav-account');
        };
    }

    if (btnNavAi) {
        btnNavAi.onclick = () => {
            const aiToggle = document.getElementById('ai-chat-toggle');
            if (aiToggle) aiToggle.click();
            setActiveNavItem('btn-nav-ai');
        };
    }

    const btnNavSupport = document.getElementById('btn-nav-support');
    const supportModal = document.getElementById('support-modal');
    if (btnNavSupport) {
        btnNavSupport.onclick = () => {
            supportModal.classList.remove('hidden');
            setActiveNavItem('btn-nav-support');
            loadChatMessages(currentUser); // تحميل الرسايل فور الفتح
        }
    }


    // --- Support Chat Logic ---
    const supportForm = document.getElementById('support-form');
    const msgInput = document.getElementById('support-msg-input');
    let unsubSupportChat = null;

    function loadChatMessages(currentUser) {
        const chatBox = document.getElementById('support-chat-box');
        if (!chatBox || !currentUser) return;

        // جلب الرسايل (نستخدم اليوزر أيدي فقط لتجنب تعقيد الفهرس حالياً)
        const q = query(collection(db, 'support_tickets'), where('userId', '==', currentUser.uid));

        if (unsubSupportChat) {
            unsubSupportChat();
            unsubSupportChat = null;
        }

        unsubSupportChat = onSnapshot(q, (snapshot) => {
            chatBox.innerHTML = '<div style="background: rgba(255,255,255,0.05); padding: 10px 15px; border-radius: 15px; border-bottom-right-radius: 0; align-self: flex-start; max-width: 85%; font-size: 0.9rem; color: #ddd;">أهلاً بك في دعم أنتيكو تيم. كيف يمكننا مساعدتك اليوم؟</div>';

            // ترتيب الرسايل يدوياً لضمان الدقة
            const msgs = [];
            snapshot.forEach(doc => msgs.push(doc.data()));
            msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

            msgs.forEach(msg => {
                const isAdmin = msg.senderId === 'admin';
                const isMe = msg.senderId === currentUser.uid;
                const msgDiv = document.createElement('div');
                msgDiv.style.cssText = `
                    padding: 10px 15px; 
                    border-radius: 15px; 
                    max-width: 85%; 
                    font-size: 0.9rem; 
                    position: relative;
                    margin-bottom: 5px;
                    ${isMe ? 'background: var(--neon-red); color: #fff; align-self: flex-end; border-bottom-left-radius: 0;' : 'background: rgba(255,255,255,0.1); color: #ddd; align-self: flex-start; border-bottom-right-radius: 0;'}
                `;

                let content = '';
                if (isAdmin) {
                    content += `<div style="font-size: 0.7rem; color: var(--neon-red); font-weight: 800; margin-bottom: 3px;"><i class="ph ph-shield-check"></i> فريق أنتيكو</div>`;
                }
                content += `<div>${msg.text}</div>`;

                msgDiv.innerHTML = content;
                chatBox.appendChild(msgDiv);
            });
            chatBox.scrollTop = chatBox.scrollHeight;
        });
    }

    if (supportForm) {
        supportForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentUser) {
                showError('يرجى تسجيل الدخول أولاً للمراسلة');
                openPrivacyModal();
                return;
            }

            const text = msgInput.value.trim();
            if (!text) return;

            const btn = document.getElementById('support-submit-btn');
            const originalIcon = btn.innerHTML;
            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';
            btn.disabled = true;

            try {
                await addDoc(collection(db, 'support_tickets'), {
                    userId: currentUser.uid,
                    userEmail: currentUser.email,
                    senderId: currentUser.uid,
                    text: text,
                    timestamp: new Date().getTime(),
                    status: 'open'
                });
                msgInput.value = '';
                playSound('menu');
            } catch (err) {
                console.error("Chat error:", err);
                showError('فشل في إرسال الرسالة، يرجى المحاولة لاحقاً');
            } finally {
                btn.innerHTML = originalIcon;
                btn.disabled = false;
            }
        });
    }

    // --- Global Notifications (Toasts) ---
    window.showToast = function (msg, type = 'success') {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            background: ${type === 'success' ? 'var(--neon-green)' : 'var(--neon-red)'};
            color: #fff; padding: 12px 25px; border-radius: 30px; z-index: 10000;
            font-weight: 700; box-shadow: 0 5px 15px rgba(0,0,0,0.5);
            animation: slideInDown 0.3s forwards; pointer-events: none;
        `;
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    if (btnOpenStore) btnOpenStore.onclick = () => navigateTo('services-section');
    if (btnOpenTeam) btnOpenTeam.onclick = () => navigateTo('team-section');

    // Legacy listener removed (Handled above)

    const allBackBtns = document.querySelectorAll('#back-to-main, #back-to-main-from-team');
    allBackBtns.forEach(btn => btn.onclick = () => navigateTo('main-menu'));
    if (backToServicesBtn) backToServicesBtn.onclick = () => navigateTo('services-section');

    // Global PointerDown Listener for Instant Sound (Ultra Fast)
    document.addEventListener('pointerdown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        const btn = e.target.closest('button, .premium-btn, .menu-card, .glass-card, .menu-item, .action-btn, .bottom-nav-item, .sidebar-menu a, .nav-item, .buy-btn, [onclick], .selectable-card, .sidebar-item, a');
        if (!btn) return;

        // Optimized isClickable check (No getComputedStyle for ultra-fast response)
        const isClickable = btn.tagName === 'BUTTON' ||
            btn.tagName === 'A' ||
            btn.hasAttribute('onclick') ||
            btn.classList.contains('premium-btn') ||
            btn.classList.contains('menu-item') ||
            btn.classList.contains('action-btn') ||
            btn.classList.contains('nav-tile') ||
            btn.id.startsWith('open-'); // Matches open-team, open-store

        if (!isClickable) return;

        const text = (btn.textContent || "").toLowerCase();
        const id = btn.id || "";
        const cls = btn.className || "";

        // 1. صوت الرجوع
        if (id.includes('back') || text.includes('عودة') || text.includes('back')) {
            playSound('back');
        }
        // 2. صوت الـ Nav السفلي
        else if (id.startsWith('btn-nav-') || cls.includes('bottom-nav-item')) {
            playSound('nav');
        }
        // 3. صوت الشراء (فتح المنتج أو الضغط على شراء)
        else if (cls.includes('buy-btn') || text.includes('buy') || text.includes('شراء') || cls.includes('card-inner')) {
            playSound('buy');
        }
        // 4. خيارات القائمة والطلبات
        else {
            playSound('menu');
        }
    }, { passive: true });

    // Special case for Final Order Submit
    const confirmOrderBtn = document.getElementById('confirm-order-btn');
    if (confirmOrderBtn) {
        confirmOrderBtn.addEventListener('click', () => {
            playSound('order');
        });
    }

    // Settings Event Listeners
    if (btnNavSettings) {
        btnNavSettings.addEventListener('click', () => {
            const settingsModal = document.getElementById('settings-modal');
            if (settingsModal) settingsModal.classList.remove('hidden');
        });
    }

    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            appSettings.volume = parseInt(e.target.value);
            if (volumeLabel) volumeLabel.textContent = `${appSettings.volume}%`;
            saveSettings();
        });
    }

    if (soundToggle) {
        soundToggle.addEventListener('change', (e) => {
            appSettings.soundEnabled = e.target.checked;
            saveSettings();
        });
    }

    // --- Background Music Listeners ---
    if (bgVolumeSlider) {
        bgVolumeSlider.addEventListener('input', (e) => {
            appSettings.bgMusicVolume = parseInt(e.target.value);
            if (bgVolumeLabel) bgVolumeLabel.textContent = `${appSettings.bgMusicVolume}%`;
            saveSettings();
            updateBgMusic();
        });
    }

    if (bgSoundToggle) {
        bgSoundToggle.addEventListener('change', (e) => {
            appSettings.bgMusicEnabled = e.target.checked;
            saveSettings();
            updateBgMusic();
        });
    }

    // Start background music on first interaction (required by browsers)
    const initMusicOnInteraction = () => {
        if (appSettings.bgMusicEnabled) {
            updateBgMusic();
        }
    };
    document.addEventListener('click', initMusicOnInteraction, { once: true });
    document.addEventListener('touchstart', initMusicOnInteraction, { once: true });

    const testSoundBtn = document.getElementById('test-sound-btn');
    const testVisual = document.getElementById('test-sound-visual');
    if (testSoundBtn) {
        testSoundBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            playClick();
            if (testVisual) {
                testVisual.classList.remove('hidden');
                setTimeout(() => {
                    testVisual.classList.add('hidden');
                }, 1000);
            }
        });
    }



    async function loadPublicData() {
        // Defensive: Safe text setter
        const safeSetText = (idOrEl, text) => {
            const el = (typeof idOrEl === 'string') ? document.getElementById(idOrEl) : idOrEl;
            if (el && text !== undefined) {
                // Strip "Antiko" or "Antiko Bot" from any dynamic text
                const cleaned = text.trim();
                el.textContent = cleaned;
            }
        };

        try {
            // 0. Site Settings & Sound
            const sSettingsRef = doc(db, "site_settings", "main");
            const sSettingsSnap = await getDoc(sSettingsRef);
            if (sSettingsSnap.exists()) {
                const sData = sSettingsSnap.data();
                if (sData.customBtnSound) {
                    appSettings.customSound = sData.customBtnSound;
                }
            }

            // 1. DYNAMIC SERVICES
            const servicesRef = collection(db, "services");
            const qServices = query(servicesRef, orderBy("sortOrder", "asc"));
            const servicesSnap = await getDocs(qServices);
            const storeGrid = document.getElementById('store-sections-grid');

            if (storeGrid) {
                storeGrid.innerHTML = '';
                if (servicesSnap.empty) {
                    storeGrid.innerHTML = '<p class="text-center" style="width:100%;">لا توجد أقسام متاحة حالياً.</p>';
                } else {
                    servicesSnap.forEach(sDoc => {
                        try {
                            const s = sDoc.data();
                            if (s.active === false) return;

                            const card = document.createElement('div');
                            card.className = `glass-card menu-card slide-in storefront-card`;
                            card.style.cursor = 'pointer';

                            let iconHtml;
                            if (s.logoBase64) {
                                iconHtml = `
                                    <div style="position:relative; width:60px; height:60px; display:flex; align-items:center; justify-content:center; margin: 0 auto;">
                                        <img src="${s.logoBase64}" alt="..." width="60" height="60" style="object-fit: contain; filter: drop-shadow(0 0 10px ${s.color || '#ff003c'}80); position:relative; z-index:2;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                        <div style="position:absolute; inset:0; display:none; align-items:center; justify-content:center; color: ${s.color || '#ff003c'};"><i class="ph-fill ph-${s.icon || 'package'}" style="font-size:3rem;"></i></div>
                                    </div>`;
                            } else {
                                const iconName = s.icon || 'star';
                                iconHtml = `<div style="color: ${s.color || '#ff003c'}; filter: drop-shadow(0 0 15px ${s.color || '#ff003c'}); display: inline-block;"><i class="ph-fill ph-${iconName}" style="color: inherit;"></i></div>`;
                            }

                            card.innerHTML = `
                                <div class="card-edge"></div>
                                <div class="card-inner text-center" style="padding: 40px 20px;">
                                    <div class="menu-icon">${iconHtml}</div>
                                    <h2 style="font-weight: 800;">${s.titleAr || 'قسم جديد'}</h2>
                                    <p class="text-muted" style="font-size: 0.9rem;">${s.descriptionAr || ''}</p>
                                </div>
                            `;
                            card.onclick = () => { loadCountriesForService(s); };
                            storeGrid.appendChild(card);
                        } catch (err) {
                            console.error("Error rendering service card:", err);
                        }
                    });
                }
            }

            // 2. SITE SETTINGS
            const settingsRef = doc(db, "site_settings", "main");
            const settingsSnap = await getDoc(settingsRef);

            if (settingsSnap.exists()) {
                const s = settingsSnap.data();
                safeSetText('hero-top-text', s.heroTopText);
                // Set data-text for glitch effect
                const hTitle = document.getElementById('hero-title');
                if (hTitle) {
                    hTitle.textContent = s.heroTitle;
                    hTitle.setAttribute('data-text', s.heroTitle || '');
                }
                safeSetText('hero-subtitle', s.heroSubtitle);

                safeSetText('team-card-title', s.teamCardTitle);
                safeSetText('team-card-sub', s.teamCardSub);
                safeSetText('store-card-title', s.storeCardTitle);
                safeSetText('store-card-sub', s.storeCardSub);

                // --- General Site Announcement ---
                const homeAnnounceWrapper = document.getElementById('home-announcement-wrapper');
                if (homeAnnounceWrapper) {
                    if (s.showMainAnnounce && s.mainAnnounceText) {
                        homeAnnounceWrapper.style.display = 'flex';
                        const content = homeAnnounceWrapper.querySelector('.announcement-content');
                        if (content) content.textContent = s.mainAnnounceText;
                    } else {
                        homeAnnounceWrapper.style.display = 'none';
                    }
                }
                safeSetText('tg-card-title', s.tgCardTitle);
                safeSetText('tg-card-sub', s.tgCardSub);

                adminWhatsApp = s.adminWa || "";
            }

            // Hide loader, show app
            loader.classList.add('hidden');
            appContent.classList.remove('hidden');

        } catch (error) {
            console.error("Error loading app data:", error);
            loader.classList.add('hidden');
            appContent.classList.remove('hidden');
        }
    }

    async function loadCountriesForService(service) {
        // Navigate to countries section and handle hero visibility
        navigateTo('countries-section');
        countriesTitle.innerHTML = `<i class="ph ph-${service.icon || 'star'}"></i> ${service.titleAr}`;
        countriesGrid.innerHTML = '<div class="loader-spinner" style="margin: 0 auto;"></div><p class="text-center" style="width: 100%;">جاري التحميل...</p>';

        try {
            // Determine collection based on service slug or targetCollection override
            const targetCollection = (service.targetCollection && service.targetCollection.trim() !== "")
                ? service.targetCollection.trim()
                : service.slug;

            const announcementWrapper = document.getElementById('announcement-wrapper');
            if (announcementWrapper) {
                // Priority: Service-specific banner settings in the Service doc
                const showBanner = service.showBanner;
                const bannerText = service.bannerText;

                if (showBanner && bannerText) {
                    announcementWrapper.style.display = 'flex';
                    const contentDiv = announcementWrapper.querySelector('.announcement-content');
                    if (contentDiv) {
                        contentDiv.textContent = bannerText;
                    }
                } else {
                    // Fallback to global settings if legacy (old data)
                    const settingsRef = doc(db, "site_settings", "main");
                    const settingsSnap = await getDoc(settingsRef);
                    if (settingsSnap.exists()) {
                        const settings = settingsSnap.data();
                        const gShow = settings.showMainAnnounce;
                        const gText = settings.mainAnnounceText;
                        if (gShow && gText) {
                            announcementWrapper.style.display = 'flex';
                            const contentDiv = announcementWrapper.querySelector('.announcement-content');
                            if (contentDiv) contentDiv.textContent = gText;
                        } else {
                            announcementWrapper.style.display = 'none';
                        }
                    } else {
                        announcementWrapper.style.display = 'none';
                    }
                }
            }

            const countriesRef = collection(db, targetCollection);
            // Native Firebase "where" and "orderBy" on different fields requires a composite index.
            // We fetch all ordered and filter locally to avoid forcing the user to create an index.
            const qCountries = query(countriesRef, orderBy("sortOrder", "asc"));
            const countriesSnap = await getDocs(qCountries);

            countriesGrid.innerHTML = '';
            let hasActiveCountries = false;
            const isNumberService = service.sectionType ? (service.sectionType === 'numbers') :
                ((targetCollection || "").toLowerCase().includes('whatsapp') ||
                    (targetCollection || "").toLowerCase().includes('telegram') ||
                    (service.slug || "").toLowerCase().includes('number'));

            // Dynamic Layout Switch
            if (isNumberService) {
                countriesGrid.style.display = 'flex';
                countriesGrid.style.flexDirection = 'column';
                countriesGrid.style.gap = '12px';
            } else {
                countriesGrid.style.display = 'grid';
                countriesGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(300px, 1fr))';
                countriesGrid.style.gap = '30px';
            }

            if (!countriesSnap.empty) {
                countriesSnap.forEach(docSnap => {
                    const country = docSnap.data();
                    const isOutOfStock = country.active === false;
                    const card = document.createElement('div');

                    // Determine service types globally for the card
                    const collLow = (targetCollection || "").toLowerCase();
                    const slugLow = (service.slug || "").toLowerCase();

                    let isBook = collLow.includes('book') || slugLow.includes('book');
                    let isGame = collLow.includes('game') || collLow.includes('recharge') || slugLow.includes('game') || slugLow.includes('recharge');
                    let isProject = collLow.includes('design') || collLow.includes('web') || collLow.includes('app');

                    if (service.sectionType === 'options') { isGame = true; isBook = false; }
                    if (service.sectionType === 'store') { isGame = false; isProject = true; isBook = false; }


                    let visualHtml = '';

                    if (isNumberService) {
                        // PREMIUM LIST SYSTEM FOR NUMBERS
                        card.className = `glass-card slide-in ${isOutOfStock ? 'out-of-stock' : ''}`;
                        card.style = "margin-bottom: 12px; padding: 2px;";

                        visualHtml = FlagsHelper.getFlagHtml(country.logoBase64 || country.imageBase64 || country.coverBase64 || country.flagUrl || country.flag || country.icon, 48, 48, '1.5rem');
                        const priceDisplay = `${country.price || '0'} ${country.currency || 'ج.م'}`;
                        const displayName = country.nameAr || country.name || country.title || 'دولة غير معروفة';

                        card.innerHTML = `
                            <div class="card-edge"></div>
                            <div class="card-inner" style="flex-direction: row; align-items: center; justify-content: space-between; padding: 12px 20px; gap: 15px;">
                                <div style="display: flex; align-items: center; gap: 15px; flex: 1;">
                                    <div style="flex-shrink: 0;">${visualHtml}</div>
                                    <div style="text-align: right;">
                                        <div style="font-size: 1.15rem; font-weight: 800; color: #fff;">${displayName}</div>
                                        <div style="font-size: 0.8rem; color: var(--text-secondary); opacity: 0.8;">جاهز للاستخدام</div>
                                    </div>
                                </div>
                                <div style="text-align: left; display: flex; align-items: center; gap: 15px;">
                                    <div style="color: var(--neon-red); font-size: 1.25rem; font-weight: 800; font-family: var(--font-heading); white-space: nowrap;">
                                        ${priceDisplay}
                                    </div>
                                    ${isOutOfStock ? `
                                        <span class="badge offline" style="font-size: 0.7rem; padding: 4px 8px;">غير متاح</span>
                                    ` : `
                                        <button class="buy-btn premium-btn" style="padding: 8px 15px; font-size: 0.85rem; border-radius: 6px; min-width: 80px;">
                                            <i class="ph ph-shopping-cart"></i> شراء
                                        </button>
                                    `}
                                </div>
                            </div>
                        `;
                    } else {
                        // STANDARD GRID SYSTEM
                        card.className = `glass-card slide-in ${isOutOfStock ? 'out-of-stock' : ''}`;
                        card.style.padding = '0';

                        if (isBook) {
                            const imgUrl = country.coverBase64 || country.logoBase64 || country.imageBase64;
                            visualHtml = imgUrl
                                ? `<img src="${imgUrl}" alt="..." width="120" height="180" style="border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.5); object-fit: cover; border: 1px solid var(--border-light);">`
                                : `<div style="font-size: 5rem; opacity: 0.8;">📚</div>`;
                        } else if (isGame || isProject) {
                            const logoUrl = country.logoBase64 || country.imageBase64 || country.coverBase64 || country.icon || (isGame ? getGameLogo(country.name) : '');
                            visualHtml = `<img src="${logoUrl}" alt="..." width="100" height="100" style="border-radius: 12px; box-shadow: 0 5px 15px rgba(0,0,0,0.5); object-fit: cover; border: 1px solid var(--border-light);">`;
                        } else {
                            visualHtml = FlagsHelper.getFlagHtml(country.logoBase64 || country.imageBase64 || country.coverBase64 || country.flagUrl || country.flag || country.icon, 70, 70, '2.5rem');
                        }

                        let priceDisplay = `${country.price || '0'} ${country.currency || 'ج.م'}`;
                        card.innerHTML = `
                            <div class="card-edge"></div>
                            <div class="card-inner" style="align-items: center; justify-content: center; text-align: center; gap: 8px; padding: 20px;">
                                <div style="${isBook || isGame || isProject ? 'margin-bottom: 5px;' : 'margin-bottom: 10px;'}">${visualHtml}</div>
                                <div style="font-size: 1.15rem; font-weight: 800; color: #fff; margin-top: 5px;">${country.nameAr || country.name || country.title || 'خدمة'}</div>
                                <div style="color: var(--neon-red); font-size: 1.1rem; font-weight: 700;">${priceDisplay}</div>
                                ${isOutOfStock ? `
                                    <div class="badge offline" style="width:100%; padding:10px;">نفذت الكمية</div>
                                ` : `
                                    <button class="buy-btn premium-btn w-100" style="padding: 10px; font-size: 0.9rem; border-radius: 8px;">
                                        <i class="ph ph-shopping-cart"></i> شراء
                                    </button>
                                `}
                            </div>
                        `;
                    }

                    if (isOutOfStock) {
                        card.style.cursor = 'not-allowed';
                    } else {
                        card.style.cursor = 'pointer';
                    }


                    // Purchase event
                    const startPurchase = (e) => {
                        let isGamePurchase = (targetCollection || "").toLowerCase().includes('game') || (targetCollection || "").toLowerCase().includes('recharge');
                        if (service.sectionType === 'options') isGamePurchase = true;
                        if (service.sectionType === 'store' || service.sectionType === 'numbers') isGamePurchase = false;

                        if (e) { e.preventDefault(); e.stopPropagation(); }
                        if (isGamePurchase) {
                            openGameOptions(country, FlagsHelper.getFlagHtml(country.flagUrl || country.flag || country.icon, 70, 70, '2.5rem'));
                            return;
                        }

                        const modal = document.getElementById('smart-order-modal');
                        const titleEl = document.getElementById('order-modal-title');
                        const priceEl = document.getElementById('order-modal-price');
                        const iconEl = document.getElementById('order-modal-icon');

                        if (modal && titleEl && priceEl && iconEl) {
                            const confirmBtn = document.getElementById('confirm-order-btn');
                            const phoneContainer = document.getElementById('smart-order-phone-container');
                            const selectionStep = document.getElementById('smart-order-selection-step');
                            const successStep = document.getElementById('smart-order-success-step');

                            // Reset Modal State
                            selectedGameOrder = {
                                game: { name: country.nameAr || country.name || country.title || 'خدمة' },
                                option: { name: 'طلب مباشر', price: country.price || '0' },
                                type: (targetCollection.includes('_') ? targetCollection.split('_')[0] : targetCollection) || (service ? service.slug : 'direct'),
                                serviceSlug: service ? service.slug : 'other',
                                serviceName: service ? service.titleAr : 'خدمة مباشرة',
                                currency: country.currency || 'ج.م'
                            };

                            titleEl.textContent = country.nameAr || country.name;
                            priceEl.textContent = `${country.price} ${country.currency || 'ج.م'}`;
                            phoneContainer.classList.add('hidden');
                            selectionStep.classList.remove('hidden');
                            successStep.classList.add('hidden');
                            confirmBtn.innerHTML = '<i class="ph-fill ph-shopping-bag"></i> حجز الآن';

                            const phoneError = document.getElementById('smart-phone-error');
                            if (phoneError) phoneError.classList.add('hidden');
                            document.getElementById('smart-order-phone').style.borderColor = 'var(--border-light)';
                            document.getElementById('smart-order-phone').value = '';

                            if (isBook) iconEl.innerHTML = `<div style="font-size: 4rem;">📖</div>`;
                            else iconEl.innerHTML = visualHtml;

                            modal.classList.remove('hidden');
                        }
                    }; // End of startPurchase function

                    if (!isOutOfStock) {
                        card.addEventListener('click', startPurchase);
                    }

                    countriesGrid.appendChild(card);
                    hasActiveCountries = true;
                }); // End of countriesSnap.forEach
            } // End of if (!countriesSnap.empty)

            if (!hasActiveCountries) {
                countriesGrid.innerHTML = '<p class="text-muted text-center" style="width: 100%;">لا توجد أرقام متاحة حالياً.</p>';
            }
        } catch (error) {
            console.error("Error loading countries:", error);
            countriesGrid.innerHTML = `
                <div class="text-center w-100">
                    <i class="ph ph-warning-circle text-red" style="font-size: 3rem; color: var(--neon-red);"></i>
                    <p style="color: var(--neon-red);">حدث خطأ أثناء تحميل الدول.</p>
                </div>
            `;
        }
    }

    // Reset initial state
    selectedGameOrder = { game: null, option: null };

    function openGameOptions(game, logoHtml) {
        const modal = document.getElementById('game-options-modal');
        const list = document.getElementById('game-options-list');
        const title = document.getElementById('game-options-title');
        const desc = document.getElementById('game-options-desc');
        const logo = document.getElementById('game-options-logo');
        const buyBtn = document.getElementById('game-buy-btn');
        const phoneContainer = document.getElementById('game-phone-container');
        const selectionStep = document.getElementById('game-selection-step');
        const successStep = document.getElementById('game-success-step');

        if (!modal || !list) return;

        // Reset Modal State
        selectedGameOrder = { game, option: null };
        title.textContent = game.nameAr || game.name || game.title || 'شحن رصيد';
        desc.textContent = game.description || game.descriptionAr || 'اختر الكمية التي تريد شحنها:';
        logo.innerHTML = logoHtml;
        list.innerHTML = '';

        selectionStep.classList.remove('hidden');
        successStep.classList.add('hidden');
        phoneContainer.classList.add('hidden');

        const phoneError = document.getElementById('game-phone-error');
        if (phoneError) phoneError.classList.add('hidden');
        document.getElementById('game-order-phone').style.borderColor = 'var(--border-light)';
        document.getElementById('game-order-phone').value = '';

        buyBtn.disabled = true;
        buyBtn.style.opacity = '0.5';
        buyBtn.style.cursor = 'not-allowed';
        buyBtn.innerHTML = '<i class="ph-fill ph-shopping-cart"></i> إتمام الطلب';

        if (!Array.isArray(game.options)) {
            console.warn("Game options is not an array:", game.options);
            game.options = [];
        }

        if (game.options.length === 0) {
            list.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-secondary);">لا توجد خيارات متاحة حالياً.</div>';
        } else {
            game.options.forEach((opt, idx) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'glass-card game-option-item';
                btn.style.display = 'flex';
                btn.style.justifyContent = 'space-between';
                btn.style.alignItems = 'center';
                btn.style.padding = '15px 20px';
                btn.style.width = '100%';
                btn.style.border = '1px solid var(--border-light)';
                btn.style.transition = 'all 0.3s ease';
                btn.style.cursor = 'pointer';

                const imgHtml = opt.image ? `<img src="${opt.image}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 6px; margin-left: 10px;">` : '';
                btn.innerHTML = `
                        <div style="display: flex; align-items: center;">
                            ${imgHtml}
                            <div style="font-weight: 700; font-size: 1.1rem; color: #fff;">${opt.name}</div>
                        </div>
                        <div style="font-weight: 800; color: var(--neon-red); font-size: 1.1rem;">${opt.price} ${game.currency || 'ج.م'}</div>
                    `;

                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    // Remove selection from others
                    document.querySelectorAll('.game-option-item').forEach(el => {
                        el.style.borderColor = 'var(--border-light)';
                        el.style.background = 'transparent';
                        el.style.boxShadow = 'none';
                    });

                    // Highlight this
                    btn.style.borderColor = 'var(--neon-red)';
                    btn.style.background = 'rgba(255, 0, 60, 0.1)';
                    btn.style.boxShadow = '0 0 15px rgba(255, 0, 60, 0.2)';

                    selectedGameOrder.option = opt;
                    console.log("Selected package:", opt.name);

                    // Enable Buy Button
                    buyBtn.disabled = false;
                    buyBtn.style.opacity = '1';
                    buyBtn.style.cursor = 'pointer';
                });
                list.appendChild(btn);
            });
        }

        modal.classList.remove('hidden');
    }

    // Handle Buy Button Click
    const gameBuyBtn = document.getElementById('game-buy-btn');
    if (gameBuyBtn) {
        gameBuyBtn.addEventListener('click', async () => {
            const phoneContainer = document.getElementById('game-phone-container');
            const phoneInput = document.getElementById('game-order-phone');

            // Step 1: Show Phone Input if hidden
            if (phoneContainer.classList.contains('hidden')) {
                phoneContainer.classList.remove('hidden');
                phoneInput.focus();
                gameBuyBtn.innerHTML = '<i class="ph-fill ph-check-circle"></i> تأكيد الحجز';
                return;
            }

            // Step 2: Validate Phone and Submit
            const phone = phoneInput.value.trim();
            const phoneError = document.getElementById('game-phone-error');
            const phoneRegex = /^[0-9]{11}$/;

            if (!phoneRegex.test(phone)) {
                phoneInput.style.borderColor = 'var(--neon-red)';
                if (phoneError) phoneError.classList.remove('hidden');
                return;
            } else {
                phoneInput.style.borderColor = 'var(--border-light)';
                if (phoneError) phoneError.classList.add('hidden');
            }

            // Show Loading
            const originalText = gameBuyBtn.innerHTML;
            gameBuyBtn.disabled = true;
            gameBuyBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> جاري الإرسال...';

            try {
                await addDoc(collection(db, "orders"), {
                    userId: currentUser ? currentUser.uid : 'guest',
                    userEmail: currentUser ? currentUser.email : 'guest',
                    type: 'game',
                    gameName: (selectedGameOrder.game.nameAr || selectedGameOrder.game.name || selectedGameOrder.game.title || 'لعبة'),
                    optionName: (selectedGameOrder.option.name || 'شحن'),
                    price: (selectedGameOrder.option.price || '0'),
                    currency: (selectedGameOrder.game.currency || 'ج.م'),
                    phone: phone,
                    status: 'pending',
                    timestamp: Date.now()
                });

                // --- My Orders Logic ---
                window.loadUserOrders = async function () {
                    if (!currentUser) {
                        showToast("يجب تسجيل الدخول لمشاهدة طلباتك", "error");
                        return;
                    }

                    const list = document.getElementById('user-orders-list');
                    if (!list) return;

                    list.innerHTML = '<div class="text-center" style="padding:20px; color:#555;"><i class="ph ph-spinner ph-spin"></i> جاري جلب طلباتك...</div>';

                    try {
                        const q = query(
                            collection(db, "orders"),
                            where("userId", "==", currentUser.uid),
                        );

                        const snap = await getDocs(q);
                        if (snap.empty) {
                            list.innerHTML = `
                    <div style="text-align:center; padding: 40px 20px;">
                        <i class="ph ph-shopping-cart" style="font-size: 3rem; color: #222; margin-bottom: 15px; display: block;"></i>
                        <p style="color: #888;">لم تقم بأي طلبات بعد.</p>
                        <button onclick="closeModal('user-orders-modal')" class="premium-btn secondary" style="margin-top:20px;">ابدأ التسوق الآن</button>
                    </div>
                `;
                            return;
                        }

                        const orders = [];
                        snap.forEach(doc => orders.push({ id: doc.id, ...doc.data() }));
                        orders.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

                        list.innerHTML = '';
                        orders.forEach(order => {
                            const card = document.createElement('div');
                            card.style.cssText = `
                    background: rgba(255,255,255,0.03); 
                    border: 1px solid rgba(255,255,255,0.07); 
                    border-radius: 12px; 
                    padding: 15px; 
                    position: relative;
                    animation: fadeIn 0.4s ease;
                `;

                            let statusColor = '#888';
                            let statusText = 'قيد الانتظار';
                            if (order.status === 'completed' || order.status === 'done' || order.status === 'تم') {
                                statusColor = '#00ff88'; statusText = 'تم التنفيذ ✅';
                            } else if (order.status === 'canceled' || order.status === 'ملغي') {
                                statusColor = '#ff4444'; statusText = 'ملغي ❌';
                            }

                            card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <div>
                            <div style="font-weight: 800; color: #fff; font-size: 1rem;">${order.serviceName || order.gameName}</div>
                            <div style="font-size: 0.8rem; color: #888;">${order.details || order.optionName}</div>
                        </div>
                        <div style="font-size: 0.8rem; font-weight: 700; color: ${statusColor}; background: ${statusColor}15; padding: 4px 10px; border-radius: 20px;">
                            ${statusText}
                        </div>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 10px; margin-top: 10px;">
                        <div style="font-size: 0.75rem; color: #555;">${new Date(order.timestamp).toLocaleString('ar-EG')}</div>
                        <div style="font-weight: 800; color: #00ff88; font-size: 1rem;">${order.price} ${order.currency}</div>
                    </div>
                `;
                            list.appendChild(card);
                        });

                    } catch (e) {
                        console.error("Load User Orders Error:", e);
                        list.innerHTML = '<p style="text-align:center; color:red;">فشل في تحميل الطلبات. حاول لاحقاً.</p>';
                    }
                };

                // Attach listener
                const ordersBtn = document.getElementById('modal-orders-btn');
                if (ordersBtn) {
                    ordersBtn.onclick = () => {
                        openModal('user-orders-modal');
                        loadUserOrders();
                    }
                }

                // Show Success
                document.getElementById('game-selection-step').classList.add('hidden');
                document.getElementById('game-success-step').classList.remove('hidden');

                phoneInput.value = ''; // Reset for next time

            } catch (error) {
                console.error("Booking Error:", error);
                alert("حدث خطأ أثناء إرسال طلبك. يرجى المحاولة مرة أخرى.");
            } finally {
                gameBuyBtn.disabled = false;
                gameBuyBtn.innerHTML = originalText;
            }
        });
    }

    function getGameLogo(name) {
        if (!name) return 'https://img.freepik.com/premium-vector/joystick-neon-logo-design-template-gamer-neon-logo-concept-pro-gamer-logo-neon-vector-illustration_155165-154.jpg';
        const n = name.toLowerCase();
        if (n.includes('pubg') || n.includes('ببجي')) return 'https://w7.pngwing.com/pngs/381/68/png-transparent-playerunknown-s-battlegrounds-logo-pubg-thumbnail.png';
        if (n.includes('free fire') || n.includes('فري فاير')) return 'https://e7.pngegg.com/pngimages/279/119/png-clipart-garena-free-fire-battle-royale-game-garena-free-fire-logo-logo-fictional-character.png';
        if (n.includes('roblox') || n.includes('روبلوكس')) return 'https://w7.pngwing.com/pngs/710/188/png-transparent-roblox-logo-thumbnail.png';
        if (n.includes('valorant') || n.includes('فالورانت')) return 'https://w7.pngwing.com/pngs/1/86/png-transparent-valorant-logo-thumbnail.png';
        if (n.includes('league') || n.includes('lol') || n.includes('ليج')) return 'https://w7.pngwing.com/pngs/194/481/png-transparent-league-of-legends-logo-computer-icons-video-game-logo-miscellaneous-game-leaf-thumbnail.png';
        if (n.includes('clash') || n.includes('كلاش')) return 'https://w7.pngwing.com/pngs/669/993/png-transparent-clash-of-clans-clash-royale-clash-of-kings-video-game-logo-thumbnail.png';
        if (n.includes('fortnite') || n.includes('فورتنايت')) return 'https://w7.pngwing.com/pngs/466/291/png-transparent-logo-fortnite-video-game-f-logo-game-angle-white-thumbnail.png';
        if (n.includes('fifa') || n.includes('فيفا') || n.includes('fc')) return 'https://w7.pngwing.com/pngs/403/612/png-transparent-fifa-18-fifa-17-fifa-interactive-world-cup-video-game-fifa-logo-text-trademark-sport-thumbnail.png';
        if (n.includes('ludo') || n.includes('لودو')) return 'https://w7.pngwing.com/pngs/160/288/png-transparent-ludo-king-board-game-android-dice-game-mankind-game-electronics-application-thumbnail.png';
        if (n.includes('tiktok') || n.includes('تيك توك')) return 'https://w7.pngwing.com/pngs/619/847/png-transparent-tiktok-logo-thumbnail.png';
        return 'https://img.freepik.com/premium-vector/joystick-neon-logo-design-template-gamer-neon-logo-concept-pro-gamer-logo-neon-vector-illustration_155165-154.jpg';
    }

    // ==========================================
    // PREMIUM NEURAL NETWORK BACKGROUND (Original Full Effect)
    // ==========================================
    // ==========================================
    // PREMIUM NEURAL NETWORK BACKGROUND (Optimized)
    // ==========================================
    const canvas = document.getElementById('bg-lines');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;

        const particles = [];
        // Even on mobile, we can keep it light. Let's use user's request for full effect but efficient.
        const isMobile = isMobileDevice;
        const particleCount = isMobile ? 30 : Math.min(Math.floor((width * height) / 10000), 100);
        const connectionDistance = isMobile ? 120 : 160;
        const mouseRadius = isMobile ? 120 : 180;

        const mouse = { x: null, y: null };
        let lastInteractionTime = Date.now();

        const handleInteraction = (e) => {
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            mouse.x = clientX;
            mouse.y = clientY;
            lastInteractionTime = Date.now();
        };

        window.addEventListener('mousemove', handleInteraction);
        window.addEventListener('touchstart', handleInteraction);
        window.addEventListener('touchmove', handleInteraction);
        window.addEventListener('touchend', () => { mouse.x = null; mouse.y = null; });

        window.addEventListener('resize', () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            initParticles();
        });

        class Particle {
            constructor() { this.init(); }
            init() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * (isMobile ? 0.4 : 0.6);
                this.vy = (Math.random() - 0.5) * (isMobile ? 0.4 : 0.6);
                this.size = Math.random() * 2 + 1;
            }
            update() {
                if (this.x < 0 || this.x > width) this.vx *= -1;
                if (this.y < 0 || this.y > height) this.vy *= -1;
                this.x += this.vx;
                this.y += this.vy;

                if (mouse.x != null && mouse.y != null) {
                    const dx = mouse.x - this.x;
                    const dy = mouse.y - this.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < mouseRadius) {
                        const force = (mouseRadius - dist) / mouseRadius;
                        this.vx -= (dx / dist) * force * 0.4;
                        this.vy -= (dy / dist) * force * 0.4;
                    }
                }
                const maxSpeed = isMobile ? 1.0 : 2.0;
                const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                if (currentSpeed > maxSpeed) {
                    this.vx = (this.vx / currentSpeed) * maxSpeed;
                    this.vy = (this.vy / currentSpeed) * maxSpeed;
                }
            }
            draw() {
                ctx.fillStyle = 'rgba(255, 0, 60, 0.7)';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        function initParticles() {
            particles.length = 0;
            for (let i = 0; i < particleCount; i++) particles.push(new Particle());
        }

        let animationId;
        function animate() {
            // OPTIMIZATION: Stop animation if tab is hidden or dashboard is open
            if (document.hidden || !dashboardView.classList.contains('hidden')) {
                animationId = requestAnimationFrame(animate);
                return;
            }

            ctx.clearRect(0, 0, width, height);
            const connectionDistanceSq = connectionDistance * connectionDistance;

            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                p.update();
                p.draw();
                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < connectionDistanceSq) {
                        const dist = Math.sqrt(distSq); // Only calculate sqrt if needed for opacity
                        const opacity = (1 - (dist / connectionDistance)) * (isMobile ? 0.35 : 0.45);
                        ctx.strokeStyle = `rgba(255, 0, 60, ${opacity})`;
                        ctx.lineWidth = isMobile ? 1.2 : 0.8;
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                }
            }
            animationId = requestAnimationFrame(animate);
        }

        initParticles();
        animate();
    }


    // Handle Smart Order Confirm Button Click
    const smartOrderBtn = document.getElementById('confirm-order-btn');
    if (smartOrderBtn) {
        smartOrderBtn.addEventListener('click', async () => {
            const phoneContainer = document.getElementById('smart-order-phone-container');
            const phoneInput = document.getElementById('smart-order-phone');

            if (phoneContainer.classList.contains('hidden')) {
                phoneContainer.classList.remove('hidden');
                phoneInput.focus();
                smartOrderBtn.innerHTML = '<i class="ph-fill ph-check-circle"></i> تأكيد الحجز';
                return;
            }

            const phone = phoneInput.value.trim();
            const phoneError = document.getElementById('smart-phone-error');
            const phoneRegex = /^[0-9]{11}$/;

            if (!phoneRegex.test(phone)) {
                phoneInput.style.borderColor = 'var(--neon-red)';
                if (phoneError) phoneError.classList.remove('hidden');
                return;
            } else {
                phoneInput.style.borderColor = 'var(--border-light)';
                if (phoneError) phoneError.classList.add('hidden');
            }

            smartOrderBtn.disabled = true;
            smartOrderBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> جاري الإرسال...';

            try {
                await addDoc(collection(db, "orders"), {
                    userId: currentUser ? currentUser.uid : 'guest',
                    userEmail: currentUser ? currentUser.email : 'guest',
                    type: selectedGameOrder.type || 'other',
                    serviceName: selectedGameOrder.game.name,
                    details: selectedGameOrder.option.name,
                    price: selectedGameOrder.option.price,
                    currency: selectedGameOrder.currency || 'ج.م',
                    phone: phone,
                    status: 'pending',
                    timestamp: Date.now()
                });

                document.getElementById('smart-order-selection-step').classList.add('hidden');
                document.getElementById('smart-order-success-step').classList.remove('hidden');

                phoneInput.value = '';

            } catch (error) {
                console.error("Smart Booking Error:", error);
                alert("حدث خطأ أثناء إرسال طلبك.");
            } finally {
                smartOrderBtn.disabled = false;
            }
        });
    }

    // Real-time phone validation clearance
    const gPhone = document.getElementById('game-order-phone');
    if (gPhone) {
        const clearFunc = () => {
            gPhone.style.borderColor = 'var(--border-light)';
            const err = document.getElementById('game-phone-error');
            if (err) err.classList.add('hidden');
        };
        gPhone.addEventListener('input', clearFunc);
        gPhone.addEventListener('focus', clearFunc);
    }

    const sPhone = document.getElementById('smart-order-phone');
    if (sPhone) {
        const clearFunc = () => {
            sPhone.style.borderColor = 'var(--border-light)';
            const err = document.getElementById('smart-phone-error');
            if (err) err.classList.add('hidden');
        };
        sPhone.addEventListener('input', clearFunc);
        sPhone.addEventListener('focus', clearFunc);
    }

    async function renderTeamPublic() {
        const grid = document.getElementById('team-public-grid');
        if (!grid) return;

        try {
            grid.innerHTML = '<div class="text-center" style="width:100%; color:var(--text-secondary);"><i class="ph ph-spinner ph-spin"></i> جاري تحميل الفريق...</div>';
            // Use a simple query to avoid indexing issues
            const q = query(collection(db, "team_members"), orderBy("sortOrder", "asc"));
            const querySnapshot = await getDocs(q);

            const activeMembers = [];
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                if (data.active !== false) {
                    activeMembers.push({ id: docSnap.id, ...data });
                }
            });

            if (activeMembers.length === 0) {
                grid.innerHTML = '<div class="text-center" style="width:100%; color:var(--text-muted);">سيتم إضافة أعضاء الفريق قريباً.</div>';
                return;
            }

            grid.innerHTML = '';
            activeMembers.forEach((m) => {
                const card = document.createElement('div');
                card.className = 'glass-card text-center menu-card slide-in';
                card.style = "flex: 0 1 300px; padding: 0;";

                const imgUrl = m.imageBase64 || 'https://via.placeholder.com/200?text=Avatar';

                card.innerHTML = `
                    <div class="card-edge"></div>
                    <div class="card-inner" style="padding: 40px 20px;">
                        <div class="team-avatar-wrapper" style="margin-bottom: 20px; position: relative; display: inline-block;">
                            <img src="${imgUrl}" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid var(--neon-red); box-shadow: 0 0 20px var(--neon-red-glow);">
                        </div>
                        <h2 style="font-size: 1.5rem; margin-bottom: 5px;">${m.name}</h2>
                        <div style="color: var(--neon-red); font-weight: 700; font-size: 0.9rem; margin-bottom: 15px; font-family: 'Orbitron', sans-serif; letter-spacing: 1px;">${m.role}</div>
                        <p class="text-muted" style="font-size: 0.95rem; line-height: 1.5;">${m.bio || ''}</p>
                    </div>
                `;
                grid.appendChild(card);
            });
        } catch (e) {
            console.error("Error loading team members", e);
            grid.innerHTML = '<div class="text-center" style="width:100%; color:var(--neon-red);">حدث خطأ أثناء تحميل الفريق.</div>';
        }
    }

    // Initial load
    loadPublicData();

});
