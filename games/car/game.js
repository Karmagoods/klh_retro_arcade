import { getBest, recordScore } from "../../js/highscores.js";
import { drawOverlay } from "../../js/overlay.js";
import { audio } from "../../js/sound.js";
import { bindTouchControls } from "../../js/touch.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const LANES = 4;
const LANE_CHANGE_INTERVAL_MIN = 180; // 3 seconds at 60fps
const LANE_CHANGE_INTERVAL_MAX = 300; // 5 seconds at 60fps
const LANE_CHANGE_SPEED = 0.4; // horizontal pixels per frame
const ROAD_X = 100;
const ROAD_W = canvas.width - 200;
const LANE_W = ROAD_W / LANES;

const VEHICLE_TYPES = {
    sedan:  { w: 54, h: 96, colors: ["#3498db", "#9b59b6", "#1abc9c", "#e67e22", "#ecf0f1"], speed: 0.65 },
    truck:  { w: 64, h: 140, colors: ["#95a5a6", "#34495e", "#7f8c8d"], speed: 0.5 },
    sports: { w: 52, h: 90, colors: ["#f1c40f", "#e74c3c"], speed: 0.8 },
    cop:    { w: 56, h: 96, colors: ["#111111"], speed: 0.72 }
};

const ITEM_TYPES = {
    coin:   { w: 30, h: 30, color: "#ffd700" },
    nitro:  { w: 32, h: 36, color: "#00ffee" },
    shield: { w: 34, h: 34, color: "#a855f7" }
};

function createState() {
    return {
        phase: "ready",
        score: 0,
        distance: 0,
        speed: 5,
        highScore: getBest("car"),
        car: {
            x: canvas.width / 2,
            y: canvas.height - 115,
            w: 52,
            h: 94,
            tilt: 0,
            hasShield: false
        },
        traffic: [],
        items: [],
        particles: [],
        scenery: [
            { y: 0, type: "tree" },
            { y: 150, type: "light" },
            { y: 300, type: "tree" },
            { y: 450, type: "light" }
        ],
        spawnTimer: 0,
        itemTimer: 0,
        roadOffset: 0,
        nitroTimer: 0,
        nitroCooldown: 0,
        coinsCount: 0,
        nearMisses: 0,
        frame: 0
    };
}

let state = createState();
const input = { left: false, right: false, up: false, start: false, pause: false, menu: false, restart: false };

document.addEventListener("keydown", (e) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", " "].includes(e.key)) e.preventDefault();
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") input.left = true;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") input.right = true;
    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") input.up = true;
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
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") input.left = false;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") input.right = false;
    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") input.up = false;
});

bindTouchControls(input);

function pointerX(clientX) {
    const rect = canvas.getBoundingClientRect();
    return ((clientX - rect.left) / rect.width) * canvas.width;
}

canvas.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    audio.unlock();
    state.car.x = Math.max(ROAD_X + 30, Math.min(ROAD_X + ROAD_W - 30, pointerX(e.touches[0].clientX)));
    if (state.phase === "gameover") input.restart = true;
    else if (state.phase === "ready") input.start = true;
}, { passive: false });

canvas.addEventListener("touchmove", (e) => {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    state.car.x = Math.max(ROAD_X + 30, Math.min(ROAD_X + ROAD_W - 30, pointerX(e.touches[0].clientX)));
}, { passive: false });

function spawnTraffic() {
    const lane = Math.floor(Math.random() * LANES);
    const laneCenter = ROAD_X + LANE_W * lane + LANE_W / 2;
    const types = ["sedan", "sedan", "truck", "sports", "cop"];
    const type = types[Math.floor(Math.random() * types.length)];
    const def = VEHICLE_TYPES[type];
    const color = def.colors[Math.floor(Math.random() * def.colors.length)];

    state.traffic.push({
        type,
        x: laneCenter,
        y: -140,
        w: def.w,
        h: def.h,
        color,
        speed: def.speed,
        lane,
        passed: false,
        copFlash: 0,
        laneChangeTimer: Math.floor(Math.random() * (LANE_CHANGE_INTERVAL_MAX - LANE_CHANGE_INTERVAL_MIN + 1)) + LANE_CHANGE_INTERVAL_MIN,
        targetLane: null
    });
}

function spawnItem() {
    const lane = Math.floor(Math.random() * LANES);
    const laneCenter = ROAD_X + LANE_W * lane + LANE_W / 2;
    const itemRoll = Math.random();
    const type = itemRoll < 0.6 ? "coin" : itemRoll < 0.85 ? "nitro" : "shield";
    const def = ITEM_TYPES[type];

    state.items.push({
        type,
        x: laneCenter,
        y: -50,
        w: def.w,
        h: def.h,
        collected: false
    });
}

function addParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = 2 + Math.random() * 6;
        state.particles.push({
            x, y,
            dx: Math.cos(angle) * spd,
            dy: Math.sin(angle) * spd,
            life: 20 + Math.random() * 20,
            maxLife: 40,
            color,
            size: 3 + Math.random() * 4
        });
    }
}

function crash() {
    if (state.car.hasShield) {
        state.car.hasShield = false;
        audio.play("thud");
        addParticles(state.car.x, state.car.y, "#a855f7", 20);
        return;
    }

    state.phase = "gameover";
    state.highScore = recordScore("car", Math.floor(state.score));
    audio.play("crash");
    addParticles(state.car.x, state.car.y, "#e74c3c", 30);
    addParticles(state.car.x, state.car.y, "#ffd700", 20);
}

function update() {
    state.frame++;

    if (input.menu) {
        window.location.href = "../index.html";
        return;
    }
    if (input.restart || (state.phase === "gameover" && input.start)) {
        state = createState();
        input.restart = false;
        input.start = false;
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
        audio.play("vroom");
    }
    if (state.phase !== "playing") {
        input.start = false;
        return;
    }

    if (state.frame % 60 === 0) audio.play("engine");

    // Nitro
    if (input.up && state.nitroCooldown <= 0 && state.nitroTimer <= 0) {
        state.nitroTimer = 100;
        state.nitroCooldown = 260;
        audio.play("boost");
    }
    if (state.nitroTimer > 0) state.nitroTimer--;
    if (state.nitroCooldown > 0) state.nitroCooldown--;

    const nitroMult = state.nitroTimer > 0 ? 1.65 : 1.0;
    state.speed = Math.min(10 + state.distance / 2500, 20) * nitroMult;

    state.distance += state.speed;
    state.score += state.speed * 0.18;

    // Scroll
    state.roadOffset = (state.roadOffset + state.speed) % 80;
    state.scenery.forEach((s) => {
        s.y += state.speed * 0.8;
        if (s.y > canvas.height + 60) s.y = -60;
    });

    // Steering
    const steerSpeed = 7 + state.speed * 0.15;
    if (input.left) {
        state.car.x -= steerSpeed;
        state.car.tilt = Math.max(-1, state.car.tilt - 0.15);
    }
    if (input.right) {
        state.car.x += steerSpeed;
        state.car.tilt = Math.min(1, state.car.tilt + 0.15);
    }
    if (!input.left && !input.right) {
        state.car.tilt *= 0.82;
    }
    state.car.x = Math.max(ROAD_X + 30, Math.min(ROAD_X + ROAD_W - 30, state.car.x));

    // Spawn traffic & items
    state.spawnTimer++;
    const spawnRate = Math.max(28, 60 - Math.floor(state.distance / 2500));
    if (state.spawnTimer >= spawnRate) {
        state.spawnTimer = 0;
        spawnTraffic();
    }

    state.itemTimer++;
    if (state.itemTimer >= 140) {
        state.itemTimer = 0;
        spawnItem();
    }

    // Move traffic + lane-switching AI
    state.traffic.forEach((veh) => {
        veh.y += state.speed * veh.speed;
        if (veh.type === "cop") veh.copFlash = (veh.copFlash + 1) % 20;

        // Only lane-switch once the vehicle is fully on screen
        if (veh.y < 0) return;

        if (veh.targetLane === null) {
            veh.laneChangeTimer--;
            if (veh.laneChangeTimer <= 0) {
                // Pick a random adjacent lane
                const choices = [];
                if (veh.lane > 0) choices.push(veh.lane - 1);
                if (veh.lane < LANES - 1) choices.push(veh.lane + 1);
                veh.targetLane = choices[Math.floor(Math.random() * choices.length)];
            }
        } else {
            // Slide smoothly toward target lane center
            const targetX = ROAD_X + LANE_W * veh.targetLane + LANE_W / 2;
            const dx = targetX - veh.x;
            if (Math.abs(dx) <= LANE_CHANGE_SPEED + 0.5) {
                veh.x = targetX;
                veh.lane = veh.targetLane;
                veh.targetLane = null;
                veh.laneChangeTimer = Math.floor(
                    Math.random() * (LANE_CHANGE_INTERVAL_MAX - LANE_CHANGE_INTERVAL_MIN + 1)
                ) + LANE_CHANGE_INTERVAL_MIN;
            } else {
                veh.x += Math.sign(dx) * LANE_CHANGE_SPEED;
            }
        }
    });

    // Move items
    state.items.forEach((it) => {
        it.y += state.speed * 0.9;
    });

    // Collisions
    const car = state.car;
    const carBox = { x: car.x - car.w / 2, y: car.y - car.h / 2, w: car.w, h: car.h };

    // Item pickups
    state.items.forEach((it) => {
        if (it.collected) return;
        const itBox = { x: it.x - it.w / 2, y: it.y - it.h / 2, w: it.w, h: it.h };
        const hit = carBox.x < itBox.x + itBox.w &&
                    carBox.x + carBox.w > itBox.x &&
                    carBox.y < itBox.y + itBox.h &&
                    carBox.y + carBox.h > itBox.y;

        if (hit) {
            it.collected = true;
            if (it.type === "coin") {
                state.score += 200;
                state.coinsCount++;
                audio.play("coin");
                addParticles(it.x, it.y, "#ffd700", 10);
            } else if (it.type === "nitro") {
                state.nitroTimer = 100;
                state.nitroCooldown = 60;
                audio.play("powerup");
                addParticles(it.x, it.y, "#00ffee", 14);
            } else if (it.type === "shield") {
                state.car.hasShield = true;
                audio.play("powerup");
                addParticles(it.x, it.y, "#a855f7", 14);
            }
        }
    });

    // Traffic collisions
    state.traffic.forEach((veh) => {
        const vehBox = { x: veh.x - veh.w / 2, y: veh.y - veh.h / 2, w: veh.w, h: veh.h };
        const hit = carBox.x < vehBox.x + vehBox.w &&
                    carBox.x + carBox.w > vehBox.x &&
                    carBox.y < vehBox.y + vehBox.h &&
                    carBox.y + carBox.h > vehBox.y;

        if (hit && !veh.passed) {
            veh.passed = true;
            crash();
        }

        if (!veh.passed && veh.y > car.y + car.h / 2 + 10) {
            veh.passed = true;
            const dx = Math.abs(veh.x - car.x);
            if (dx < 65) {
                state.nearMisses++;
                state.score += 30;
                audio.play("ding");
                addParticles(car.x, car.y - 30, "#ffd700", 6);
            }
        }
    });

    // Cleanup
    state.traffic = state.traffic.filter((t) => t.y < canvas.height + 160);
    state.items = state.items.filter((i) => !i.collected && i.y < canvas.height + 100);

    state.particles.forEach((p) => {
        p.x += p.dx;
        p.y += p.dy;
        p.life--;
        p.dy += 0.1;
    });
    state.particles = state.particles.filter((p) => p.life > 0);
}

function drawBackground() {
    ctx.fillStyle = "#050816";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Horizon glowing sun
    const grad = ctx.createLinearGradient(0, 0, 0, 150);
    grad.addColorStop(0, "#2b1055");
    grad.addColorStop(1, "#75226b");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, 150);

    ctx.fillStyle = "#ff007f";
    ctx.beginPath();
    ctx.arc(canvas.width / 2, 130, 45, 0, Math.PI * 2);
    ctx.fill();

    // Road surface
    ctx.fillStyle = "#161625";
    ctx.fillRect(ROAD_X, 0, ROAD_W, canvas.height);

    // Red/White shoulders
    const segH = 40;
    for (let y = -80 + state.roadOffset; y < canvas.height; y += segH * 2) {
        ctx.fillStyle = "#e74c3c";
        ctx.fillRect(ROAD_X - 10, y, 10, segH);
        ctx.fillRect(ROAD_X + ROAD_W, y, 10, segH);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(ROAD_X - 10, y + segH, 10, segH);
        ctx.fillRect(ROAD_X + ROAD_W, y + segH, 10, segH);
    }

    // Lane markings
    ctx.fillStyle = "#f1c40f";
    for (let i = 1; i < LANES; i++) {
        const lx = ROAD_X + LANE_W * i;
        for (let y = -80 + state.roadOffset; y < canvas.height; y += 80) {
            ctx.fillRect(lx - 3, y, 6, 40);
        }
    }

    // Scenery
    state.scenery.forEach((s) => {
        const lx = 45;
        const rx = canvas.width - 45;
        if (s.type === "tree") {
            ctx.fillStyle = "#00b894";
            ctx.beginPath();
            ctx.arc(lx, s.y, 20, 0, Math.PI * 2);
            ctx.arc(rx, s.y, 20, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = "#ffeaa7";
            ctx.fillRect(lx - 2, s.y - 15, 4, 30);
            ctx.fillRect(rx - 2, s.y - 15, 4, 30);
            ctx.fillStyle = "#fdcb6e";
            ctx.beginPath();
            ctx.arc(lx + 6, s.y - 15, 6, 0, Math.PI * 2);
            ctx.arc(rx - 6, s.y - 15, 6, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

function drawVehicle(veh) {
    const ox = veh.x - veh.w / 2;
    const oy = veh.y - veh.h / 2;

    ctx.fillStyle = veh.color;
    ctx.fillRect(ox, oy, veh.w, veh.h);

    // Cop flashing lights
    if (veh.type === "cop") {
        ctx.fillStyle = veh.copFlash < 10 ? "#ff0000" : "#0000ff";
        ctx.fillRect(ox + veh.w / 2 - 10, oy + veh.h / 2 - 4, 20, 8);
    }

    // Windshield
    ctx.fillStyle = "rgba(180, 220, 255, 0.8)";
    ctx.fillRect(ox + 6, oy + veh.h * 0.22, veh.w - 12, veh.h * 0.2);
    ctx.fillRect(ox + 6, oy + veh.h * 0.65, veh.w - 12, veh.h * 0.15);

    // Wheels
    ctx.fillStyle = "#111";
    ctx.fillRect(ox - 3, oy + 12, 6, 20);
    ctx.fillRect(ox + veh.w - 3, oy + 12, 6, 20);
    ctx.fillRect(ox - 3, oy + veh.h - 32, 6, 20);
    ctx.fillRect(ox + veh.w - 3, oy + veh.h - 32, 6, 20);

    // Tail lights
    ctx.fillStyle = "#ff3333";
    ctx.fillRect(ox + 4, oy + veh.h - 4, 10, 4);
    ctx.fillRect(ox + veh.w - 14, oy + veh.h - 4, 10, 4);

    // Amber turn indicator when lane-changing
    if (veh.targetLane !== null) {
        const blinkOn = Math.floor(Date.now() / 250) % 2 === 0;
        if (blinkOn) {
            ctx.fillStyle = "#ff8c00";
            const turningRight = veh.targetLane > veh.lane;
            const bx = turningRight ? ox + veh.w - 8 : ox;
            ctx.fillRect(bx, oy + 6, 8, 8);
        }
    }
}

function drawItems() {
    state.items.forEach((it) => {
        if (it.collected) return;
        const ox = it.x;
        const oy = it.y;

        if (it.type === "coin") {
            ctx.fillStyle = "#ffd700";
            ctx.beginPath();
            ctx.arc(ox, oy, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#ffaa00";
            ctx.beginPath();
            ctx.arc(ox, oy, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#fff";
            ctx.font = "12px 'Press Start 2P'";
            ctx.fillText("$", ox - 4, oy + 5);
        } else if (it.type === "nitro") {
            ctx.fillStyle = "#00ffee";
            ctx.fillRect(ox - 12, oy - 16, 24, 32);
            ctx.fillStyle = "#fff";
            ctx.font = "10px 'Press Start 2P'";
            ctx.fillText("N2O", ox - 10, oy + 4);
        } else if (it.type === "shield") {
            ctx.fillStyle = "#a855f7";
            ctx.beginPath();
            ctx.arc(ox, oy, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#fff";
            ctx.font = "12px 'Press Start 2P'";
            ctx.fillText("S", ox - 4, oy + 4);
        }
    });
}

function drawPlayerCar() {
    const c = state.car;

    // Nitro exhaust flames
    if (state.nitroTimer > 0 && state.frame % 2 === 0) {
        addParticles(c.x - 12, c.y + c.h / 2, "#00ffee", 2);
        addParticles(c.x + 12, c.y + c.h / 2, "#ff007f", 2);
    }

    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.tilt * 0.2);

    // Shield aura
    if (c.hasShield) {
        ctx.strokeStyle = "rgba(168, 85, 247, 0.8)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, c.h / 2 + 10, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(-c.w / 2 + 4, -c.h / 2 + 6, c.w, c.h);

    // Body (Red Supercar)
    ctx.fillStyle = "#ff2a2a";
    ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);

    // Yellow Racing Stripes
    ctx.fillStyle = "#ffd700";
    ctx.fillRect(-6, -c.h / 2, 4, c.h);
    ctx.fillRect(2, -c.h / 2, 4, c.h);

    // Cabin / Roof
    ctx.fillStyle = "#111";
    ctx.fillRect(-c.w / 2 + 6, -c.h / 2 + 20, c.w - 12, c.h - 40);

    // Windshield
    ctx.fillStyle = "#00ffee";
    ctx.fillRect(-c.w / 2 + 8, -c.h / 2 + 24, c.w - 16, 18);
    ctx.fillRect(-c.w / 2 + 8, c.h / 2 - 38, c.w - 16, 14);

    // Headlights
    ctx.fillStyle = "#ffffaa";
    ctx.fillRect(-c.w / 2 + 4, -c.h / 2, 10, 6);
    ctx.fillRect(c.w / 2 - 14, -c.h / 2, 10, 6);

    // Tail lights
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(-c.w / 2 + 4, c.h / 2 - 4, 10, 4);
    ctx.fillRect(c.w / 2 - 14, c.h / 2 - 4, 10, 4);

    ctx.restore();
}

function drawParticles() {
    state.particles.forEach((p) => {
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
    ctx.globalAlpha = 1;
}

function drawHUD() {
    ctx.font = "16px 'Press Start 2P'";
    ctx.fillStyle = "#00ffee";
    ctx.fillText("SCORE " + Math.floor(state.score), 16, 28);

    ctx.fillStyle = "#ffd700";
    ctx.fillText("COINS " + state.coinsCount, 16, 55);

    ctx.fillStyle = "#ff2a2a";
    const kmh = Math.round(state.speed * 13);
    ctx.fillText(kmh + " KM/H", 16, 82);

    // Nitro Meter
    if (state.nitroCooldown > 0) {
        const pct = 1 - state.nitroCooldown / 260;
        ctx.fillStyle = "#222";
        ctx.fillRect(canvas.width - 180, 16, 150, 14);
        ctx.fillStyle = pct >= 1 ? "#00ffee" : "#ff007f";
        ctx.fillRect(canvas.width - 180, 16, 150 * pct, 14);
        ctx.font = "10px 'Press Start 2P'";
        ctx.fillStyle = "#fff";
        ctx.fillText("NITRO", canvas.width - 180, 46);
    } else {
        ctx.font = "10px 'Press Start 2P'";
        ctx.fillStyle = "#00ffee";
        ctx.fillText("NITRO READY!", canvas.width - 180, 28);
    }

    if (state.car.hasShield) {
        ctx.font = "10px 'Press Start 2P'";
        ctx.fillStyle = "#a855f7";
        ctx.fillText("SHIELD ACTIVE", canvas.width - 180, 70);
    }
}

function draw() {
    drawBackground();
    state.traffic.forEach(drawVehicle);
    drawItems();
    drawPlayerCar();
    drawParticles();
    drawHUD();

    if (state.phase === "ready") {
        drawOverlay(ctx, canvas, "TURBO RACE", [
            "STEER WITH ARROWS / A D",
            "HOLD UP / W FOR NITRO",
            "COLLECT COINS & SHIELDS",
            "SPACE TO START"
        ]);
    } else if (state.phase === "paused") {
        drawOverlay(ctx, canvas, "PAUSED", ["P TO CONTINUE"]);
    } else if (state.phase === "gameover") {
        drawOverlay(ctx, canvas, "CRASHED!", [
            "SCORE " + Math.floor(state.score),
            "COINS " + state.coinsCount,
            "NEAR MISSES " + state.nearMisses,
            "BEST " + state.highScore,
            "SPACE TO RESTART"
        ]);
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();
