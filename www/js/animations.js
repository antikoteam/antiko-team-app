// Scroll Reveal Animation Observer
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, { threshold: 0.1 });

// Initialize reveal on all current reveal elements
const initReveal = () => {
    document.querySelectorAll('.reveal:not(.visible)').forEach(el => revealObserver.observe(el));
};

// PERF: Debounced MutationObserver - scoped to main-view only
let revealDebounceTimer = null;
const contentObserver = new MutationObserver(() => {
    // Don't fire on every single mutation - wait for DOM to settle
    clearTimeout(revealDebounceTimer);
    revealDebounceTimer = setTimeout(() => {
        // PERF: Only scan main-view, not the entire body (avoids triggering on typing in dashboard/AI chat)
        const scope = document.getElementById('main-view') || document.body;
        scope.querySelectorAll('.reveal:not(.visible)').forEach(el => revealObserver.observe(el));
    }, 500);
});

document.addEventListener('DOMContentLoaded', () => {
    initReveal();
    // PERF: Only observe main-view to avoid triggering on dashboard edits and AI chat
    const scope = document.getElementById('main-view') || document.body;
    contentObserver.observe(scope, { childList: true, subtree: true });
});
