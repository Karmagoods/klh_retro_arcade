import { getBest, recordScore } from "../../js/highscores.js";
import { drawOverlay } from "../../js/overlay.js";
import { audio } from "../../js/sound.js";
import { bindTouchControls } from "../../js/touch.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ─── WEAPONS ─────────────────────────────────────────────────────────────────
const WEAPONS = [
    { id: "pistol",  name: "PISTOL",  fireRate: 15, damage: 1, spread: 0, color: "#ffff44", grenade: false },
    { id: "rifle",   name: "RIFLE",   fireRate: 6,  damage: 2, spread: 0, color: "#44ff88", grenade: false },
    { id: "shotgun", name: "SHOTGUN", fireRate: 40, damage: 3, spread: 3, color: "#ff8844", grenade: false },
    { id: "grenade", name: "GRENADE", fireRate: 70, damage: 0, spread: 0, color: "#ff4444", grenade: true  }
];

// ─── LEVEL CONFIG ─────────────────────────────────────────────────────────────
const LEVELS = {
    1: {
        name: "DESERT OUTPOST",
        bgTop:    "#c8a96e",
        bgBottom: "#8a5c2e",
        sceneryType: "desert",
        waves: [
            { grunts: 5, snipers: 0, tanks: 0, helis: 0 },
            { grunts: 7, snipers: 2, tanks: 0, helis: 0 },
            { grunts: 8, snipers: 3, tanks: 0, helis: 0 },
            { grunts: 6, snipers: 4, tanks: 1, helis: 0 },
            { grunts: 8, snipers: 4, tanks: 2, helis: 0 }
        ]
    },
    2: {
        name: "URBAN RUINS",
        bgTop:    "#1e1e2e",
        bgBottom: "#0a0a14",
        sceneryType: "urban",
        waves: [
            { grunts: 8,  snipers: 3, tanks: 1, helis: 0 },
            { grunts: 10, snipers: 4, tanks: 2, helis: 1 },
            { grunts: 10, snipers: 5, tanks: 2, helis: 1 },
            { grunts: 8,  snipers: 6, tanks: 3, helis: 2 },
            { grunts: 10, snipers: 6, tanks: 3, helis: 2 }
        ]
    }
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function buildWaveQueue(waveDef) {
    const q = [];
    for (let i = 0; i < waveDef.grunts;  i++) q.push("grunt");
    for (let i = 0; i < waveDef.snipers; i++) q.push("sniper");
    for (let i = 0; i < waveDef.tanks;   i++) q.push("tank");
    for (let i = 0; i < waveDef.helis;   i++) q.push("heli");
    return shuffle(q);
}

function generateScenery(lvl) {
    const items = [];
    const type = LEVELS[lvl].sceneryType;
    for (let i = 0; i < 10; i++) {
        const side = Math.random() < 0.5 ? "left" : "right";
        items.push({
            x: side === "left" ? 10 + Math.random() * 60 : canvas.width - 70 + Math.random() * 60,
            y: Math.random() * canvas.height,
            kind: type === "desert"
                ? (Math.random() < 0.55 ? "palm" : "rock")
                : (Math.random() < 0.5  ? "rubble" : "barrel"),
            size: 12 + Math.random() * 18
        });
    }
    return items;
}

// ─── STATE ────────────────────────────────────────────────────────────────────
function createState(lvl, carryScore = 0) {
    return {
        phase: "playing",    // playing | paused | wavecomplete | levelcomplete | gameover | victory
        level: lvl,
        score: carryScore,
        highScore: getBest("army"),
        wave: 0,             // 0-indexed
        wavePhase: "spawning", // spawning | fighting | ending
        waveTimer: 0,
        enemyQueue: buildWaveQueue(LEVELS[lvl].waves[0]),
        spawnTimer: 0,
        spawnInterval: lvl === 1 ? 70 : 50,
        player: {
            x: canvas.width / 2,
            y: canvas.height - 70,
            w: 20,
            h: 28,
            hp: 3,
            maxHp: 3,
            weaponIdx: 0,
            grenades: 5,
            fireTimer: 0,
            invincible: 0
        },
        enemies:      [],
        bullets:      [],    // player projectiles
        enemyBullets: [],    // enemy projectiles
        particles:    [],
        explosions:   [],    // area explosions (grenade)
        scenery:      generateScenery(lvl),
        frame: 0
    };
}

let state = null;
let globalPhase = "levelselect"; // levelselect | ingame

const input = {
    left: false, right: false, up: false, down: false,
    fire: false, cycleWeapon: false,
    start: false, pause: false, menu: false, restart: false,
    level1: false, level2: false
};

// ─── INPUT ────────────────────────────────────────────────────────────────────
document.addEventListener("keydown", (e) => {
    if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"," "].includes(e.key)) e.preventDefault();
    if (e.key === "ArrowLeft"  || e.key === "a" || e.key === "A") input.left  = true;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") input.right = true;
    if (e.key === "ArrowUp"    || e.key === "w" || e.key === "W") input.up    = true;
    if (e.key === "ArrowDown"  || e.key === "s" || e.key === "S") input.down  = true;
    if (e.key === " " || e.key === "x" || e.key === "X")          input.fire  = true;
    if (e.key === "z" || e.key === "Z") input.cycleWeapon = true;
    if (e.key === "1") input.level1 = true;
    if (e.key === "2") input.level2 = true;
    if (e.key === "p" || e.key === "P") input.pause = true;
    if (e.key === "Escape") {
        if (state && state.phase === "playing") input.pause = true;
        else input.menu = true;
    }
    if (e.key === "Enter") {
        if (!state) input.start = true;
        else if (state.phase === "gameover" || state.phase === "victory" ||
                 state.phase === "levelcomplete" || state.phase === "wavecomplete") input.restart = true;
        else input.start = true;
    }
    audio.unlock();
});

document.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft"  || e.key === "a" || e.key === "A") input.left  = false;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") input.right = false;
    if (e.key === "ArrowUp"    || e.key === "w" || e.key === "W") input.up    = false;
    if (e.key === "ArrowDown"  || e.key === "s" || e.key === "S") input.down  = false;
    if (e.key === " " || e.key === "x" || e.key === "X") input.fire = false;
});

bindTouchControls(input);

// Weapon cycle touch button
const weaponBtn = document.getElementById("weaponBtn");
if (weaponBtn) {
    weaponBtn.addEventListener("touchstart", (e) => { e.preventDefault(); input.cycleWeapon = true; }, { passive: false });
    weaponBtn.addEventListener("mousedown",  () => { input.cycleWeapon = true; });
}

// ─── SPAWN ENEMY ─────────────────────────────────────────────────────────────
function spawnEnemy(type) {
    const fromLeft = Math.random() < 0.5;
    const ex = (type === "heli")
        ? (fromLeft ? -80 : canvas.width + 80)
        : 60 + Math.random() * (canvas.width - 120);

    const baseEnemy = {
        type,
        x: ex,
        y: (type === "heli") ? 40 + Math.random() * 80 : -40,
        passed: false,
        fireTimer: Math.floor(Math.random() * 80) + 40
    };

    switch (type) {
        case "grunt":
            return { ...baseEnemy, w: 18, h: 24, hp: 1, maxHp: 1, speed: 1.4 + Math.random() * 0.4, score: 10,
                     color: "#556b2f" };
        case "sniper":
            return { ...baseEnemy, w: 16, h: 24, hp: 1, maxHp: 1,
                     speed: 0.9 + Math.random() * 0.4, score: 20,
                     color: "#4a4a4a", dx: (Math.random() < 0.5 ? 1 : -1) * (0.4 + Math.random() * 0.5) };
        case "tank":
            return { ...baseEnemy, w: 54, h: 44, hp: 5, maxHp: 5, speed: 0.6, score: 50,
                     color: "#7a5c3a", fireTimer: 180 + Math.floor(Math.random() * 60) };
        case "heli":
            return { ...baseEnemy, w: 70, h: 28, hp: 8, maxHp: 8,
                     speed: 1.6 + Math.random() * 0.4, score: 100,
                     color: "#1a3a5c", dir: fromLeft ? 1 : -1,
                     dropTimer: 70 + Math.floor(Math.random() * 50),
                     descentTimer: 0 };
    }
}

// ─── PARTICLES ───────────────────────────────────────────────────────────────
function addParticles(x, y, color, count, speedMult = 1) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = (2 + Math.random() * 5) * speedMult;
        state.particles.push({
            x, y,
            dx: Math.cos(angle) * spd,
            dy: Math.sin(angle) * spd,
            life: 18 + Math.random() * 22,
            maxLife: 40,
            color,
            size: 3 + Math.random() * 4
        });
    }
}

// ─── FIRE WEAPONS ─────────────────────────────────────────────────────────────
function fireWeapon() {
    const p   = state.player;
    const wpn = WEAPONS[p.weaponIdx];

    if (wpn.grenade) {
        if (p.grenades <= 0) return;
        p.grenades--;
        state.bullets.push({
            x: p.x, y: p.y - p.h / 2,
            dx: 0, dy: -5,
            damage: 8, color: "#ff4444",
            grenade: true, grenadeTimer: 55, r: 80
        });
        audio.play("boost");
        return;
    }

    if (wpn.spread > 1) {
        // Shotgun: 3 bullets
        for (let i = -1; i <= 1; i++) {
            state.bullets.push({
                x: p.x, y: p.y - p.h / 2,
                dx: i * 2.2, dy: -10,
                damage: wpn.damage, color: wpn.color,
                grenade: false
            });
        }
    } else {
        state.bullets.push({
            x: p.x, y: p.y - p.h / 2,
            dx: 0, dy: wpn.id === "rifle" ? -14 : -10,
            damage: wpn.damage, color: wpn.color,
            grenade: false
        });
    }
    audio.play("ding");
}

// ─── GRENADE EXPLODE ─────────────────────────────────────────────────────────
function explodeGrenade(bul) {
    addParticles(bul.x, bul.y, "#ff4400", 22, 1.4);
    addParticles(bul.x, bul.y, "#ffaa00", 14, 1.0);
    addParticles(bul.x, bul.y, "#ffffff", 8, 0.6);

    // Explosion flash record
    state.explosions.push({ x: bul.x, y: bul.y, r: bul.r, life: 18, maxLife: 18 });

    // Damage enemies in radius
    state.enemies.forEach((en) => {
        const dx = en.x - bul.x;
        const dy = en.y - bul.y;
        if (Math.sqrt(dx * dx + dy * dy) < bul.r) {
            en.hp -= 8;
            addParticles(en.x, en.y, "#ff8800", 8);
        }
    });
    audio.play("crash");
}

// ─── TAKE DAMAGE ─────────────────────────────────────────────────────────────
function playerHit() {
    const p = state.player;
    if (p.invincible > 0) return;
    p.hp--;
    p.invincible = 120;
    addParticles(p.x, p.y, "#ff0000", 12);
    addParticles(p.x, p.y, "#ffffff", 6);
    audio.play("thud");
    if (p.hp <= 0) {
        state.highScore = recordScore("army", Math.floor(state.score));
        state.phase = "gameover";
        addParticles(p.x, p.y, "#e74c3c", 25);
        addParticles(p.x, p.y, "#ffd700", 15);
        audio.play("crash");
    }
}

// ─── NEXT WAVE ───────────────────────────────────────────────────────────────
function startNextWave() {
    state.wave++;
    const lvlDef = LEVELS[state.level];
    if (state.wave >= lvlDef.waves.length) {
        // All waves done
        if (state.level === 1) {
            state.phase = "levelcomplete";
        } else {
            state.highScore = recordScore("army", Math.floor(state.score));
            state.phase = "victory";
            addParticles(canvas.width / 2, canvas.height / 2, "#ffd700", 40, 1.5);
            addParticles(canvas.width / 2, canvas.height / 2, "#00ffee", 30, 1.2);
        }
        return;
    }
    state.enemyQueue = buildWaveQueue(lvlDef.waves[state.wave]);
    state.spawnTimer = 0;
    state.wavePhase  = "spawning";
    state.score += (state.wave) * 50; // wave complete bonus
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────
function update() {
    state.frame++;

    // ── Global input ──────────────────────────────────────────────
    if (input.menu) { window.location.href = "../index.html"; return; }

    if (input.cycleWeapon) {
        input.cycleWeapon = false;
        if (state.phase === "playing") {
            state.player.weaponIdx = (state.player.weaponIdx + 1) % WEAPONS.length;
            state.player.fireTimer = 0;
            audio.play("select");
        }
    }

    if (input.pause) {
        input.pause = false;
        if (state.phase === "playing") state.phase = "paused";
        else if (state.phase === "paused") state.phase = "playing";
    }

    if (state.phase === "wavecomplete") {
        state.waveTimer++;
        if (state.waveTimer > 120 || input.restart) {
            input.restart = false;
            state.waveTimer = 0;
            state.phase = "playing";
            startNextWave();
        }
        return;
    }
    if (state.phase === "levelcomplete" || state.phase === "gameover" ||
        state.phase === "victory" || state.phase === "paused") {
        if (input.restart) {
            input.restart = false;
            if (state.phase === "levelcomplete") {
                const prevScore = state.score;
                state = createState(2, prevScore);
            } else {
                globalPhase = "levelselect";
                state = null;
            }
        }
        return;
    }

    // ── Player movement ───────────────────────────────────────────
    const p = state.player;
    const moveSpeed = 5;
    if (input.left)  p.x -= moveSpeed;
    if (input.right) p.x += moveSpeed;
    if (input.up)    p.y -= moveSpeed;
    if (input.down)  p.y += moveSpeed;
    p.x = Math.max(p.w / 2, Math.min(canvas.width  - p.w / 2, p.x));
    p.y = Math.max(p.h / 2, Math.min(canvas.height - p.h / 2, p.y));

    if (p.invincible > 0) p.invincible--;

    // ── Fire ──────────────────────────────────────────────────────
    if (p.fireTimer > 0) p.fireTimer--;
    if (input.fire && p.fireTimer <= 0) {
        const wpn = WEAPONS[p.weaponIdx];
        if (!wpn.grenade || p.grenades > 0) {
            fireWeapon();
            p.fireTimer = wpn.fireRate;
        }
    }

    // ── Enemy wave / spawn ────────────────────────────────────────
    if (state.wavePhase === "spawning") {
        state.spawnTimer++;
        if (state.spawnTimer >= state.spawnInterval) {
            state.spawnTimer = 0;
            if (state.enemyQueue.length > 0) {
                const type = state.enemyQueue.pop();
                state.enemies.push(spawnEnemy(type));
            } else {
                state.wavePhase = "fighting";
            }
        }
    } else if (state.wavePhase === "fighting") {
        if (state.enemies.length === 0) {
            state.wavePhase = "ending";
            state.waveTimer = 0;
        }
    } else if (state.wavePhase === "ending") {
        state.waveTimer++;
        if (state.waveTimer > 30) {
            state.waveTimer = 0;
            const totalWaves = LEVELS[state.level].waves.length;
            if (state.wave + 1 >= totalWaves) {
                startNextWave(); // triggers levelcomplete or victory
            } else {
                state.phase = "wavecomplete";
            }
        }
    }

    // ── Enemy movement & AI ────────────────────────────────────────
    state.enemies.forEach((en) => {
        if (en.type === "heli") {
            en.x  += en.dir * en.speed;
            en.descentTimer = (en.descentTimer || 0) + 1;
            if (en.descentTimer % 180 === 0) en.y += 25;
            // Bounce at edges
            if (en.x > canvas.width + 90)  en.dir = -1;
            if (en.x < -90) en.dir = 1;

            en.dropTimer--;
            if (en.dropTimer <= 0) {
                en.dropTimer = 70 + Math.floor(Math.random() * 50);
                state.enemyBullets.push({ x: en.x, y: en.y + en.h / 2, dx: 0, dy: 5, damage: 1, type: "bomb" });
            }
        } else if (en.type === "tank") {
            en.y += en.speed;
            en.fireTimer--;
            if (en.fireTimer <= 0) {
                en.fireTimer = 200 + Math.floor(Math.random() * 60);
                state.enemyBullets.push({ x: en.x, y: en.y + en.h / 2, dx: 0, dy: 6, damage: 2, type: "shell" });
                audio.play("ding");
            }
        } else if (en.type === "sniper") {
            en.y   += en.speed;
            en.x   += en.dx;
            if (en.x < 20 || en.x > canvas.width - 20) en.dx *= -1;
            en.fireTimer--;
            if (en.fireTimer <= 0) {
                en.fireTimer = 100 + Math.floor(Math.random() * 80);
                const angle = Math.atan2(p.y - en.y, p.x - en.x);
                state.enemyBullets.push({
                    x: en.x, y: en.y + en.h / 2,
                    dx: Math.cos(angle) * 5, dy: Math.sin(angle) * 5,
                    damage: 1, type: "bullet"
                });
            }
        } else { // grunt
            en.y += en.speed;
        }
    });

    // ── Bullets move ────────────────────────────────────────────────
    state.bullets.forEach((bul) => {
        bul.x += bul.dx;
        bul.y += bul.dy;
        if (bul.grenade) {
            bul.grenadeTimer--;
            if (bul.grenadeTimer <= 0) bul.explode = true;
        }
    });

    state.enemyBullets.forEach((eb) => {
        eb.x += eb.dx;
        eb.y += eb.dy;
    });

    // ── Player bullet vs enemy collisions ─────────────────────────
    state.bullets.forEach((bul) => {
        if (bul.grenade) return; // handled separately on explode
        state.enemies.forEach((en) => {
            if (en.hp <= 0) return;
            const hit = bul.x > en.x - en.w / 2 && bul.x < en.x + en.w / 2 &&
                        bul.y > en.y - en.h / 2 && bul.y < en.y + en.h / 2;
            if (hit) {
                en.hp -= bul.damage;
                bul.hit = true;
                addParticles(bul.x, bul.y, "#ff8800", 4);
                if (en.hp <= 0) {
                    state.score += en.score;
                    addParticles(en.x, en.y, "#ff4400", 10);
                    addParticles(en.x, en.y, "#ffd700", 6);
                    audio.play("coin");
                }
            }
        });
    });

    // Grenade explode
    state.bullets.forEach((bul) => {
        if (bul.grenade && bul.explode) explodeGrenade(bul);
    });
    state.bullets = state.bullets.filter((b) => !b.hit && !b.explode && b.y > -40 &&
                                                  b.x > -40 && b.x < canvas.width + 40);

    // ── Enemy projectile vs player ────────────────────────────────
    state.enemyBullets.forEach((eb) => {
        if (p.invincible > 0) return;
        const pw2 = p.w / 2, ph2 = p.h / 2;
        if (eb.x > p.x - pw2 && eb.x < p.x + pw2 &&
            eb.y > p.y - ph2 && eb.y < p.y + ph2) {
            eb.hit = true;
            playerHit();
        }
    });
    state.enemyBullets = state.enemyBullets.filter(
        (eb) => !eb.hit && eb.y < canvas.height + 60 && eb.y > -60 &&
                eb.x > -60 && eb.x < canvas.width + 60
    );

    // ── Enemy reaches player / bottom ─────────────────────────────
    state.enemies.forEach((en) => {
        if (en.hp <= 0) return;
        // Collision with player (physical contact)
        const hit = Math.abs(en.x - p.x) < (en.w / 2 + p.w / 2) &&
                    Math.abs(en.y - p.y) < (en.h / 2 + p.h / 2);
        if (hit && p.invincible <= 0) {
            en.hp = 0;
            playerHit();
        }
    });

    // ── Cleanup ───────────────────────────────────────────────────
    state.enemies = state.enemies.filter(
        (en) => en.hp > 0 && en.y < canvas.height + 100 && en.x > -150 && en.x < canvas.width + 150
    );

    // Explosion lifetimes
    state.explosions.forEach((ex) => ex.life--);
    state.explosions = state.explosions.filter((ex) => ex.life > 0);

    // Particles
    state.particles.forEach((p) => {
        p.x += p.dx; p.y += p.dy;
        p.dy += 0.1;
        p.life--;
    });
    state.particles = state.particles.filter((p) => p.life > 0);
}

// ─── DRAW BACKGROUND ─────────────────────────────────────────────────────────
function drawBackground() {
    const lvlDef = LEVELS[state.level];
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, lvlDef.bgTop);
    grad.addColorStop(1, lvlDef.bgBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Ground horizon line
    ctx.strokeStyle = state.level === 1 ? "#a07040" : "#333355";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height * 0.45);
    ctx.lineTo(canvas.width, canvas.height * 0.45);
    ctx.stroke();

    // Scenery
    state.scenery.forEach((s) => {
        if (s.kind === "palm") {
            // Trunk
            ctx.fillStyle = "#8b6914";
            ctx.fillRect(s.x - 4, s.y - s.size, 8, s.size * 1.2);
            // Fronds
            ctx.fillStyle = "#2d7d32";
            for (let a = -0.6; a <= 0.6; a += 0.3) {
                ctx.save();
                ctx.translate(s.x, s.y - s.size);
                ctx.rotate(a);
                ctx.fillRect(-s.size * 0.6, -6, s.size * 1.2, 8);
                ctx.restore();
            }
        } else if (s.kind === "rock") {
            ctx.fillStyle = "#9e9e9e";
            ctx.beginPath();
            ctx.ellipse(s.x, s.y, s.size, s.size * 0.55, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#bdbdbd";
            ctx.beginPath();
            ctx.ellipse(s.x - s.size * 0.2, s.y - s.size * 0.1, s.size * 0.5, s.size * 0.28, -0.3, 0, Math.PI * 2);
            ctx.fill();
        } else if (s.kind === "rubble") {
            ctx.fillStyle = "#555577";
            for (let i = 0; i < 4; i++) {
                ctx.fillRect(s.x + (i - 1.5) * (s.size * 0.5), s.y - i * 4, s.size * 0.45, s.size * 0.45);
            }
        } else if (s.kind === "barrel") {
            ctx.fillStyle = "#cc3300";
            ctx.fillRect(s.x - s.size * 0.4, s.y - s.size, s.size * 0.8, s.size);
            ctx.fillStyle = "#222";
            ctx.fillRect(s.x - s.size * 0.4, s.y - s.size * 0.5, s.size * 0.8, 4);
            ctx.fillRect(s.x - s.size * 0.4, s.y - s.size * 0.2, s.size * 0.8, 4);
        }
    });
}

// ─── DRAW ENEMIES ────────────────────────────────────────────────────────────
function drawEnemy(en) {
    if (en.hp <= 0) return;
    const ox = en.x - en.w / 2;
    const oy = en.y - en.h / 2;

    if (en.type === "heli") {
        // Helicopter body
        ctx.fillStyle = en.color;
        ctx.fillRect(ox, oy + en.h * 0.25, en.w, en.h * 0.5);
        // Cockpit
        ctx.fillStyle = "#00ccff";
        ctx.fillRect(ox + en.w * 0.55, oy + en.h * 0.2, en.w * 0.3, en.h * 0.45);
        // Tail rotor
        ctx.fillStyle = "#2a4a6a";
        ctx.fillRect(ox - en.w * 0.2, oy + en.h * 0.35, en.w * 0.2, en.h * 0.2);
        // Rotor blades (spinning)
        ctx.fillStyle = "#a0bcd0";
        const rotAngle = (state.frame * 0.3) % (Math.PI * 2);
        ctx.save();
        ctx.translate(en.x, oy + en.h * 0.2);
        ctx.rotate(rotAngle);
        ctx.fillRect(-en.w * 0.55, -3, en.w * 1.1, 6);
        ctx.restore();
        // HP bar
        drawHpBar(en, oy - 10);
        return;
    }

    if (en.type === "tank") {
        // Tracks
        ctx.fillStyle = "#3a2a1a";
        ctx.fillRect(ox - 4, oy + en.h * 0.6, en.w + 8, en.h * 0.45);
        // Hull
        ctx.fillStyle = en.color;
        ctx.fillRect(ox, oy + en.h * 0.15, en.w, en.h * 0.75);
        // Turret
        ctx.fillStyle = "#5a3c1e";
        ctx.fillRect(ox + en.w * 0.2, oy - en.h * 0.05, en.w * 0.6, en.h * 0.4);
        // Barrel
        ctx.fillStyle = "#3a2a14";
        ctx.fillRect(en.x - 3, oy + en.h * 0.1 - 20, 6, en.h * 0.3);
        // HP bar
        drawHpBar(en, oy - 14);
        return;
    }

    // Grunt / Sniper — pixel soldier
    const bodyColor = en.type === "sniper" ? "#4a4a4a" : "#556b2f";
    // Legs
    ctx.fillStyle = bodyColor;
    ctx.fillRect(ox + 2, oy + en.h * 0.62, en.w * 0.36, en.h * 0.38);
    ctx.fillRect(ox + en.w * 0.52, oy + en.h * 0.62, en.w * 0.36, en.h * 0.38);
    // Body
    ctx.fillStyle = bodyColor;
    ctx.fillRect(ox, oy + en.h * 0.3, en.w, en.h * 0.4);
    // Head / helmet
    ctx.fillStyle = en.type === "sniper" ? "#333" : "#3d5020";
    ctx.fillRect(ox + en.w * 0.15, oy, en.w * 0.7, en.h * 0.35);
    // Eyes (menacing)
    ctx.fillStyle = "#ff2200";
    ctx.fillRect(ox + en.w * 0.25, oy + en.h * 0.08, en.w * 0.18, en.h * 0.1);
    ctx.fillRect(ox + en.w * 0.57, oy + en.h * 0.08, en.w * 0.18, en.h * 0.1);
    // Gun
    ctx.fillStyle = "#222";
    const gunLen = en.type === "sniper" ? en.w * 0.9 : en.w * 0.6;
    ctx.fillRect(ox + en.w * 0.6, oy + en.h * 0.35, gunLen, 4);
}

function drawHpBar(en, barY) {
    if (en.hp === en.maxHp) return;
    const bw = en.w + 8;
    const bx = en.x - bw / 2;
    ctx.fillStyle = "#400";
    ctx.fillRect(bx, barY, bw, 5);
    ctx.fillStyle = "#0f0";
    ctx.fillRect(bx, barY, bw * (en.hp / en.maxHp), 5);
}

// ─── DRAW PROJECTILES ─────────────────────────────────────────────────────────
function drawProjectiles() {
    // Player bullets
    state.bullets.forEach((bul) => {
        if (bul.grenade) {
            ctx.fillStyle = "#cc2200";
            ctx.beginPath();
            ctx.arc(bul.x, bul.y, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#ff6600";
            ctx.beginPath();
            ctx.arc(bul.x - 2, bul.y - 2, 4, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = bul.color;
            const len = Math.abs(bul.dy) > 5 ? 12 : 6;
            ctx.fillRect(bul.x - 2, bul.y - len / 2, 4, len);
        }
    });

    // Enemy projectiles
    state.enemyBullets.forEach((eb) => {
        if (eb.type === "bomb") {
            ctx.fillStyle = "#111";
            ctx.beginPath();
            ctx.arc(eb.x, eb.y, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#ff4400";
            ctx.beginPath();
            ctx.arc(eb.x + 4, eb.y - 4, 3, 0, Math.PI * 2);
            ctx.fill();
        } else if (eb.type === "shell") {
            ctx.fillStyle = "#cc8800";
            ctx.fillRect(eb.x - 5, eb.y - 10, 10, 20);
        } else {
            ctx.fillStyle = "#ff2200";
            ctx.fillRect(eb.x - 2, eb.y - 5, 4, 10);
        }
    });

    // Explosions
    state.explosions.forEach((ex) => {
        const pct = ex.life / ex.maxLife;
        ctx.globalAlpha = pct * 0.7;
        const grad = ctx.createRadialGradient(ex.x, ex.y, 0, ex.x, ex.y, ex.r * (1 - pct * 0.3));
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(0.3, "#ff8800");
        grad.addColorStop(1, "rgba(255,68,0,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(ex.x, ex.y, ex.r * (1 - pct * 0.3), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    });
}

// ─── DRAW PLAYER ─────────────────────────────────────────────────────────────
function drawPlayer() {
    const p = state.player;
    if (p.invincible > 0 && Math.floor(p.invincible / 6) % 2 === 0) return; // blink

    ctx.save();
    ctx.translate(p.x, p.y);
    const ox = -p.w / 2, oy = -p.h / 2;

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(ox + 3, oy + 4, p.w, p.h);

    // Legs
    ctx.fillStyle = "#1a3a1a";
    ctx.fillRect(ox + 2, oy + p.h * 0.62, p.w * 0.36, p.h * 0.38);
    ctx.fillRect(ox + p.w * 0.52, oy + p.h * 0.62, p.w * 0.36, p.h * 0.38);

    // Body
    ctx.fillStyle = "#2e5a1e";
    ctx.fillRect(ox, oy + p.h * 0.3, p.w, p.h * 0.38);

    // Helmet
    ctx.fillStyle = "#1a3a14";
    ctx.fillRect(ox + p.w * 0.1, oy, p.w * 0.8, p.h * 0.35);

    // Visor / eyes
    ctx.fillStyle = "#00ffee";
    ctx.fillRect(ox + p.w * 0.25, oy + p.h * 0.1, p.w * 0.18, p.h * 0.1);
    ctx.fillRect(ox + p.w * 0.57, oy + p.h * 0.1, p.w * 0.18, p.h * 0.1);

    // Weapon arm
    const wpn = WEAPONS[p.weaponIdx];
    ctx.fillStyle = "#333";
    if (wpn.id === "shotgun") {
        ctx.fillRect(ox + p.w * 0.7, oy + p.h * 0.3, p.w * 1.0, 8);
    } else if (wpn.id === "grenade") {
        ctx.fillStyle = "#cc2200";
        ctx.beginPath();
        ctx.arc(ox + p.w * 0.9, oy + p.h * 0.3, 7, 0, Math.PI * 2);
        ctx.fill();
    } else if (wpn.id === "rifle") {
        ctx.fillRect(ox + p.w * 0.7, oy + p.h * 0.28, p.w * 1.2, 5);
    } else {
        ctx.fillRect(ox + p.w * 0.7, oy + p.h * 0.32, p.w * 0.7, 5);
    }

    ctx.restore();
}

// ─── DRAW PARTICLES ──────────────────────────────────────────────────────────
function drawParticles() {
    state.particles.forEach((p) => {
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
    ctx.globalAlpha = 1;
}

// ─── DRAW HUD ────────────────────────────────────────────────────────────────
function drawHUD() {
    const p = state.player;
    const lvlDef = LEVELS[state.level];

    // Score
    ctx.font = "14px 'Press Start 2P'";
    ctx.fillStyle = "#00ffee";
    ctx.fillText("SCORE " + Math.floor(state.score), 16, 26);

    // Wave
    ctx.fillStyle = "#ffd700";
    ctx.fillText("WAVE " + (state.wave + 1) + " / " + lvlDef.waves.length, 16, 50);

    // Level name
    ctx.fillStyle = lvlDef.bgTop === "#c8a96e" ? "#e8c47a" : "#ff6666";
    ctx.font = "10px 'Press Start 2P'";
    ctx.fillText(lvlDef.name, 16, 70);

    // HP hearts
    ctx.font = "18px 'Press Start 2P'";
    for (let i = 0; i < p.maxHp; i++) {
        ctx.fillStyle = i < p.hp ? "#ff2244" : "#333";
        ctx.fillText("♥", canvas.width - 30 - i * 28, 30);
    }

    // Weapon display
    const wpn = WEAPONS[p.weaponIdx];
    ctx.font = "10px 'Press Start 2P'";
    ctx.fillStyle = wpn.color;
    ctx.fillText("⚔ " + wpn.name, canvas.width - 180, 56);
    if (wpn.grenade) {
        ctx.fillStyle = p.grenades > 0 ? "#ff4444" : "#555";
        ctx.fillText("x" + p.grenades + " GRENADES", canvas.width - 180, 74);
    }

    // Hint: Z to cycle
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "8px 'Press Start 2P'";
    ctx.fillText("Z = CYCLE WEAPON", canvas.width - 180, 90);
}

// ─── DRAW LEVEL-SELECT SCREEN ─────────────────────────────────────────────────
function drawLevelSelect() {
    ctx.fillStyle = "#050816";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.textAlign = "center";
    ctx.font = "26px 'Press Start 2P'";
    ctx.fillStyle = "#4caf50";
    ctx.fillText("COMBAT ZONE", canvas.width / 2, 110);

    ctx.font = "12px 'Press Start 2P'";
    ctx.fillStyle = "#00ffee";
    ctx.fillText("SELECT LEVEL", canvas.width / 2, 160);

    // Level cards
    const cards = [
        { num: 1, name: "DESERT OUTPOST", sub: "GRUNTS & SNIPERS",  col: "#c8a96e", key: "PRESS 1" },
        { num: 2, name: "URBAN RUINS",    sub: "TANKS & HELICOPTERS", col: "#5566aa", key: "PRESS 2" }
    ];
    cards.forEach((c, i) => {
        const cx = canvas.width / 2 - 220 + i * 300;
        const cy = 240;
        // Card bg
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(cx - 110, cy - 10, 220, 160);
        ctx.strokeStyle = c.col;
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - 110, cy - 10, 220, 160);
        // Level num
        ctx.font = "32px 'Press Start 2P'";
        ctx.fillStyle = c.col;
        ctx.fillText("L" + c.num, cx, cy + 50);
        // Name
        ctx.font = "10px 'Press Start 2P'";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(c.name, cx, cy + 80);
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fillText(c.sub, cx, cy + 100);
        // Key hint
        ctx.fillStyle = c.col;
        ctx.fillText(c.key, cx, cy + 128);
    });

    ctx.font = "10px 'Press Start 2P'";
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillText("ARROWS / WASD · SPACE FIRE · Z WEAPON", canvas.width / 2, canvas.height - 30);

    ctx.textAlign = "left";
}

// ─── DRAW ────────────────────────────────────────────────────────────────────
function draw() {
    if (globalPhase === "levelselect") {
        drawLevelSelect();
        return;
    }

    drawBackground();
    state.enemies.forEach(drawEnemy);
    drawProjectiles();
    drawPlayer();
    drawParticles();
    drawHUD();

    // Overlays
    if (state.phase === "paused") {
        drawOverlay(ctx, canvas, "PAUSED", ["P TO CONTINUE"]);
    } else if (state.phase === "wavecomplete") {
        const nextWave = state.wave + 2;
        const total = LEVELS[state.level].waves.length;
        drawOverlay(ctx, canvas, "WAVE CLEAR!", [
            "+ " + (state.wave + 1) * 50 + " BONUS",
            "WAVE " + nextWave + " OF " + total + " INCOMING"
        ]);
    } else if (state.phase === "levelcomplete") {
        drawOverlay(ctx, canvas, "LEVEL 1 CLEAR!", [
            "SCORE " + Math.floor(state.score),
            "PRESS ENTER FOR LEVEL 2",
            "OR ESC FOR MENU"
        ]);
    } else if (state.phase === "gameover") {
        drawOverlay(ctx, canvas, "GAME OVER", [
            "SCORE " + Math.floor(state.score),
            "BEST  " + state.highScore,
            "PRESS ENTER TO RETRY"
        ]);
    } else if (state.phase === "victory") {
        drawOverlay(ctx, canvas, "VICTORY!", [
            "BOTH LEVELS CLEARED!",
            "SCORE " + Math.floor(state.score),
            "BEST  " + state.highScore,
            "PRESS ENTER FOR MENU"
        ]);
    }
}

// ─── LEVEL SELECT LOGIC ────────────────────────────────────────────────────────
function handleLevelSelect() {
    if (input.menu) { window.location.href = "../index.html"; return; }

    let chosen = 0;
    if (input.level1 || input.start) chosen = 1;
    if (input.level2) chosen = 2;

    input.level1 = input.level2 = input.start = false;

    if (chosen > 0) {
        globalPhase = "ingame";
        state = createState(chosen);
        audio.play("vroom");
    }
}

// ─── MAIN LOOP ────────────────────────────────────────────────────────────────
function loop() {
    if (globalPhase === "levelselect") {
        handleLevelSelect();
    } else {
        update();
        // Return to level select when state is cleared
        if (state === null) globalPhase = "levelselect";
    }
    draw();
    requestAnimationFrame(loop);
}

loop();
