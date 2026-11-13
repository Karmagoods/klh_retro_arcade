import { getBest, recordScore } from "../../js/highscores.js";
import { drawOverlay } from "../../js/overlay.js";
import { audio } from "../../js/sound.js";
import { bindTouchControls } from "../../js/touch.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const TILE = 40;
const COLS = 20;
const ROWS = 15;
const ROW_HOME = 1;
const ROW_MEDIAN = 7;
const ROW_START = 14;
const LIFE_FRAMES = 40 * 60;

const HOME_SLOTS = [2, 6, 10, 14, 18];
const HOP_FRAMES = 7;

const DIRECTIONS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
};

const CAR_COLORS = ["#ff5f6d", "#ffd166", "#4d9fff", "#9b5de5", "#00f5d4"];

function rowY(row) {
    return row * TILE + TILE / 2;
}

function roundRectPath(x, y, w, h, r) {
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
        ctx.roundRect(x, y, w, h, r);
        return;
    }
    const radius = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
}

function createLanes(level) {
    const scale = 1 + (level - 1) * 0.1;

    const road = [
        { row: 8, dir: -1, speed: 1.4, gap: 260, width: 2 },
        { row: 9, dir: 1, speed: 1.1, gap: 300, width: 2 },
        { row: 10, dir: -1, speed: 2.0, gap: 360, width: 1 },
        { row: 11, dir: 1, speed: 1.6, gap: 290, width: 2 },
        { row: 12, dir: -1, speed: 1.0, gap: 330, width: 3 }
    ];
    const river = [
        { row: 2, dir: 1, speed: 0.9, gap: 300, width: 3, kind: "log" },
        { row: 3, dir: -1, speed: 1.5, gap: 260, width: 2, kind: "log" },
        { row: 4, dir: 1, speed: 1.1, gap: 220, width: 2, kind: "turtle" },
        { row: 5, dir: -1, speed: 1.8, gap: 320, width: 4, kind: "log" },
        { row: 6, dir: 1, speed: 1.2, gap: 280, width: 2, kind: "log" }
    ];

    const build = (lanes) =>
        lanes.map((lane) => {
            const width = lane.width * TILE;
            const items = [];
            for (let x = -width; x < canvas.width + width; x += lane.gap) {
                items.push({ x: x + Math.random() * lane.gap * 0.35, w: width });
            }
            return {
                ...lane,
                speed: Math.min(3.4, lane.speed * scale),
                items,
                timer: (lane.gap + Math.random() * 160) / lane.speed
            };
        });

    return { road: build(road), river: build(river) };
}

function makeFrog() {
    return { x: canvas.width / 2, row: ROW_START, hop: null };
}

function createState() {
    return {
        phase: "ready",
        score: 0,
        lives: 3,
        level: 1,
        highScore: getBest("hopper"),
        homes: HOME_SLOTS.map(() => false),
        lanes: createLanes(1),
        player: makeFrog(),
        bestRow: ROW_START,
        timeLeft: LIFE_FRAMES,
        deathTimer: 0,
        levelTimer: 0,
        anim: 0,
        queue: null
    };
}

let state = createState();
const input = { start: false, pause: false, menu: false, restart: false };
input.up = false;
input.down = false;
input.left = false;
input.right = false;

// ---------------------------------------------------------------- input

const keyDirs = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    W: "up",
    s: "down",
    S: "down",
    a: "left",
    A: "left",
    d: "right",
    D: "right"
};

document.addEventListener("keydown", (e) => {
    const dir = keyDirs[e.key];
    if (dir) {
        e.preventDefault();
        if (e.repeat) return;
        hop(dir);
        if (state.phase === "ready") input.start = true;
    }
    if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (state.phase === "gameover") input.restart = true;
        else input.start = true;
    }
    if (e.key === "p" || e.key === "P") input.pause = true;
    if (e.key === "Escape") {
        if (state.phase === "playing" || state.phase === "paused") input.pause = true;
        else input.menu = true;
    }
    audio.unlock();
});

const touchApi = bindTouchControls(input);
touchApi.attachSwipe(canvas, (dir) => {
    if (state.phase === "ready") input.start = true;
    hop(dir);
    audio.unlock();
});

const prevHeld = { up: false, down: false, left: false, right: false };
function pollTouchDirs() {
    let pressed = false;
    for (const name of Object.keys(DIRECTIONS)) {
        if (input[name] && !prevHeld[name]) {
            hop(name);
            pressed = true;
        }
        prevHeld[name] = !!input[name];
    }
    return pressed;
}

// ---------------------------------------------------------------- rules

function hop(dirName) {
    if (state.phase === "ready") {
        state.phase = "playing";
        input.start = false;
    }
    if (state.phase !== "playing") return;

    const p = state.player;
    if (!p) return;

    if (p.hop) {
        state.queue = dirName;
        return;
    }

    const d = DIRECTIONS[dirName];
    if (!d) return;

    const nx = p.x + d.x * TILE;
    const nr = p.row + d.y;
    if (nr < ROW_HOME || nr > ROW_START) return;
    if (nx < TILE / 2 || nx > canvas.width - TILE / 2) return;

    p.hop = {
        fromX: p.x,
        fromY: rowY(p.row),
        toX: nx,
        toY: rowY(nr),
        row: nr,
        t: 0
    };
    audio.play("jump");
}

function resetFrog() {
    state.player = makeFrog();
    state.bestRow = ROW_START;
    state.timeLeft = LIFE_FRAMES;
    state.queue = null;
}

function startDeath() {
    if (state.phase !== "playing") return;
    state.phase = "dying";
    state.deathTimer = 70;
    state.queue = null;
    audio.play("crash");
}

function laneUnderPlayer(lane) {
    const p = state.player;
    return lane.items.find((item) => p.x > item.x - 6 && p.x < item.x + item.w + 6) || null;
}

function tryHome() {
    const p = state.player;
    let slot = -1;
    HOME_SLOTS.forEach((col, index) => {
        if (Math.abs(p.x - (col * TILE + TILE / 2)) < TILE * 0.55) slot = index;
    });

    if (slot === -1 || state.homes[slot]) {
        startDeath();
        return;
    }

    state.homes[slot] = true;
    state.score += 50;
    audio.play("coin");

    if (state.homes.every(Boolean)) {
        state.phase = "levelclear";
        state.levelTimer = 130;
        state.score += 1000;
        audio.play("win");
        return;
    }

    resetFrog();
}

function land() {
    const p = state.player;

    if (p.row === ROW_HOME) {
        tryHome();
        return;
    }

    if (p.row < state.bestRow) {
        state.score += 10;
        state.bestRow = p.row;
        audio.play("score");
    }

    if (p.row >= 2 && p.row <= 6) {
        const lane = state.lanes.river.find((item) => item.row === p.row);
        if (!lane || !laneUnderPlayer(lane)) {
            startDeath();
        }
    }
}

function nextLevel() {
    state.level += 1;
    state.homes = HOME_SLOTS.map(() => false);
    state.lanes = createLanes(state.level);
    resetFrog();
    state.phase = "playing";
}

function checkCollisions() {
    const p = state.player;
    if (p.hop) return;

    if (p.row >= 8 && p.row <= 12) {
        const lane = state.lanes.road.find((item) => item.row === p.row);
        if (lane) {
            for (const car of lane.items) {
                if (p.x + 12 > car.x && p.x - 12 < car.x + car.w) {
                    startDeath();
                    return;
                }
            }
        }
    }

    if (p.row >= 2 && p.row <= 6) {
        const lane = state.lanes.river.find((item) => item.row === p.row);
        const log = lane ? laneUnderPlayer(lane) : null;
        if (!log) {
            startDeath();
            return;
        }
        p.x += lane.dir * lane.speed;
        if (p.x < 4 || p.x > canvas.width - 4) {
            startDeath();
            return;
        }
    }
}

function updateLanes(lanes) {
    for (const lane of lanes) {
        lane.timer -= 1;
        if (lane.timer <= 0) {
            const width = lane.width * TILE;
            lane.items.push({ x: lane.dir > 0 ? -width - 10 : canvas.width + 10, w: width });
            lane.timer = (lane.gap + Math.random() * 160) / lane.speed;
        }

        for (const item of lane.items) {
            item.x += lane.dir * lane.speed;
        }

        lane.items = lane.items.filter((item) =>
            lane.dir > 0 ? item.x < canvas.width + 40 : item.x + item.w > -40
        );
    }
}

// ---------------------------------------------------------------- update

function update() {
    state.anim += 1;

    if (input.menu) {
        window.location.href = "../index.html";
        return;
    }
    if (input.restart || (state.phase === "gameover" && input.start)) {
        state = createState();
        input.restart = false;
        input.start = false;
        return;
    }
    if (input.pause) {
        if (state.phase === "playing") state.phase = "paused";
        else if (state.phase === "paused") state.phase = "playing";
        input.pause = false;
    }

    if (state.phase === "dying") {
        state.deathTimer -= 1;
        if (state.deathTimer <= 0) {
            state.lives -= 1;
            if (state.lives <= 0) {
                state.highScore = recordScore("hopper", state.score);
                state.phase = "gameover";
                audio.play("lose");
            } else {
                state.lanes = createLanes(state.level);
                resetFrog();
                state.phase = "playing";
            }
        }
        return;
    }

    if (state.phase === "levelclear") {
        state.levelTimer -= 1;
        if (state.levelTimer <= 0) nextLevel();
        return;
    }

    const tapped = pollTouchDirs();
    if (state.phase === "ready" && (input.start || tapped)) {
        state.phase = "playing";
        input.start = false;
    }
    if (state.phase !== "playing") {
        input.start = false;
        return;
    }

    state.timeLeft -= 1;
    if (state.timeLeft <= 0) {
        startDeath();
        return;
    }

    const p = state.player;
    if (p.hop) {
        const h = p.hop;
        h.t += 1 / HOP_FRAMES;
        if (h.t >= 1) {
            p.x = h.toX;
            p.row = h.row;
            p.hop = null;
            if (state.queue) {
                const queued = state.queue;
                state.queue = null;
                land();
                if (state.phase === "playing" && state.player === p) hop(queued);
            } else {
                land();
            }
        }
    }

    updateLanes(state.lanes.road);
    updateLanes(state.lanes.river);

    if (state.phase === "playing") checkCollisions();
}

// ---------------------------------------------------------------- drawing

function drawBackground() {
    ctx.fillStyle = "#050816";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grass banks
    const grassRows = [0, 1, ROW_MEDIAN, 13, 14];
    for (const row of grassRows) {
        ctx.fillStyle = row === ROW_MEDIAN ? "#14351f" : "#0e2a19";
        ctx.fillRect(0, row * TILE, canvas.width, TILE);
    }
    ctx.fillStyle = "rgba(57, 255, 20, 0.05)";
    for (let x = 0; x < canvas.width; x += TILE) {
        ctx.fillRect(x + 6, 2 * TILE - 6, TILE - 12, 2);
    }

    // Water
    ctx.fillStyle = "#07253d";
    ctx.fillRect(0, 2 * TILE, canvas.width, 5 * TILE);
    ctx.strokeStyle = "rgba(72, 229, 255, 0.14)";
    ctx.lineWidth = 2;
    for (let row = 2; row <= 6; row++) {
        for (let x = 0; x < canvas.width; x += 60) {
            const y = row * TILE + 20 + Math.sin((x + state.anim * 1.4) * 0.02) * 4;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + 34, y);
            ctx.stroke();
        }
    }

    // Road
    ctx.fillStyle = "#12151d";
    ctx.fillRect(0, 8 * TILE, canvas.width, 5 * TILE);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.setLineDash([18, 16]);
    ctx.lineWidth = 2;
    for (let row = 9; row <= 12; row++) {
        const y = row * TILE;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    ctx.setLineDash([]);

    // Road edges
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.beginPath();
    ctx.moveTo(0, 8 * TILE + 2);
    ctx.lineTo(canvas.width, 8 * TILE + 2);
    ctx.moveTo(0, 13 * TILE - 2);
    ctx.lineTo(canvas.width, 13 * TILE - 2);
    ctx.stroke();
}

function drawHomes() {
    HOME_SLOTS.forEach((col, index) => {
        const x = col * TILE + TILE / 2;
        const y = ROW_HOME * TILE + TILE / 2;

        ctx.fillStyle = state.homes[index] ? "#0a1b12" : "#04120a";
        ctx.beginPath();
        ctx.ellipse(x, y, TILE * 0.42, TILE * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = state.homes[index] ? "#39ff14" : "#2b6b3f";
        ctx.lineWidth = 3;
        ctx.stroke();

        if (state.homes[index]) {
            drawFrog(x, y, 0.72);
        } else {
            ctx.fillStyle = "rgba(72, 229, 255, 0.18)";
            ctx.beginPath();
            ctx.ellipse(x, y, TILE * 0.2, TILE * 0.14, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // Reeds between the home bays
    ctx.fillStyle = "#1c5230";
    for (let col = 0; col < COLS; col++) {
        if (HOME_SLOTS.includes(col)) continue;
        const x = col * TILE;
        for (let i = 0; i < 3; i++) {
            const bx = x + 8 + i * 11;
            ctx.beginPath();
            ctx.moveTo(bx, ROW_HOME * TILE + TILE - 4);
            ctx.lineTo(bx + 4, ROW_HOME * TILE + 4);
            ctx.lineTo(bx + 8, ROW_HOME * TILE + TILE - 4);
            ctx.closePath();
            ctx.fill();
        }
    }
}

function drawLog(item, row, kind) {
    const y = row * TILE + 8;

    if (kind === "turtle") {
        const segments = Math.max(2, Math.round(item.w / 34));
        const segW = item.w / segments;
        for (let i = 0; i < segments; i++) {
            const x = item.x + i * segW;
            ctx.fillStyle = "#2f8f4e";
            ctx.beginPath();
            ctx.arc(x + segW / 2, y + 12, segW * 0.46, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#176030";
            ctx.beginPath();
            ctx.arc(x + segW / 2, y + 12, segW * 0.28, 0, Math.PI * 2);
            ctx.fill();
        }
        return;
    }

    ctx.fillStyle = "#6b4423";
    roundRectPath(item.x, y, item.w, TILE - 16, 8);
    ctx.fill();

    ctx.strokeStyle = "#8f6134";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(item.x + 8, y + 6);
    ctx.lineTo(item.x + item.w - 8, y + 6);
    ctx.stroke();

    ctx.fillStyle = "#4d2f18";
    for (let x = item.x + 16; x < item.x + item.w - 8; x += 26) {
        ctx.beginPath();
        ctx.arc(x, y + (TILE - 16) / 2, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawCar(item, row, index) {
    const y = row * TILE + 9;
    const h = TILE - 18;

    ctx.fillStyle = CAR_COLORS[index % CAR_COLORS.length];
    roundRectPath(item.x, y, item.w, h, 7);
    ctx.fill();

    ctx.fillStyle = "rgba(5, 8, 22, 0.65)";
    const windowW = Math.max(10, item.w * 0.32);
    ctx.fillRect(item.x + item.w * 0.18, y + 4, windowW, h - 10);
    ctx.fillRect(item.x + item.w * 0.62, y + 4, windowW, h - 10);

    ctx.fillStyle = "#fff8c9";
    if (item.w > 45) {
        ctx.fillRect(item.x + item.w - 5, y + 4, 4, 5);
        ctx.fillRect(item.x + item.w - 5, y + h - 9, 4, 5);
    } else {
        ctx.fillRect(item.x + item.w - 4, y + h / 2 - 3, 3, 6);
    }
}

function drawFrog(x, y, scale = 1) {
    const s = 15 * scale;

    ctx.fillStyle = "#39ff14";
    ctx.beginPath();
    ctx.ellipse(x, y + 2, s, s * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#2bd60f";
    ctx.beginPath();
    ctx.ellipse(x - s * 0.8, y + s * 0.55, s * 0.38, s * 0.28, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + s * 0.8, y + s * 0.55, s * 0.38, s * 0.28, -0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#39ff14";
    ctx.beginPath();
    ctx.arc(x - s * 0.45, y - s * 0.55, s * 0.4, 0, Math.PI * 2);
    ctx.arc(x + s * 0.45, y - s * 0.55, s * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#04120a";
    ctx.beginPath();
    ctx.arc(x - s * 0.45, y - s * 0.6, s * 0.18, 0, Math.PI * 2);
    ctx.arc(x + s * 0.45, y - s * 0.6, s * 0.18, 0, Math.PI * 2);
    ctx.fill();
}

function drawPlayer() {
    const p = state.player;

    if (p.hop) {
        const h = p.hop;
        const x = h.fromX + (h.toX - h.fromX) * h.t;
        const y = h.fromY + (h.toY - h.fromY) * h.t - Math.sin(h.t * Math.PI) * 14;
        drawFrog(x, y);
        return;
    }

    if (state.phase === "dying") {
        const wobble = Math.sin(state.anim * 0.6) * 4;
        ctx.globalAlpha = 0.55 + Math.abs(Math.sin(state.anim * 0.25)) * 0.45;
        drawFrog(p.x + wobble, rowY(p.row));
        ctx.globalAlpha = 1;
        return;
    }

    drawFrog(p.x, rowY(p.row));
}

function drawTimer() {
    const ratio = Math.max(0, state.timeLeft / LIFE_FRAMES);
    const width = canvas.width - 24;
    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    ctx.fillRect(12, 30, width, 6);
    ctx.fillStyle = ratio > 0.35 ? "#39ff14" : "#ff5f6d";
    ctx.fillRect(12, 30, width * ratio, 6);
}

function drawHud() {
    ctx.font = "11px 'Press Start 2P'";
    ctx.textAlign = "left";
    ctx.fillStyle = "#8fd8ff";
    ctx.fillText("SCORE " + String(state.score).padStart(6, "0"), 12, 18);

    ctx.textAlign = "center";
    ctx.fillStyle = "#5f7bbd";
    ctx.fillText("LEVEL " + state.level, canvas.width / 2, 18);

    ctx.textAlign = "right";
    ctx.fillStyle = "#39ff14";
    ctx.fillText("LIVES " + state.lives, canvas.width - 12, 18);
    ctx.textAlign = "left";

    drawTimer();
}

function draw() {
    drawBackground();
    drawHomes();

    for (const lane of state.lanes.road) {
        lane.items.forEach((item, index) => drawCar(item, lane.row, index));
    }
    for (const lane of state.lanes.river) {
        lane.items.forEach((item) => drawLog(item, lane.row, lane.kind));
    }

    drawPlayer();
    drawHud();

    if (state.phase === "ready") {
        drawOverlay(ctx, canvas, "HOPPER", [
            "ARROWS / SWIPE TO HOP",
            "FILL ALL 5 LILY PADS",
            "SPACE TO START"
        ]);
    } else if (state.phase === "paused") {
        drawOverlay(ctx, canvas, "PAUSED", ["P TO CONTINUE"]);
    } else if (state.phase === "levelclear") {
        drawOverlay(ctx, canvas, "LEVEL CLEAR", ["+1000 BONUS", "GET READY"]);
    } else if (state.phase === "gameover") {
        drawOverlay(ctx, canvas, "GAME OVER", [
            "SCORE " + state.score,
            "BEST " + state.highScore,
            "SPACE TO RESTART"
        ]);
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();
