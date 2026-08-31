import { getBest, recordScore } from "../../js/highscores.js";
import { drawOverlay } from "../../js/overlay.js";
import { audio } from "../../js/sound.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const WIN = 7;

function createState() {
    return {
        phase: "ready",
        playerScore: 0,
        cpuScore: 0,
        highScore: getBest("pong"),
        player: { x: 24, y: canvas.height / 2 - 50, w: 14, h: 100, speed: 7 },
        cpu: { x: canvas.width - 38, y: canvas.height / 2 - 50, w: 14, h: 100, speed: 5.2 },
        ball: { x: canvas.width / 2, y: canvas.height / 2, r: 8, dx: 5, dy: 3 }
    };
}

const input = { up: false, down: false, start: false, pause: false, menu: false, restart: false };
let state = createState();

document.addEventListener("keydown", (e) => {
    if (["ArrowUp", "ArrowDown", " "].includes(e.key)) e.preventDefault();
    if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") input.up = true;
    if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") input.down = true;
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

document.addEventListener("keyup", (e) => {
    if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") input.up = false;
    if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") input.down = false;
});

function resetBall(direction) {
    state.ball.x = canvas.width / 2;
    state.ball.y = canvas.height / 2;
    const speed = 5 + Math.min(4, state.playerScore + state.cpuScore) * 0.35;
    state.ball.dx = direction * speed;
    state.ball.dy = (Math.random() * 4 - 2) || 2;
}

function bouncePaddle(paddle) {
    const ball = state.ball;
    if (
        ball.x + ball.r > paddle.x &&
        ball.x - ball.r < paddle.x + paddle.w &&
        ball.y + ball.r > paddle.y &&
        ball.y - ball.r < paddle.y + paddle.h
    ) {
        const hit = (ball.y - (paddle.y + paddle.h / 2)) / (paddle.h / 2);
        ball.dx = -Math.sign(ball.dx) * Math.min(11, Math.abs(ball.dx) * 1.06);
        ball.dy = hit * 6;
        ball.x = paddle.x < canvas.width / 2 ? paddle.x + paddle.w + ball.r : paddle.x - ball.r;
        audio.play("paddle");
    }
}

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
        resetBall(Math.random() < 0.5 ? -1 : 1);
        input.start = false;
    }
    if (state.phase !== "playing") {
        input.start = false;
        return;
    }

    if (input.up) state.player.y -= state.player.speed;
    if (input.down) state.player.y += state.player.speed;
    state.player.y = Math.max(0, Math.min(canvas.height - state.player.h, state.player.y));

    const target = state.ball.y - state.cpu.h / 2;
    if (state.cpu.y < target - 8) state.cpu.y += state.cpu.speed;
    if (state.cpu.y > target + 8) state.cpu.y -= state.cpu.speed;
    state.cpu.y = Math.max(0, Math.min(canvas.height - state.cpu.h, state.cpu.y));

    state.ball.x += state.ball.dx;
    state.ball.y += state.ball.dy;

    if (state.ball.y < state.ball.r || state.ball.y > canvas.height - state.ball.r) {
        state.ball.dy *= -1;
        state.ball.y = Math.max(state.ball.r, Math.min(canvas.height - state.ball.r, state.ball.y));
        audio.play("wall");
    }

    bouncePaddle(state.player);
    bouncePaddle(state.cpu);

    if (state.ball.x < 0) {
        state.cpuScore += 1;
        audio.play("lose");
        if (state.cpuScore >= WIN) {
            state.highScore = recordScore("pong", state.playerScore);
            state.phase = "gameover";
        } else {
            resetBall(1);
        }
    } else if (state.ball.x > canvas.width) {
        state.playerScore += 1;
        audio.play("win");
        if (state.playerScore >= WIN) {
            state.highScore = recordScore("pong", state.playerScore);
            state.phase = "gameover";
        } else {
            resetBall(-1);
        }
    }
}

function drawNet() {
    ctx.fillStyle = "rgba(0,255,238,0.35)";
    for (let y = 10; y < canvas.height; y += 28) {
        ctx.fillRect(canvas.width / 2 - 3, y, 6, 16);
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawNet();
    ctx.fillStyle = "#00ffee";
    ctx.fillRect(state.player.x, state.player.y, state.player.w, state.player.h);
    ctx.fillStyle = "#ff2d55";
    ctx.fillRect(state.cpu.x, state.cpu.y, state.cpu.w, state.cpu.h);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, state.ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "28px 'Press Start 2P'";
    ctx.fillStyle = "#00ffee";
    ctx.fillText(String(state.playerScore), canvas.width / 2 - 80, 50);
    ctx.fillStyle = "#ff2d55";
    ctx.fillText(String(state.cpuScore), canvas.width / 2 + 40, 50);

    if (state.phase === "ready") {
        drawOverlay(ctx, canvas, "PONG", ["FIRST TO 7", "W / S OR ARROWS", "SPACE TO START"]);
    } else if (state.phase === "paused") {
        drawOverlay(ctx, canvas, "PAUSED", ["P TO CONTINUE"]);
    } else if (state.phase === "gameover") {
        const result = state.playerScore > state.cpuScore ? "YOU WIN" : "YOU LOSE";
        drawOverlay(ctx, canvas, result, ["SCORE " + state.playerScore, "BEST " + state.highScore, "SPACE TO RESTART"]);
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();
