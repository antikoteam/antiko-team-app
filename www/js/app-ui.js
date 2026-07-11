import { state } from "./app-state.js";
import { openPrivacyModal } from "./app-auth.js";

const getUIElements = () => ({
    loader: document.getElementById('loader'),
    appContent: document.getElementById('app-content'),
    siteHero: document.getElementById('site-hero'),
    btnNavHome: document.getElementById('btn-nav-home'),
    btnNavStore: document.getElementById('btn-nav-store'),
    btnNavAccount: document.getElementById('btn-nav-account'),
    btnNavAi: document.getElementById('btn-nav-ai'),
    btnNavSupport: document.getElementById('btn-nav-support'),
    accountEmail: document.getElementById('account-email'),
    accountModal: document.getElementById('account-modal')
});

const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;

// Safety loading fallback
setTimeout(() => {
    const els = getUIElements();
    if (els.loader && !els.loader.classList.contains('hidden')) {
        console.warn("Loading taking too long, forcing hide loader.");
        els.loader.classList.add('hidden');
        if (els.appContent) els.appContent.classList.remove('hidden');
    }
}, 6000);

// --- Auto Update Logic ---
let currentVersion = localStorage.getItem('site_version') || '0';
export async function checkForUpdates() {
    try {
        const response = await fetch('/version.txt?t=' + Date.now());
        if (response.ok) {
            const newVersion = (await response.text()).trim();
            if (currentVersion !== '0' && currentVersion !== newVersion) {
                console.log('New update found! Reloading...');
                localStorage.setItem('site_version', newVersion);
                window.location.reload(true);
            } else if (currentVersion === '0') {
                localStorage.setItem('site_version', newVersion);
            }
        }
    } catch (e) {
        console.warn('Update check failed', e);
    }
}
setInterval(checkForUpdates, 180000);
checkForUpdates();

// --- Mouse Trailer Effect ---
const initMouseTrailer = () => {
    const trailer = document.getElementById('mouse-trailer');
    let timeoutId;

    if (!isMobileDevice && trailer) {
        window.addEventListener('mousemove', (e) => {
            trailer.style.opacity = '1';
            requestAnimationFrame(() => {
                trailer.style.left = `${e.clientX}px`;
                trailer.style.top = `${e.clientY}px`;
            });

            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                trailer.style.opacity = '0';
            }, 500);
        });

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
    } else if (trailer) {
        trailer.style.display = 'none';
    }
};

// --- Page Navigator Routing ---
export function navigateTo(sectionId) {
    if (isMobileDevice) window.scrollTo(0, 0);
    else window.scrollTo({ top: 0, behavior: 'smooth' });

    const mainView = document.getElementById('main-view');
    const dashboardView = document.getElementById('dashboard-view');
    const bgLines = document.getElementById('bg-lines');
    const bgEffects = document.querySelector('.bg-effects');
    const els = getUIElements();

    if (sectionId === 'dashboard-view') {
        if (mainView) mainView.classList.add('hidden');
        if (dashboardView) {
            dashboardView.classList.remove('hidden');
            dashboardView.style.zIndex = '500';
            dashboardView.style.position = 'relative';
            dashboardView.style.backgroundColor = '#000';
            if (bgLines) bgLines.style.display = 'none';
            if (bgEffects) bgEffects.style.display = 'none';
            document.dispatchEvent(new CustomEvent('dashboardOpened'));
        }
        if (els.siteHero) els.siteHero.classList.add('hidden');
        return;
    } else {
        if (mainView) mainView.classList.remove('hidden');
        if (dashboardView) {
            dashboardView.classList.add('hidden');
            dashboardView.style.backgroundColor = 'transparent';
        }
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

    if (sectionId === 'main-menu') {
        if (els.siteHero) {
            els.siteHero.classList.remove('hidden');
            els.siteHero.style.display = 'block';
        }
    } else {
        if (els.siteHero) {
            els.siteHero.classList.add('hidden');
            els.siteHero.style.display = 'none';
        }
    }

    let activeNavId = 'btn-nav-home';
    if (sectionId === 'services-section' || sectionId === 'countries-section') activeNavId = 'btn-nav-store';

    setActiveNavItem(activeNavId);

    if (sectionId === 'team-section' && !window.location.pathname.includes('team.html')) {
        window.location.href = 'team.html';
        return;
    }
    if ((sectionId === 'services-section' || sectionId === 'countries-section') && !window.location.pathname.includes('store.html')) {
        window.location.href = 'store.html';
        return;
    }
    if (sectionId === 'main-menu' && !window.location.pathname.includes('index.html')) {
        window.location.href = 'index.html';
        return;
    }

    if (sectionId === 'services-section' || sectionId === 'team-section') {
        if (typeof window.loadPublicData === 'function') window.loadPublicData();
        if (sectionId === 'team-section' && typeof window.renderTeamPublic === 'function') {
            window.renderTeamPublic();
        }
    }
}

export function setActiveNavItem(id) {
    const navItems = document.querySelectorAll('.bottom-nav-item');
    navItems.forEach(item => {
        if (item.id === id) item.classList.add('active');
        else item.classList.remove('active');
    });
}

// Bind navigation clicks
const initUINavListeners = () => {
    const els = getUIElements();
    
    if (els.btnNavHome) els.btnNavHome.onclick = () => window.location.href = 'index.html';
    if (els.btnNavStore) els.btnNavStore.onclick = () => window.location.href = 'store.html';
    if (els.btnNavAi) els.btnNavAi.onclick = () => window.location.href = 'ai.html';
    if (els.btnNavSupport) els.btnNavSupport.onclick = () => window.location.href = 'support.html';

    if (els.btnNavAccount) {
        els.btnNavAccount.onclick = () => {
            if (state.currentUser) {
                if (els.accountEmail) els.accountEmail.textContent = state.currentUser.email;
                if (els.accountModal) els.accountModal.classList.remove('hidden');
            } else {
                openPrivacyModal();
            }
            setActiveNavItem('btn-nav-account');
        };
    }

    const btnOpenStore = document.getElementById('open-store');
    const btnOpenTeam = document.getElementById('open-team');
    if (btnOpenStore) btnOpenStore.onclick = () => navigateTo('services-section');
    if (btnOpenTeam) btnOpenTeam.onclick = () => navigateTo('team-section');

    const allBackBtns = document.querySelectorAll('#back-to-main, #back-to-main-from-team');
    allBackBtns.forEach(btn => btn.onclick = () => navigateTo('main-menu'));

    const backToServicesBtn = document.getElementById('back-to-services-btn');
    if (backToServicesBtn) backToServicesBtn.onclick = () => navigateTo('services-section');

    const btnNavSettings = document.getElementById('btn-nav-settings');
    if (btnNavSettings) {
        btnNavSettings.addEventListener('click', () => {
            const settingsModal = document.getElementById('settings-modal');
            if (settingsModal) settingsModal.classList.remove('hidden');
        });
    }

    window.addEventListener('resize', () => {
        if (els.siteHero) els.siteHero.classList.remove('hidden');
    });
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initMouseTrailer();
        initUINavListeners();
    });
} else {
    initMouseTrailer();
    initUINavListeners();
}

// Expose globals
window.navigateTo = navigateTo;
window.setActiveNavItem = setActiveNavItem;
