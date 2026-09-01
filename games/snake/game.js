import { getBest, recordScore } from "../../js/highscores.js";
import { drawOverlay } from "../../js/overlay.js";
import { audio } from "../../js/sound.js";
import { bindTouchControls } from "../../js/touch.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const CELL = 20;
const COLS = canvas.width / CELL;
const ROWS = canvas.height / CELL;

function spawnFood(snake) {
    let food;
    do {
        food = {
            x: Math.floor(Math.random() * COLS),
            y: Math.floor(Math.random() * ROWS)
        };
    } while (snake.some((part) => part.x === food.x && part.y === food.y));
    return food;
}

function createState() {
    const snake = [
        { x: 12, y: 15 },
        { x: 11, y: 15 },
        { x: 10, y: 15 }
    ];
    return {
        phase: "ready",
        snake,
        dir: { x: 1, y: 0 },
        pending: [],
        food: spawnFood(snake),
        score: 0,
        highScore: getBest("snake"),
        tick: 0,
        step: 8
    };
}

let state = createState();
const input = { start: false, pause: false, menu: false, restart: false };

function queueDir(x, y) {
    const last = state.pending[state.pending.length - 1] || state.dir;
    if (last.x + x === 0 && last.y + y === 0) return;
    if (last.x === x && last.y === y) return;
    if (state.pending.length < 3) state.pending.push({ x, y });
}

document.addEventListener("keydown", (e) => {
    const map = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        w: [0, -1],
        W: [0, -1],
        s: [0, 1],
        S: [0, 1],
        a: [-1, 0],
        A: [-1, 0],
        d: [1, 0],
        D: [1, 0]
    };
    if (map[e.key]) {
        e.preventDefault();
        queueDir(...map[e.key]);
    }
    if (e.key === " " || e.key === "Enter") {
        if (state.phase === "gameover") input.restart = true;
        else input.start = true;
    }
    if (e.key === "p" || e.key === "P") input.pause = true;
    if (e.key === "Escape") {
        if (state.phase === "playing") input.pause = true;
        else input.menu = true;
    }
    audio.unlock();
});

// Touch D-pad: hold directions map via flags we poll
input.up = false;
input.down = false;
input.left = false;
input.right = false;
const touchApi = bindTouchControls(input);
touchApi.attachSwipe(canvas, (dir) => {
    const map = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    if (map[dir]) queueDir(...map[dir]);
    if (state.phase === "ready") input.start = true;
    audio.unlock();
});

const prevHeld = { up: false, down: false, left: false, right: false };
function pollTouchDirs() {
    const dirs = [
        ["up", 0, -1],
        ["down", 0, 1],
        ["left", -1, 0],
        ["right", 1, 0]
    ];
    for (const [key, x, y] of dirs) {
        if (input[key] && !prevHeld[key]) queueDir(x, y);
        prevHeld[key] = !!input[key];
    }
}

function update() {
    pollTouchDirs();
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
    if (state.phase === "ready" && input.start) {
        state.phase = "playing";
        input.start = false;
    }
    if (state.phase !== "playing") {
        input.start = false;
        return;
    }

    state.tick += 1;
    if (state.tick % state.step !== 0) return;
    if (state.pending.length) state.dir = state.pending.shift();

    const head = {
        x: state.snake[0].x + state.dir.x,
        y: state.snake[0].y + state.dir.y
    };

    const hitWall = head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS;
    const hitSelf = state.snake.some((part) => part.x === head.x && part.y === head.y);
    if (hitWall || hitSelf) {
        audio.play("lose");
        state.highScore = recordScore("snake", state.score);
        state.phase = "gameover";
        return;
    }

    state.snake.unshift(head);
    if (head.x === state.food.x && head.y === state.food.y) {
        state.score += 10;
        audio.play("eat");
        state.food = spawnFood(state.snake);
        state.step = Math.max(4, 8 - Math.floor(state.score / 80));
    } else {
        state.snake.pop();
    }
}

function draw() {
    ctx.fillStyle = "#0b1020";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(0,255,238,0.08)";
    for (let x = 0; x < COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * CELL, 0);
        ctx.lineTo(x * CELL, canvas.height);
        ctx.stroke();
    }

    ctx.fillStyle = "#ff2d55";
    ctx.fillRect(state.food.x * CELL + 2, state.food.y * CELL + 2, CELL - 4, CELL - 4);

    state.snake.forEach((part, i) => {
        ctx.fillStyle = i === 0 ? "#00ffee" : "#34c759";
        ctx.fillRect(part.x * CELL + 1, part.y * CELL + 1, CELL - 2, CELL - 2);
    });

    ctx.font = "16px 'Press Start 2P'";
    ctx.fillStyle = "#00ffee";
    ctx.fillText("SCORE " + state.score, 16, 28);

    if (state.phase === "ready") {
        drawOverlay(ctx, canvas, "SNAKE", ["ARROWS OR WASD", "SPACE TO START"]);
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
