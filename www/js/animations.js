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
    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
};

// Re-run observer when dynamic content is added (MutationObserver)
const contentObserver = new MutationObserver(() => {
    document.querySelectorAll('.reveal:not(.visible)').forEach(el => revealObserver.observe(el));
});

document.addEventListener('DOMContentLoaded', () => {
    initReveal();
    contentObserver.observe(document.body, { childList: true, subtree: true });
});
