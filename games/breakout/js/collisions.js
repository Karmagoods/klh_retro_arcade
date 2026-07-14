import { BRICKS } from "./config.js";
import { audio } from "../../../js/sound.js";

export function detectBrickCollision(state) {

    const { ball, bricks } = state;

    for (let c = 0; c < BRICKS.COLUMN_COUNT; c++) {

        for (let r = 0; r < BRICKS.ROW_COUNT; r++) {

            const b = bricks[c][r];

            if (b.status !== 1) continue;

            if (

                ball.x > b.x &&
                ball.x < b.x + BRICKS.WIDTH &&
                ball.y > b.y &&
                ball.y < b.y + BRICKS.HEIGHT

            ) {

                // Reverse ball direction
                ball.dy = -ball.dy;

                // Destroy brick
                b.status = 0;

                // Increase score
                state.score++;

                // Play brick sound
                audio.play("brick");

                // Check for level completion
                if (state.score >= BRICKS.ROW_COUNT * BRICKS.COLUMN_COUNT) {

                    audio.play("win");

                    // Small delay so the sound plays before reload
                    setTimeout(() => {

                        alert("LEVEL COMPLETE!");
                        document.location.reload();

                    }, 250);

                }

                // Prevent hitting multiple bricks in one frame
                return;

            }

        }

    }

}