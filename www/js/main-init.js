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
