// Global Error Handlers for Native Debugging
window.onerror = function (msg, url, line, col, error) {
    const errorMsg = `GLOBAL ERROR:\n${msg}\nURL: ${url}\nLine: ${line}, Col: ${col}\nError object: ${error ? (error.message || JSON.stringify(error)) : 'null'}`;
    console.error(errorMsg);
    alert(errorMsg);
    return false;
};

window.onunhandledrejection = function (event) {
    const reasonMsg = event.reason ? (event.reason.message || event.reason.code || JSON.stringify(event.reason)) : 'unknown';
    const errorMsg = `UNHANDLED REJECTION:\nReason: ${reasonMsg}`;
    console.error(errorMsg);
    alert(errorMsg);
};

// Modal helpers
function openModal(id) {
    console.log("Opening modal:", id);
    const el = document.getElementById(id);
    if (el) el.classList.remove("hidden");
    else console.error("Modal not found:", id);
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
    
    if (id === 'account-modal' || id === 'login-modal' || id === 'privacy-policy-modal') {
        const bottomNavAccount = document.getElementById('bottom-nav-account');
        if (bottomNavAccount) {
            bottomNavAccount.classList.remove('active');
            const navItems = document.querySelectorAll('.mobile-bottom-nav .bottom-nav-item');
            navItems.forEach(item => item.classList.remove('active'));
            
            const prevIndex = window._prevActiveBottomNavIndex;
            if (prevIndex !== undefined && prevIndex !== -1) {
                if (navItems[prevIndex]) navItems[prevIndex].classList.add('active');
            } else {
                const path = window.location.pathname;
                if (path.includes('index.html') || path.endsWith('/')) {
                    if (navItems[0]) navItems[0].classList.add('active');
                } else if (path.includes('ai.html')) {
                    if (navItems[1]) navItems[1].classList.add('active');
                } else if (path.includes('support.html')) {
                    if (navItems[3]) navItems[3].classList.add('active');
                } else if (path.includes('settings.html')) {
                    if (navItems[4]) navItems[4].classList.add('active');
                }
            }
        }
    }
}

window.closeModal = closeModal;
window.openModal = openModal;

// Sidebar Toggle Logic (Global for reliability)
window.toggleSidebar = function () {
    const sidebar = document.getElementById('sidebar');
    let overlay = document.querySelector('.sidebar-overlay');

    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
        overlay.onclick = window.toggleSidebar;
    }

    if (sidebar) {
        const isOpen = sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('visible');

        // Scroll Lock for a better App Experience
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            // Also prevent touchmove default for background
            document.addEventListener('touchmove', preventDefault, { passive: false });
        } else {
            document.body.style.overflow = '';
            document.removeEventListener('touchmove', preventDefault);
        }
    }
    console.log("Sidebar toggled");
};

function preventDefault(e) {
    // Only prevent scroll if NOT inside the sidebar content
    if (!e.target.closest('#sidebar')) {
        e.preventDefault();
    }
}
