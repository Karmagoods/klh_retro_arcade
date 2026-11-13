/**
 * Firebase Analytics for KLH Retro Arcade
 * Firebase Project: klhinnovation-6eac7
 * GA4 Measurement ID: G-49TQG0YC60
 */

export const firebaseConfig = {
    projectId: "klhinnovation-6eac7",
    appId: "1:287335912967:web:07b093612918d516023ca2",
    storageBucket: "klhinnovation-6eac7.firebasestorage.app",
    apiKey: "AIzaSyBWL3XejMeJSsi7JR60dQAVNP4KzoMJJgk",
    authDomain: "klhinnovation-6eac7.firebaseapp.com",
    messagingSenderId: "287335912967",
    measurementId: "G-49TQG0YC60"
};

const GAME_NAMES = {
    breakout: "Breakout",
    pong: "Pong",
    snake: "Snake",
    invaders: "Space Invaders",
    tetris: "Tetris",
    bike: "Moto Dash",
    car: "Turbo Race",
    army: "Combat Zone"
};

let analyticsPromise = null;

/**
 * Lazily and safely initialize Firebase Analytics via official ESM CDN.
 * Uses dynamic import so that offline PWA mode and restricted environments never crash.
 */
export async function getAnalyticsInstance() {
    if (analyticsPromise) return analyticsPromise;

    analyticsPromise = (async () => {
        if (typeof window === "undefined") return null;

        try {
            const [appMod, analyticsMod] = await Promise.all([
                import("https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js"),
                import("https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js")
            ]);

            const supported = await analyticsMod.isSupported().catch(() => false);
            if (!supported) {
                console.info("[Analytics] Firebase Analytics is not supported in this environment.");
                return null;
            }

            const app = appMod.getApps().length > 0 ? appMod.getApp() : appMod.initializeApp(firebaseConfig);
            const analytics = analyticsMod.getAnalytics(app);
            return { analytics, logEvent: analyticsMod.logEvent };
        } catch (err) {
            console.warn("[Analytics] Firebase Analytics unavailable (offline or blocked):", err.message || err);
            return null;
        }
    })();

    return analyticsPromise;
}

/**
 * Generic event tracker that safely logs to GA4 when available.
 */
export async function trackEvent(name, params = {}) {
    try {
        const instance = await getAnalyticsInstance();
        if (instance && instance.analytics && instance.logEvent) {
            instance.logEvent(instance.analytics, name, params);
        }
    } catch (err) {
        console.debug(`[Analytics] trackEvent failed for ${name}:`, err);
    }
}

/**
 * Screen / Page View Tracker
 */
export function trackPageView(pageTitle, pageLocation = window.location.href) {
    trackEvent("page_view", {
        page_title: pageTitle,
        page_location: pageLocation
    });
}

/**
 * Standard GA4 post_score event
 */
export function trackScore(gameId, score, isHighScore = false) {
    const gameTitle = GAME_NAMES[gameId] || gameId;
    trackEvent("post_score", {
        score: Math.floor(score),
        character: gameId,
        game_name: gameTitle,
        is_high_score: Boolean(isHighScore)
    });
}

/**
 * Game Over event
 */
export function trackGameOver(gameId, score, isHighScore = false) {
    const gameTitle = GAME_NAMES[gameId] || gameId;
    trackEvent("game_over", {
        game_id: gameId,
        game_title: gameTitle,
        score: Math.floor(score),
        is_high_score: Boolean(isHighScore)
    });
}

/**
 * Game Started / Level Start event
 */
export function trackGameStart(gameId) {
    const gameTitle = GAME_NAMES[gameId] || gameId;
    trackEvent("level_start", {
        level_name: gameTitle,
        character: gameId
    });
    trackEvent("game_start", {
        game_id: gameId,
        game_title: gameTitle
    });
}

/**
 * Select Content (e.g. clicking a game in the hub)
 */
export function trackSelectContent(contentType, itemId, itemName) {
    trackEvent("select_content", {
        content_type: contentType,
        item_id: itemId,
        item_name: itemName
    });
}

/**
 * Menu / Panel navigation
 */
export function trackMenuNavigation(panelName) {
    trackEvent("menu_navigation", {
        panel: panelName
    });
}

/**
 * Settings updates (volume, mute)
 */
export function trackSettingChange(settingName, value) {
    trackEvent("settings_change", {
        setting_name: settingName,
        value: String(value)
    });
}

/**
 * PWA installation events
 */
export function trackPwaInstall(action, outcome = null) {
    const params = { action };
    if (outcome) params.outcome = outcome;
    trackEvent("pwa_install", params);
}

/**
 * Automatically inspects the current URL and tracks initial screen/page view.
 */
function autoTrack() {
    if (typeof window === "undefined") return;

    const path = window.location.pathname;
    let detectedGameId = null;

    for (const key of Object.keys(GAME_NAMES)) {
        if (path.includes(`/${key}/`)) {
            detectedGameId = key;
            break;
        }
    }

    if (detectedGameId) {
        const title = GAME_NAMES[detectedGameId];
        trackEvent("screen_view", {
            screen_name: title,
            game_id: detectedGameId,
            app_name: "KLH Retro Arcade"
        });
        trackGameStart(detectedGameId);
    } else if (path.includes("/games/") || path.endsWith("/games") || path.endsWith("games/index.html")) {
        trackEvent("screen_view", {
            screen_name: "Arcade Hub",
            app_name: "KLH Retro Arcade"
        });
    }
}

// Automatically track the initial view on load
if (typeof window !== "undefined") {
    if (document.readyState === "complete" || document.readyState === "interactive") {
        autoTrack();
    } else {
        window.addEventListener("DOMContentLoaded", autoTrack, { once: true });
    }
}
