document.addEventListener('DOMContentLoaded', () => {
    initPreloader(() => {
        const navbar = document.getElementById('navbar');
        const navToggle = document.getElementById('navToggle');
        const mobileMenu = document.getElementById('mobileMenu');
        const progress = document.querySelector('.scroll-progress');

        const setProgress = () => {
            const max = document.documentElement.scrollHeight - window.innerHeight;
            const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
            progress.style.width = `${pct}%`;
            navbar.classList.toggle('is-scrolled', window.scrollY > 40);
        };

        setProgress();
        window.addEventListener('scroll', setProgress, { passive: true });

        navToggle?.addEventListener('click', () => {
            mobileMenu.classList.toggle('is-open');
            navToggle.classList.toggle('is-open');
        });

        document.querySelectorAll('a[href^="#"]').forEach((link) => {
            link.addEventListener('click', (event) => {
                const target = document.querySelector(link.getAttribute('href'));
                if (!target) return;
                event.preventDefault();
                mobileMenu.classList.remove('is-open');
                navToggle?.classList.remove('is-open');
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });

        splitKineticTitles();
        initTextScramble();
        initShaderCanvas();
        initCardLight();
        initCursor();
        initForm();

        if (!window.gsap || !window.ScrollTrigger || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            initFallback();
            return;
        }

        gsap.registerPlugin(ScrollTrigger);
        initMotion();
        initCharReveal();
        initMagneticButtons();
        initTiltCards();
        initImageReveal();
        initLineDraw();
        initTypewriter();
        initHeroMouseParallax();
    });
});

function splitKineticTitles() {
    document.querySelectorAll('[data-split="words"]').forEach((title) => {
        if (title.dataset.splitted === 'true') return;
        const words = title.textContent.trim().split(/\s+/);
        title.textContent = '';
        words.forEach((word, index) => {
            const wrap = document.createElement('span');
            wrap.className = 'word-wrap';
            const span = document.createElement('span');
            span.className = 'word';
            span.textContent = word;
            wrap.appendChild(span);
            title.append(wrap);
            if (index < words.length - 1) title.append(' ');
        });
        title.dataset.splitted = 'true';
    });
}

function initCursor() {
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const dot = document.querySelector('.cursor');
    const ring = document.querySelector('.cursor-ring');
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;

    window.addEventListener('mousemove', (event) => {
        mouseX = event.clientX;
        mouseY = event.clientY;
        dot.style.left = `${mouseX}px`;
        dot.style.top = `${mouseY}px`;
    });

    const render = () => {
        ringX += (mouseX - ringX) * 0.14;
        ringY += (mouseY - ringY) * 0.14;
        ring.style.left = `${ringX}px`;
        ring.style.top = `${ringY}px`;
        requestAnimationFrame(render);
    };

    render();

    document.querySelectorAll('a, button, .project-card, .service-card, input, select, textarea').forEach((item) => {
        item.addEventListener('mouseenter', () => ring.classList.add('is-hovering'));
        item.addEventListener('mouseleave', () => ring.classList.remove('is-hovering'));
    });
}

function initCardLight() {
    document.querySelectorAll('.service-card').forEach((card) => {
        card.addEventListener('pointermove', (event) => {
            const rect = card.getBoundingClientRect();
            const x = ((event.clientX - rect.left) / rect.width) * 100;
            const y = ((event.clientY - rect.top) / rect.height) * 100;
            card.style.setProperty('--mx', `${x}%`);
            card.style.setProperty('--my', `${y}%`);
        });
    });
}

function initShaderCanvas() {
    const canvas = document.getElementById('shaderCanvas');
    if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const gl = canvas.getContext('webgl', { antialias: false, alpha: true, powerPreference: 'high-performance' });
    if (!gl) return;

    const vertexSource = `
        attribute vec2 position;
        void main() {
            gl_Position = vec4(position, 0.0, 1.0);
        }
    `;

    const fragmentSource = `
        precision highp float;
        uniform vec2 resolution;
        uniform vec2 pointer;
        uniform float time;

        float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(
                mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
                u.y
            );
        }

        float fbm(vec2 p) {
            float v = 0.0;
            float a = 0.5;
            for (int i = 0; i < 5; i++) {
                v += a * noise(p);
                p = mat2(1.7, -1.1, 1.1, 1.7) * p + 0.13;
                a *= 0.52;
            }
            return v;
        }

        void main() {
            vec2 uv = gl_FragCoord.xy / resolution.xy;
            vec2 p = uv;
            p.x *= resolution.x / resolution.y;

            vec2 m = pointer / resolution;
            m.x *= resolution.x / resolution.y;
            float d = distance(p, m);

            float flow = fbm(p * 2.2 + vec2(time * 0.045, -time * 0.025));
            float caustic = sin((p.x + flow * 0.48) * 15.0 + time * 0.72) * sin((p.y - flow * 0.32) * 18.0 - time * 0.55);
            caustic = smoothstep(0.42, 0.98, caustic);

            float liquid = fbm(p * 4.5 + flow + time * 0.03);
            float pointerGlow = smoothstep(0.55, 0.0, d) * 0.55;

            vec3 cyan = vec3(0.00, 0.56, 0.70);
            vec3 lime = vec3(0.52, 0.78, 0.25);
            vec3 coral = vec3(0.90, 0.28, 0.22);
            vec3 cream = vec3(0.96, 0.97, 0.93);

            vec3 color = mix(cream, cyan, flow * 0.42);
            color = mix(color, lime, liquid * 0.22);
            color = mix(color, coral, caustic * 0.16);
            color += pointerGlow * vec3(0.10, 0.42, 0.46);

            float alpha = 0.28 + caustic * 0.18 + pointerGlow * 0.22;
            gl_FragColor = vec4(color, alpha);
        }
    `;

    const createShader = (type, source) => {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    };

    const vertex = createShader(gl.VERTEX_SHADER, vertexSource);
    const fragment = createShader(gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertex || !fragment) return;

    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    const position = gl.getAttribLocation(program, 'position');
    const resolution = gl.getUniformLocation(program, 'resolution');
    const pointer = gl.getUniformLocation(program, 'pointer');
    const time = gl.getUniformLocation(program, 'time');
    const mouse = { x: window.innerWidth * 0.72, y: window.innerHeight * 0.36 };

    window.addEventListener('pointermove', (event) => {
        mouse.x = event.clientX;
        mouse.y = window.innerHeight - event.clientY;
    }, { passive: true });

    const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(window.innerWidth * dpr);
        canvas.height = Math.floor(window.innerHeight * dpr);
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
        gl.viewport(0, 0, canvas.width, canvas.height);
    };

    resize();
    window.addEventListener('resize', resize);

    const start = performance.now();
    const render = () => {
        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
        gl.uniform2f(resolution, canvas.width, canvas.height);
        gl.uniform2f(pointer, mouse.x * (canvas.width / window.innerWidth), mouse.y * (canvas.height / window.innerHeight));
        gl.uniform1f(time, (performance.now() - start) / 1000);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        requestAnimationFrame(render);
    };

    render();
}

function initMotion() {
    gsap.from('.hero .word', {
        yPercent: 100,
        opacity: 0,
        rotateX: -65,
        filter: 'blur(12px)',
        transformOrigin: '50% 100%',
        duration: 1,
        ease: 'power4.out',
        stagger: 0.035
    });

    gsap.from('.hero-copy .eyebrow, .hero-copy p:not(.eyebrow), .hero-actions', {
        y: 28,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.1
    });

    gsap.from('.mockup-card', {
        y: 56,
        opacity: 0,
        rotate: -2,
        duration: 1,
        ease: 'power3.out',
        stagger: 0.12
    });

    gsap.from('.motion-badge', {
        y: 24,
        opacity: 0,
        scale: 0.92,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.12,
        delay: 0.3
    });

    gsap.to('.motion-badge-a', {
        y: -12,
        rotate: 2,
        duration: 2.8,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
    });

    gsap.to('.motion-badge-b', {
        y: 14,
        rotate: -2,
        duration: 3.2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
    });

    gsap.to('.hero-video', {
        yPercent: 10,
        scale: 1.08,
        ease: 'none',
        scrollTrigger: {
            trigger: '.hero',
            start: 'top top',
            end: 'bottom top',
            scrub: true
        }
    });

    gsap.utils.toArray('.kinetic-title').forEach((title) => {
        if (title.closest('.hero')) return;
        gsap.from(title.querySelectorAll('.word'), {
            yPercent: 90,
            opacity: 0,
            rotateX: -55,
            filter: 'blur(10px)',
            transformOrigin: '50% 100%',
            duration: 0.85,
            ease: 'power4.out',
            stagger: 0.024,
            scrollTrigger: {
                trigger: title,
                start: 'top 84%',
                once: true
            }
        });
    });

    gsap.utils.toArray('.mockup-card, .project-card img, .brand-image img').forEach((image) => {
        gsap.to(image, {
            yPercent: -7,
            scale: 1.035,
            ease: 'none',
            scrollTrigger: {
                trigger: image,
                start: 'top bottom',
                end: 'bottom top',
                scrub: true
            }
        });
    });

    gsap.utils.toArray('.project-card, .service-card, .site-feature, .method-steps article, .brand-image, .contact-form, .proof-strip div').forEach((item) => {
        gsap.from(item, {
            y: 44,
            opacity: 0,
            duration: 0.85,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: item,
                start: 'top 86%',
                once: true
            }
        });
    });

    gsap.utils.toArray('[data-count]').forEach((number) => {
        const value = Number(number.dataset.count);
        gsap.from(number, {
            textContent: 0,
            duration: 1.7,
            ease: 'power2.out',
            snap: { textContent: 1 },
            scrollTrigger: {
                trigger: number,
                start: 'top 88%',
                once: true
            },
            onUpdate() {
                number.textContent = Math.round(Number(number.textContent));
            }
        });
    });

    gsap.from('.hero-video', {
        scale: 1.12,
        duration: 1.6,
        ease: 'power2.out',
        delay: 0.1
    });

    const floatingCta = document.getElementById('floatingCta');
    if (floatingCta) {
        let ctaShown = false;
        const ctaToggle = () => {
            if (window.scrollY > 400 && !ctaShown) {
                ctaShown = true;
                floatingCta.classList.add('is-visible');
            } else if (window.scrollY <= 200 && ctaShown) {
                ctaShown = false;
                floatingCta.classList.remove('is-visible');
            }
        };
        window.addEventListener('scroll', ctaToggle, { passive: true });
        ctaToggle();
    }
}

function initFallback() {
    const revealItems = document.querySelectorAll('.project-card, .service-card, .site-feature, .method-steps article, .brand-image, .contact-form, .proof-strip div');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.animate(
                [
                    { transform: 'translateY(24px)', opacity: 0 },
                    { transform: 'translateY(0)', opacity: 1 }
                ],
                { duration: 650, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'both' }
            );
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.12 });

    revealItems.forEach((item) => observer.observe(item));
}

function initForm() {
    const contactForm = document.getElementById('contactForm');
    const formStatus = document.getElementById('formStatus');
    if (!contactForm || !formStatus) return;

    contactForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const button = contactForm.querySelector('button[type="submit"]');
        const btnText = button.querySelector('.btn-text');
        const btnLoader = button.querySelector('.btn-loader');
        const data = Object.fromEntries(new FormData(contactForm));
        if (data.website) {
            formStatus.textContent = 'Message envoye. AMEVIA vous repond sous 24h.';
            formStatus.className = 'form-status success';
            contactForm.reset();
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
            button.disabled = false;
            return;
        }

        btnText.style.display = 'none';
        btnLoader.style.display = 'block';
        button.disabled = true;

        try {
            const response = await fetch('https://formspree.io/f/xjkyqgdl', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) throw new Error('Formspree rejected the message');

            formStatus.textContent = 'Message envoye. AMEVIA vous repond sous 24h.';
            formStatus.className = 'form-status success';
            contactForm.reset();
        } catch (error) {
            formStatus.textContent = 'Envoi impossible ici. Ecrivez directement a contact@amevia.com.';
            formStatus.className = 'form-status error';
        } finally {
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
            button.disabled = false;
        }
    });
}

function initPreloader(onDone) {
    const preloader = document.getElementById('preloader');
    if (!preloader || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        if (preloader) preloader.classList.add('is-done');
        onDone?.();
        return;
    }

    document.body.style.overflow = 'hidden';
    const letters = preloader.querySelectorAll('.preloader-letter');
    const percent = document.getElementById('preloaderPercent');
    const barFill = document.getElementById('preloaderBarFill');
    const duration = 600;
    const stagger = 100;
    const MIN_LOAD_TIME = 1400;
    const MAX_LOAD_TIME = 3200;

    const startTime = performance.now();

    letters.forEach((letter, index) => {
        setTimeout(() => {
            letter.style.transition = `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1), transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1), filter ${duration}ms cubic-bezier(0.16, 1, 0.3, 1)`;
            letter.style.opacity = '1';
            letter.style.transform = 'translateY(0) rotateX(0deg) scale(1)';
            letter.style.filter = 'blur(0px)';
        }, index * stagger + 200);
    });

    if (percent) {
        setTimeout(() => { percent.style.opacity = '1'; }, 400);
    }

    const criticalImages = [
        'assets/images/logo.png',
        'assets/images/real-lengor-screen.jpg'
    ];

    const imagePromises = criticalImages.map((src) => new Promise((resolve) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = resolve;
        img.src = src;
    }));

    const fontPromise = document.fonts?.ready ? document.fonts.ready : Promise.resolve();

    let currentPercent = 0;
    let percentInterval;

    const updatePercent = () => {
        currentPercent += Math.floor(Math.random() * 3) + 2;
        if (currentPercent >= 95) currentPercent = 95;
        if (percent) percent.textContent = currentPercent + '%';
        if (barFill) barFill.style.width = currentPercent + '%';
    };

    percentInterval = setInterval(updatePercent, 50);

    Promise.all([...imagePromises, fontPromise]).then(() => {
        const elapsed = performance.now() - startTime;
        const remaining = Math.max(MIN_LOAD_TIME - elapsed, 0);

        setTimeout(() => {
            clearInterval(percentInterval);
            if (percent) percent.textContent = '100%';
            if (barFill) barFill.style.width = '100%';

            setTimeout(() => {
                preloader.classList.add('is-done');
                document.body.style.overflow = '';
                document.body.classList.add('page-is-ready');
                onDone?.();
            }, 300);
        }, remaining);
    });

    setTimeout(() => {
        clearInterval(percentInterval);
        if (!preloader.classList.contains('is-done')) {
            preloader.classList.add('is-done');
            document.body.style.overflow = '';
            document.body.classList.add('page-is-ready');
            onDone?.();
        }
    }, MAX_LOAD_TIME);
}

function initTextScramble() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    document.querySelectorAll('[data-scramble]').forEach((el) => {
        const original = el.textContent;
        el.classList.add('is-scrambled');

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                observer.unobserve(el);

                let iteration = 0;
                const interval = setInterval(() => {
                    el.textContent = original
                        .split('')
                        .map((char, index) => {
                            if (char === ' ') return ' ';
                            if (index < iteration) return original[index];
                            return chars[Math.floor(Math.random() * chars.length)];
                        })
                        .join('');

                    if (iteration >= original.length) clearInterval(interval);
                    iteration += 1 / 2;
                }, 28);
            });
        }, { threshold: 0.5 });

        observer.observe(el);
    });
}

function initMagneticButtons() {
    if (!window.matchMedia('(pointer: fine)').matches) return;

    document.querySelectorAll('.btn, .nav-action').forEach((btn) => {
        btn.classList.add('btn-magnetic');
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = '';
        });
    });
}

function initTiltCards() {
    if (!window.matchMedia('(pointer: fine)').matches) return;

    document.querySelectorAll('.project-card, .service-card').forEach((card) => {
        card.classList.add('tilt-card');
        const shine = document.createElement('div');
        shine.className = 'tilt-shine';
        card.appendChild(shine);

        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            const rotateX = (0.5 - y) * 12;
            const rotateY = (x - 0.5) * 12;
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
            shine.style.background = `linear-gradient(${135 + rotateY * 3}deg, rgba(255,255,255,${0.3 + x * 0.2}) 0%, transparent 50%, rgba(255,255,255,0.05) 100%)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    });
}

function initImageReveal() {
    document.querySelectorAll('.project-card a, .brand-image').forEach((container) => {
        container.classList.add('image-reveal');
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.2 });

    document.querySelectorAll('.image-reveal').forEach((el) => observer.observe(el));
}

function initLineDraw() {
    const sections = document.querySelectorAll('section');
    sections.forEach((section, index) => {
        if (index === sections.length - 1) return;
        const line = document.createElement('div');
        line.className = 'line-draw';
        section.after(line);
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-drawn');
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('.line-draw').forEach((el) => observer.observe(el));
}

function initTypewriter() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const target = document.querySelector('.footer-tagline');
    if (!target || target.dataset.typewriter === 'true') return;
    target.dataset.typewriter = 'true';

    const text = target.textContent;
    target.innerHTML = '<span class="typewriter-text"></span><span class="typewriter-cursor"></span>';
    const span = target.querySelector('.typewriter-text');
    let i = 0;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            observer.unobserve(target);
            const interval = setInterval(() => {
                span.textContent += text[i];
                i++;
                if (i >= text.length) clearInterval(interval);
            }, 60);
        });
    }, { threshold: 0.5 });

    observer.observe(target);
}

function initHeroMouseParallax() {
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const showcase = document.querySelector('.hero-showcase');
    if (!showcase) return;
    showcase.classList.add('is-parallax');

    const cards = showcase.querySelectorAll('.mockup-card');
    document.querySelector('.hero').addEventListener('mousemove', (e) => {
        const rect = showcase.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;

        cards.forEach((card, index) => {
            const depth = (index + 1) * 6;
            card.style.transform = `translate(${x * depth}px, ${y * depth}px)`;
        });
    });
}

function initCharReveal() {
    if (!window.gsap || !window.ScrollTrigger) return;

    document.querySelectorAll('.site-feature h3, .project-card h3, .service-card h3').forEach((heading) => {
        if (heading.dataset.charRevealed) return;
        const text = heading.textContent;
        heading.innerHTML = '';
        text.split('').forEach((char) => {
            const span = document.createElement('span');
            span.className = 'char';
            span.textContent = char === ' ' ? '\u00A0' : char;
            heading.appendChild(span);
        });
        heading.dataset.charRevealed = 'true';
    });

    gsap.utils.toArray('.site-feature h3, .project-card h3, .service-card h3').forEach((heading) => {
        gsap.from(heading.querySelectorAll('.char'), {
            y: 20,
            opacity: 0,
            filter: 'blur(6px)',
            duration: 0.6,
            ease: 'power3.out',
            stagger: 0.015,
            scrollTrigger: {
                trigger: heading,
                start: 'top 88%',
                once: true
            }
        });
    });

    gsap.utils.toArray('.testimonial-card').forEach((card, index) => {
        gsap.from(card, {
            y: 40,
            opacity: 0,
            duration: 0.8,
            ease: 'power3.out',
            delay: index * 0.1,
            scrollTrigger: {
                trigger: card,
                start: 'top 88%',
                once: true
            }
        });
    });

    gsap.utils.toArray('.faq-item').forEach((item, index) => {
        gsap.from(item, {
            y: 30,
            opacity: 0,
            duration: 0.7,
            ease: 'power3.out',
            delay: index * 0.08,
            scrollTrigger: {
                trigger: item,
                start: 'top 90%',
                once: true
            }
        });
    });
}
