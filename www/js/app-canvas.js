// Neural Network Particle Background Particle Canvas system
const canvas = document.getElementById('bg-lines');
if (canvas) {
    const ctx = canvas.getContext('2d');
    
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const particles = [];
    const isMobile = isMobileDevice;
    const particleCount = isMobile ? 10 : Math.min(Math.floor((width * height) / 25000), 24);
    const connectionDistance = isMobile ? 80 : 110;
    const mouseRadius = isMobile ? 90 : 120;

    const mouse = { x: null, y: null };
    let isUserTyping = false;
    let lastFrameTime = 0;
    const targetFPS = isMobile ? 18 : 30;
    const frameInterval = 1000 / targetFPS;

    // Detect when user is typing to pause animation
    document.addEventListener('focusin', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
            isUserTyping = true;
            if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
        }
    });
    
    document.addEventListener('focusout', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
            isUserTyping = false;
            if (!animationId) animate();
        }
    });

    const handleInteraction = (e) => {
        if (isUserTyping) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        mouse.x = clientX;
        mouse.y = clientY;
    };

    window.addEventListener('mousemove', handleInteraction, { passive: true });
    window.addEventListener('touchend', () => { mouse.x = null; mouse.y = null; }, { passive: true });

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
    function animate(timestamp) {
        if (timestamp - lastFrameTime < frameInterval) {
            animationId = requestAnimationFrame(animate);
            return;
        }
        lastFrameTime = timestamp;

        const _dv = document.getElementById('dashboard-view');
        if (document.hidden || (_dv && !_dv.classList.contains('hidden')) || isUserTyping) {
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
                    const dist = Math.sqrt(distSq);
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
