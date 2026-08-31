import { BRICKS, UI } from "./config.js";
import { drawOverlay } from "../../../js/overlay.js";

function drawPaddle(ctx, paddle) {
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#00ffee";
    ctx.fillStyle = "#00ffee";
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    ctx.shadowBlur = 0;
}

function drawBall(ctx, ball) {
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#ffffff";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.closePath();
    ctx.shadowBlur = 0;
}

function drawBricks(ctx, bricks) {
    for (let c = 0; c < bricks.length; c++) {
        for (let r = 0; r < bricks[c].length; r++) {
            if (bricks[c][r].status !== 1) continue;
            const brickX = c * (BRICKS.WIDTH + BRICKS.PADDING) + BRICKS.OFFSET_LEFT;
            const brickY = r * (BRICKS.HEIGHT + BRICKS.PADDING) + BRICKS.OFFSET_TOP;
            bricks[c][r].x = brickX;
            bricks[c][r].y = brickY;
            const color = BRICKS.COLORS[r % BRICKS.COLORS.length];
            ctx.shadowBlur = 18;
            ctx.shadowColor = color;
            ctx.fillStyle = color;
            ctx.fillRect(brickX, brickY, BRICKS.WIDTH, BRICKS.HEIGHT);
            ctx.shadowBlur = 0;
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;
            ctx.strokeRect(brickX, brickY, BRICKS.WIDTH, BRICKS.HEIGHT);
        }
    }
}

export function draw(ctx, canvas, state) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = UI.FONT;
    ctx.fillStyle = UI.COLOR;
    ctx.fillText("SCORE " + state.score, 16, 28);
    ctx.fillText("LVL " + state.level, canvas.width / 2 - 50, 28);
    ctx.fillText("LIVES " + state.lives, canvas.width - 210, 28);

    drawBricks(ctx, state.bricks);
    drawBall(ctx, state.ball);
    drawPaddle(ctx, state.paddle);

    if (state.phase === "ready") {
        drawOverlay(ctx, canvas, "BREAKOUT", ["SPACE / CLICK TO SERVE", "ARROWS OR MOUSE TO MOVE", "P PAUSE  ESC MENU"]);
    } else if (state.phase === "paused") {
        drawOverlay(ctx, canvas, "PAUSED", ["P TO CONTINUE"]);
    } else if (state.phase === "levelclear") {
        drawOverlay(ctx, canvas, "LEVEL CLEAR", ["SPACE FOR LEVEL " + (state.level + 1)]);
    } else if (state.phase === "gameover") {
        drawOverlay(ctx, canvas, "GAME OVER", [
            "SCORE " + state.score,
            "BEST " + state.highScore,
            "SPACE TO RESTART"
        ]);
    }
}
