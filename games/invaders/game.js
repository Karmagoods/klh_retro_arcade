import { getBest, recordScore } from "../../js/highscores.js";
import { drawOverlay } from "../../js/overlay.js";
import { audio } from "../../js/sound.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const COLS = 9;
const ROWS = 5;
const POINTS = [30, 20, 20, 10, 10];

function createAliens(wave) {
    const aliens = [];
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            aliens.push({
                x: 80 + c * 70,
                y: 70 + r * 42,
                w: 36,
                h: 24,
                alive: true,
                row: r
            });
        }
    }
    return aliens;
}

function createState() {
    return {
        phase: "ready",
        score: 0,
        lives: 3,
        wave: 1,
        highScore: getBest("invaders"),
        player: { x: canvas.width / 2 - 22, y: canvas.height - 46, w: 44, h: 18, cooldown: 0 },
        bullets: [],
        enemyBullets: [],
        aliens: createAliens(1),
        dir: 1,
        moveTimer: 0,
        step: 36
    };
}

let state = createState();
const input = { left: false, right: false, fire: false, start: false, pause: false, menu: false, restart: false };

document.addEventListener("keydown", (e) => {
    if (["ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") input.left = true;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") input.right = true;
    if (e.key === " ") {
        if (state.phase === "gameover") input.restart = true;
        else if (state.phase === "ready") input.start = true;
        else input.fire = true;
    }
    if (e.key === "Enter") input.start = true;
    if (e.key === "p" || e.key === "P") input.pause = true;
    if (e.key === "Escape") {
        if (state.phase === "playing") input.pause = true;
        else input.menu = true;
    }
    audio.unlock();
});

document.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") input.left = false;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") input.right = false;
    if (e.key === " ") input.fire = false;
});

function livingAliens() {
    return state.aliens.filter((alien) => alien.alive);
}

function hits(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function nextWave() {
    state.wave += 1;
    state.aliens = createAliens(state.wave);
    state.dir = 1;
    state.step = Math.max(12, 36 - state.wave * 4);
    state.bullets = [];
    state.enemyBullets = [];
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
        input.start = false;
    }
    if (state.phase !== "playing") {
        input.start = false;
        return;
    }

    if (input.left) state.player.x -= 6;
    if (input.right) state.player.x += 6;
    state.player.x = Math.max(10, Math.min(canvas.width - state.player.w - 10, state.player.x));
    if (state.player.cooldown > 0) state.player.cooldown -= 1;

    if (input.fire && state.player.cooldown === 0) {
        state.bullets.push({ x: state.player.x + state.player.w / 2 - 2, y: state.player.y - 12, w: 4, h: 12, dy: -8 });
        state.player.cooldown = 16;
        audio.play("shoot");
    }

    state.bullets.forEach((b) => { b.y += b.dy; });
    state.bullets = state.bullets.filter((b) => b.y > -20);

    state.bullets.forEach((bullet) => {
        livingAliens().forEach((alien) => {
            if (hits(bullet, alien)) {
                alien.alive = false;
                bullet.y = -40;
                state.score += POINTS[alien.row];
                audio.play("brick");
            }
        });
    });

    if (livingAliens().length === 0) {
        audio.play("win");
        nextWave();
        return;
    }

    state.moveTimer += 1;
    if (state.moveTimer >= state.step) {
        state.moveTimer = 0;
        let hitEdge = false;
        livingAliens().forEach((alien) => {
            alien.x += 14 * state.dir;
            if (alien.x < 20 || alien.x + alien.w > canvas.width - 20) hitEdge = true;
        });
        if (hitEdge) {
            state.dir *= -1;
            livingAliens().forEach((alien) => {
                alien.y += 18;
                alien.x += 14 * state.dir;
            });
            state.step = Math.max(8, state.step - 1);
        }
        audio.play("move");
    }

    if (Math.random() < 0.02 + state.wave * 0.004) {
        const shooters = livingAliens();
        const shooter = shooters[Math.floor(Math.random() * shooters.length)];
        state.enemyBullets.push({ x: shooter.x + shooter.w / 2 - 2, y: shooter.y + shooter.h, w: 4, h: 12, dy: 5 + state.wave * 0.3 });
    }

    state.enemyBullets.forEach((b) => { b.y += b.dy; });
    state.enemyBullets = state.enemyBullets.filter((b) => b.y < canvas.height + 20);

    state.enemyBullets.forEach((bullet) => {
        if (hits(bullet, state.player)) {
            bullet.y = canvas.height + 40;
            state.lives -= 1;
            audio.play("lose");
            if (state.lives <= 0) {
                state.highScore = recordScore("invaders", state.score);
                state.phase = "gameover";
            }
        }
    });

    if (livingAliens().some((alien) => alien.y + alien.h >= state.player.y)) {
        state.highScore = recordScore("invaders", state.score);
        state.phase = "gameover";
        audio.play("lose");
    }
}

function drawAlien(alien) {
    ctx.fillStyle = alien.row === 0 ? "#ff2d55" : alien.row < 3 ? "#ffcc00" : "#34c759";
    ctx.fillRect(alien.x, alien.y, alien.w, alien.h);
    ctx.fillStyle = "#050816";
    ctx.fillRect(alien.x + 6, alien.y + 6, 8, 8);
    ctx.fillRect(alien.x + alien.w - 14, alien.y + 6, 8, 8);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#00ffee";
    ctx.fillRect(state.player.x, state.player.y, state.player.w, state.player.h);
    ctx.fillRect(state.player.x + 16, state.player.y - 8, 12, 8);

    livingAliens().forEach(drawAlien);
    ctx.fillStyle = "#ffffff";
    state.bullets.forEach((b) => ctx.fillRect(b.x, b.y, b.w, b.h));
    ctx.fillStyle = "#ff9500";
    state.enemyBullets.forEach((b) => ctx.fillRect(b.x, b.y, b.w, b.h));

    ctx.font = "16px 'Press Start 2P'";
    ctx.fillStyle = "#00ffee";
    ctx.fillText("SCORE " + state.score, 16, 28);
    ctx.fillText("WAVE " + state.wave, 320, 28);
    ctx.fillText("LIVES " + state.lives, 560, 28);

    if (state.phase === "ready") {
        drawOverlay(ctx, canvas, "INVADERS", ["ARROWS TO MOVE", "SPACE TO FIRE", "SPACE TO START"]);
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
