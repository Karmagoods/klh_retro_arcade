import { BALL } from "./config.js";
import { detectBrickCollision } from "./collisions.js";
import { audio } from "../../../js/sound.js";

export function update(canvas, state, input) {

    const { ball, paddle } = state;

    // =============================
    // Paddle Movement
    // =============================

    if (input.rightPressed && paddle.x < canvas.width - paddle.width) {
        paddle.x += paddle.speed;
    }

    if (input.leftPressed && paddle.x > 0) {
        paddle.x -= paddle.speed;
    }

    // =============================
    // Move Ball
    // =============================

    ball.x += ball.dx;
    ball.y += ball.dy;

    // =============================
    // Brick Collision
    // =============================

    detectBrickCollision(state);

    // =============================
    // Paddle Collision
    // =============================

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

        // Change angle depending on where the ball hits
        ball.dx = hitPoint * BALL.PADDLE_BOUNCE_SPEED;
        ball.dy = -Math.abs(ball.dy);

        // Tiny speed increase each hit
        ball.dy *= 1.01;
        ball.dx *= 1.01;

        // Prevent sticking
        ball.y = paddle.y - ball.radius;

        audio.play("paddle");

    }

    // =============================
    // Left & Right Walls
    // =============================

    if (
        ball.x <= ball.radius ||
        ball.x >= canvas.width - ball.radius
    ) {

        ball.dx *= -1;

        audio.play("wall");

    }

    // =============================
    // Top Wall
    // =============================

    if (ball.y <= ball.radius) {

        ball.dy *= -1;

        audio.play("wall");

    }

    // =============================
    // Bottom Wall
    // =============================

    if (ball.y > canvas.height + ball.radius) {

        state.lives--;

        audio.play("lose");

        if (state.lives <= 0) {

            setTimeout(() => {

                alert("GAME OVER");
                document.location.reload();

            }, 250);

        } else {

            // Reset Ball

            ball.x = canvas.width / 2;
            ball.y = canvas.height / 2;

            ball.dx = BALL.INITIAL_DX;
            ball.dy = BALL.INITIAL_DY;

            // Reset Paddle

            paddle.x = canvas.width / 2 - paddle.width / 2;

        }

    }

}