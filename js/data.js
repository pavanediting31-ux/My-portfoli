// Initial Videos Dataset for Pavan's Portfolio (Empty by default - Managed via Admin & Firestore)
const DEFAULT_VIDEOS = [];

// Helper to get all videos from localStorage or fallback to empty array
function getStoredVideos() {
    try {
        const stored = localStorage.getItem('pavan_portfolio_videos');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                // If stored videos contain sample vid-1 to vid-8, clear old sample data
                const isSampleData = parsed.some(v => v.id && v.id.startsWith('vid-') && parseInt(v.id.split('-')[1]) <= 8);
                if (isSampleData) {
                    localStorage.removeItem('pavan_portfolio_videos');
                    return [];
                }
                return parsed;
            }
        }
    } catch (e) {
        console.error("Error reading localStorage:", e);
    }
    return DEFAULT_VIDEOS;
}

// Helper to save videos to localStorage
function saveStoredVideos(videos) {
    try {
        localStorage.setItem('pavan_portfolio_videos', JSON.stringify(videos || []));
    } catch (e) {
        console.error("Error writing to localStorage:", e);
    }
}

