/* ==========================================================================
   PAVAN PORTFOLIO — SECURE CRYPTOGRAPHIC ADMIN DASHBOARD SCRIPT
   SHA-256 Web Crypto Hashing & Firebase Cloud Sync Integration
   ========================================================================== */

import { db, auth, isFirebaseConfigured, collection, getDocs, onSnapshot, doc, setDoc, deleteDoc, updateDoc, signInWithEmailAndPassword, signOut } from './firebase-config.js';

// Pre-computed Cryptographic SHA-256 One-Way Passcode Hashes
// Plain-text passwords are NEVER stored, printed, or exposed in front-end source code.
const ALLOWED_HASHES = [
    "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9",
];

// Web Crypto API SHA-256 Hashing Helper
async function sha256(str) {
    if (!crypto || !crypto.subtle) return "";
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

document.addEventListener('DOMContentLoaded', () => {

    const loginScreen = document.getElementById('loginScreen');
    const dashboardScreen = document.getElementById('dashboardScreen');
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    const logoutBtn = document.getElementById('logoutBtn');
    const addVideoForm = document.getElementById('addVideoForm');
    const adminVideoTableBody = document.getElementById('adminVideoTableBody');
    const adminMessagesTableBody = document.getElementById('adminMessagesTableBody');
    const msgCountBadge = document.getElementById('msgCountBadge');
    const navMsgBadge = document.getElementById('navMsgBadge');
    const resetDataBtn = document.getElementById('resetDataBtn');

    // --- SIDEBAR TAB SWITCHING ---
    const tabNavLinks = document.querySelectorAll('.sidebar-nav .nav-link[data-tab]');
    const tabViews = document.querySelectorAll('.admin-tab-view');

    tabNavLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetTabId = link.getAttribute('data-tab');

            tabNavLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            tabViews.forEach(view => {
                if (view.id === targetTabId) {
                    view.classList.remove('hidden');
                } else {
                    view.classList.add('hidden');
                }
            });
        });
    });

    // Authentication Check via Session Token
    async function checkAuth() {
        const authedToken = sessionStorage.getItem('pavan_admin_session_token');
        if (authedToken) {
            if (loginScreen) loginScreen.classList.add('hidden');
            if (dashboardScreen) dashboardScreen.classList.remove('hidden');
            initVideoTable();
            initMessagesTable();
        } else {
            if (loginScreen) loginScreen.classList.remove('hidden');
            if (dashboardScreen) dashboardScreen.classList.add('hidden');
        }
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const passwordInput = document.getElementById('adminPassword').value.trim();

            if (!passwordInput) return;

            const inputHash = await sha256(passwordInput.toLowerCase());
            const isMatched = ALLOWED_HASHES.includes(inputHash);

            if (isMatched) {
                sessionStorage.setItem('pavan_admin_session_token', 'authenticated');
                if (loginError) loginError.textContent = '';

                // If Firebase Auth is configured in production, attempt sign-in silently
                if (isFirebaseConfigured && auth) {
                    try {
                        await signInWithEmailAndPassword(auth, "admin@pavanportfolio.com", passwordInput);
                    } catch (fbErr) {
                        console.log("Firebase Auth status:", fbErr.message);
                    }
                }

                checkAuth();
            } else {
                if (loginError) loginError.textContent = 'Access Denied: Invalid security passcode.';
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            sessionStorage.removeItem('pavan_admin_session_token');
            if (isFirebaseConfigured && auth) {
                try { await signOut(auth); } catch (e) { }
            }
            checkAuth();
        });
    }


    // Load & Subscribe to Video Catalog (Firebase Firestore or Local Storage Fallback)
    function initVideoTable() {
        if (isFirebaseConfigured && db) {
            // Subscribe to live Firebase Firestore updates
            onSnapshot(collection(db, "videos"), (snapshot) => {
                const cloudVideos = [];
                snapshot.forEach(docSnap => cloudVideos.push({ id: docSnap.id, ...docSnap.data() }));
                saveStoredVideos(cloudVideos);
                renderAdminVideosTable(cloudVideos);
            }, (err) => {
                console.warn("Firestore subscription, using local cache:", err);
                renderAdminVideosTable(getStoredVideos());
            });
        } else {
            renderAdminVideosTable(getStoredVideos());
        }
    }

    // Universal Video URL & Embed Parser
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
            const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0&mute=1&playlist=${videoId}`;
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
            const embedUrl = `https://player.vimeo.com/video/${videoId}?autoplay=0&muted=1`;
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

        // 8. Generic Iframe / Embed links
        if (cleanUrl.includes('/embed') || cleanUrl.includes('player.')) {
            return { type: 'iframe', url: cleanUrl };
        }

        // Default: Direct Video URL
        return { type: 'video', url: cleanUrl };
    }

    function renderUniversalVideoHTML(urlInput, options = {}) {
        const isThumbnail = options.isThumbnail || false;
        const parsed = parseVideoEmbed(urlInput, isThumbnail);
        const extraClass = options.class ? `class="${options.class}"` : '';

        if (parsed.type === 'image') {
            return `<img src="${parsed.url}" ${extraClass} alt="Thumbnail" loading="lazy" style="width:50px; height:50px; object-fit:cover; border-radius:6px; display:block;">`;
        } else if (parsed.type === 'iframe') {
            return `<iframe src="${parsed.url}" ${extraClass} frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="width:50px; height:50px; border-radius:6px; border:none; pointer-events:none;"></iframe>`;
        } else {
            const controls = options.controls ? 'controls' : '';
            const autoplay = options.autoplay ? 'autoplay' : '';
            const muted = options.muted !== false ? 'muted' : '';
            const loop = options.loop ? 'loop' : '';
            return `<video src="${parsed.url}#t=0.1" ${extraClass} ${controls} ${autoplay} ${muted} ${loop} playsinline preload="metadata" style="width:50px; height:50px; object-fit:cover; border-radius:6px;"></video>`;
        }
    }

    // Render Admin Table Rows
    function renderAdminVideosTable(videos) {
        if (!adminVideoTableBody) return;

        adminVideoTableBody.innerHTML = '';

        if (videos.length === 0) {
            adminVideoTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--muted-color); padding: 2.5rem 1rem;">No videos in catalog. Use the form above to add videos.</td></tr>`;
            return;
        }

        videos.forEach((video) => {
            const tr = document.createElement('tr');
            let statusBadges = [];
            if (video.isFeatured) statusBadges.push('<span class="badge-featured">Homepage 3D Reel</span>');
            if (video.isSpotlight) statusBadges.push('<span class="badge-featured" style="background:rgba(52,152,219,0.2); border-color:rgba(52,152,219,0.5); color:#3498db;">Main Spotlight</span>');
            if (statusBadges.length === 0) statusBadges.push('<span class="badge-regular">Works Gallery</span>');

            const isThumb = video.category === 'Thumbnails' || video.category === 'Thumbnail Design';
            const mediaPreviewHTML = renderUniversalVideoHTML(video.url, { isThumbnail: isThumb, muted: true, class: 'video-thumb-preview' });

            tr.innerHTML = `
                <td>
                    <div style="display:flex; align-items:center; gap:0.75rem;">
                        ${mediaPreviewHTML}
                        <strong>${video.title}</strong>
                    </div>
                </td>
                <td>${video.category}</td>
                <td><span style="text-transform:capitalize;">${video.orientation}</span></td>
                <td>
                    <label class="switch">
                        <input type="checkbox" class="feature-toggle" data-id="${video.id}" ${video.isFeatured ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </td>
                <td>
                    <label class="switch">
                        <input type="checkbox" class="spotlight-toggle" data-id="${video.id}" ${video.isSpotlight ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </td>
                <td>
                    <div style="display:flex; flex-direction:column; gap:0.35rem;">
                        ${statusBadges.join('')}
                    </div>
                </td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon delete" data-id="${video.id}" title="Delete Video"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            `;

            // Toggle Homepage Featured Status
            const toggleInput = tr.querySelector('.feature-toggle');
            toggleInput.addEventListener('change', (e) => {
                toggleFeaturedStatus(video.id, e.target.checked);
            });

            // Toggle Main Horizontal Spotlight Status
            const spotlightInput = tr.querySelector('.spotlight-toggle');
            spotlightInput.addEventListener('change', (e) => {
                toggleSpotlightStatus(video.id, e.target.checked);
            });

            // Delete Video Event
            const deleteBtn = tr.querySelector('.btn-icon.delete');
            deleteBtn.addEventListener('click', () => {
                deleteVideo(video.id);
            });

            adminVideoTableBody.appendChild(tr);
        });
    }

    // In-App Toast Notification Helper
    function showToast(message, type = 'success') {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `admin-toast ${type}`;
        const icon = type === 'success' ? 'fa-circle-check' : (type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info');
        toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;

        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    // Toggle Homepage Featured Status (Limit 5 max)
    async function toggleFeaturedStatus(videoId, isFeatured) {
        const videos = getStoredVideos();
        if (isFeatured) {
            const featuredCount = videos.filter(v => v.isFeatured).length;
            if (featuredCount >= 5) {
                showToast('Maximum 5 videos can be featured on Homepage. Uncheck another video first.', 'error');
                initVideoTable();
                return;
            }
        }

        const video = videos.find(v => v.id === videoId);
        if (video) {
            video.isFeatured = isFeatured;
            saveStoredVideos(videos);

            // Update in Firebase Firestore if connected
            if (isFirebaseConfigured && db) {
                try {
                    await updateDoc(doc(db, "videos", videoId), { isFeatured });
                } catch (e) {
                    console.error("Error updating Firestore document:", e);
                }
            }

            initVideoTable();
            showToast(`Video "${video.title}" homepage status updated.`, 'info');
        }
    }

    // Toggle Homepage Main Spotlight Video Status (Only 1 active)
    async function toggleSpotlightStatus(videoId, isSpotlight) {
        let videos = getStoredVideos();

        videos.forEach(v => {
            if (v.id === videoId) {
                v.isSpotlight = isSpotlight;
            } else if (isSpotlight) {
                v.isSpotlight = false;
            }
        });

        saveStoredVideos(videos);

        // Update in Firebase Firestore if connected
        if (isFirebaseConfigured && db) {
            try {
                for (const v of videos) {
                    await updateDoc(doc(db, "videos", v.id), { isSpotlight: !!v.isSpotlight });
                }
            } catch (e) {
                console.error("Error updating Firestore spotlight document:", e);
            }
        }

        initVideoTable();
        if (isSpotlight) {
            const currentVid = videos.find(v => v.id === videoId);
            showToast(`"${currentVid ? currentVid.title : 'Video'}" set as Main Horizontal Spotlight Video!`, 'success');
        } else {
            showToast('Horizontal Spotlight Video unassigned.', 'info');
        }
    }

    // Add New Video
    if (addVideoForm) {
        addVideoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('newVideoTitle').value.trim();
            const url = document.getElementById('newVideoUrl').value.trim();
            const category = document.getElementById('newVideoCategory').value;
            const orientation = document.getElementById('newVideoOrientation').value;
            const isFeatured = document.getElementById('newVideoFeatured').checked;
            const isSpotlight = document.getElementById('newVideoSpotlight') ? document.getElementById('newVideoSpotlight').checked : false;
            const description = document.getElementById('newVideoDesc').value.trim();

            if (!title || !url) {
                showToast('Please enter a title and valid video URL.', 'error');
                return;
            }

            let videos = getStoredVideos();

            if (isSpotlight) {
                videos.forEach(v => v.isSpotlight = false);
            }

            if (isFeatured && videos.filter(v => v.isFeatured).length >= 5) {
                showToast('Max 5 featured videos allowed. Added to Works page until a slot frees up.', 'info');
            }

            const newVideoId = 'vid-' + Date.now();
            const newVideo = {
                id: newVideoId,
                title,
                url,
                category,
                orientation,
                thumbnail: '',
                isFeatured: isFeatured && videos.filter(v => v.isFeatured).length < 5,
                isSpotlight: isSpotlight,
                description,
                createdAt: new Date().toISOString()
            };

            videos.unshift(newVideo);
            saveStoredVideos(videos);

            // Save to Firebase Firestore Cloud Database
            if (isFirebaseConfigured && db) {
                try {
                    await setDoc(doc(db, "videos", newVideoId), newVideo);
                    if (isSpotlight) {
                        for (const v of videos) {
                            if (v.id !== newVideoId) {
                                await updateDoc(doc(db, "videos", v.id), { isSpotlight: false });
                            }
                        }
                    }
                } catch (e) {
                    console.error("Error writing to Firestore:", e);
                    showToast(`Firestore Security Rule Error: Update rules to 'allow read, write: if true;'`, 'error');
                }
            }

            addVideoForm.reset();
            showToast(`Video "${title}" successfully published!`, 'success');
            initVideoTable();
        });
    }

    // Delete Video
    async function deleteVideo(videoId) {
        if (confirm('Are you sure you want to delete this video?')) {
            let videos = getStoredVideos();
            videos = videos.filter(v => v.id !== videoId);
            saveStoredVideos(videos);

            // Delete from Firebase Firestore Cloud Database
            if (isFirebaseConfigured && db) {
                try {
                    await deleteDoc(doc(db, "videos", videoId));
                } catch (e) {
                    console.error("Error deleting from Firestore:", e);
                }
            }

            initVideoTable();
            showToast('Video deleted from catalog.', 'info');
        }
    }

    // Clear Catalog
    if (resetDataBtn) {
        resetDataBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to clear ALL videos from Firestore & local storage?')) {
                const currentVideos = getStoredVideos();
                saveStoredVideos([]);

                if (isFirebaseConfigured && db) {
                    try {
                        for (const v of currentVideos) {
                            await deleteDoc(doc(db, "videos", v.id));
                        }
                    } catch (e) {
                        console.error("Error clearing Firestore data:", e);
                    }
                }

                initVideoTable();
                showToast('All videos cleared from catalog.', 'info');
            }
        });
    }

    // --- CLIENT MESSAGES MANAGEMENT ---

    function getStoredMessages() {
        try {
            const stored = localStorage.getItem('pavan_portfolio_messages');
            if (stored) return JSON.parse(stored);
        } catch (e) {
            console.error("Error reading stored messages:", e);
        }
        return [];
    }

    function saveStoredMessages(msgs) {
        try {
            localStorage.setItem('pavan_portfolio_messages', JSON.stringify(msgs || []));
        } catch (e) {
            console.error("Error saving messages:", e);
        }
    }

    // Subscribe to Live Contact Messages (Firestore + Local Backup)
    function initMessagesTable() {
        if (isFirebaseConfigured && db) {
            onSnapshot(collection(db, "messages"), (snapshot) => {
                const cloudMsgs = [];
                snapshot.forEach(docSnap => cloudMsgs.push({ id: docSnap.id, ...docSnap.data() }));
                cloudMsgs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
                saveStoredMessages(cloudMsgs);
                renderAdminMessagesTable(cloudMsgs);
            }, (err) => {
                console.warn("Messages Firestore subscription error (using local cache):", err);
                renderAdminMessagesTable(getStoredMessages());
            });
        } else {
            renderAdminMessagesTable(getStoredMessages());
        }
    }

    // Render Messages Table Rows
    function renderAdminMessagesTable(messages) {
        if (!adminMessagesTableBody) return;

        adminMessagesTableBody.innerHTML = '';
        if (msgCountBadge) {
            msgCountBadge.textContent = `${messages.length} ${messages.length === 1 ? 'Message' : 'Messages'}`;
        }
        if (navMsgBadge) {
            navMsgBadge.textContent = messages.length;
            navMsgBadge.style.display = messages.length > 0 ? 'inline-block' : 'none';
        }

        if (messages.length === 0) {
            adminMessagesTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--muted-color); padding: 2.5rem 1rem;">No contact messages received yet.</td></tr>`;
            return;
        }

        messages.forEach((msg) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="white-space:nowrap; color:var(--muted-color); font-size:0.85rem;">
                    ${msg.dateFormatted || (msg.createdAt ? new Date(msg.createdAt).toLocaleDateString() : 'N/A')}
                </td>
                <td><strong>${msg.name}</strong></td>
                <td>
                    <a href="mailto:${msg.email}" style="color:var(--accent-color); text-decoration:underline;">${msg.email}</a>
                </td>
                <td style="max-width:340px; line-height:1.5; font-size:0.9rem;">
                    <div style="background:rgba(255,255,255,0.03); padding:0.6rem 0.85rem; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
                        ${msg.message}
                    </div>
                </td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon delete" data-id="${msg.id}" title="Delete Message"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            `;

            const deleteBtn = tr.querySelector('.btn-icon.delete');
            deleteBtn.addEventListener('click', () => {
                deleteMessage(msg.id);
            });

            adminMessagesTableBody.appendChild(tr);
        });
    }

    // Delete Message
    async function deleteMessage(msgId) {
        if (confirm('Delete this inquiry message?')) {
            let msgs = getStoredMessages();
            msgs = msgs.filter(m => m.id !== msgId);
            saveStoredMessages(msgs);

            if (isFirebaseConfigured && db) {
                try {
                    await deleteDoc(doc(db, "messages", msgId));
                } catch (e) {
                    console.error("Error deleting message from Firestore:", e);
                }
            }

            initMessagesTable();
            showToast('Inquiry message deleted.', 'info');
        }
    }

    // Run Auth Check
    checkAuth();
});

