import { GAMES, loadScores, loadSettings } from "./highscores.js";
import { audio } from "./sound.js";
import { trackMenuNavigation, trackSelectContent, trackSettingChange } from "./analytics.js";

const mainMenu = document.getElementById("mainMenu");
const panels = {
    games: document.getElementById("gamesPanel"),
    scores: document.getElementById("scoresPanel"),
    settings: document.getElementById("settingsPanel"),
    about: document.getElementById("aboutPanel")
};

function showPanel(name) {
    mainMenu.classList.add("hidden");
    Object.entries(panels).forEach(([key, panel]) => {
        panel.classList.toggle("hidden", key !== name);
    });
    trackMenuNavigation(name);
}

function showMenu() {
    Object.values(panels).forEach((panel) => panel.classList.add("hidden"));
    mainMenu.classList.remove("hidden");
    trackMenuNavigation("main");
}

document.getElementById("playBtn").addEventListener("click", () => {
    audio.unlock();
    audio.play("select");
    const grid = document.getElementById("gameGrid");
    grid.innerHTML = "";
    GAMES.forEach((game) => {
        const link = document.createElement("a");
        link.className = "game-card";
        link.href = game.href;
        link.style.setProperty("--card-accent", game.accent);
        link.innerHTML = `
            <span class="card-icon" aria-hidden="true">${game.icon}</span>
            <span class="card-title">${game.title}</span>
            <span class="card-blurb">${game.blurb}</span>
        `;
        link.addEventListener("click", () => {
            trackSelectContent("game", game.id, game.title);
        });
        grid.appendChild(link);
    });
    showPanel("games");
});

document.getElementById("scoresBtn").addEventListener("click", () => {
    audio.unlock();
    audio.play("select");
    const scores = loadScores();
    const list = document.getElementById("scoresList");
    list.innerHTML = GAMES.map((game) => {
        const val = scores[game.id] || 0;
        return `<div class="score-row"><span>${game.icon} ${game.title}</span><span class="score-val">${val}</span></div>`;
    }).join("");
    showPanel("scores");
});

document.getElementById("settingsBtn").addEventListener("click", () => {
    audio.unlock();
    audio.play("select");
    syncSettings();
    showPanel("settings");
});

document.getElementById("aboutBtn").addEventListener("click", () => {
    audio.unlock();
    audio.play("select");
    showPanel("about");
});

document.querySelectorAll("[data-back]").forEach((button) => {
    button.addEventListener("click", () => {
        audio.play("select");
        showMenu();
    });
});

const volumeSlider = document.getElementById("volumeSlider");
const muteBtn = document.getElementById("muteBtn");

function syncSettings() {
    const settings = loadSettings();
    audio.masterVolume = settings.volume;
    audio.muted = settings.muted;
    volumeSlider.value = String(Math.round(settings.volume * 100));
    muteBtn.textContent = settings.muted ? "MUTE: ON" : "MUTE: OFF";
}

volumeSlider.addEventListener("input", () => {
    audio.unlock();
    audio.setMasterVolume(Number(volumeSlider.value) / 100);
});

volumeSlider.addEventListener("change", () => {
    audio.play("select");
    trackSettingChange("volume", volumeSlider.value);
});

muteBtn.addEventListener("click", () => {
    audio.unlock();
    const isMuted = audio.toggleMute();
    muteBtn.textContent = isMuted ? "MUTE: ON" : "MUTE: OFF";
    trackSettingChange("muted", isMuted);
});

const installBtn = document.getElementById("installBtn");
if (installBtn) {
    const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true;
    if (!standalone) {
        installBtn.classList.remove("hidden");
        installBtn.addEventListener("click", () => {
            audio.unlock();
            audio.play("select");
            if (typeof window.klhShowInstallPrompt === "function") {
                window.klhShowInstallPrompt();
            }
        });
    }
}

syncSettings();
