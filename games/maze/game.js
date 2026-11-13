import { getBest, recordScore } from "../../js/highscores.js";
import { drawOverlay } from "../../js/overlay.js";
import { audio } from "../../js/sound.js";
import { bindTouchControls } from "../../js/touch.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const TILE = 25;
const COLS = 32;
const ROWS = 23;

// Left half of the maze — the right half is mirrored so the layout stays symmetric.
const LEFT = [
    "################",
    "#...............",
    "#.###.#####.###.",
    "#o###.#####.###.",
    "#.###.#####.###.",
    "#...............",
    "#.###.##.#######",
    "#.###.##.#######",
    "#.....##.......#",
    "######.##.######",
    "######.##.######",
    "      ....      ",
    "######.##.######",
    "######.##.######",
    "#.....##.......#",
    "#.###.##.#######",
    "#.###.##.#######",
    "#...............",
    "#.###.#####.###.",
    "#o###.#####.###.",
    "#.###.#####.###.",
    "#...............",
    "################"
];

const MAZE = LEFT.map((row) => row + [...row].reverse().join(""));

const DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
};
const ORDER = ["up", "left", "down", "right"];
const OPPOSITE = { up: "down", down: "up", left: "right", right: "left" };
const ANGLE = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };

const START = { c: 15, r: 17 };
const GHOST_SETUP = [
    { c: 12, r: 11, color: "#ff3b30", kind: "chaser", corner: { c: 30, r: 1 } },
    { c: 14, r: 11, color: "#ff9dd1", kind: "ambusher", corner: { c: 1, r: 1 } },
    { c: 17, r: 11, color: "#48e5ff", kind: "flanker", corner: { c: 30, r: 21 } },
    { c: 19, r: 11, color: "#ffb347", kind: "shy", corner: { c: 1, r: 21 } }
];

const PLAYER_SPEED = 1 / 6;
const FRIGHT_FRAMES = 7 * 60;
const CHASE_FRAMES = 20 * 60;
const SCATTER_FRAMES = 7 * 60;

function wrapCol(c) {
    return ((c % COLS) + COLS) % COLS;
}

function isWall(c, r) {
    if (r < 0 || r >= ROWS) return true;
    return MAZE[r][wrapCol(c)] === "#";
}

function canGo(c, r, dir) {
    const d = DIRS[dir];
    if (!d) return false;
    return !isWall(c + d.x, r + d.y);
}

function cellCenter(c, r) {
    return { x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 };
}

function makePlayer() {
    return {
        c: START.c,
        r: START.r,
        nextC: START.c,
        nextR: START.r,
        dir: "left",
        want: "left",
        moving: false,
        progress: 0
    };
}

function makeGhosts() {
    return GHOST_SETUP.map((setup, index) => ({
        c: setup.c,
        r: setup.r,
        spawn: { c: setup.c, r: setup.r },
        nextC: setup.c,
        nextR: setup.r,
        dir: index % 2 === 0 ? "left" : "right",
        color: setup.color,
        kind: setup.kind,
        corner: setup.corner,
        moving: false,
        progress: 0,
        release: 30 + index * 45,
        eaten: false
    }));
}

function createPellets() {
    let left = 0;
    const grid = MAZE.map((row) =>
        row.split("").map((ch) => {
            if (ch === "." || ch === "o") {
                left += 1;
                return ch;
            }
            return null;
        })
    );
    return { grid, left };
}

function createState() {
    const pellets = createPellets();
    const startCell = pellets.grid[START.r][START.c];
    if (startCell) {
        pellets.grid[START.r][START.c] = null;
        pellets.left -= 1;
    }
    return {
        phase: "ready",
        score: 0,
        lives: 3,
        level: 1,
        highScore: getBest("maze"),
        pellets: pellets.grid,
        pelletsLeft: pellets.left,
        pelletsEaten: startCell ? 1 : 0,
        player: makePlayer(),
        ghosts: makeGhosts(),
        mode: "chase",
        modeTimer: CHASE_FRAMES,
        frightened: 0,
        combo: 0,
        fruit: null,
        deathTimer: 0,
        levelTimer: 0,
        anim: 0
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
        state.player.want = dir;
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
    state.player.want = dir;
    if (state.phase === "ready") input.start = true;
    audio.unlock();
});

const prevHeld = { up: false, down: false, left: false, right: false };
function pollTouchDirs() {
    let pressed = false;
    for (const name of ORDER) {
        if (input[name] && !prevHeld[name]) {
            state.player.want = name;
            pressed = true;
        }
        prevHeld[name] = !!input[name];
    }
    return pressed;
}

// ---------------------------------------------------------------- movement

function entityPos(e) {
    const fromX = e.c * TILE + TILE / 2;
    const fromY = e.r * TILE + TILE / 2;
    const toX = e.nextC * TILE + TILE / 2;
    const toY = e.nextR * TILE + TILE / 2;
    // Tunnel wrap: don't stretch the sprite across the whole maze.
    if (Math.abs(toX - fromX) > TILE * 1.5) return { x: toX, y: toY };
    const t = Math.min(1, Math.max(0, e.progress));
    return { x: fromX + (toX - fromX) * t, y: fromY + (toY - fromY) * t };
}

function startMove(e) {
    const d = DIRS[e.dir];
    if (!d) return false;
    const nc = wrapCol(e.c + d.x);
    const nr = e.r + d.y;
    if (isWall(nc, nr)) return false;
    e.nextC = nc;
    e.nextR = nr;
    e.moving = true;
    return true;
}

function reverseEntity(e) {
    if (!e.dir) return;
    e.dir = OPPOSITE[e.dir];
    if (!e.moving) return;
    const c = e.c;
    const r = e.r;
    e.c = e.nextC;
    e.r = e.nextR;
    e.nextC = c;
    e.nextR = r;
    e.progress = 1 - e.progress;
}

function eatAt(c, r) {
    const pellet = state.pellets[r][c];
    if (pellet) {
        state.pellets[r][c] = null;
        state.pelletsLeft -= 1;
        state.pelletsEaten += 1;
        if (pellet === "o") {
            state.score += 50;
            state.frightened = FRIGHT_FRAMES;
            state.combo = 0;
            state.ghosts.forEach((ghost) => {
                if (!ghost.eaten) reverseEntity(ghost);
            });
            audio.play("powerup");
        } else {
            state.score += 10;
            audio.play("blip");
        }

        if ((state.pelletsEaten === 70 || state.pelletsEaten === 170) && !state.fruit) {
            state.fruit = { c: 15, r: 11, timer: 10 * 60 };
        }

        if (state.pelletsLeft === 0) {
            state.phase = "levelclear";
            state.levelTimer = 110;
            audio.play("win");
            return;
        }
    }

    if (state.fruit && state.fruit.c === c && state.fruit.r === r) {
        state.score += 100 * state.level;
        state.fruit = null;
        audio.play("coin");
    }
}

function updatePlayer() {
    const p = state.player;

    // Instant 180° turn feels better than waiting for the next tile.
    if (p.want === OPPOSITE[p.dir]) {
        reverseEntity(p);
    }

    if (!p.moving) {
        if (canGo(p.c, p.r, p.want)) p.dir = p.want;
        if (!startMove(p)) return;
    }

    p.progress += PLAYER_SPEED;
    while (p.progress >= 1) {
        p.progress -= 1;
        p.c = p.nextC;
        p.r = p.nextR;
        eatAt(p.c, p.r);
        if (state.phase !== "playing") {
            p.moving = false;
            p.progress = 0;
            return;
        }
        if (canGo(p.c, p.r, p.want)) p.dir = p.want;
        if (!startMove(p)) {
            p.moving = false;
            p.progress = 0;
            return;
        }
    }
}

function ghostTarget(g) {
    if (g.eaten) return g.spawn;
    if (state.mode === "scatter") return g.corner;

    const p = state.player;
    const pd = DIRS[p.dir] || { x: 0, y: 0 };

    if (g.kind === "chaser") return { c: p.c, r: p.r };
    if (g.kind === "ambusher") {
        return { c: p.c + pd.x * 4, r: p.r + pd.y * 4 };
    }
    if (g.kind === "flanker") {
        const lead = { c: p.c + pd.x * 2, r: p.r + pd.y * 2 };
        const blinky = state.ghosts[0];
        return { c: lead.c * 2 - blinky.c, r: lead.r * 2 - blinky.r };
    }
    const dist = Math.hypot(g.c - p.c, g.r - p.r);
    return dist > 8 ? { c: p.c, r: p.r } : g.corner;
}

function ghostChoose(g) {
    const open = ORDER.filter((name) => canGo(g.c, g.r, name));
    let options = open.filter((name) => name !== OPPOSITE[g.dir]);
    if (!options.length) options = open;
    if (!options.length) return null;

    if (state.frightened > 0 && !g.eaten) {
        return options[Math.floor(Math.random() * options.length)];
    }

    const target = ghostTarget(g);
    let best = options[0];
    let bestDist = Infinity;
    for (const name of options) {
        const d = DIRS[name];
        const nc = g.c + d.x;
        const nr = g.r + d.y;
        const dist = (nc - target.c) ** 2 + (nr - target.r) ** 2;
        if (dist < bestDist) {
            bestDist = dist;
            best = name;
        }
    }
    return best;
}

function ghostSpeed(g) {
    if (g.eaten) return 0.24;
    if (state.frightened > 0) return 0.075;
    return Math.min(0.155, 0.115 + state.level * 0.005);
}

function updateGhost(g) {
    if (g.release > 0) {
        g.release -= 1;
        return;
    }

    if (!g.moving) {
        const dir = ghostChoose(g);
        if (dir) g.dir = dir;
        if (!startMove(g)) return;
    }

    g.progress += ghostSpeed(g);
    while (g.progress >= 1) {
        g.progress -= 1;
        g.c = g.nextC;
        g.r = g.nextR;

        if (g.eaten && g.c === g.spawn.c && g.r === g.spawn.r) {
            g.eaten = false;
            g.dir = "left";
        }

        const dir = ghostChoose(g);
        if (dir) g.dir = dir;
        if (!startMove(g)) {
            g.moving = false;
            g.progress = 0;
            return;
        }
    }
}

// ---------------------------------------------------------------- rules

function resetPositions() {
    state.player = makePlayer();
    state.ghosts = makeGhosts();
    state.frightened = 0;
    state.combo = 0;
    state.mode = "chase";
    state.modeTimer = CHASE_FRAMES;
    state.fruit = null;
}

function startDeath() {
    state.phase = "dying";
    state.deathTimer = 90;
    state.frightened = 0;
    audio.play("lose");
}

function checkCollisions() {
    const p = entityPos(state.player);
    for (const ghost of state.ghosts) {
        if (ghost.release > 0 || ghost.eaten) continue;
        const gp = entityPos(ghost);
        if (Math.abs(p.x - gp.x) > TILE * 0.7) continue;
        if (Math.abs(p.y - gp.y) > TILE * 0.7) continue;

        if (state.frightened > 0) {
            ghost.eaten = true;
            state.combo = Math.min(4, state.combo + 1);
            state.score += 200 * 2 ** (state.combo - 1);
            audio.play("eat");
        } else {
            startDeath();
            return;
        }
    }
}

function nextLevel() {
    state.level += 1;
    const pellets = createPellets();
    state.pellets = pellets.grid;
    state.pelletsLeft = pellets.left;
    state.pelletsEaten = 0;
    if (state.pellets[START.r][START.c]) {
        state.pellets[START.r][START.c] = null;
        state.pelletsLeft -= 1;
        state.pelletsEaten = 1;
    }
    resetPositions();
    state.phase = "playing";
}

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
                state.highScore = recordScore("maze", state.score);
                state.phase = "gameover";
                audio.play("lose");
            } else {
                resetPositions();
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

    const pressed = pollTouchDirs();
    if (state.phase === "ready" && (input.start || pressed)) {
        state.phase = "playing";
        input.start = false;
    }
    if (state.phase !== "playing") {
        input.start = false;
        return;
    }

    if (state.frightened > 0) {
        state.frightened -= 1;
    } else {
        state.combo = 0;
        state.modeTimer -= 1;
        if (state.modeTimer <= 0) {
            if (state.mode === "chase") {
                state.mode = "scatter";
                state.modeTimer = SCATTER_FRAMES;
            } else {
                state.mode = "chase";
                state.modeTimer = CHASE_FRAMES;
            }
            state.ghosts.forEach((ghost) => {
                if (!ghost.eaten) reverseEntity(ghost);
            });
        }
    }

    if (state.fruit) {
        state.fruit.timer -= 1;
        if (state.fruit.timer <= 0) state.fruit = null;
    }

    updatePlayer();
    if (state.phase !== "playing") return;

    state.ghosts.forEach(updateGhost);
    checkCollisions();
}

// ---------------------------------------------------------------- drawing

function circle(x, y, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
}

// The maze never changes, so render it once and blit the layer each frame.
const mazeLayer = document.createElement("canvas");
mazeLayer.width = canvas.width;
mazeLayer.height = canvas.height;
const mazeCtx = mazeLayer.getContext("2d");

function buildMazeLayer() {
    mazeCtx.fillStyle = "#050816";
    mazeCtx.fillRect(0, 0, mazeLayer.width, mazeLayer.height);

    mazeCtx.lineWidth = 2;
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (MAZE[r][c] !== "#") continue;
            const x = c * TILE;
            const y = r * TILE;
            mazeCtx.fillStyle = "#0a1a4a";
            mazeCtx.fillRect(x, y, TILE, TILE);

            mazeCtx.strokeStyle = "#2f6bff";
            mazeCtx.beginPath();
            if (!isWall(c, r - 1)) {
                mazeCtx.moveTo(x, y + 1);
                mazeCtx.lineTo(x + TILE, y + 1);
            }
            if (!isWall(c, r + 1)) {
                mazeCtx.moveTo(x, y + TILE - 1);
                mazeCtx.lineTo(x + TILE, y + TILE - 1);
            }
            if (!isWall(c - 1, r)) {
                mazeCtx.moveTo(x + 1, y);
                mazeCtx.lineTo(x + 1, y + TILE);
            }
            if (!isWall(c + 1, r)) {
                mazeCtx.moveTo(x + TILE - 1, y);
                mazeCtx.lineTo(x + TILE - 1, y + TILE);
            }
            mazeCtx.stroke();
        }
    }
}

buildMazeLayer();

function drawMaze() {
    ctx.drawImage(mazeLayer, 0, 0);
}

function drawPellets() {
    const pulse = 0.75 + Math.sin(state.anim * 0.12) * 0.25;
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const pellet = state.pellets[r][c];
            if (!pellet) continue;
            const p = cellCenter(c, r);
            if (pellet === "o") {
                circle(p.x, p.y, 6 * pulse, "#ffe6b0");
            } else {
                circle(p.x, p.y, 2.4, "#ffd9a0");
            }
        }
    }
}

function drawPlayer() {
    const p = entityPos(state.player);
    const base = ANGLE[state.player.dir] || 0;
    const mouth = state.player.moving
        ? 0.08 + Math.abs(Math.sin(state.anim * 0.2)) * 0.34
        : 0.24;

    ctx.save();
    ctx.shadowColor = "#ffe14d";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#ffe14d";
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.arc(p.x, p.y, TILE * 0.42, base + mouth, base + Math.PI * 2 - mouth);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawGhost(g) {
    const p = entityPos(g);
    const radius = TILE * 0.42;
    const frightened = state.frightened > 0 && !g.eaten;
    const flashing = frightened && state.frightened < 120 && Math.floor(state.anim / 12) % 2 === 0;
    const dir = DIRS[g.dir] || DIRS.left;

    if (!g.eaten) {
        ctx.fillStyle = frightened ? (flashing ? "#ffffff" : "#2b5bff") : g.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y - radius * 0.25, radius, Math.PI, 0);
        ctx.lineTo(p.x + radius, p.y + radius * 0.72);
        const step = (radius * 2) / 3;
        for (let i = 0; i < 3; i++) {
            const x0 = p.x + radius - i * step;
            ctx.quadraticCurveTo(x0 - step / 2, p.y + radius * 0.35, x0 - step, p.y + radius * 0.72);
        }
        ctx.closePath();
        ctx.fill();
    }

    if (frightened) {
        const eyeColor = flashing ? "#2b5bff" : "#ffffff";
        circle(p.x - radius * 0.35, p.y - radius * 0.25, radius * 0.22, eyeColor);
        circle(p.x + radius * 0.35, p.y - radius * 0.25, radius * 0.22, eyeColor);
        ctx.strokeStyle = flashing ? "#2b5bff" : "#ffffff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
            const x0 = p.x - radius * 0.55 + i * radius * 0.36;
            const y0 = p.y + radius * 0.42 + (i % 2 === 0 ? 0 : -3);
            if (i === 0) ctx.moveTo(x0, y0);
            else ctx.lineTo(x0, y0);
        }
        ctx.stroke();
        return;
    }

    const eyeOffsetX = dir.x * radius * 0.16;
    const eyeOffsetY = dir.y * radius * 0.16;
    circle(p.x - radius * 0.33 + eyeOffsetX, p.y - radius * 0.22 + eyeOffsetY, radius * 0.28, "#ffffff");
    circle(p.x + radius * 0.33 + eyeOffsetX, p.y - radius * 0.22 + eyeOffsetY, radius * 0.28, "#ffffff");
    circle(p.x - radius * 0.33 + eyeOffsetX * 2.4, p.y - radius * 0.22 + eyeOffsetY * 2.4, radius * 0.14, "#14213d");
    circle(p.x + radius * 0.33 + eyeOffsetX * 2.4, p.y - radius * 0.22 + eyeOffsetY * 2.4, radius * 0.14, "#14213d");
}

function drawFruit() {
    if (!state.fruit) return;
    const p = cellCenter(state.fruit.c, state.fruit.r);
    ctx.strokeStyle = "#39ff14";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 2);
    ctx.quadraticCurveTo(p.x + 2, p.y - 9, p.x + 8, p.y - 10);
    ctx.stroke();
    circle(p.x - 5, p.y + 3, 5, "#ff2d55");
    circle(p.x + 4, p.y + 5, 5, "#ff2d55");
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
    ctx.fillStyle = "#ffe14d";
    ctx.fillText("LIVES", canvas.width - 66, 18);
    for (let i = 0; i < state.lives; i++) {
        const x = canvas.width - 46 + i * 16;
        ctx.beginPath();
        ctx.moveTo(x, 12);
        ctx.arc(x, 12, 6, 0.28, Math.PI * 2 - 0.28);
        ctx.closePath();
        ctx.fill();
    }
    ctx.textAlign = "left";
}

function draw() {
    drawMaze();
    drawPellets();
    drawFruit();

    if (state.phase !== "dying") state.ghosts.forEach(drawGhost);
    drawPlayer();
    drawHud();

    if (state.phase === "ready") {
        drawOverlay(ctx, canvas, "MAZE MUNCH", [
            "ARROWS / WASD TO MOVE",
            "EAT ALL PELLETS",
            "SPACE TO START"
        ]);
    } else if (state.phase === "paused") {
        drawOverlay(ctx, canvas, "PAUSED", ["P TO CONTINUE"]);
    } else if (state.phase === "levelclear") {
        drawOverlay(ctx, canvas, "LEVEL CLEAR", ["+ BONUS", "GET READY"]);
    } else if (state.phase === "gameover") {
        drawOverlay(ctx, canvas, "GAME OVER", [
            "SCORE " + state.score,
            "BEST " + state.highScore,
            "SPACE TO RESTART"
        ]);
    } else if (state.phase === "dying") {
        const p = entityPos(state.player);
        const t = 1 - state.deathTimer / 90;
        ctx.strokeStyle = "#ffe14d";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, TILE * 0.42 * (1 - t), Math.PI * 1.6, Math.PI * 2.4);
        ctx.stroke();
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();
