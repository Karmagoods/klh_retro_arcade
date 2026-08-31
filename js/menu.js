import { GAMES, loadScores, loadSettings } from "./highscores.js";
import { audio } from "./sound.js";

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
}

function showMenu() {
    Object.values(panels).forEach((panel) => panel.classList.add("hidden"));
    mainMenu.classList.remove("hidden");
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
        link.textContent = game.title;
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
        return `<p class="score-row">${game.title}: ${scores[game.id] || 0}</p>`;
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
    audio.play("select");
});

muteBtn.addEventListener("click", () => {
    audio.unlock();
    muteBtn.textContent = audio.toggleMute() ? "MUTE: ON" : "MUTE: OFF";
});

syncSettings();
