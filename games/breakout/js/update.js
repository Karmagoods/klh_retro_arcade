import { BALL, PADDLE } from "./config.js";
import { detectBrickCollision } from "./collisions.js";
import { createGameState, resetServe, serveBall, startLevel } from "./state.js";
import { recordScore } from "../../../js/highscores.js";
import { audio } from "../../../js/sound.js";

function movePaddle(canvas, state, input) {
    const { paddle } = state;

    if (input.mouseX !== null) {
        paddle.x = input.mouseX - paddle.width / 2;
    }
    if (input.rightPressed) paddle.x += paddle.speed;
    if (input.leftPressed) paddle.x -= paddle.speed;

    paddle.x = Math.max(0, Math.min(canvas.width - paddle.width, paddle.x));
}

export function update(canvas, state, input) {
    if (input.menu) {
        window.location.href = "../index.html";
        input.menu = false;
        return;
    }

    if (input.restart && state.phase === "gameover") {
        const next = createGameState(canvas);
        Object.assign(state, next);
        input.restart = false;
        return;
    }

    if (input.pause) {
        if (state.phase === "playing") state.phase = "paused";
        else if (state.phase === "paused") state.phase = "playing";
        input.pause = false;
    }

    if (state.phase === "levelclear") {
        if (input.serve) {
            state.level += 1;
            if (state.lives < 5) state.lives += 1;
            startLevel(state, canvas);
            input.serve = false;
        }
        return;
    }

    if (state.phase === "gameover" || state.phase === "paused") {
        input.serve = false;
        return;
    }

    movePaddle(canvas, state, input);

    if (state.phase === "ready") {
        state.ball.x = state.paddle.x + state.paddle.width / 2;
        state.ball.y = state.paddle.y - state.ball.radius - 2;
        if (input.serve) {
            serveBall(state, canvas);
            state.phase = "playing";
            input.serve = false;
        }
        return;
    }

    const { ball, paddle } = state;
    ball.x += ball.dx;
    ball.y += ball.dy;

    detectBrickCollision(state);
    if (state.phase !== "playing") return;

    if (
        ball.dy > 0 &&
        ball.y + ball.radius >= paddle.y &&
        ball.y - ball.radius <= paddle.y + paddle.height &&
        ball.x + ball.radius >= paddle.x &&
        ball.x - ball.radius <= paddle.x + paddle.width
    ) {
        const hitPoint = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
        ball.dx = hitPoint * BALL.PADDLE_BOUNCE_SPEED;
        ball.dy = -Math.abs(ball.dy) * 1.02;
        ball.dx *= 1.02;
        ball.y = paddle.y - ball.radius;
        audio.play("paddle");
    }

    if (ball.x <= ball.radius) {
        ball.x = ball.radius;
        ball.dx = Math.abs(ball.dx);
        audio.play("wall");
    } else if (ball.x >= canvas.width - ball.radius) {
        ball.x = canvas.width - ball.radius;
        ball.dx = -Math.abs(ball.dx);
        audio.play("wall");
    }

    if (ball.y <= ball.radius) {
        ball.y = ball.radius;
        ball.dy = Math.abs(ball.dy);
        audio.play("wall");
    }

    if (ball.y > canvas.height + ball.radius) {
        state.lives -= 1;
        audio.play("lose");
        if (state.lives <= 0) {
            state.highScore = recordScore("breakout", state.score);
            state.phase = "gameover";
        } else {
            resetServe(state, canvas);
        }
    }

    paddle.width = Math.max(70, PADDLE.WIDTH - (state.level - 1) * 8);
}
