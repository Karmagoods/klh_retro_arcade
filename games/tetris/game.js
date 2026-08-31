import { getBest, recordScore } from "../../js/highscores.js";
import { drawOverlay } from "../../js/overlay.js";
import { audio } from "../../js/sound.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const COLS = 10;
const ROWS = 20;
const SIZE = 28;
const OFFSET_X = 180;
const OFFSET_Y = 20;

const SHAPES = {
    I: [[1, 1, 1, 1]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1]],
    S: [[0, 1, 1], [1, 1, 0]],
    Z: [[1, 1, 0], [0, 1, 1]],
    J: [[1, 0, 0], [1, 1, 1]],
    L: [[0, 0, 1], [1, 1, 1]]
};

const COLORS = {
    I: "#00c7ff",
    O: "#ffcc00",
    T: "#af52de",
    S: "#34c759",
    Z: "#ff3b30",
    J: "#007aff",
    L: "#ff9500"
};

const BAG = Object.keys(SHAPES);

function rotate(matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const next = Array.from({ length: cols }, () => Array(rows).fill(0));
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            next[x][rows - 1 - y] = matrix[y][x];
        }
    }
    return next;
}

function emptyGrid() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function randomPiece() {
    const type = BAG[Math.floor(Math.random() * BAG.length)];
    return {
        type,
        matrix: SHAPES[type].map((row) => row.slice()),
        x: 3,
        y: 0
    };
}

function createState() {
    return {
        phase: "ready",
        grid: emptyGrid(),
        piece: randomPiece(),
        next: randomPiece(),
        score: 0,
        lines: 0,
        level: 1,
        highScore: getBest("tetris"),
        drop: 0,
        dropEvery: 48
    };
}

let state = createState();
const input = { start: false, pause: false, menu: false, restart: false };

function collides(piece, ox, oy, matrix) {
    const shape = matrix || piece.matrix;
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (!shape[y][x]) continue;
            const nx = piece.x + x + ox;
            const ny = piece.y + y + oy;
            if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
            if (ny >= 0 && state.grid[ny][nx]) return true;
        }
    }
    return false;
}

function mergePiece() {
    const { piece } = state;
    piece.matrix.forEach((row, y) => {
        row.forEach((cell, x) => {
            if (!cell) return;
            const gy = piece.y + y;
            const gx = piece.x + x;
            if (gy >= 0) state.grid[gy][gx] = piece.type;
        });
    });
}

function clearLines() {
    let cleared = 0;
    state.grid = state.grid.filter((row) => {
        const full = row.every(Boolean);
        if (full) cleared += 1;
        return !full;
    });
    while (state.grid.length < ROWS) {
        state.grid.unshift(Array(COLS).fill(null));
    }
    if (cleared) {
        const table = [0, 100, 300, 500, 800];
        state.score += table[cleared] * state.level;
        state.lines += cleared;
        state.level = 1 + Math.floor(state.lines / 10);
        state.dropEvery = Math.max(12, 48 - (state.level - 1) * 4);
        audio.play("line");
    }
}

function spawn() {
    state.piece = state.next;
    state.piece.x = 3;
    state.piece.y = 0;
    state.next = randomPiece();
    if (collides(state.piece, 0, 0)) {
        state.highScore = recordScore("tetris", state.score);
        state.phase = "gameover";
        audio.play("lose");
    }
}

function hardDrop() {
    while (!collides(state.piece, 0, 1)) {
        state.piece.y += 1;
        state.score += 2;
    }
    lockPiece();
}

function lockPiece() {
    mergePiece();
    audio.play("hit");
    clearLines();
    spawn();
}

function tryMove(dx, dy) {
    if (!collides(state.piece, dx, dy)) {
        state.piece.x += dx;
        state.piece.y += dy;
        return true;
    }
    return false;
}

function tryRotate() {
    const rotated = rotate(state.piece.matrix);
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
        if (!collides(state.piece, kick, 0, rotated)) {
            state.piece.matrix = rotated;
            state.piece.x += kick;
            audio.play("select");
            return;
        }
    }
}

document.addEventListener("keydown", (e) => {
    if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " "].includes(e.key)) e.preventDefault();
    audio.unlock();
    if (e.key === "Escape") {
        if (state.phase === "playing") input.pause = true;
        else input.menu = true;
        return;
    }
    if (e.key === "p" || e.key === "P") {
        input.pause = true;
        return;
    }
    if (e.key === "Enter" || (e.key === " " && state.phase !== "playing")) {
        if (state.phase === "gameover") input.restart = true;
        else input.start = true;
        return;
    }
    if (state.phase !== "playing") return;
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") tryMove(-1, 0);
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") tryMove(1, 0);
    if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        if (tryMove(0, 1)) state.score += 1;
        else lockPiece();
    }
    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") tryRotate();
    if (e.key === " ") hardDrop();
});

function update() {
    if (input.menu) {
        window.location.href = "../index.html";
        return;
    }
    if (input.restart) {
        state = createState();
        input.restart = false;
        return;
    }
    if (input.pause) {
        if (state.phase === "playing") state.phase = "paused";
        else if (state.phase === "paused") state.phase = "playing";
        input.pause = false;
    }
    if (state.phase === "ready" && input.start) {
        state.phase = "playing";
        input.start = false;
    }
    if (state.phase !== "playing") {
        input.start = false;
        return;
    }

    state.drop += 1;
    if (state.drop >= state.dropEvery) {
        state.drop = 0;
        if (!tryMove(0, 1)) lockPiece();
    }
}

function drawCell(x, y, type) {
    ctx.fillStyle = COLORS[type];
    ctx.fillRect(OFFSET_X + x * SIZE, OFFSET_Y + y * SIZE, SIZE - 2, SIZE - 2);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0b1020";
    ctx.fillRect(OFFSET_X - 8, OFFSET_Y - 8, COLS * SIZE + 16, ROWS * SIZE + 16);
    ctx.strokeStyle = "#00ffee";
    ctx.strokeRect(OFFSET_X - 8, OFFSET_Y - 8, COLS * SIZE + 16, ROWS * SIZE + 16);

    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (state.grid[y][x]) drawCell(x, y, state.grid[y][x]);
        }
    }

    state.piece.matrix.forEach((row, y) => {
        row.forEach((cell, x) => {
            if (cell) drawCell(state.piece.x + x, state.piece.y + y, state.piece.type);
        });
    });

    ctx.font = "16px 'Press Start 2P'";
    ctx.fillStyle = "#00ffee";
    ctx.fillText("SCORE", 500, 80);
    ctx.fillText(String(state.score), 500, 110);
    ctx.fillText("LINES " + state.lines, 500, 160);
    ctx.fillText("LEVEL " + state.level, 500, 200);
    ctx.fillText("NEXT", 500, 260);
    state.next.matrix.forEach((row, y) => {
        row.forEach((cell, x) => {
            if (!cell) return;
            ctx.fillStyle = COLORS[state.next.type];
            ctx.fillRect(500 + x * 24, 280 + y * 24, 22, 22);
        });
    });

    if (state.phase === "ready") {
        drawOverlay(ctx, canvas, "TETRIS", ["ARROWS MOVE", "UP ROTATE  SPACE DROP", "SPACE TO START"]);
    } else if (state.phase === "paused") {
        drawOverlay(ctx, canvas, "PAUSED", ["P TO CONTINUE"]);
    } else if (state.phase === "gameover") {
        drawOverlay(ctx, canvas, "GAME OVER", ["SCORE " + state.score, "BEST " + state.highScore, "SPACE TO RESTART"]);
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();
