/* AMEVIA — navigation, contact et animations sans dépendance externe. */
(() => {
    'use strict';

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobile = window.matchMedia('(max-width: 768px)');
    const coarsePointer = window.matchMedia('(pointer: coarse)');
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const state = { paused: true, userPaused: null, animations: new Set(), updateVideos: () => {} };

    function listenToMedia(query, callback) {
        if (query.addEventListener) query.addEventListener('change', callback);
        else if (query.addListener) query.addListener(callback);
    }

    function initMotion() {
        const button = document.getElementById('motionToggle');
        const update = () => {
            const restrained = mobile.matches || coarsePointer.matches || Boolean(connection && connection.saveData);
            state.paused = reducedMotion.matches || (state.userPaused === null ? restrained : state.userPaused);
            document.documentElement.classList.toggle('motion-paused', state.paused);
            if (state.paused) {
                state.animations.forEach(animation => animation.cancel());
                state.animations.clear();
            }
            if (button) {
                button.hidden = false;
                button.setAttribute('aria-pressed', String(state.paused));
                button.disabled = reducedMotion.matches;
                button.textContent = reducedMotion.matches
                    ? 'Animations réduites'
                    : state.paused ? 'Activer les animations' : 'Mettre les animations en pause';
            }
            state.updateVideos();
        };
        if (button) button.addEventListener('click', () => {
            state.userPaused = !state.paused;
            update();
        });
        listenToMedia(reducedMotion, update);
        listenToMedia(mobile, update);
        listenToMedia(coarsePointer, update);
        if (connection && connection.addEventListener) connection.addEventListener('change', update);
        update();
    }

    function initVideos() {
        const records = Array.from(document.querySelectorAll('.hero-video, .work-card-media video'), video => {
            video.autoplay = false;
            video.removeAttribute('autoplay');
            video.preload = 'none';
            video.pause();
            return { video, visible: false, pending: false };
        });
        if (!records.length) return;

        const canPlay = record => record.visible && !state.paused && !document.hidden;
        const updateVideo = record => {
            const video = record.video;
            if (!canPlay(record)) {
                video.pause();
                return;
            }
            if (record.pending || !video.paused) return;
            let needsLoad = false;
            [video, ...video.querySelectorAll('source')].forEach(source => {
                if (!source.dataset.src) return;
                source.src = source.dataset.src;
                delete source.dataset.src;
                needsLoad = true;
            });
            if (needsLoad) video.load();
            record.pending = true;
            try {
                Promise.resolve(video.play()).then(() => {
                    if (!canPlay(record)) video.pause();
                }).catch(() => {
                    // Le poster reste disponible si le navigateur refuse la lecture.
                }).finally(() => { record.pending = false; });
            } catch (_) {
                record.pending = false;
            }
        };
        state.updateVideos = () => records.forEach(updateVideo);
        if ('IntersectionObserver' in window) {
            const byVideo = new Map(records.map(record => [record.video, record]));
            const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    const record = byVideo.get(entry.target);
                    record.visible = entry.isIntersecting && entry.intersectionRatio >= 0.1;
                    updateVideo(record);
                });
            }, { threshold: [0, 0.1] });
            records.forEach(record => observer.observe(record.video));
        }
        // Sans observation de visibilité, on conserve les posters et évite la lecture automatique.
        document.addEventListener('visibilitychange', state.updateVideos);
        window.addEventListener('pagehide', () => records.forEach(record => record.video.pause()));
    }

    function initNavigation() {
        const nav = document.getElementById('nav');
        const bar = document.getElementById('scrollProgressBar');
        const links = Array.from(document.querySelectorAll('.nav-link[href^="#"]'));
        const sections = links.map(link => ({ link, section: document.getElementById(link.hash.slice(1)) }))
            .filter(item => item.section);
        let queued = false;
        const update = () => {
            queued = false;
            if (nav) nav.classList.toggle('scrolled', window.scrollY > 24);
            const available = document.documentElement.scrollHeight - window.innerHeight;
            if (bar) bar.style.width = `${available > 0 ? Math.min(100, Math.max(0, window.scrollY / available * 100)) : 0}%`;
            let current = null;
            sections.forEach(item => {
                if (item.section.getBoundingClientRect().top <= window.innerHeight * 0.35) current = item.link;
            });
            links.forEach(link => {
                link.classList.toggle('active', link === current);
                if (link === current) link.setAttribute('aria-current', 'location');
                else link.removeAttribute('aria-current');
            });
        };
        const schedule = () => {
            if (!queued) {
                queued = true;
                window.requestAnimationFrame(update);
            }
        };
        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule);
        window.addEventListener('load', schedule);
        update();
    }

    function initMenu() {
        const toggle = document.getElementById('navToggle');
        const menu = document.getElementById('navLinks');
        if (!toggle || !menu) return;
        const links = Array.from(menu.querySelectorAll('a'));
        const initialTabIndexes = new Map(links.map(link => [link, link.getAttribute('tabindex')]));
        let open = false;
        const setOpen = (next, restoreFocus = false) => {
            open = next && mobile.matches;
            document.body.classList.toggle('menu-open', open);
            toggle.classList.toggle('active', open);
            toggle.setAttribute('aria-expanded', String(open));
            toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
            const hidden = mobile.matches && !open;
            menu.toggleAttribute('inert', hidden);
            if (hidden) menu.setAttribute('aria-hidden', 'true');
            else menu.removeAttribute('aria-hidden');
            links.forEach(link => {
                const original = initialTabIndexes.get(link);
                if (hidden) link.setAttribute('tabindex', '-1');
                else if (original === null) link.removeAttribute('tabindex');
                else link.setAttribute('tabindex', original);
            });
            if (open && links.length) links[0].focus();
            else if (restoreFocus) toggle.focus();
        };
        toggle.addEventListener('click', () => setOpen(!open));
        links.forEach(link => link.addEventListener('click', () => {
            if (!open) return;
            setOpen(false);
            const target = document.getElementById(link.hash.slice(1));
            if (target) {
                if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
                target.focus({ preventScroll: true });
            }
        }));
        menu.addEventListener('click', event => {
            if (event.target === menu && open) setOpen(false, true);
        });
        document.addEventListener('keydown', event => {
            if (!open) return;
            if (event.key === 'Escape') {
                event.preventDefault();
                setOpen(false, true);
            } else if (event.key === 'Tab') {
                const focusable = [...links, toggle];
                const index = focusable.indexOf(document.activeElement);
                if ((event.shiftKey && index <= 0) || (!event.shiftKey && (index === focusable.length - 1 || index === -1))) {
                    event.preventDefault();
                    focusable[event.shiftKey ? focusable.length - 1 : 0].focus();
                }
            }
        });
        listenToMedia(mobile, () => setOpen(false));
        setOpen(false);
    }

    function initReveals() {
        if (!('IntersectionObserver' in window) || !Element.prototype.animate) return;
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                observer.unobserve(entry.target);
                if (state.paused || document.hidden) return;
                const animation = entry.target.animate([
                    { opacity: 0, transform: 'translateY(16px)' },
                    { opacity: 1, transform: 'translateY(0)' }
                ], { duration: 500, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
                state.animations.add(animation);
                animation.finished.then(() => state.animations.delete(animation), () => state.animations.delete(animation));
            });
        }, { threshold: 0.1 });
        document.querySelectorAll('[data-reveal], .hero-eyebrow, .hero-title, .hero-desc, .hero-actions, .hero-showcase')
            .forEach(element => observer.observe(element));
    }

    function initFaq() {
        const items = Array.from(document.querySelectorAll('.faq-item'));
        items.forEach(item => item.addEventListener('toggle', () => {
            if (item.open) items.forEach(other => { if (other !== item) other.open = false; });
        }));
    }

    function initContact() {
        const form = document.getElementById('contactForm');
        if (!form) return;
        const status = document.getElementById('formStatus');
        const button = form.querySelector('button[type="submit"]');
        if (status) {
            status.setAttribute('role', 'status');
            status.setAttribute('aria-live', 'polite');
            status.setAttribute('aria-atomic', 'true');
            status.setAttribute('tabindex', '-1');
        }
        // Les navigateurs sans ces API utilisent l'action HTML et la validation native.
        if (!button || !window.fetch || !window.AbortController) return;
        let submitting = false;
        const setStatus = (message, type, focus = false) => {
            if (!status) return;
            status.textContent = message;
            status.classList.remove('is-success', 'is-error');
            if (type) status.classList.add(`is-${type}`);
            if (focus) status.focus();
        };
        form.addEventListener('submit', async event => {
            event.preventDefault();
            if (submitting) return;
            if (!form.checkValidity()) { form.reportValidity(); return; }
            submitting = true;
            const originalLabel = button.innerHTML;
            const controller = new AbortController();
            const timeout = window.setTimeout(() => controller.abort(), 12000);
            button.disabled = true;
            button.innerHTML = '<span>Envoi en cours…</span>';
            form.setAttribute('aria-busy', 'true');
            setStatus('Envoi de votre message en cours…');
            try {
                const response = await fetch('https://formsubmit.co/ajax/hello@ameviaagency.com', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                    body: JSON.stringify(Object.fromEntries(new FormData(form))),
                    signal: controller.signal
                });
                if (!response.ok) throw new Error('Envoi refusé');
                const result = await response.json();
                if (!result || (result.success !== true && result.success !== 'true')) throw new Error('Envoi non confirmé');
                form.reset();
                setStatus('Merci ! Votre message a bien été envoyé. Nous revenons vers vous sous 24 h.', 'success', true);
            } catch (error) {
                const message = error.name === 'AbortError'
                    ? 'Le délai de réponse est dépassé. Votre message est conservé : réessayez ou écrivez-nous à hello@ameviaagency.com.'
                    : 'L’envoi n’a pas pu être confirmé. Votre message est conservé : réessayez ou écrivez-nous à hello@ameviaagency.com.';
                setStatus(message, 'error', true);
            } finally {
                window.clearTimeout(timeout);
                submitting = false;
                button.disabled = false;
                button.innerHTML = originalLabel;
                form.removeAttribute('aria-busy');
            }
        });
    }

    function initMarquee() {
        const marquee = document.querySelector('.marquee');
        if (!marquee) return;
        marquee.addEventListener('mouseenter', () => marquee.classList.add('is-paused'));
        marquee.addEventListener('mouseleave', () => marquee.classList.remove('is-paused'));
    }

    function boot() {
        // Le contenu et les contrôles essentiels restent indépendants des animations.
        document.documentElement.classList.remove('no-js');
        document.documentElement.classList.add('js');
        const preloader = document.getElementById('preloader');
        if (preloader) preloader.remove();
        const year = document.getElementById('footerYear');
        if (year) year.textContent = String(new Date().getFullYear());
        [initMenu, initNavigation, initFaq, initContact, initMotion, initVideos, initReveals, initMarquee]
            .forEach(init => {
                try { init(); }
                catch (error) { console.error(`[AMEVIA] ${init.name}`, error); }
            });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
    else boot();
})();
