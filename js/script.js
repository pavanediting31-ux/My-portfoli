/* ==========================================================================
   PAVAN PORTFOLIO — HIGH PERFORMANCE SMOOTH SCRIPT
   Strict 60/120 FPS Video Carousel & Lenis Smooth Scroll Engine
   ========================================================================== */

import { db, isFirebaseConfigured, collection, onSnapshot, doc, setDoc } from './firebase-config.js';


document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Single Clean Lenis Smooth Scroll Instance ---
    let lenis = null;
    if (typeof Lenis !== 'undefined') {
        lenis = new Lenis({
            duration: 0.9,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothTouch: false,
            touchMultiplier: 1.5,
            mouseMultiplier: 0.9
        });

        function raf(time) {
            if (lenis) lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);

        if (typeof ScrollTrigger !== 'undefined') {
            lenis.on('scroll', ScrollTrigger.update);
        }
    }

    // --- 2. Dynamic Preloader ---
    const preloader = document.getElementById('preloader');
    const preloaderCounter = document.getElementById('preloaderCounter');
    const preloaderBar = document.getElementById('preloaderBar');

    if (preloader) {
        let progress = 0;
        const interval = setInterval(() => {
            progress += 15;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                preloader.classList.add('fade-out');
                initHeroAnimations();
            }
            if (preloaderCounter) preloaderCounter.textContent = progress.toString().padStart(2, '0');
            if (preloaderBar) preloaderBar.style.width = `${progress}%`;
        }, 30);
    }

    // --- 3. Hardware Accelerated Smooth Cursor ---
    const cursor = document.getElementById('customCursor');
    const cursorDot = document.getElementById('customCursorDot');
    const cursorLabel = document.getElementById('cursorLabel');

    if (cursor && cursorDot) {
        let mouseX = -100, mouseY = -100;
        let cursorX = -100, cursorY = -100;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            cursorDot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
        });

        function animateCursor() {
            cursorX += (mouseX - cursorX) * 0.2;
            cursorY += (mouseY - cursorY) * 0.2;
            cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;
            requestAnimationFrame(animateCursor);
        }
        animateCursor();

        // Hover scale effects
        document.querySelectorAll('a, button, .stacked-card, .video-card').forEach(el => {
            el.addEventListener('mouseenter', () => cursor.classList.add('active'));
            el.addEventListener('mouseleave', () => {
                cursor.classList.remove('active');
                if (cursorLabel) cursorLabel.textContent = '';
            });
        });
    }

// --- 4. Hero Entrance Animations ---
function initHeroAnimations() {
    if (typeof gsap !== 'undefined') {
        gsap.from('.minimal-logo-visual', { scale: 0.8, opacity: 0, duration: 0.8, ease: 'power2.out' });
        gsap.from('.minimal-title', { y: 30, opacity: 0, duration: 0.8, delay: 0.1, ease: 'power2.out' });
        gsap.from('.minimal-subtitle', { y: 20, opacity: 0, duration: 0.7, delay: 0.2, ease: 'power2.out' });
        gsap.from('.hero-actions', { y: 15, opacity: 0, duration: 0.6, delay: 0.3, ease: 'power2.out' });
    }
}

// --- 5. 3D Stack Carousel (Lazy Video Loading for Zero GPU Lag) ---
const p3dContainer = document.getElementById('p3dContainer');
let stackedCards = [];
let currentStackIndex = 0;

// Helper to get video thumbnail image URL (YouTube, etc.)
function getVideoThumbnailUrl(urlInput) {
    if (!urlInput) return '';
    const cleanUrl = urlInput.trim();
    const ytMatch = cleanUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i);
    if (ytMatch && ytMatch[1]) {
        return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
    }
    return '';
}

function renderHomepageReels(videoDataset) {
    if (!p3dContainer) return;

    const allVideos = videoDataset !== undefined ? videoDataset : getStoredVideos();
    // Strictly filter ONLY video items where isFeatured === true (Max 5)
    const featured = allVideos.filter(v => v.isFeatured && v.category !== 'Thumbnails' && v.category !== 'Thumbnail Design').slice(0, 5);

    const existingNav = p3dContainer.querySelector('.p3d-nav');
    p3dContainer.innerHTML = '';
    if (existingNav) p3dContainer.appendChild(existingNav);

    const p3dNav = p3dContainer.querySelector('.p3d-nav');

    if (featured.length === 0) {
        if (p3dNav) p3dNav.style.display = 'none';
        const emptyNotice = document.createElement('div');
        emptyNotice.style.cssText = 'grid-column: 1/-1; text-align: center; color: var(--muted-color); padding: 4rem 1rem; width: 100%;';
        emptyNotice.innerHTML = `
                <i class="fa-solid fa-film" style="font-size: 2.5rem; margin-bottom: 1rem; opacity: 0.4;"></i>
                <p style="font-size: 1.1rem; font-weight: 500; margin-bottom: 0.35rem;">No Top Reels Selected for Homepage</p>
                <p style="font-size: 0.85rem; opacity: 0.7;">Enable "Feature on Homepage (Top 5 Featured Reels Slider)" in Admin Panel to feature videos here.</p>
            `;
        p3dContainer.appendChild(emptyNotice);
        stackedCards = [];
        return;
    }

    if (p3dNav) p3dNav.style.display = 'flex';

    featured.forEach((video, index) => {
        const card = document.createElement('div');
        card.className = 'stacked-card';
        card.setAttribute('data-index', index);
        card.setAttribute('data-url', video.url);

        const videoCategory = video.category || 'Featured Reel';
        const videoTitle = video.title || 'Cinematic Reel';
        const isVert = video.orientation === 'vertical';
        const ytThumb = getVideoThumbnailUrl(video.url);

        const mediaPreview = ytThumb
            ? `<img src="${ytThumb}" class="card-thumb-img" alt="${videoTitle}" style="width:100%; height:100%; object-fit:cover;">`
            : renderUniversalVideoHTML(video.url, { autoplay: false, muted: true, controls: false, class: 'card-thumb-video' });

        card.innerHTML = `
                <div class="card-video-wrapper">${mediaPreview}</div>
                <div class="card-overlay-gradient"></div>
                <div class="card-top-badge">
                    <span class="badge-tag">${videoCategory.toUpperCase()}</span>
                </div>
                <div class="p3d-play-btn">
                    <div class="play-pulse-ring"></div>
                    <i class="fa-solid fa-play"></i>
                </div>
                <div class="card-bottom-info">
                    <h4 class="card-video-title">${videoTitle}</h4>
                    <span class="card-video-meta">${isVert ? '9:16 Vertical Reel' : '16:9 Edit'}</span>
                </div>
            `;

        p3dContainer.appendChild(card);
    });

    stackedCards = Array.from(p3dContainer.querySelectorAll('.stacked-card'));
    currentStackIndex = 0;
    if (stackedCards.length > 0) {
        updateStackLayout();
    }
}

function updateStackLayout() {
    if (stackedCards.length === 0) return;

    const total = stackedCards.length;
    stackedCards.forEach((card, i) => {
        let offset = i - currentStackIndex;

        if (offset > Math.floor(total / 2)) offset -= total;
        if (offset < -Math.floor(total / 2)) offset += total;

        card.className = 'stacked-card';

        if (offset === 0) {
            card.classList.add('active');
        } else {
            if (offset === 1) card.classList.add('right-1');
            else if (offset === -1) card.classList.add('left-1');
            else if (offset === 2) card.classList.add('right-2');
            else if (offset === -2) card.classList.add('left-2');
            else if (offset > 0) card.classList.add('hidden-right');
            else card.classList.add('hidden-left');

            // STOP any playing video on non-active cards immediately
            card.classList.remove('playing');
            const wrapper = card.querySelector('.card-video-wrapper');
            if (wrapper) {
                const vid = wrapper.querySelector('video');
                if (vid) {
                    vid.pause();
                    try { vid.currentTime = 0; } catch (e) { }
                    vid.muted = true;
                    vid.removeAttribute('controls');
                }
            }
        }
    });
}

function stopCurrentActiveVideo() {
    const currentCard = stackedCards[currentStackIndex];
    if (currentCard) {
        currentCard.classList.remove('playing');
        const wrapper = currentCard.querySelector('.card-video-wrapper');
        if (wrapper) {
            const vid = wrapper.querySelector('video');
            if (vid) {
                vid.pause();
                try { vid.currentTime = 0; } catch (e) { }
                vid.muted = true;
                vid.removeAttribute('controls');
            }
        }
    }
}

function startActiveVideoPlayback() {
    const activeCard = stackedCards[currentStackIndex];
    if (!activeCard) return;

    const wrapper = activeCard.querySelector('.card-video-wrapper');
    const videoUrl = activeCard.getAttribute('data-url');
    if (!wrapper) return;

    activeCard.classList.add('playing');

    let vid = wrapper.querySelector('video');

    if (!vid && !wrapper.querySelector('iframe')) {
        wrapper.innerHTML = renderUniversalVideoHTML(videoUrl, { autoplay: true, muted: false, controls: true });
        vid = wrapper.querySelector('video');
    }

    if (vid) {
        vid.muted = false;
        vid.controls = true;
        vid.playsInline = true;
        vid.setAttribute('playsinline', '');
        vid.setAttribute('webkit-playsinline', '');
        vid.play().catch(() => {
            // Mobile browser fallback if unmuted audio is blocked by user interaction policy
            vid.muted = true;
            vid.play().catch(e => console.warn("Mobile playback fallback:", e));
        });
    }
}

function nextStackCard() {
    if (stackedCards.length === 0) return;
    stopCurrentActiveVideo();
    currentStackIndex = (currentStackIndex + 1) % stackedCards.length;
    updateStackLayout();
    startActiveVideoPlayback();
}

function prevStackCard() {
    if (stackedCards.length === 0) return;
    stopCurrentActiveVideo();
    currentStackIndex = (currentStackIndex - 1 + stackedCards.length) % stackedCards.length;
    updateStackLayout();
    startActiveVideoPlayback();
}

const p3dNext = document.getElementById('p3dNext');
const p3dPrev = document.getElementById('p3dPrev');

if (p3dNext) p3dNext.addEventListener('click', (e) => { e.stopPropagation(); nextStackCard(); });
if (p3dPrev) p3dPrev.addEventListener('click', (e) => { e.stopPropagation(); prevStackCard(); });

if (p3dContainer) {
    p3dContainer.addEventListener('click', (e) => {
        const card = e.target.closest('.stacked-card');
        if (!card) return;
        const index = parseInt(card.getAttribute('data-index'));
        if (index !== currentStackIndex) {
            stopCurrentActiveVideo();
            currentStackIndex = index;
            updateStackLayout();
            startActiveVideoPlayback();
        } else {
            // Click active card: toggle play / pause with audio & controls
            const wrapper = card.querySelector('.card-video-wrapper');
            const videoUrl = card.getAttribute('data-url');
            if (!wrapper) return;

            const isPlaying = card.classList.contains('playing');

            if (isPlaying) {
                // Pause currently playing active video
                card.classList.remove('playing');
                const vid = wrapper.querySelector('video');
                if (vid) vid.pause();
            } else {
                startActiveVideoPlayback();
            }
        }
    });
}

// Universal Video & Thumbnail Media Parser
function parseVideoEmbed(urlInput, isThumbnail = false) {
    if (!urlInput) return { type: 'image', url: '' };

    let cleanUrl = urlInput.trim();

    // 1. Raw iframe code snippet <iframe src="xxx"...>
    if (cleanUrl.includes('<iframe') && cleanUrl.includes('src=')) {
        const srcMatch = cleanUrl.match(/src=["']([^"']+)["']/i);
        if (srcMatch && srcMatch[1]) {
            cleanUrl = srcMatch[1];
        }
    }

    // 2. Canva Embed links
    if (cleanUrl.includes('canva.com')) {
        let embedUrl = cleanUrl;
        if (isThumbnail) {
            if (embedUrl.includes('/watch?embed')) {
                embedUrl = embedUrl.replace('/watch?embed', '/view?embed');
            } else if (!embedUrl.includes('embed')) {
                embedUrl = embedUrl + (embedUrl.includes('?') ? '&embed' : '?embed');
            }
        } else {
            if (embedUrl.includes('/view') && !embedUrl.includes('embed')) {
                embedUrl = embedUrl.replace('/view', '/watch?embed');
            } else if (!embedUrl.includes('embed')) {
                embedUrl = embedUrl + (embedUrl.includes('?') ? '&embed' : '?embed');
            }
        }
        return { type: 'iframe', url: embedUrl };
    }

    // 3. YouTube (Standard, Shorts, Youtu.be)
    const ytMatch = cleanUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i);
    if (ytMatch && ytMatch[1]) {
        if (isThumbnail) {
            return { type: 'image', url: `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg` };
        }
        const videoId = ytMatch[1];
        const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&playsinline=1&enablejsapi=1`;
        return { type: 'iframe', url: embedUrl };
    }

    // 4. Strict Thumbnail Mode: All Cloudinary, Firebase Storage, Google Drive & direct links MUST render as pure Images!
    if (isThumbnail) {
        if (cleanUrl.includes('drive.google.com')) {
            const driveMatch = cleanUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (driveMatch && driveMatch[1]) {
                return { type: 'image', url: `https://drive.google.com/uc?export=view&id=${driveMatch[1]}` };
            }
        }
        return { type: 'image', url: cleanUrl };
    }

    // 5. Direct Image files (.jpg, .jpeg, .png, .gif, .webp, .svg, Unsplash, Imgur)
    if (/\.(jpeg|jpg|png|gif|webp|svg)(\?.*)?$/i.test(cleanUrl) || cleanUrl.includes('images.unsplash.com') || cleanUrl.includes('imgur.com')) {
        return { type: 'image', url: cleanUrl };
    }

    // 6. Vimeo
    const vimeoMatch = cleanUrl.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)/i);
    if (vimeoMatch && vimeoMatch[1]) {
        const videoId = vimeoMatch[1];
        const embedUrl = `https://player.vimeo.com/video/${videoId}?autoplay=1&muted=1&loop=1&playsinline=1`;
        return { type: 'iframe', url: embedUrl };
    }

    // 7. Google Drive Video
    if (cleanUrl.includes('drive.google.com')) {
        const driveMatch = cleanUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (driveMatch && driveMatch[1]) {
            const embedUrl = `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
            return { type: 'iframe', url: embedUrl };
        }
    }

    // 8. Generic Iframe / Embed links (Streamable, Wistia, Loom, etc.)
    if (cleanUrl.includes('/embed') || cleanUrl.includes('player.')) {
        return { type: 'iframe', url: cleanUrl };
    }

    // Default: Direct Video URL (MP4, WebM)
    return { type: 'video', url: cleanUrl };
}

function renderUniversalVideoHTML(urlInput, options = {}) {
    const isThumbnail = options.isThumbnail || false;
    const parsed = parseVideoEmbed(urlInput, isThumbnail);
    const extraClass = options.class ? `class="${options.class}"` : '';
    const pointerEvents = isThumbnail ? 'pointer-events:none;' : 'pointer-events:auto;';

    if (parsed.type === 'image') {
        return `<img src="${parsed.url}" ${extraClass} alt="Thumbnail Graphic" loading="lazy" style="width:100%; height:100%; object-fit:cover; display:block;">`;
    } else if (parsed.type === 'iframe') {
        return `<iframe src="${parsed.url}" ${extraClass} frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" allowfullscreen style="width:100%; height:100%; border:none; ${pointerEvents}"></iframe>`;
    } else {
        const controls = (options.controls && !isThumbnail) ? 'controls' : '';
        const autoplay = options.autoplay !== false ? 'autoplay' : '';
        const muted = (options.muted || options.autoplay) ? 'muted' : '';
        const loop = options.loop !== false ? 'loop' : '';
        return `<video src="${parsed.url}#t=0.1" ${extraClass} ${controls} ${autoplay} ${muted} ${loop} playsinline webkit-playsinline preload="auto" style="width:100%; height:100%; object-fit:cover; ${pointerEvents}"></video>`;
    }
}

// Render Main Horizontal Spotlight Showreel
function renderSpotlightVideo(videoDataset) {
    const spotlightCard = document.getElementById('spotlightCard');
    if (!spotlightCard) return;

    const allVideos = videoDataset !== undefined ? videoDataset : getStoredVideos();
    let spotlightVideo = allVideos.find(v => v.isSpotlight && v.category !== 'Thumbnails' && v.category !== 'Thumbnail Design');
    if (!spotlightVideo) {
        spotlightVideo = allVideos.find(v => v.orientation === 'horizontal' && v.category !== 'Thumbnails' && v.category !== 'Thumbnail Design') || allVideos.find(v => v.category !== 'Thumbnails' && v.category !== 'Thumbnail Design');
    }

    if (!spotlightVideo) {
        spotlightCard.innerHTML = `
                <div style="text-align: center; color: var(--muted-color); padding: 4rem 1.5rem;">
                    <i class="fa-solid fa-film" style="font-size: 2.5rem; margin-bottom: 1rem; opacity: 0.4;"></i>
                    <p style="font-size: 1.1rem; font-weight: 600; color: #fff; margin-bottom: 0.35rem;">No Horizontal Spotlight Video Assigned</p>
                    <p style="font-size: 0.85rem; opacity: 0.7;">Select and assign a horizontal spotlight video from the Admin Dashboard.</p>
                </div>
            `;
        return;
    }

    const category = spotlightVideo.category || 'Featured Edit';
    const title = spotlightVideo.title || 'Cinematic Production Edit';
    const description = spotlightVideo.description || 'Custom widescreen video edit featuring color grading, motion graphics, and sound design.';
    const videoMediaHTML = renderUniversalVideoHTML(spotlightVideo.url, { controls: true, autoplay: false, muted: false });

    spotlightCard.innerHTML = `
            <div class="spotlight-video-wrapper">
                ${videoMediaHTML}
            </div>
            <div class="spotlight-info">
                <div class="spotlight-badge">
                    <i class="fa-solid fa-star"></i>
                    <span>FEATURED SHOWCASE • ${category.toUpperCase()}</span>
                </div>
                <h3 class="spotlight-title">${title}</h3>
                <p class="spotlight-desc">${description}</p>
            </div>
        `;
}

// Render Featured Thumbnails Showcase Grid
function renderFeaturedThumbnails(videoDataset) {
    const grid = document.getElementById('featuredThumbnailsGrid');
    if (!grid) return;

    const allVideos = videoDataset !== undefined ? videoDataset : getStoredVideos();
    const thumbnails = allVideos.filter(v => v.category === 'Thumbnails' || v.category === 'Thumbnail Design');

    grid.innerHTML = '';

    if (thumbnails.length === 0) {
        grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; color: var(--muted-color); padding: 3.5rem 1rem;">
                    <i class="fa-solid fa-image" style="font-size: 2.5rem; margin-bottom: 1rem; opacity: 0.4;"></i>
                    <p style="font-size: 1.1rem; font-weight: 600; color: #fff; margin-bottom: 0.35rem;">No Featured Thumbnails Added Yet</p>
                    <p style="font-size: 0.85rem; opacity: 0.7;">Select "Thumbnails / Graphic Design" category when adding work in Admin Panel.</p>
                </div>
            `;
        return;
    }

    thumbnails.forEach(item => {
        const card = document.createElement('div');
        card.className = 'thumbnail-card';
        const mediaHTML = renderUniversalVideoHTML(item.url, { isThumbnail: true, autoplay: false, muted: true, controls: false });

        card.innerHTML = `
                <div class="thumbnail-card-media">
                    ${mediaHTML}
                </div>
                <div class="thumbnail-card-overlay">
                    <div class="thumbnail-card-badge">
                        <i class="fa-solid fa-paintbrush"></i>
                        <span>THUMBNAIL DESIGN</span>
                    </div>
                    <h4 class="thumbnail-card-title">${item.title}</h4>
                </div>
            `;

        card.addEventListener('click', () => {
            window.location.href = 'works.html';
        });

        grid.appendChild(card);
    });
}

// Live Firebase Cloud Sync for Global Visitors (or Fallback to Local Storage)
if (isFirebaseConfigured && db) {
    onSnapshot(collection(db, "videos"), (snapshot) => {
        const cloudVideos = [];
        snapshot.forEach(docSnap => cloudVideos.push({ id: docSnap.id, ...docSnap.data() }));
        saveStoredVideos(cloudVideos);
        renderHomepageReels(cloudVideos);
        renderSpotlightVideo(cloudVideos);
        renderFeaturedThumbnails(cloudVideos);
    }, (err) => {
        console.warn("Firestore subscription error, using local storage:", err);
        renderHomepageReels(getStoredVideos());
        renderSpotlightVideo(getStoredVideos());
        renderFeaturedThumbnails(getStoredVideos());
    });
} else {
    renderHomepageReels(getStoredVideos());
    renderSpotlightVideo(getStoredVideos());
    renderFeaturedThumbnails(getStoredVideos());
}

// --- 6. FAQ Accordion ---
const faqItems = document.querySelectorAll('.faq-item');
faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    if (questionBtn) {
        questionBtn.addEventListener('click', () => {
            const isOpen = item.classList.contains('active');
            faqItems.forEach(i => {
                i.classList.remove('active');
                const icon = i.querySelector('.faq-icon');
                if (icon) icon.textContent = '+';
            });
            if (!isOpen) {
                item.classList.add('active');
                const icon = item.querySelector('.faq-icon');
                if (icon) icon.textContent = '−';
            }
        });
    }
});


// --- 7. Live Contact Form Submissions (Firestore & Local Backup) ---
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = contactForm.querySelector('button[type="submit"]');
        const nameInput = document.getElementById('contactName');
        const emailInput = document.getElementById('contactEmail');
        const projectInput = document.getElementById('contactProject');

        const name = nameInput ? nameInput.value.trim() : '';
        const email = emailInput ? emailInput.value.trim() : '';
        const message = projectInput ? projectInput.value.trim() : '';

        const statusBox = document.getElementById('contactStatus');

        if (!name || !email || !message) {
            if (statusBox) {
                statusBox.className = 'contact-status-msg error';
                statusBox.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Please fill out all required fields.';
                statusBox.style.display = 'flex';
            }
            return;
        }

        if (btn) {
            btn.disabled = true;
            btn.textContent = 'SENDING...';
        }

        const msgId = 'msg-' + Date.now();
        const messageData = {
            id: msgId,
            name,
            email,
            message,
            createdAt: new Date().toISOString(),
            dateFormatted: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        };

        // Local Storage Backup
        try {
            const storedMsgs = JSON.parse(localStorage.getItem('pavan_portfolio_messages') || '[]');
            storedMsgs.unshift(messageData);
            localStorage.setItem('pavan_portfolio_messages', JSON.stringify(storedMsgs));
        } catch (err) {
            console.warn("Local storage write error:", err);
        }

        // Save to Firestore Database
        if (isFirebaseConfigured && db) {
            try {
                await setDoc(doc(db, "messages", msgId), messageData);
            } catch (err) {
                console.error("Error saving contact message to Firestore:", err);
            }
        }

        setTimeout(() => {
            if (statusBox) {
                statusBox.className = 'contact-status-msg success';
                statusBox.innerHTML = `<i class="fa-solid fa-circle-check"></i> Thank you, <strong>${name}</strong>! Your project inquiry has been sent directly to Pavan's admin dashboard.`;
                statusBox.style.display = 'flex';
            }
            contactForm.reset();
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'SEND MESSAGE';
            }

            setTimeout(() => {
                if (statusBox) statusBox.style.display = 'none';
            }, 7000);
        }, 800);
    });
}

    // Secret Owner Shortcut: Ctrl + Shift + A -> Redirect to Admin Panel
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
            e.preventDefault();
            window.location.href = 'admin.html';
        }
    });
});


