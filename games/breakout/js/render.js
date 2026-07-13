import { BRICKS, UI } from "./config.js";

function drawPaddle(ctx, paddle) {
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#00ffee";

    ctx.fillStyle = "#00ffee";

    ctx.fillRect(
        paddle.x,
        paddle.y,
        paddle.width,
        paddle.height
    );

    ctx.shadowBlur = 0;
}

function drawBall(ctx, ball) {
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#ffffff";

    ctx.beginPath();

    ctx.arc(
        ball.x,
        ball.y,
        ball.radius,
        0,
        Math.PI * 2
    );

    ctx.fillStyle = "#ffffff";
    ctx.fill();

    ctx.closePath();

    ctx.shadowBlur = 0;
}

function drawBricks(ctx, bricks) {
    for (let c = 0; c < BRICKS.COLUMN_COUNT; c++) {
        for (let r = 0; r < BRICKS.ROW_COUNT; r++) {
            if (bricks[c][r].status === 1) {
                const brickX =
                    c * (BRICKS.WIDTH + BRICKS.PADDING) + BRICKS.OFFSET_LEFT;

                const brickY =
                    r * (BRICKS.HEIGHT + BRICKS.PADDING) + BRICKS.OFFSET_TOP;

                bricks[c][r].x = brickX;
                bricks[c][r].y = brickY;

                ctx.shadowBlur = 20;
                ctx.shadowColor = BRICKS.COLORS[r];

                ctx.fillStyle = BRICKS.COLORS[r];
                ctx.fillRect(
                    brickX,
                    brickY,
                    BRICKS.WIDTH,
                    BRICKS.HEIGHT
                );

                ctx.shadowBlur = 0;

                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 2;

                ctx.strokeRect(
                    brickX,
                    brickY,
                    BRICKS.WIDTH,
                    BRICKS.HEIGHT
                );
            }
        }
    }
}

function drawScore(ctx, score) {
    ctx.font = UI.FONT;
    ctx.fillStyle = UI.COLOR;

    ctx.fillText(
        "SCORE: " + score,
        20,
        30
    );
}

function drawLives(ctx, canvas, lives) {
    ctx.font = UI.FONT;
    ctx.fillStyle = UI.COLOR;

    ctx.fillText(
        "LIVES: " + lives,
        canvas.width - 220,
        30
    );
}

export function draw(ctx, canvas, state) {
    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    drawScore(ctx, state.score);
    drawLives(ctx, canvas, state.lives);
    drawBricks(ctx, state.bricks);
    drawBall(ctx, state.ball);
    drawPaddle(ctx, state.paddle);
}
