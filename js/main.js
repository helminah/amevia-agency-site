/* ═══════════════════════════════════════════════
   AMEVIA Cinematic — Main Animation Engine v2
   GSAP + ScrollTrigger + Lenis + Custom Canvas
   ═══════════════════════════════════════════════ */

gsap.registerPlugin(ScrollTrigger);

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

/* ═══════════════════════════════════════════════
   APP STATE
   ═══════════════════════════════════════════════ */
const state = {
    lenis: null,
    cursor: { x: 0, y: 0, lx: 0, ly: 0 },
    mouse: { x: 0, y: 0, normX: 0, normY: 0 },
    heroVideo: null,
};

/* ═══════════════════════════════════════════════
   UTILITY — Split Text
   ═══════════════════════════════════════════════ */
function splitText(el, mode = 'words') {
    const text = el.textContent;
    el.innerHTML = '';
    if (mode === 'words') {
        text.trim().split(/\s+/).forEach((w, i, arr) => {
            const span = document.createElement('span');
            span.className = 'word';
            span.style.display = 'inline-block';
            span.style.overflow = 'hidden';
            span.innerHTML = `<span class="word-inner" style="display:inline-block">${w}</span>`;
            el.appendChild(span);
            if (i < arr.length - 1) el.appendChild(document.createTextNode(' '));
        });
    } else if (mode === 'chars') {
        text.split('').forEach(c => {
            const span = document.createElement('span');
            span.className = 'char';
            span.style.display = 'inline-block';
            span.style.overflow = 'hidden';
            const inner = document.createElement('span');
            inner.className = 'char-inner';
            inner.style.display = 'inline-block';
            inner.textContent = c === ' ' ? '\u00A0' : c;
            span.appendChild(inner);
            el.appendChild(span);
        });
    }
}

function getInners(el, mode) {
    return el.querySelectorAll(`.${mode}-inner`);
}

/* ═══════════════════════════════════════════════
   1. LENIS — Smooth Scroll
   ═══════════════════════════════════════════════ */
function initLenis() {
    if (prefersReduced) return;
    state.lenis = new Lenis({ duration: 1.2, easing: t => Math.min(1, 1 - Math.pow(2, -10 * t)), smoothWheel: true });
    function raf(time) {
        state.lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    state.lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => state.lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
}

/* ═══════════════════════════════════════════════
   2. PARTICLE CANVAS — Hero background effect
   ═══════════════════════════════════════════════ */
function initParticles() {
    if (prefersReduced || isTouchDevice) return;
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h, particles = [], running = true;
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
            // mouse repulsion
            const dx = this.x - state.mouse.x;
            const dy = this.y - state.mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < MOUSE_DIST && dist > 0) {
                const force = (MOUSE_DIST - dist) / MOUSE_DIST;
                this.x += (dx / dist) * force * 1.5;
                this.y += (dy / dist) * force * 1.5;
            }
            // bounce
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
                    ctx.strokeStyle = `rgba(0,153,187,${alpha})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        if (!running) return;
        ctx.clearRect(0, 0, w, h);
        particles.forEach(p => { p.update(); p.draw(); });
        drawLines();
        requestAnimationFrame(animate);
    }
    animate();

    // Pause when out of viewport
    const observer = new IntersectionObserver(entries => {
        running = entries[0].isIntersecting;
        if (running) animate();
    }, { threshold: 0.1 });
    observer.observe(canvas);
}

/* ═══════════════════════════════════════════════
   3. HERO SPOTLIGHT — Cursor radial glow
   ═══════════════════════════════════════════════ */
function initHeroSpotlight() {
    if (prefersReduced || isTouchDevice) return;
    const spot = document.getElementById('heroSpotlight');
    if (!spot) return;
    const hero = document.getElementById('hero');
    if (!hero) return;
    hero.addEventListener('mousemove', e => {
        const rect = hero.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        spot.style.setProperty('--mouse-x', x + '%');
        spot.style.setProperty('--mouse-y', y + '%');
    });
}

/* ═══════════════════════════════════════════════
   4. MAGNETIC BUTTONS — Pull towards cursor
   ═══════════════════════════════════════════════ */
function initMagneticButtons() {
    if (prefersReduced || isTouchDevice) return;
    const magnets = document.querySelectorAll('.magnetic');
    const strength = 0.4;
    magnets.forEach(btn => {
        const onMove = e => {
            const rect = btn.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const dx = (e.clientX - cx) * strength;
            const dy = (e.clientY - cy) * strength;
            gsap.to(btn, { x: dx, y: dy, duration: 0.3, ease: 'power2.out' });
        };
        const onLeave = () => {
            gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
        };
        btn.addEventListener('mousemove', onMove);
        btn.addEventListener('mouseleave', onLeave);
    });
}

/* ═══════════════════════════════════════════════
   5. TEXT SCRAMBLE — Nav links decode effect
   ═══════════════════════════════════════════════ */
function initTextScramble() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    const scrambleEls = document.querySelectorAll('[data-scramble]');
    scrambleEls.forEach(el => {
        const original = el.dataset.scramble || el.textContent;
        let frame = 0;
        let interval;
        el.parentElement.addEventListener('mouseenter', () => {
            frame = 0;
            clearInterval(interval);
            interval = setInterval(() => {
                frame++;
                const progress = frame / 12;
                let out = '';
                for (let i = 0; i < original.length; i++) {
                    if (i < Math.floor(progress * original.length)) {
                        out += original[i];
                    } else {
                        out += chars[Math.floor(Math.random() * chars.length)];
                    }
                }
                el.textContent = out;
                if (frame >= 12) {
                    clearInterval(interval);
                    el.textContent = original;
                }
            }, 30);
        });
        el.parentElement.addEventListener('mouseleave', () => {
            clearInterval(interval);
            el.textContent = original;
        });
    });
}

/* ═══════════════════════════════════════════════
   6. SCROLL COLOR SHIFT — Subtle bg transition
   ═══════════════════════════════════════════════ */
function initScrollColorShift() {
    if (prefersReduced) return;
    ScrollTrigger.create({
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1,
        onUpdate: self => {
            const p = self.progress;
            const r = Math.round(245 - p * 8);
            const g = Math.round(247 - p * 4);
            const b = Math.round(243 + p * 6);
            document.body.style.background = `rgb(${r},${g},${b})`;
        }
    });
}

/* ═══════════════════════════════════════════════
   7. PRELOADER — Enhanced with GSAP timeline
   ═══════════════════════════════════════════════ */
function initPreloader() {
    const preloader = document.getElementById('preloader');
    const fill = document.getElementById('preloaderFill');
    if (!preloader || !fill) return;
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15 + 5;
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            setTimeout(() => {
                preloader.classList.add('done');
                setTimeout(() => preloader.remove(), 900);
                if (!prefersReduced) initHeroReveal();
            }, 400);
        }
        fill.style.width = progress + '%';
    }, 100);
}

/* ═══════════════════════════════════════════════
   8. HERO REVEAL — Dramatic entrance
   ═══════════════════════════════════════════════ */
function initHeroReveal() {
    const tl = gsap.timeline({ defaults: { ease: 'expo.out', duration: 1.2 } });
    const video = document.querySelector('.hero-video');
    const lines = document.querySelectorAll('.hero-title .line');
    const eyebrow = document.querySelector('.hero-eyebrow');
    const desc = document.querySelector('.hero-desc');
    const actions = document.querySelector('.hero-actions');
    const scrollInd = document.querySelector('.hero-scroll');

    // Initial states
    gsap.set(lines, { clipPath: 'inset(0 100% 0 0)', opacity: 1 });
    gsap.set(eyebrow, { y: 30, opacity: 0 });
    gsap.set(desc, { y: 30, opacity: 0 });
    gsap.set(actions, { y: 30, opacity: 0 });
    if (scrollInd) gsap.set(scrollInd, { opacity: 0, y: 20 });
    if (video) gsap.set(video, { scale: 1.3, filter: 'blur(20px)' });

    tl
      .to(video, { scale: 1.05, filter: 'blur(0px)', duration: 1.8, ease: 'power3.out' }, 0)
      .to(eyebrow, { y: 0, opacity: 1 }, 0.2)
      .to(lines[0], { clipPath: 'inset(0 0% 0 0)', duration: 0.9 }, 0.35)
      .to(lines[1], { clipPath: 'inset(0 0% 0 0)', duration: 0.9 }, 0.5)
      .to(lines[2], { clipPath: 'inset(0 0% 0 0)', duration: 0.9 }, 0.65)
      .to(lines[3], { clipPath: 'inset(0 0% 0 0)', duration: 0.9 }, 0.8)
      .to(desc, { y: 0, opacity: 1 }, 1.0)
      .to(actions, { y: 0, opacity: 1 }, 1.15)
      .to(scrollInd, { opacity: 1, y: 0 }, 1.4);

    // Parallax on scroll
    if (!prefersReduced) {
        gsap.to(video, {
            y: 120,
            scale: 1.15,
            scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true }
        });
        gsap.to('.hero-content', {
            y: -60,
            opacity: 0,
            scrollTrigger: { trigger: '#hero', start: 'top top', end: '50% top', scrub: true }
        });
        gsap.to('.hero-vignette', {
            opacity: 0.6,
            scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true }
        });
    }
}

/* ═══════════════════════════════════════════════
   9. NAVIGATION
   ═══════════════════════════════════════════════ */
function initNav() {
    const nav = document.getElementById('nav');
    if (!nav) return;
    ScrollTrigger.create({
        trigger: document.body,
        start: '100px top',
        onEnter: () => nav.classList.add('scrolled'),
        onLeaveBack: () => nav.classList.remove('scrolled'),
    });
}

/* ═══════════════════════════════════════════════
   10. MOBILE MENU
   ═══════════════════════════════════════════════ */
function initMobileMenu() {
    const toggle = document.getElementById('navToggle');
    if (!toggle) return;
    toggle.addEventListener('click', () => {
        document.body.classList.toggle('menu-open');
        toggle.classList.toggle('active');
    });
}

/* ═══════════════════════════════════════════════
   11. CUSTOM CURSOR — smooth follow (sans quickTo)
   ═══════════════════════════════════════════════ */
function initCursor() {
    if (prefersReduced || isTouchDevice) return;
    const cursor = document.getElementById('cursor');
    const trail = document.getElementById('cursorTrail');
    if (!cursor || !trail) return;

    let cx = 0, cy = 0, tx = 0, ty = 0;
    document.addEventListener('mousemove', e => {
        cx = e.clientX - 4;
        cy = e.clientY - 4;
        tx = e.clientX - 20;
        ty = e.clientY - 20;
        state.mouse.x = e.clientX;
        state.mouse.y = e.clientY;
    });

    function loop() {
        const cxNow = parseFloat(cursor.style.left || 0);
        const cyNow = parseFloat(cursor.style.top || 0);
        const txNow = parseFloat(trail.style.left || 0);
        const tyNow = parseFloat(trail.style.top || 0);
        const nx = cxNow + (cx - cxNow) * 0.35;
        const ny = cyNow + (cy - cyNow) * 0.35;
        const ntx = txNow + (tx - txNow) * 0.08;
        const nty = tyNow + (ty - tyNow) * 0.08;
        cursor.style.left = nx + 'px';
        cursor.style.top = ny + 'px';
        trail.style.left = ntx + 'px';
        trail.style.top = nty + 'px';
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    document.querySelectorAll('a, button, [data-tilt]').forEach(el => {
        el.addEventListener('mouseenter', () => trail.classList.add('hover'));
        el.addEventListener('mouseleave', () => trail.classList.remove('hover'));
    });
}

/* ═══════════════════════════════════════════════
   12. WORK — HORIZONTAL SCROLL with 3D perspective
   ═══════════════════════════════════════════════ */
function initHorizontalScroll() {
    const section = document.getElementById('work');
    const track = document.getElementById('workTrack');
    if (!section || !track) return;
    const cards = track.querySelectorAll('.work-card');

    const getScroll = () => {
        track.style.width = 'auto';
        return track.scrollWidth - window.innerWidth;
    };

    let tween = gsap.to(track, {
        x: () => -getScroll(),
        ease: 'none',
        scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: () => '+=' + getScroll(),
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
            onUpdate: self => {
                const p = self.progress;
                // Subtle 3D rotation on cards as they scroll
                cards.forEach((card, i) => {
                    const cardProgress = (p * cards.length) - i;
                    const rotY = gsap.utils.clamp(-8, 8, cardProgress * 3);
                    const scale = gsap.utils.clamp(0.92, 1.02, 1 - Math.abs(cardProgress) * 0.04);
                    gsap.set(card, { rotateY: rotY, scale: scale, transformPerspective: 1000 });
                });
            }
        }
    });

    // Staggered entrance for cards
    ScrollTrigger.create({
        trigger: section,
        start: 'top 80%',
        once: true,
        onEnter: () => {
            cards.forEach((card, i) => {
                gsap.from(card, {
                    y: 80,
                    rotateX: 15,
                    opacity: 0,
                    duration: 1,
                    delay: i * 0.12,
                    ease: 'expo.out',
                    transformPerspective: 800
                });
            });
        }
    });

    return tween;
}

/* ═══════════════════════════════════════════════
   13. TILT CARDS — Enhanced 3D hover
   ═══════════════════════════════════════════════ */
function initTiltCards() {
    if (prefersReduced || isTouchDevice) return;
    document.querySelectorAll('[data-tilt]').forEach(card => {
        const onMove = e => {
            const rect = card.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            gsap.to(card, {
                rotateY: x * 12,
                rotateX: -y * 12,
                duration: 0.4,
                ease: 'power2.out',
                transformPerspective: 800
            });
            // Parallax inner image
            const img = card.querySelector('img, video');
            if (img) {
                gsap.to(img, {
                    x: x * 20,
                    y: y * 20,
                    duration: 0.5,
                    ease: 'power2.out'
                });
            }
        };
        const onLeave = () => {
            gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)' });
            const img = card.querySelector('img, video');
            if (img) gsap.to(img, { x: 0, y: 0, duration: 0.6, ease: 'power2.out' });
        };
        card.addEventListener('mousemove', onMove);
        card.addEventListener('mouseleave', onLeave);
    });
}

/* ═══════════════════════════════════════════════
   14. TIMELINE — Scroll-driven progress
   ═══════════════════════════════════════════════ */
function initTimelineScroll() {
    const lineProgress = document.getElementById('timelineProgress');
    if (!lineProgress) return;
    ScrollTrigger.create({
        trigger: '.method-timeline',
        start: 'top 70%',
        end: 'bottom 60%',
        scrub: true,
        onUpdate: self => {
            gsap.set(lineProgress, { height: (self.progress * 100) + '%' });
        }
    });

    document.querySelectorAll('.timeline-step').forEach(step => {
        ScrollTrigger.create({
            trigger: step,
            start: 'top 65%',
            onEnter: () => step.classList.add('active'),
            onLeaveBack: () => step.classList.remove('active')
        });
    });
}

/* ═══════════════════════════════════════════════
   15. GLOBAL REVEALS — All scroll-triggered
   ═══════════════════════════════════════════════ */
function initReveals() {
    const revealMap = {
        'fade-up': { y: 40, opacity: 0 },
        'fade-left': { x: 40, opacity: 0 },
        'fade-right': { x: -40, opacity: 0 },
        'fade': { opacity: 0 },
    };
    const defaults = { y: 30, opacity: 0, duration: 0.9, ease: 'expo.out' };

    Object.keys(revealMap).forEach(attr => {
        const prop = revealMap[attr];
        document.querySelectorAll(`[data-reveal="${attr}"]`).forEach(el => {
            gsap.from(el, {
                ...defaults,
                ...prop,
                scrollTrigger: { trigger: el, start: 'top 85%', once: true }
            });
        });
    });

    // Chars reveal
    document.querySelectorAll('[data-reveal="chars"]').forEach(el => {
        splitText(el, 'chars');
        const inners = getInners(el, 'char');
        gsap.from(inners, {
            y: '100%',
            opacity: 0,
            duration: 0.7,
            stagger: 0.025,
            ease: 'expo.out',
            scrollTrigger: { trigger: el, start: 'top 85%', once: true }
        });
    });

    // Words reveal
    document.querySelectorAll('[data-reveal="words"]').forEach(el => {
        splitText(el, 'words');
        const inners = getInners(el, 'word');
        gsap.from(inners, {
            y: '100%',
            opacity: 0,
            duration: 0.8,
            stagger: 0.04,
            ease: 'expo.out',
            scrollTrigger: { trigger: el, start: 'top 80%', once: true }
        });
    });
}

/* ═══════════════════════════════════════════════
   16. CONTACT — Form enhancements
   ═══════════════════════════════════════════════ */
function initContact() {
    const form = document.getElementById('contactForm');
    if (!form) return;
    form.addEventListener('submit', e => {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        const original = btn.innerHTML;
        btn.innerHTML = '<span>Message envoyé !</span>';
        btn.style.background = 'var(--lime)';
        setTimeout(() => {
            btn.innerHTML = original;
            btn.style.background = '';
            form.reset();
        }, 2500);
    });

    // Focus glow
    form.querySelectorAll('input, textarea').forEach(field => {
        field.addEventListener('focus', () => {
            gsap.to(field.parentElement, { scale: 1.01, duration: 0.3 });
        });
        field.addEventListener('blur', () => {
            gsap.to(field.parentElement, { scale: 1, duration: 0.3 });
        });
    });
}

/* ═══════════════════════════════════════════════
   17. FOOTER YEAR
   ═══════════════════════════════════════════════ */
function initFooter() {
    const y = document.getElementById('footerYear');
    if (y) y.textContent = new Date().getFullYear();
}

/* ═══════════════════════════════════════════════
   18. SERVICE CARD GLOW EFFECT
   ═══════════════════════════════════════════════ */
function initServiceCardGlow() {
    if (prefersReduced || isTouchDevice) return;
    const cards = document.querySelectorAll('.service-card');
    cards.forEach(card => {
        const onMove = e => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--glow-x', x + 'px');
            card.style.setProperty('--glow-y', y + 'px');
        };
        card.addEventListener('mousemove', onMove);
    });
}

/* ═══════════════════════════════════════════════
   19. HERO SECTION PIN
   ═══════════════════════════════════════════════ */
function initHeroPin() {
    const hero = document.getElementById('hero');
    if (!hero || !hero.dataset.pin) return;
    ScrollTrigger.create({
        trigger: hero,
        start: 'top top',
        end: '+=100%',
        pin: true,
        pinSpacing: true
    });
}

/* ═══════════════════════════════════════════════
   BOOT
   ═══════════════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', () => {
    initLenis();
    initPreloader();
    initNav();
    initMobileMenu();
    initCursor();
    initParticles();
    initHeroSpotlight();
    initMagneticButtons();
    initTextScramble();
    initScrollColorShift();
    initHeroPin();
    initHorizontalScroll();
    initTiltCards();
    initTimelineScroll();
    initContact();
    initFooter();
    initServiceCardGlow();
    // Reveals run last
    setTimeout(() => initReveals(), 100);
});
