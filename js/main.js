/* ═══════════════════════════════════════════════
   AMEVIA — Main Animation Engine v5
   GSAP + ScrollTrigger + Lenis + Canvas
   Performance-first · Accessible · 60fps
   ═══════════════════════════════════════════════ */

gsap.registerPlugin(ScrollTrigger);

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

const state = {
    lenis: null,
    mouse: { x: 0, y: 0 },
};

/* ───────────────────────────────────────────────
   Utility — Split text into words / chars
   ─────────────────────────────────────────────── */
function splitText(el, mode = 'words') {
    const text = el.textContent;
    el.innerHTML = '';
    if (mode === 'words') {
        text.trim().split(/\s+/).forEach((w, i, arr) => {
            const span = document.createElement('span');
            span.className = 'word';
            span.innerHTML = `<span class="word-inner">${w}</span>`;
            el.appendChild(span);
            if (i < arr.length - 1) el.appendChild(document.createTextNode(' '));
        });
    } else if (mode === 'chars') {
        text.split('').forEach(c => {
            const span = document.createElement('span');
            span.className = 'char';
            const inner = document.createElement('span');
            inner.className = 'char-inner';
            inner.textContent = c === ' ' ? '\u00A0' : c;
            span.appendChild(inner);
            el.appendChild(span);
        });
    }
}
function getInners(el, mode) { return el.querySelectorAll(`.${mode}-inner`); }

/* ───────────────────────────────────────────────
   1. Lenis — smooth scroll
   ─────────────────────────────────────────────── */
function initLenis() {
    if (prefersReduced || typeof Lenis === 'undefined') return;
    state.lenis = new Lenis({ duration: 1.2, easing: t => Math.min(1, 1 - Math.pow(2, -10 * t)), smoothWheel: true });
    state.lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => state.lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
}

/* ───────────────────────────────────────────────
   2. Particle canvas — hero background
   (single RAF loop, paused off-screen)
   ─────────────────────────────────────────────── */
function initParticles() {
    if (prefersReduced || isTouchDevice) return;
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h, particles = [], rafId = null;
    const PARTICLE_COUNT = 60;
    const CONNECTION_DIST = 120;
    const MOUSE_DIST = 150;

    function resize() {
        const hero = document.getElementById('hero');
        if (!hero) return;
        w = canvas.width = hero.offsetWidth;
        h = canvas.height = hero.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    class Particle {
        constructor() {
            this.x = Math.random() * w;
            this.y = Math.random() * h;
            this.vx = (Math.random() - 0.5) * 0.4;
            this.vy = (Math.random() - 0.5) * 0.4;
            this.r = Math.random() * 1.5 + 0.5;
            this.alpha = Math.random() * 0.4 + 0.1;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            const dx = this.x - state.mouse.x;
            const dy = this.y - state.mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < MOUSE_DIST && dist > 0) {
                const force = (MOUSE_DIST - dist) / MOUSE_DIST;
                this.x += (dx / dist) * force * 1.5;
                this.y += (dy / dist) * force * 1.5;
            }
            if (this.x < 0 || this.x > w) this.vx *= -1;
            if (this.y < 0 || this.y > h) this.vy *= -1;
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(10,14,12,${this.alpha})`;
            ctx.fill();
        }
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());

    function drawLines() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < CONNECTION_DIST) {
                    const alpha = 0.12 * (1 - dist / CONNECTION_DIST);
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(0,144,179,${alpha})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        ctx.clearRect(0, 0, w, h);
        particles.forEach(p => { p.update(); p.draw(); });
        drawLines();
        rafId = requestAnimationFrame(animate);
    }
    function start() { if (rafId === null) animate(); }
    function stop() { if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; } }

    start();

    // Pause when out of viewport — guarded so only ONE loop ever runs
    const observer = new IntersectionObserver(entries => {
        entries[0].isIntersecting ? start() : stop();
    }, { threshold: 0.05 });
    observer.observe(canvas);
}

/* ───────────────────────────────────────────────
   3. Hero spotlight — cursor radial glow
   ─────────────────────────────────────────────── */
function initHeroSpotlight() {
    if (prefersReduced || isTouchDevice) return;
    const spot = document.getElementById('heroSpotlight');
    const hero = document.getElementById('hero');
    if (!spot || !hero) return;
    hero.addEventListener('mousemove', e => {
        const rect = hero.getBoundingClientRect();
        spot.style.setProperty('--mouse-x', ((e.clientX - rect.left) / rect.width) * 100 + '%');
        spot.style.setProperty('--mouse-y', ((e.clientY - rect.top) / rect.height) * 100 + '%');
    });
}

/* ───────────────────────────────────────────────
   4. Magnetic buttons
   ─────────────────────────────────────────────── */
function initMagneticButtons() {
    if (prefersReduced || isTouchDevice) return;
    const strength = 0.4;
    document.querySelectorAll('.magnetic').forEach(btn => {
        btn.addEventListener('mousemove', e => {
            const rect = btn.getBoundingClientRect();
            const dx = (e.clientX - (rect.left + rect.width / 2)) * strength;
            const dy = (e.clientY - (rect.top + rect.height / 2)) * strength;
            gsap.to(btn, { x: dx, y: dy, duration: 0.3, ease: 'power2.out' });
        });
        btn.addEventListener('mouseleave', () => {
            gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
        });
    });
}

/* ───────────────────────────────────────────────
   5. Text scramble — nav links
   ─────────────────────────────────────────────── */
function initTextScramble() {
    if (prefersReduced) return;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    document.querySelectorAll('[data-scramble]').forEach(el => {
        const original = el.dataset.scramble || el.textContent;
        let frame = 0, interval;
        const parent = el.parentElement;
        parent.addEventListener('mouseenter', () => {
            frame = 0;
            clearInterval(interval);
            interval = setInterval(() => {
                frame++;
                const progress = frame / 12;
                let out = '';
                for (let i = 0; i < original.length; i++) {
                    out += i < Math.floor(progress * original.length)
                        ? original[i]
                        : chars[Math.floor(Math.random() * chars.length)];
                }
                el.textContent = out;
                if (frame >= 12) { clearInterval(interval); el.textContent = original; }
            }, 30);
        });
        parent.addEventListener('mouseleave', () => { clearInterval(interval); el.textContent = original; });
    });
}

/* ───────────────────────────────────────────────
   6. Scroll progress bar
   ─────────────────────────────────────────────── */
function initScrollProgress() {
    const bar = document.getElementById('scrollProgressBar');
    if (!bar) return;
    ScrollTrigger.create({
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: self => { bar.style.width = (self.progress * 100) + '%'; }
    });
}

/* ───────────────────────────────────────────────
   7. Preloader
   ─────────────────────────────────────────────── */
function initPreloader() {
    const preloader = document.getElementById('preloader');
    const fill = document.getElementById('preloaderFill');
    if (!preloader) return;
    if (prefersReduced) { preloader.remove(); return; }
    if (!fill) return;
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15 + 5;
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            setTimeout(() => {
                preloader.classList.add('done');
                setTimeout(() => preloader.remove(), 900);
                initHeroReveal();
            }, 400);
        }
        fill.style.width = progress + '%';
    }, 100);
}

/* ───────────────────────────────────────────────
   8. Hero reveal — owns the hero intro entirely
   ─────────────────────────────────────────────── */
function initHeroReveal() {
    const tl = gsap.timeline({ defaults: { ease: 'expo.out', duration: 1.2 } });
    const video = document.querySelector('.hero-video');
    const lines = document.querySelectorAll('.hero-title .line');
    const eyebrow = document.querySelector('.hero-eyebrow');
    const desc = document.querySelector('.hero-desc');
    const actions = document.querySelector('.hero-actions');
    const micro = document.querySelector('.hero-microcopy');
    const scrollInd = document.querySelector('.hero-scroll');

    // Split each line into words for 3D animation
    lines.forEach(line => splitText(line, 'words'));

    gsap.set([eyebrow, desc, actions, micro], { y: 30, opacity: 0 });
    if (scrollInd) gsap.set(scrollInd, { opacity: 0, y: 20 });
    if (video) gsap.set(video, { scale: 1.3, filter: 'blur(20px)' });

    // Set initial state for all word-inners
    const allWordInners = document.querySelectorAll('.hero-title .word-inner');
    gsap.set(allWordInners, { rotateX: 90, y: '100%', scale: 0.8, opacity: 0, filter: 'blur(4px)' });

    tl.to(video, { scale: 1.05, filter: 'blur(0px)', duration: 1.8, ease: 'power3.out' }, 0)
      .to(eyebrow, { y: 0, opacity: 1 }, 0.2);

    // Animate words per line with stagger
    let lineDelay = 0.35;
    lines.forEach((line, idx) => {
        const words = line.querySelectorAll('.word-inner');
        const isAccent = line.classList.contains('accent');
        tl.to(words, {
            rotateX: 0,
            y: '0%',
            scale: 1,
            opacity: 1,
            filter: 'blur(0px)',
            duration: isAccent ? 1.4 : 1.0,
            stagger: 0.08,
            ease: isAccent ? 'back.out(1.4)' : 'expo.out'
        }, lineDelay + idx * 0.18);
    });

    tl.to(desc, { y: 0, opacity: 1 }, 1.0)
      .to(actions, { y: 0, opacity: 1 }, 1.15)
      .to(micro, { y: 0, opacity: 1 }, 1.3)
      .to(scrollInd, { opacity: 1, y: 0 }, 1.45);

    gsap.to(video, { y: 120, scale: 1.15, scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero-content', { y: -60, opacity: 0, scrollTrigger: { trigger: '#hero', start: 'top top', end: '50% top', scrub: true } });
}

/* ───────────────────────────────────────────────
   9. Nav — scrolled state + active link
   ─────────────────────────────────────────────── */
function initNav() {
    const nav = document.getElementById('nav');
    if (nav) {
        ScrollTrigger.create({
            trigger: document.body,
            start: '100px top',
            onEnter: () => nav.classList.add('scrolled'),
            onLeaveBack: () => nav.classList.remove('scrolled'),
        });
    }
    // Active link highlight
    document.querySelectorAll('main section[id]').forEach(section => {
        const link = document.querySelector(`.nav-link[href="#${section.id}"]`);
        if (!link) return;
        ScrollTrigger.create({
            trigger: section,
            start: 'top 50%',
            end: 'bottom 50%',
            onToggle: self => link.classList.toggle('active', self.isActive),
        });
    });
}

/* ───────────────────────────────────────────────
   10. Mobile menu
   ─────────────────────────────────────────────── */
function initMobileMenu() {
    const toggle = document.getElementById('navToggle');
    if (!toggle) return;
    const setState = open => {
        document.body.classList.toggle('menu-open', open);
        toggle.classList.toggle('active', open);
        toggle.setAttribute('aria-expanded', String(open));
    };
    toggle.addEventListener('click', () => setState(!document.body.classList.contains('menu-open')));
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => setState(false));
    });
}

/* ───────────────────────────────────────────────
   11. Custom cursor — transform-based (compositor)
   ─────────────────────────────────────────────── */
function initCursor() {
    if (prefersReduced || isTouchDevice) return;
    const cursor = document.getElementById('cursor');
    const trail = document.getElementById('cursorTrail');
    if (!cursor || !trail) return;

    let mx = 0, my = 0, cx = 0, cy = 0, tx = 0, ty = 0;
    document.addEventListener('mousemove', e => {
        mx = e.clientX; my = e.clientY;
        state.mouse.x = e.clientX; state.mouse.y = e.clientY;
    });

    function loop() {
        cx += (mx - cx) * 0.35;
        cy += (my - cy) * 0.35;
        tx += (mx - tx) * 0.12;
        ty += (my - ty) * 0.12;
        cursor.style.transform = `translate3d(${cx - 4}px, ${cy - 4}px, 0)`;
        trail.style.transform = `translate3d(${tx - 20}px, ${ty - 20}px, 0)`;
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    document.querySelectorAll('a, button, summary, [data-tilt]').forEach(el => {
        el.addEventListener('mouseenter', () => trail.classList.add('hover'));
        el.addEventListener('mouseleave', () => trail.classList.remove('hover'));
    });
}

/* ───────────────────────────────────────────────
   12. Work — horizontal scroll (with reduced fallback)
   ─────────────────────────────────────────────── */
function initHorizontalScroll() {
    const section = document.getElementById('work');
    const track = document.getElementById('workTrack');
    const wrap = document.getElementById('workHorizontal');
    if (!section || !track) return;
    const cards = track.querySelectorAll('.work-card');

    // Reduced motion: native horizontal scroll instead of pin-scrub hijack
    if (prefersReduced) {
        if (wrap) {
            wrap.style.height = 'auto';
            wrap.style.overflowX = 'auto';
            wrap.style.paddingBottom = '24px';
        }
        return;
    }

    const getScroll = () => {
        track.style.width = 'auto';
        return Math.max(0, track.scrollWidth - window.innerWidth);
    };

    gsap.to(track, {
        x: () => -getScroll(),
        ease: 'none',
        scrollTrigger: {
            trigger: wrap || section,
            start: 'top top',
            end: () => '+=' + getScroll(),
            pin: wrap || section,
            scrub: 1,
            invalidateOnRefresh: true,
            onUpdate: self => {
                const p = self.progress;
                cards.forEach((card, i) => {
                    const cardProgress = (p * cards.length) - i;
                    const rotY = gsap.utils.clamp(-8, 8, cardProgress * 3);
                    const scale = gsap.utils.clamp(0.92, 1.02, 1 - Math.abs(cardProgress) * 0.04);
                    gsap.set(card, { rotateY: rotY, scale: scale, transformPerspective: 1000 });
                });
            }
        }
    });

    ScrollTrigger.create({
        trigger: section,
        start: 'top 80%',
        once: true,
        onEnter: () => {
            cards.forEach((card, i) => {
                gsap.from(card, { y: 80, rotateX: 15, opacity: 0, duration: 1, delay: i * 0.12, ease: 'expo.out', transformPerspective: 800 });
            });
        }
    });
}

/* ───────────────────────────────────────────────
   13. Tilt cards — 3D hover
   ─────────────────────────────────────────────── */
function initTiltCards() {
    if (prefersReduced || isTouchDevice) return;
    document.querySelectorAll('[data-tilt]').forEach(card => {
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            gsap.to(card, { rotateY: x * 12, rotateX: -y * 12, duration: 0.4, ease: 'power2.out', transformPerspective: 800 });
            const img = card.querySelector('img, video');
            if (img) gsap.to(img, { x: x * 20, y: y * 20, duration: 0.5, ease: 'power2.out' });
        });
        card.addEventListener('mouseleave', () => {
            gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)' });
            const img = card.querySelector('img, video');
            if (img) gsap.to(img, { x: 0, y: 0, duration: 0.6, ease: 'power2.out' });
        });
    });
}

/* ───────────────────────────────────────────────
   14. Timeline — scroll-driven progress
   ─────────────────────────────────────────────── */
function initTimelineScroll() {
    const lineProgress = document.getElementById('timelineProgress');
    const steps = document.querySelectorAll('.timeline-step');

    if (prefersReduced) {
        steps.forEach(s => s.classList.add('active'));
        if (lineProgress) lineProgress.style.height = '100%';
        return;
    }

    if (lineProgress) {
        ScrollTrigger.create({
            trigger: '.method-timeline',
            start: 'top 70%',
            end: 'bottom 60%',
            scrub: true,
            onUpdate: self => gsap.set(lineProgress, { height: (self.progress * 100) + '%' }),
        });
    }
    steps.forEach(step => {
        ScrollTrigger.create({
            trigger: step,
            start: 'top 65%',
            onEnter: () => step.classList.add('active'),
            onLeaveBack: () => step.classList.remove('active'),
        });
    });
}

/* ───────────────────────────────────────────────
   15. Global reveals (scroll-triggered)
   ─────────────────────────────────────────────── */
function initReveals() {
    if (prefersReduced) return; // CSS makes [data-reveal] visible
    const revealMap = {
        'fade-up': { y: 40, opacity: 0 },
        'fade-left': { x: 40, opacity: 0 },
        'fade-right': { x: -40, opacity: 0 },
        'fade': { opacity: 0 },
    };
    const defaults = { duration: 0.9, ease: 'expo.out' };

    Object.keys(revealMap).forEach(attr => {
        document.querySelectorAll(`[data-reveal="${attr}"]`).forEach(el => {
            gsap.from(el, { ...defaults, ...revealMap[attr], scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
        });
    });

    document.querySelectorAll('[data-reveal="chars"]').forEach(el => {
        splitText(el, 'chars');
        gsap.from(getInners(el, 'char'), { y: '100%', opacity: 0, duration: 0.7, stagger: 0.025, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });

    document.querySelectorAll('[data-reveal="words"]').forEach(el => {
        splitText(el, 'words');
        gsap.from(getInners(el, 'word'), { y: '100%', opacity: 0, duration: 0.8, stagger: 0.04, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
    });
}

/* ───────────────────────────────────────────────
   16. FAQ accordion — exclusive open
   ─────────────────────────────────────────────── */
function initFaq() {
    const items = document.querySelectorAll('.faq-item');
    items.forEach(item => {
        item.addEventListener('toggle', () => {
            if (item.open) items.forEach(other => { if (other !== item) other.open = false; });
        });
    });
}

/* ───────────────────────────────────────────────
   17. Contact form
   ─────────────────────────────────────────────── */
function initContact() {
    const form = document.getElementById('contactForm');
    if (!form) return;
    const status = document.getElementById('formStatus');
    const btn = form.querySelector('button[type="submit"]');

    const setStatus = (msg, type) => {
        if (!status) return;
        status.textContent = msg;
        status.classList.remove('is-success', 'is-error');
        if (type) status.classList.add('is-' + type);
    };

    form.addEventListener('submit', e => {
        e.preventDefault();
        if (!form.checkValidity()) { form.reportValidity(); return; }
        const original = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span>Envoi en cours…</span>';
        setStatus('', null);

        fetch('https://formsubmit.co/ajax/hello@ameviaagency.com', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
                ...Object.fromEntries(new FormData(form)),
                _subject: 'Nouveau message AMEVIA Agency',
                _template: 'table'
            })
        })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(() => {
            btn.innerHTML = original;
            setStatus('Merci ! Votre message a bien été envoyé. Nous revenons vers vous sous 24 h.', 'success');
            form.reset();
        })
        .catch(() => {
            btn.innerHTML = original;
            setStatus('Une erreur est survenue. Réessayez ou écrivez-nous à hello@ameviaagency.com.', 'error');
        })
        .finally(() => { btn.disabled = false; });
    });

    form.querySelectorAll('input, textarea').forEach(field => {
        field.addEventListener('focus', () => gsap.to(field.parentElement, { scale: 1.01, duration: 0.3 }));
        field.addEventListener('blur', () => gsap.to(field.parentElement, { scale: 1, duration: 0.3 }));
    });
}

/* ───────────────────────────────────────────────
   18. Footer year
   ─────────────────────────────────────────────── */
function initFooter() {
    const y = document.getElementById('footerYear');
    if (y) y.textContent = new Date().getFullYear();
}

/* ───────────────────────────────────────────────
   19. Service card glow (cursor-follow)
   ─────────────────────────────────────────────── */
function initServiceCardGlow() {
    if (prefersReduced || isTouchDevice) return;
    document.querySelectorAll('.service-card').forEach(card => {
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            card.style.setProperty('--glow-x', (e.clientX - rect.left) + 'px');
            card.style.setProperty('--glow-y', (e.clientY - rect.top) + 'px');
        });
    });
}

/* ───────────────────────────────────────────────
   20. Marquee — infinite ticker with hover pause
   ─────────────────────────────────────────────── */
function initMarquee() {
    const marquee = document.querySelector('.marquee');
    if (!marquee) return;
    if (prefersReduced) {
        marquee.classList.add('is-paused');
        return;
    }
    marquee.addEventListener('mouseenter', () => marquee.classList.add('is-paused'));
    marquee.addEventListener('mouseleave', () => marquee.classList.remove('is-paused'));
}

/* ───────────────────────────────────────────────
   21. Testimonials — scroll-triggered reveal
   ─────────────────────────────────────────────── */
function initTestimonials() {
    const cards = document.querySelectorAll('.testimonial-card');
    if (!cards.length) return;
    if (prefersReduced) return; // CSS handles visibility
    cards.forEach((card, i) => {
        gsap.from(card, {
            y: 50,
            opacity: 0,
            duration: 0.9,
            delay: i * 0.12,
            ease: 'expo.out',
            scrollTrigger: {
                trigger: card,
                start: 'top 88%',
                once: true
            }
        });
    });
}

/* ───────────────────────────────────────────────
   22. Why section — scroll-triggered reveal
   ─────────────────────────────────────────────── */
function initWhySection() {
    if (prefersReduced) return;
    const items = document.querySelectorAll('.why-item');
    if (!items.length) return;
    // Items already have data-reveal="fade-up" so initReveals() handles them.
    // Add a special stagger for the numbers to scale in.
    const numbers = document.querySelectorAll('.why-number');
    if (numbers.length) {
        gsap.from(numbers, {
            scale: 0.5,
            opacity: 0,
            duration: 1.2,
            stagger: 0.15,
            ease: 'expo.out',
            scrollTrigger: {
                trigger: '.why-grid',
                start: 'top 85%',
                once: true
            }
        });
    }
}

/* ───────────────────────────────────────────────
   BOOT
   ─────────────────────────────────────────────── */
function boot() {
    initLenis();
    initPreloader();
    initScrollProgress();
    initNav();
    initMobileMenu();
    initCursor();
    initParticles();
    initHeroSpotlight();
    initMagneticButtons();
    initTextScramble();
    initHorizontalScroll();
    initTiltCards();
    initTimelineScroll();
    initFaq();
    initContact();
    initFooter();
    initServiceCardGlow();
    initMarquee();
    initTestimonials();
    initWhySection();
    initReveals();

    // Recalculate pinned/scroll positions once fonts & media settle
    window.addEventListener('load', () => ScrollTrigger.refresh());
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}
