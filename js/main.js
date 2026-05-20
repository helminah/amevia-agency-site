/* ═══════════════════════════════════════════════════════════════════════════
   AMEVIA Cinematic Engine — GSAP + Lenis + ScrollTrigger
   Apple-style motion design. Performance-first. 60fps target.
   ═══════════════════════════════════════════════════════════════════════════ */

const AMEVIA = {
    lenis: null,
    cursor: { xTo: null, yTo: null, trailX: null, trailY: null },
    initialized: false
};

/* ── 0. PRELOADER ─────────────────────────────────────────────────────── */
function initPreloader() {
    const preloader = document.getElementById('preloader');
    const fill = document.getElementById('preloaderFill');
    let progress = 0;

    const tick = () => {
        progress += Math.random() * 18 + 4;
        if (progress > 100) progress = 100;
        fill.style.width = progress + '%';
        if (progress < 100) {
            requestAnimationFrame(tick);
        } else {
            setTimeout(() => {
                preloader.classList.add('done');
                setTimeout(() => {
                    preloader.style.display = 'none';
                    initApp();
                }, 800);
            }, 400);
        }
    };
    requestAnimationFrame(tick);
}

/* ── 1. SMOOTH SCROLL (Lenis) ────────────────────────────────────────── */
function initSmoothScroll() {
    AMEVIA.lenis = new Lenis({
        duration: 1.4,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 0.9
    });

    // Bridge Lenis → ScrollTrigger
    AMEVIA.lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
        AMEVIA.lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);
}

/* ── 2. SPLIT TEXT UTILITY ───────────────────────────────────────────── */
function splitText(element, mode = 'words') {
    if (element.dataset.splitted === 'true') return;
    const text = element.textContent.trim();
    element.innerHTML = '';

    if (mode === 'chars') {
        const chars = text.split('');
        chars.forEach((char, i) => {
            const wrap = document.createElement('span');
            wrap.className = 'char';
            const inner = document.createElement('span');
            inner.className = 'char-inner';
            inner.textContent = char === ' ' ? '\u00A0' : char;
            inner.style.display = 'inline-block';
            wrap.appendChild(inner);
            element.appendChild(wrap);
        });
    } else if (mode === 'words') {
        const words = text.split(/\s+/);
        words.forEach((word, i) => {
            const wrap = document.createElement('span');
            wrap.className = 'word';
            const inner = document.createElement('span');
            inner.className = 'word-inner';
            inner.textContent = word;
            inner.style.display = 'inline-block';
            wrap.appendChild(inner);
            if (i < words.length - 1) {
                element.appendChild(document.createTextNode(' '));
            }
            element.appendChild(wrap);
        });
    }
    element.dataset.splitted = 'true';
}

/* ── 3. CUSTOM CURSOR (gsap.quickTo) ─────────────────────────────────── */
function initCursor() {
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const dot = document.getElementById('cursor');
    const trail = document.getElementById('cursorTrail');
    if (!dot || !trail) return;

    AMEVIA.cursor.xTo = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'power3' });
    AMEVIA.cursor.yTo = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'power3' });
    AMEVIA.cursor.trailX = gsap.quickTo(trail, 'x', { duration: 0.35, ease: 'power3' });
    AMEVIA.cursor.trailY = gsap.quickTo(trail, 'y', { duration: 0.35, ease: 'power3' });

    document.addEventListener('mousemove', (e) => {
        AMEVIA.cursor.xTo(e.clientX - 4);
        AMEVIA.cursor.yTo(e.clientY - 4);
        AMEVIA.cursor.trailX(e.clientX - 20);
        AMEVIA.cursor.trailY(e.clientY - 20);
    });

    // Hover states
    const interactives = document.querySelectorAll('a, button, [data-tilt]');
    interactives.forEach(el => {
        el.addEventListener('mouseenter', () => trail.classList.add('hover'));
        el.addEventListener('mouseleave', () => trail.classList.remove('hover'));
    });
}

/* ── 4. NAVIGATION ───────────────────────────────────────────────────── */
function initNavigation() {
    const nav = document.getElementById('nav');
    const toggle = document.getElementById('navToggle');

    // Scroll background
    ScrollTrigger.create({
        start: 'top -80',
        end: 99999,
        onUpdate: (self) => {
            nav.classList.toggle('scrolled', self.progress > 0);
        }
    });

    // Mobile toggle
    toggle?.addEventListener('click', () => {
        toggle.classList.toggle('is-open');
    });

    // Smooth scroll to anchors
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            const target = document.querySelector(link.getAttribute('href'));
            if (!target) return;
            e.preventDefault();
            AMEVIA.lenis?.scrollTo(target, { offset: -80 });
        });
    });
}

/* ── 5. HERO ANIMATIONS ──────────────────────────────────────────────── */
function initHero() {
    const hero = document.querySelector('.hero');
    const video = document.querySelector('.hero-video');

    // Video parallax on scroll
    gsap.to(video, {
        yPercent: 20,
        scale: 1.2,
        ease: 'none',
        scrollTrigger: {
            trigger: hero,
            start: 'top top',
            end: 'bottom top',
            scrub: true
        }
    });

    // Eyebrow char reveal
    const eyebrow = document.querySelector('.hero-eyebrow');
    if (eyebrow) {
        splitText(eyebrow, 'chars');
        gsap.from(eyebrow.querySelectorAll('.char-inner'), {
            y: 30,
            opacity: 0,
            duration: 0.8,
            stagger: 0.03,
            ease: 'power3.out',
            delay: 0.6
        });
    }

    // Title word reveal (line by line)
    document.querySelectorAll('.hero-title .line').forEach((line, i) => {
        splitText(line, 'words');
        gsap.from(line.querySelectorAll('.word-inner'), {
            yPercent: 110,
            duration: 1.2,
            stagger: 0.06,
            ease: 'power4.out',
            delay: 0.8 + (i * 0.15)
        });
    });

    // Fade up elements
    gsap.from('.hero-desc', {
        y: 40,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
        delay: 1.4
    });

    gsap.from('.hero-actions', {
        y: 40,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
        delay: 1.6
    });

    gsap.from('.hero-scroll', {
        opacity: 0,
        duration: 1,
        ease: 'power2.out',
        delay: 2
    });
}

/* ── 6. HORIZONTAL SCROLL (Work) ─────────────────────────────────────── */
function initHorizontalScroll() {
    const track = document.getElementById('workTrack');
    if (!track) return;

    const cards = track.querySelectorAll('.work-card');
    const totalWidth = track.scrollWidth - window.innerWidth + 160;

    const scrollTween = gsap.to(track, {
        x: -totalWidth,
        ease: 'none',
        scrollTrigger: {
            trigger: '#work',
            start: 'top top',
            end: () => `+=${totalWidth}`,
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true
        }
    });

    // Parallax on each card image
    cards.forEach(card => {
        const img = card.querySelector('img');
        gsap.fromTo(img, { x: -30 }, {
            x: 30,
            ease: 'none',
            scrollTrigger: {
                containerAnimation: scrollTween,
                trigger: card,
                start: 'left right',
                end: 'right left',
                scrub: true
            }
        });
    });
}

/* ── 7. SERVICES REVEAL ──────────────────────────────────────────────── */
function initServices() {
    const cards = document.querySelectorAll('.service-card');

    // Batch reveal
    ScrollTrigger.batch(cards, {
        onEnter: (batch) => {
            gsap.to(batch, {
                opacity: 1,
                y: 0,
                duration: 0.8,
                stagger: 0.12,
                ease: 'power3.out',
                overwrite: true
            });
        },
        start: 'top 85%',
        once: true
    });
}

/* ── 8. METHOD TIMELINE ──────────────────────────────────────────────── */
function initMethodTimeline() {
    const lineProgress = document.getElementById('timelineProgress');
    const steps = document.querySelectorAll('.timeline-step');

    if (lineProgress) {
        gsap.to(lineProgress, {
            height: '100%',
            ease: 'none',
            scrollTrigger: {
                trigger: '.method-timeline',
                start: 'top 70%',
                end: 'bottom 70%',
                scrub: true
            }
        });
    }

    steps.forEach((step, i) => {
        const marker = step.querySelector('.step-marker');
        const content = step.querySelector('.step-content');

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: step,
                start: 'top 75%',
                end: 'top 40%',
                scrub: true
            }
        });

        tl.to(step, { opacity: 1, x: 0, duration: 1 })
          .to(marker, { scale: 1, opacity: 1, duration: 0.5 }, 0)
          .to(content, { y: 0, opacity: 1, duration: 0.8 }, 0.2);

        // Active state toggle
        ScrollTrigger.create({
            trigger: step,
            start: 'top 60%',
            end: 'bottom 40%',
            onEnter: () => step.classList.add('active'),
            onLeave: () => step.classList.remove('active'),
            onEnterBack: () => step.classList.add('active'),
            onLeaveBack: () => step.classList.remove('active')
        });
    });
}

/* ── 9. 3D TILT CARDS ────────────────────────────────────────────────── */
function initTiltCards() {
    if (window.matchMedia('(pointer: coarse)').matches) return;

    document.querySelectorAll('[data-tilt]').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            gsap.to(card, {
                rotationY: x * 12,
                rotationX: -y * 12,
                duration: 0.5,
                ease: 'power2.out'
            });
        });

        card.addEventListener('mouseleave', () => {
            gsap.to(card, {
                rotationY: 0,
                rotationX: 0,
                duration: 0.8,
                ease: 'power3.out'
            });
        });
    });
}

/* ── 10. GLOBAL REVEALS ──────────────────────────────────────────────── */
function initGlobalReveals() {
    // Section headers
    document.querySelectorAll('[data-reveal="chars"]').forEach(el => {
        splitText(el, 'chars');
        gsap.from(el.querySelectorAll('.char-inner'), {
            y: 24,
            opacity: 0,
            duration: 0.6,
            stagger: 0.02,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: el,
                start: 'top 85%',
                once: true
            }
        });
    });

    document.querySelectorAll('[data-reveal="words"]').forEach(el => {
        splitText(el, 'words');
        gsap.from(el.querySelectorAll('.word-inner'), {
            yPercent: 100,
            duration: 1,
            stagger: 0.05,
            ease: 'power4.out',
            scrollTrigger: {
                trigger: el,
                start: 'top 85%',
                once: true
            }
        });
    });

    // Fade ups
    document.querySelectorAll('[data-reveal="fade-up"]').forEach(el => {
        gsap.to(el, {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: el,
                start: 'top 88%',
                once: true
            }
        });
    });

    // Fade left/right
    document.querySelectorAll('[data-reveal="fade-right"]').forEach(el => {
        gsap.to(el, {
            opacity: 1,
            x: 0,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: el,
                start: 'top 85%',
                once: true
            }
        });
    });

    document.querySelectorAll('[data-reveal="fade-left"]').forEach(el => {
        gsap.to(el, {
            opacity: 1,
            x: 0,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: el,
                start: 'top 85%',
                once: true
            }
        });
    });
}

/* ── 11. CONTACT FORM ────────────────────────────────────────────────── */
function initForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        const original = btn.innerHTML;

        btn.innerHTML = '<span>Envoyé !</span>';
        btn.style.background = 'var(--lime)';

        setTimeout(() => {
            btn.innerHTML = original;
            btn.style.background = '';
            form.reset();
        }, 3000);
    });
}

/* ── 12. FOOTER YEAR ─────────────────────────────────────────────────── */
function initFooter() {
    const yearEl = document.getElementById('footerYear');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
}

/* ════════════════════════════════════════════════════════════════════════
   BOOT
   ════════════════════════════════════════════════════════════════════════ */
function initApp() {
    if (AMEVIA.initialized) return;
    AMEVIA.initialized = true;

    gsap.registerPlugin(ScrollTrigger);

    initSmoothScroll();
    initCursor();
    initNavigation();
    initHero();
    initHorizontalScroll();
    initServices();
    initMethodTimeline();
    initTiltCards();
    initGlobalReveals();
    initForm();
    initFooter();

    // Refresh after fonts/images
    document.fonts.ready.then(() => ScrollTrigger.refresh());
    window.addEventListener('load', () => {
        setTimeout(() => ScrollTrigger.refresh(), 100);
    });
}

// Start with preloader
document.addEventListener('DOMContentLoaded', initPreloader);
