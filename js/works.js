/* ==========================================================================
   PAVAN PORTFOLIO — WORKS PAGE HIGH PERFORMANCE SCRIPT
   ========================================================================== */

import { db, isFirebaseConfigured, collection, onSnapshot } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {

    // Clean single RAF Lenis Smooth Scroll
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
    }

    const videoGrid = document.getElementById('videoGrid');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const videoModal = document.getElementById('videoModal');
    const modalVideo = document.getElementById('modalVideo');
    const modalTitle = document.getElementById('modalTitle');
    const modalDesc = document.getElementById('modalDesc');
    const closeModalBtn = document.getElementById('closeModalBtn');

    let currentFilter = 'short-form';
    let activeVideosDataset = getStoredVideos();

    function renderWorksGallery(dataset) {
        if (!videoGrid) return;

        const videos = dataset || activeVideosDataset;
        let filteredVideos = videos;

        const isThumbCategory = (v) => v.category === 'Thumbnails' || v.category === 'Thumbnail Design';

        if (currentFilter !== 'all') {
            if (currentFilter === 'short-form') {
                filteredVideos = videos.filter(v => !isThumbCategory(v) && v.category === 'Short Form');
            } else if (currentFilter === 'long-form') {
                filteredVideos = videos.filter(v => !isThumbCategory(v) && (v.category === 'Long Form' || v.category === 'Commercial' || v.category === 'Motion Graphics'));
            } else if (currentFilter === 'thumbnails') {
                filteredVideos = videos.filter(v => isThumbCategory(v));
            } else {
                filteredVideos = videos.filter(v => v.category.toLowerCase() === currentFilter.toLowerCase());
            }
        }

        videoGrid.innerHTML = '';

        if (filteredVideos.length === 0) {
            videoGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--muted-color); padding: 3rem;">No videos found in this category.</div>`;
            return;
        }        filteredVideos.forEach(video => {
            const card = document.createElement('div');
            card.className = 'video-card';
            card.setAttribute('data-id', video.id);

            const isVert = video.orientation === 'vertical';
            const isThumb = video.category === 'Thumbnails' || video.category === 'Thumbnail Design';

            const previewMediaHTML = renderUniversalVideoHTML(video.url, { isThumbnail: isThumb, muted: true, controls: false, class: 'video-thumb-media' });
            const thumbClass = isThumb ? 'thumbnail-graphic' : (isVert ? 'vertical' : '');

            card.innerHTML = `
                <div class="video-card-thumb ${thumbClass}" data-url="${video.url}">
                    ${previewMediaHTML}
                    <span class="video-card-badge">${isThumb ? 'GRAPHIC' : (video.orientation ? video.orientation.toUpperCase() : 'VIDEO')}</span>
                    ${!isThumb ? '<div class="video-card-play-overlay">▶</div>' : ''}
                </div>
                <div class="video-card-info">
                    <h3 class="video-card-title">${video.title}</h3>
                    <div class="video-card-meta">
                        <span>${video.category}</span>
                        ${video.isFeatured ? '<span style="color:var(--accent-color);">★ Featured</span>' : ''}
                    </div>
                </div>
            `;

            card.addEventListener('click', () => {
                openVideoModal(video);
            });

            videoGrid.appendChild(card);
        });
    }

    // Category Tab Switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.classList.contains('active')) return;
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-filter');
            renderWorksGallery(activeVideosDataset);
        });
    });

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

        // 2. Canva Embed links (Canva graphics render as view embed, videos render as watch embed)
        if (cleanUrl.includes('canva.com')) {
            let embedUrl = cleanUrl;
            if (isThumbnail) {
                if (embedUrl.includes('/watch?embed')) {
                    embedUrl = embedUrl.replace('/watch?embed', '/view?embed');
                } else if (embedUrl.includes('/watch')) {
                    embedUrl = embedUrl.replace('/watch', '/view?embed');
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
            const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=0&loop=1&playlist=${videoId}&enablejsapi=1`;
            return { type: 'iframe', url: embedUrl };
        }

        // 4. Google Drive
        if (cleanUrl.includes('drive.google.com')) {
            const driveMatch = cleanUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (driveMatch && driveMatch[1]) {
                if (isThumbnail) {
                    return { type: 'image', url: `https://drive.google.com/uc?export=view&id=${driveMatch[1]}` };
                }
                return { type: 'iframe', url: `https://drive.google.com/file/d/${driveMatch[1]}/preview` };
            }
        }

        // 5. Direct Images (.jpg, .png, .webp, .svg, Unsplash, Imgur, Cloudinary image)
        if (/\.(jpeg|jpg|png|gif|webp|svg)(\?.*)?$/i.test(cleanUrl) || cleanUrl.includes('images.unsplash.com') || cleanUrl.includes('imgur.com') || cleanUrl.includes('/image/upload/')) {
            return { type: 'image', url: cleanUrl };
        }

        // 6. Generic Iframe / Embed links
        if (cleanUrl.includes('/embed') || cleanUrl.includes('player.')) {
            return { type: 'iframe', url: cleanUrl };
        }

        // 7. Thumbnail Fallback
        if (isThumbnail) {
            return { type: 'image', url: cleanUrl };
        }

        // 8. Vimeo
        const vimeoMatch = cleanUrl.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)/i);
        if (vimeoMatch && vimeoMatch[1]) {
            const videoId = vimeoMatch[1];
            const embedUrl = `https://player.vimeo.com/video/${videoId}?autoplay=1&muted=0&loop=1`;
            return { type: 'iframe', url: embedUrl };
        }

        // Default: Direct Video URL
        return { type: 'video', url: cleanUrl };
    }

    function renderUniversalVideoHTML(urlInput, options = {}) {
        const isThumbnail = options.isThumbnail || false;
        const parsed = parseVideoEmbed(urlInput, isThumbnail);
        const extraClass = options.class ? `class="${options.class}"` : '';

        if (parsed.type === 'image') {
            return `<img src="${parsed.url}" ${extraClass} alt="Graphic Thumbnail" loading="lazy" style="width:100%; height:100%; object-fit:cover; display:block; border-radius:8px;">`;
        } else if (parsed.type === 'iframe') {
            return `<iframe src="${parsed.url}" ${extraClass} frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" allowfullscreen style="width:100%; height:100%; min-height:420px; border:none; pointer-events:auto;"></iframe>`;
        } else {
            const controls = options.controls === true ? 'controls' : '';
            const autoplay = options.autoplay ? 'autoplay' : '';
            const muted = options.muted ? 'muted' : '';
            const loop = options.loop !== false ? 'loop' : '';
            const srcUrl = options.controls ? parsed.url : `${parsed.url}#t=0.1`;
            const fitMode = options.controls ? (options.isVertical ? 'cover' : 'contain') : 'cover';
            return `<video src="${srcUrl}" ${extraClass} ${controls} ${autoplay} ${muted} ${loop} playsinline webkit-playsinline preload="metadata" style="width:100%; height:100%; object-fit:${fitMode}; pointer-events:${options.controls ? 'auto' : 'none'};"></video>`;
        }
    }

    // Lightbox Modal Player / Pure Image Viewer
    function openVideoModal(video) {
        if (!videoModal) return;

        const isThumb = video.category === 'Thumbnails' || video.category === 'Thumbnail Design';
        const isVert = video.orientation === 'vertical';
        const modalContainer = videoModal.querySelector('.video-modal-container');
        const modalBody = videoModal.querySelector('.video-modal-body');

        if (modalContainer) {
            modalContainer.classList.remove('vertical-modal');
            modalContainer.classList.remove('image-modal');

            if (isThumb) {
                modalContainer.classList.add('image-modal');
            } else if (isVert) {
                modalContainer.classList.add('vertical-modal');
            }
        }

        if (modalBody) {
            modalBody.innerHTML = renderUniversalVideoHTML(video.url, {
                controls: !isThumb,
                autoplay: !isThumb,
                muted: isThumb,
                isThumbnail: isThumb,
                isVertical: isVert
            });
        }

        if (modalTitle) modalTitle.textContent = video.title;
        if (modalDesc) {
            modalDesc.textContent = isThumb
                ? `${video.category} • Graphic Design Showcase`
                : (video.description || `${video.category} • ${video.orientation ? video.orientation.toUpperCase() : 'VIDEO'}`);
        }
        videoModal.classList.add('active');

        if (!isThumb) {
            const activeVid = modalBody ? modalBody.querySelector('video') : null;
            if (activeVid) {
                activeVid.muted = false;
                activeVid.playsInline = true;
                activeVid.setAttribute('playsinline', '');
                activeVid.setAttribute('webkit-playsinline', '');
                const playPromise = activeVid.play();
                if (playPromise !== undefined) {
                    playPromise.catch(() => {
                        activeVid.muted = true;
                        activeVid.play().catch(e => console.warn("Mobile modal playback fallback:", e));
                    });
                }
            }
        }
    }

    function closeVideoModal() {
        if (!videoModal) return;
        const modalBody = videoModal.querySelector('.video-modal-body');
        if (modalBody) modalBody.innerHTML = '';
        videoModal.classList.remove('active');
    }

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeVideoModal);

    if (videoModal) {
        videoModal.addEventListener('click', (e) => {
            if (e.target === videoModal) closeVideoModal();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && videoModal && videoModal.classList.contains('active')) {
            closeVideoModal();
        }
    });

    // Live Firebase Cloud Sync for Global Visitors (or Fallback to Local Storage)
    if (isFirebaseConfigured && db) {
        onSnapshot(collection(db, "videos"), (snapshot) => {
            const cloudVideos = [];
            snapshot.forEach(docSnap => cloudVideos.push({ id: docSnap.id, ...docSnap.data() }));
            activeVideosDataset = cloudVideos;
            saveStoredVideos(cloudVideos);
            renderWorksGallery(cloudVideos);
        }, (err) => {
            console.warn("Firestore subscription error, using local storage:", err);
            renderWorksGallery(activeVideosDataset);
        });
    } else {
        renderWorksGallery(activeVideosDataset);
    }

    // Secret Owner Shortcut: Ctrl + Shift + A -> Redirect to Admin Panel
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
            e.preventDefault();
            window.location.href = 'admin.html';
        }
    });
});

