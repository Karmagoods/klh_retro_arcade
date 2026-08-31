const STORAGE_KEY = "klh_retro_arcade_scores";

export const GAMES = [
    { id: "breakout", title: "BREAKOUT", href: "breakout/index.html" },
    { id: "pong", title: "PONG", href: "pong/index.html" },
    { id: "snake", title: "SNAKE", href: "snake/index.html" },
    { id: "invaders", title: "INVADERS", href: "invaders/index.html" },
    { id: "tetris", title: "TETRIS", href: "tetris/index.html" }
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
    if (value > (scores[gameId] || 0)) {
        scores[gameId] = value;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
    }
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
