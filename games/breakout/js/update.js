import { BALL } from "./config.js";
import { detectBrickCollision } from "./collisions.js";

export function update(canvas, state, input) {
    const { ball, paddle } = state;

    if (input.rightPressed && paddle.x < canvas.width - paddle.width)
        paddle.x += paddle.speed;

    if (input.leftPressed && paddle.x > 0)
        paddle.x -= paddle.speed;

    ball.x += ball.dx;
    ball.y += ball.dy;

    detectBrickCollision(state);

    if (
        ball.y + ball.radius >= paddle.y &&
        ball.y - ball.radius <= paddle.y + paddle.height &&
        ball.x >= paddle.x &&
        ball.x <= paddle.x + paddle.width &&
        ball.dy > 0
    ) {
        const hitPoint =
            (ball.x - (paddle.x + paddle.width / 2)) /
            (paddle.width / 2);

        ball.dx = hitPoint * BALL.PADDLE_BOUNCE_SPEED;
        ball.dy = -Math.abs(ball.dy);

        ball.y = paddle.y - ball.radius;
    }

    if (
        ball.x <= ball.radius ||
        ball.x >= canvas.width - ball.radius
    ) {
        ball.dx *= -1;
    }

    if (ball.y <= ball.radius) {
        ball.dy *= -1;
    }

    if (ball.y > canvas.height + ball.radius) {
        state.lives--;

        if (state.lives <= 0) {
            alert("GAME OVER");

            document.location.reload();
        } else {
            ball.x = canvas.width / 2;
            ball.y = canvas.height / 2;

            ball.dx = BALL.INITIAL_DX;
            ball.dy = BALL.INITIAL_DY;

            paddle.x = canvas.width / 2 - paddle.width / 2;
        }
    }
}
