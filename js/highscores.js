import { trackScore, trackGameOver } from "./analytics.js";

const STORAGE_KEY = "klh_retro_arcade_scores";

export const GAMES = [
    {
        id: "breakout",
        title: "BREAKOUT",
        href: "breakout/index.html",
        icon: "🧱",
        accent: "#ff9f1c",
        blurb: "Smash bricks. Don't drop the ball."
    },
    {
        id: "pong",
        title: "PONG",
        href: "pong/index.html",
        icon: "🏓",
        accent: "#00ffee",
        blurb: "Classic paddle duel vs CPU."
    },
    {
        id: "snake",
        title: "SNAKE",
        href: "snake/index.html",
        icon: "🐍",
        accent: "#39ff14",
        blurb: "Grow long. Don't bite yourself."
    },
    {
        id: "invaders",
        title: "INVADERS",
        href: "invaders/index.html",
        icon: "👾",
        accent: "#ff2bd6",
        blurb: "Defend Earth from the swarm."
    },
    {
        id: "tetris",
        title: "TETRIS",
        href: "tetris/index.html",
        icon: "🟦",
        accent: "#4d9fff",
        blurb: "Stack. Clear. Survive the drop."
    },
    {
        id: "bike",
        title: "MOTO DASH",
        href: "bike/index.html",
        icon: "🏍️",
        accent: "#ff6b35",
        blurb: "Weave through traffic. Don't crash."
    },
    {
        id: "car",
        title: "TURBO RACE",
        href: "car/index.html",
        icon: "🏎️",
        accent: "#ffd700",
        blurb: "Grab coins. Dodge traffic. Go fast."
    },
    {
        id: "army",
        title: "COMBAT ZONE",
        href: "army/index.html",
        icon: "🪖",
        accent: "#4caf50",
        blurb: "Guns, grenades, tanks. Two levels. Survive."
    },
    {
        id: "maze",
        title: "MAZE MUNCH",
        href: "maze/index.html",
        icon: "🟡",
        accent: "#ffe14d",
        blurb: "Eat pellets. Dodge ghosts. Power up."
    },
    {
        id: "hopper",
        title: "HOPPER",
        href: "hopper/index.html",
        icon: "🐸",
        accent: "#39ff14",
        blurb: "Cross the road. Ride the logs. Get home."
    }
];

function emptyScores() {
    const scores = {};
    GAMES.forEach((game) => {
        scores[game.id] = 0;
    });
    return scores;
}

export function loadScores() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return emptyScores();
        return { ...emptyScores(), ...JSON.parse(raw) };
    } catch {
        return emptyScores();
    }
}

export function getBest(gameId) {
    return loadScores()[gameId] || 0;
}

export function recordScore(gameId, score) {
    const scores = loadScores();
    const value = Math.max(0, Math.floor(score));
    const isNewHigh = value > (scores[gameId] || 0);
    if (isNewHigh) {
        scores[gameId] = value;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
    }
    trackScore(gameId, value, isNewHigh);
    trackGameOver(gameId, value, isNewHigh);
    return scores[gameId] || 0;
}

const SETTINGS_KEY = "klh_retro_arcade_settings";

export function loadSettings() {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (!raw) return { volume: 0.4, muted: false };
        return { volume: 0.4, muted: false, ...JSON.parse(raw) };
    } catch {
        return { volume: 0.4, muted: false };
    }
}

export function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
