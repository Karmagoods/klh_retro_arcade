/**
 * PWA install prompt + service worker registration.
 */

const DISMISS_KEY = "klh_pwa_install_dismissed";
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

let deferredPrompt = null;

function siteRoot() {
    // Resolve project root whether page is / or /games/...
    const path = location.pathname;
    if (path.includes("/games/")) {
        return path.replace(/\/games\/.*$/, "/");
    }
    // strip filename if present
    if (path.endsWith(".html")) {
        return path.replace(/\/[^/]+\.html$/, "/");
    }
    return path.endsWith("/") ? path : path.replace(/\/[^/]*$/, "/");
}

function assetUrl(rel) {
    return new URL(rel, location.origin + siteRoot()).href;
}

function isStandalone() {
    return (
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true ||
        document.referrer.includes("android-app://")
    );
}

function wasDismissedRecently() {
    try {
        const raw = localStorage.getItem(DISMISS_KEY);
        if (!raw) return false;
        return Date.now() - Number(raw) < DISMISS_MS;
    } catch {
        return false;
    }
}

function markDismissed() {
    try {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
        /* ignore */
    }
}

function isIos() {
    return (
        /iphone|ipad|ipod/i.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
}

function isSafari() {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

function hideBanner(banner) {
    banner.classList.remove("visible");
    setTimeout(() => banner.remove(), 280);
}

function createBanner({ title, body, primaryLabel, onPrimary, secondaryLabel = "NOT NOW" }) {
    const existing = document.getElementById("pwaInstallBanner");
    if (existing) existing.remove();

    const banner = document.createElement("div");
    banner.id = "pwaInstallBanner";
    banner.className = "pwa-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", title);
    banner.innerHTML = `
    <div class="pwa-banner-inner">
      <img class="pwa-banner-icon" src="${assetUrl("assets/icons/icon-96.png")}" width="48" height="48" alt="" />
      <div class="pwa-banner-copy">
        <div class="pwa-banner-title">${title}</div>
        <div class="pwa-banner-body">${body}</div>
      </div>
      <div class="pwa-banner-actions">
        <button type="button" class="pwa-btn primary" data-pwa-primary>${primaryLabel}</button>
        <button type="button" class="pwa-btn ghost" data-pwa-dismiss>${secondaryLabel}</button>
      </div>
    </div>
  `;
    document.body.appendChild(banner);
    requestAnimationFrame(() => banner.classList.add("visible"));

    banner.querySelector("[data-pwa-primary]").addEventListener("click", async () => {
        await onPrimary();
        hideBanner(banner);
    });
    banner.querySelector("[data-pwa-dismiss]").addEventListener("click", () => {
        markDismissed();
        hideBanner(banner);
    });

    return banner;
}

function showChromeInstallPrompt() {
    if (!deferredPrompt || isStandalone() || wasDismissedRecently()) return;

    createBanner({
        title: "INSTALL ARCADE",
        body: "Add KLH Retro Arcade to your home screen for fullscreen play.",
        primaryLabel: "INSTALL",
        onPrimary: async () => {
            deferredPrompt.prompt();
            try {
                const choice = await deferredPrompt.userChoice;
                if (choice && choice.outcome === "dismissed") markDismissed();
            } catch {
                /* ignore */
            }
            deferredPrompt = null;
        }
    });
}

function showIosHint(force = false) {
    if (!isIos() || isStandalone()) return;
    if (!force && wasDismissedRecently()) return;

    createBanner({
        title: "ADD TO HOME",
        body: 'Tap <strong>Share</strong> then <strong>Add to Home Screen</strong> for the full arcade experience.',
        primaryLabel: "GOT IT",
        secondaryLabel: "LATER",
        onPrimary: async () => {
            markDismissed();
        }
    });
}

export function initPwaInstall() {
    if (isStandalone()) return;

    window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        deferredPrompt = e;
        setTimeout(showChromeInstallPrompt, 1200);
    });

    window.addEventListener("appinstalled", () => {
        deferredPrompt = null;
        markDismissed();
        const b = document.getElementById("pwaInstallBanner");
        if (b) hideBanner(b);
    });

    if (isIos()) {
        setTimeout(() => showIosHint(false), 1800);
    }

    window.klhShowInstallPrompt = () => {
        if (deferredPrompt) {
            // allow re-show even if dismissed when user asks
            createBanner({
                title: "INSTALL ARCADE",
                body: "Add KLH Retro Arcade to your home screen for fullscreen play.",
                primaryLabel: "INSTALL",
                onPrimary: async () => {
                    deferredPrompt.prompt();
                    try {
                        await deferredPrompt.userChoice;
                    } catch {
                        /* ignore */
                    }
                    deferredPrompt = null;
                }
            });
        } else if (isIos()) {
            showIosHint(true);
        } else {
            createBanner({
                title: "INSTALL ARCADE",
                body: "Use your browser menu → <strong>Install app</strong> or <strong>Add to Home Screen</strong>.",
                primaryLabel: "GOT IT",
                secondaryLabel: "CLOSE",
                onPrimary: async () => {}
            });
        }
    };
}

export function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    const swUrl = assetUrl("sw.js");
    const scope = siteRoot();
    window.addEventListener("load", () => {
        navigator.serviceWorker.register(swUrl, { scope }).catch((err) => {
            console.warn("SW registration failed", err);
        });
    });
}

initPwaInstall();
registerServiceWorker();
