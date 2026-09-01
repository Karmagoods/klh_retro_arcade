/**
 * Bind on-screen touch buttons to an input object.
 * data-touch: left | right | up | down | action | fire | pause | start | drop
 * Direction and fire are held while pressed; action/start/pause/drop pulse once.
 */
export function bindTouchControls(input, root = document) {
    const held = new Set();

    function syncHeld() {
        if ("leftPressed" in input) input.leftPressed = held.has("left");
        if ("rightPressed" in input) input.rightPressed = held.has("right");
        if ("up" in input) input.up = held.has("up");
        if ("down" in input) input.down = held.has("down");
        if ("left" in input && !("leftPressed" in input)) input.left = held.has("left");
        if ("right" in input && !("rightPressed" in input)) input.right = held.has("right");
        if ("fire" in input) input.fire = held.has("fire") || held.has("action");
    }

    function pulse(key) {
        if (key === "action" || key === "start") {
            if ("serve" in input) input.serve = true;
            if ("start" in input) input.start = true;
            if ("rotate" in input && key === "action") input.rotate = true;
        }
        if (key === "pause") {
            if ("pause" in input) input.pause = true;
        }
        if (key === "drop") {
            if ("drop" in input) input.drop = true;
            if ("hardDrop" in input) input.hardDrop = true;
        }
    }

    const holdKeys = new Set(["left", "right", "up", "down", "fire"]);

    root.querySelectorAll("[data-touch]").forEach((btn) => {
        const key = btn.getAttribute("data-touch");
        if (!key) return;

        const isHold = holdKeys.has(key) || (key === "action" && "fire" in input && !("serve" in input));

        const onStart = (e) => {
            e.preventDefault();
            btn.classList.add("active");
            if (isHold) {
                held.add(key === "action" ? "fire" : key);
                syncHeld();
            } else {
                pulse(key);
            }
            // Always allow action to start/serve on pulse as well for hold-fire games
            if (key === "action" && ("start" in input || "serve" in input)) {
                pulse("action");
            }
        };
        const onEnd = (e) => {
            e.preventDefault();
            btn.classList.remove("active");
            if (isHold) {
                held.delete(key === "action" ? "fire" : key);
                syncHeld();
            }
        };

        btn.addEventListener("touchstart", onStart, { passive: false });
        btn.addEventListener("touchend", onEnd, { passive: false });
        btn.addEventListener("touchcancel", onEnd, { passive: false });
        btn.addEventListener("mousedown", onStart);
        btn.addEventListener("mouseup", onEnd);
        btn.addEventListener("mouseleave", onEnd);
    });

    return {
        attachSwipe(canvas, onDir) {
            let sx = 0;
            let sy = 0;
            canvas.addEventListener(
                "touchstart",
                (e) => {
                    if (e.touches.length !== 1) return;
                    sx = e.touches[0].clientX;
                    sy = e.touches[0].clientY;
                },
                { passive: true }
            );
            canvas.addEventListener(
                "touchend",
                (e) => {
                    const t = e.changedTouches[0];
                    if (!t) return;
                    const dx = t.clientX - sx;
                    const dy = t.clientY - sy;
                    const absX = Math.abs(dx);
                    const absY = Math.abs(dy);
                    if (Math.max(absX, absY) < 24) {
                        if ("start" in input) input.start = true;
                        if ("serve" in input) input.serve = true;
                        return;
                    }
                    if (absX > absY) onDir(dx > 0 ? "right" : "left");
                    else onDir(dy > 0 ? "down" : "up");
                },
                { passive: true }
            );
        }
    };
}
