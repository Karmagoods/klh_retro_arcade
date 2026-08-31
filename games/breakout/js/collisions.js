import { BRICKS } from "./config.js";
import { remainingBricks } from "./state.js";
import { audio } from "../../../js/sound.js";

function bounceFromRect(ball, rect) {
    const closestX = Math.max(rect.x, Math.min(ball.x, rect.x + rect.w));
    const closestY = Math.max(rect.y, Math.min(ball.y, rect.y + rect.h));
    const dx = ball.x - closestX;
    const dy = ball.y - closestY;
    if (dx * dx + dy * dy > ball.radius * ball.radius) return false;

    const overlapX = ball.radius - Math.abs(ball.x - (rect.x + rect.w / 2)) + rect.w / 2;
    const overlapY = ball.radius - Math.abs(ball.y - (rect.y + rect.h / 2)) + rect.h / 2;

    if (overlapX < overlapY) {
        ball.dx = -ball.dx;
        ball.x += ball.dx > 0 ? 1 : -1;
    } else {
        ball.dy = -ball.dy;
        ball.y += ball.dy > 0 ? 1 : -1;
    }
    return true;
}

export function detectBrickCollision(state) {
    const { ball, bricks } = state;

    for (let c = 0; c < bricks.length; c++) {
        for (let r = 0; r < bricks[c].length; r++) {
            const b = bricks[c][r];
            if (b.status !== 1) continue;

            const hit = bounceFromRect(ball, {
                x: b.x,
                y: b.y,
                w: BRICKS.WIDTH,
                h: BRICKS.HEIGHT
            });

            if (!hit) continue;

            b.status = 0;
            state.score += BRICKS.POINTS[b.row] || 10;
            audio.play("brick");

            if (remainingBricks(state) === 0) {
                audio.play("win");
                state.phase = "levelclear";
            }
            return;
        }
    }
}
