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

// PERF: Debounced MutationObserver - only check new reveals after DOM settles
let revealDebounceTimer = null;
const contentObserver = new MutationObserver(() => {
    // Don't fire on every single mutation - wait for DOM to settle
    clearTimeout(revealDebounceTimer);
    revealDebounceTimer = setTimeout(() => {
        document.querySelectorAll('.reveal:not(.visible)').forEach(el => revealObserver.observe(el));
    }, 300);
});

document.addEventListener('DOMContentLoaded', () => {
    initReveal();
    // PERF: Only watch direct children changes, not deep subtree attributes
    contentObserver.observe(document.body, { childList: true, subtree: true });
});
