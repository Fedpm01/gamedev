// ============================================================
// ELVEN DATE ADVENTURE — For Manzura ❤️
// RPG Invitation Game
// ============================================================

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
canvas.width = 800;
canvas.height = 800;

// ---- UI ELEMENTS ----
const dialogueBox     = document.getElementById("dialogue-box");
const dialogueSpeaker = document.getElementById("dialogue-speaker");
const dialogueText    = document.getElementById("dialogue-text");
const choiceContainer = document.getElementById("choice-container");
const endingScreen    = document.getElementById("ending-screen");
const heartsOverlay   = document.getElementById("hearts-overlay");
const roomLabel       = document.getElementById("room-label");
const hudHoney        = document.getElementById("hud-honey");

// ---- LOAD IMAGE HELPER ----
function img(src) {
    const i = new Image();
    i.src = src;
    return i;
}

// ---- SPRITES ----
const SPR = {
    player:    img("assets/fern.png"),
    npc:       img("assets/frieren.png"),
    bear:      img("assets/bear.png"),
    honey:     img("assets/honey.png"),
    rival:     img("assets/rival.png"),
    heartRune: img("assets/rune_heart.png"),
    starRune:  img("assets/rune_star.png"),
};

// ---- MAPS ----
const MAPS = {
    forest_hub: img("assets/map_forest.png"),
    picnic:     img("assets/map_picnic.png"),
    dancehall:  img("assets/map_dancehall.png"),
    rival_lair: img("assets/map_rival.png"),
    waterfall:  img("assets/map_waterfall.png"),
    oracle:     img("assets/map_oracle.png"),
};

// ---- GAME STATE ----
const G = {
    started: false,
    room: "forest_hub",
    inventory: [],
    talking: false,
    dialogueIndex: 0,
    currentLines: [],
    onDialogueEnd: null,
    choiceActive: false,
    lockMove: false,
    bearSolved: false,
    orbCollected: false,
};

// ---- INPUT ----
const keys = {};
document.addEventListener("keydown", e => { keys[e.code] = true; });
document.addEventListener("keyup",   e => { keys[e.code] = false; });

// ---- PLAYER ----
const player = { x: 380, y: 520, w: 40, h: 50, speed: 260 };

// ---- RIVAL STATE ----
const rival = { x: 200, y: 300, w: 40, h: 50, dir: 1, speed: 110, minX: 120, maxX: 620 };

// ---- ROOMS CONFIG ----
const ROOMS = {

    forest_hub: {
        label: "🌲 Forest Hub",
        npc: { x: 380, y: 240 },
        item: { type: "honey", x: 610, y: 520, w: 36, h: 36, active: true },
        exits: [
            { x: 0,   y: 340, w: 50, h: 120, to: "picnic",    label: "← Пикник" },
            { x: 750, y: 340, w: 50, h: 120, to: "dancehall", label: "→ Танцевальный зал" },
        ],
        onEnter() {
            talk("Frieren", [
                "Frieren: О, ты пришла... хорошо.",
                "Frieren: Ладно-ладно, не смотри на меня так — я специально тебя ждала.",
                "Frieren: Слушай, здесь спрятано несколько подсказок. Найди их все!",
                "Frieren: Мёд вон там блестит — подбери, он пригодится. Кстати, мишка охраняет кое-что интересное на поляне →",
            ]);
        }
    },

    picnic: {
        label: "🌸 Romantic Picnic Grove",
        bear: { x: 360, y: 310, w: 72, h: 72 },
        clue: { x: 360, y: 290, w: 80, h: 50, active: false, text: "🌸 Подсказка 1: «Место, где пахнет цветами и смеётся ветер...»" },
        exits: [
            { x: 340, y: 750, w: 120, h: 50, to: "forest_hub", label: "↓ Назад" },
        ],
        onEnter() {
            if (!G.bearSolved) {
                talk("Frieren", [
                    "Frieren: Ага, видишь этого пушистика?",
                    "Frieren: Он охраняет первую подсказку к свиданию.",
                    "Frieren: Медведи, знаешь ли, без взятки не работают. Попробуй мёд!",
                ]);
            } else {
                talk("Frieren", [
                    "Frieren: Медведь уже спит, красота!",
                    "Frieren: Забирай подсказку у корзины.",
                ]);
            }
        }
    },

    dancehall: {
        label: "💃 Starlit Dance Hall",
        clue: { x: 370, y: 200, w: 60, h: 60, active: true, text: "✨ Подсказка 2: «Там, где музыка — это тайный язык двоих...»" },
        exits: [
            { x: 340, y: 750, w: 120, h: 50, to: "forest_hub",  label: "↓ Назад" },
            { x: 340, y: 0,   w: 120, h: 50, to: "rival_lair",  label: "↑ Дальше" },
        ],
        onEnter() {
            talk("Frieren", [
                "Frieren: Вау, да ты умеешь танцевать?",
                "Frieren: Ну, неважно — здесь спрятана вторая подсказка!",
                "Frieren: Ищи блестящую штуку в середине зала.",
                "Frieren: И да — там впереди логово соперницы. Она будет патрулировать. Не попадайся!",
            ]);
        }
    },

    rival_lair: {
        label: "⚔️ Rival's Lair",
        exits: [
            { x: 750, y: 340, w: 50, h: 120, to: "waterfall", label: "→ К водопаду" },
            { x: 340, y: 750, w: 120, h: 50, to: "dancehall", label: "↓ Назад" },
        ],
        onEnter() {
            talk("Frieren", [
                "Frieren: Тсс! Это логово соперницы.",
                "Frieren: Она обожает мешать романтике. Классика жанра.",
                "Frieren: Обойди её — красный конус это её зрение. Проскользни к выходу →",
            ]);
        }
    },

    waterfall: {
        label: "💧 Waterfall Tryst",
        orb: { x: 370, y: 280, w: 50, h: 50, active: true },
        exits: [
            { x: 0,   y: 340, w: 50, h: 120, to: "oracle",    label: "← К Оракулу" },
            { x: 340, y: 750, w: 120, h: 50, to: "rival_lair", label: "↓ Назад" },
        ],
        onEnter() {
            talk("Frieren", [
                "Frieren: Ах, водопад... романтика, да?",
                "Frieren: Здесь светится Orb of Truth — последняя подсказка перед финалом!",
                "Frieren: Подойди к нему и подбери.",
            ]);
        }
    },

    oracle: {
        label: "🔮 Oracle Chamber",
        npc: { x: 360, y: 230 },
        runes: [
            { type: "accept",  x: 220, y: 400, w: 100, h: 100 },
            { type: "decline", x: 480, y: 400, w: 100, h: 100 },
        ],
        exits: [],
        onEnter() {
            talk("Frieren", [
                "Frieren: Манзура... ты прошла весь путь.",
                "Frieren: Все подсказки вели сюда.",
                "Frieren: Я хочу пригласить тебя на свидание. Настоящее.",
                "Frieren: Ну? Сердце — это «да». Звезда — это «я подумаю ещё лет сто».",
            ], () => { G.choiceActive = true; showChoice(); });
        }
    },
};

// ---- ROOM LABELS MAP ----
const ROOM_LABELS = {
    forest_hub: "🌲 Forest Hub",
    picnic:     "🌸 Romantic Picnic Grove",
    dancehall:  "💃 Starlit Dance Hall",
    rival_lair: "⚔️ Rival's Lair",
    waterfall:  "💧 Waterfall Tryst",
    oracle:     "🔮 Oracle Chamber",
};

// ============================================================
// DIALOGUE SYSTEM
// ============================================================
function talk(speaker, lines, onEnd) {
    G.talking = true;
    G.lockMove = true;
    G.dialogueIndex = 0;
    G.currentLines = lines;
    G.onDialogueEnd = onEnd || null;

    dialogueSpeaker.textContent = speaker;
    dialogueText.textContent = lines[0];
    dialogueBox.style.display = "block";
}

function advanceDialogue() {
    if (!G.talking) return;
    G.dialogueIndex++;

    if (G.dialogueIndex >= G.currentLines.length) {
        // end
        G.talking = false;
        dialogueBox.style.display = "none";
        G.lockMove = false;

        if (G.onDialogueEnd) {
            const cb = G.onDialogueEnd;
            G.onDialogueEnd = null;
            cb();
        }
        return;
    }

    dialogueText.textContent = G.currentLines[G.dialogueIndex];
}

// ============================================================
// CHOICES
// ============================================================
function showChoice() {
    choiceContainer.style.display = "flex";
}

document.getElementById("yes-btn").addEventListener("click", () => {
    choiceContainer.style.display = "none";
    triggerEnding("yes");
});

const noBtn = document.getElementById("no-btn");
noBtn.addEventListener("mouseenter", () => {
    const maxX = 680, maxY = 580;
    noBtn.style.position = "absolute";
    noBtn.style.left = Math.floor(Math.random() * maxX) + "px";
    noBtn.style.top  = Math.floor(Math.random() * maxY) + "px";
    noBtn.textContent = ["🐻 Не поймаешь!", "🌀 Куда-куда...", "✨ Хи-хи!"][Math.floor(Math.random()*3)];
});

// ============================================================
// ENDING
// ============================================================
function triggerEnding(type) {
    G.lockMove = true;
    G.choiceActive = false;

    heartsOverlay.style.display = "block";
    spawnHearts();

    setTimeout(() => {
        endingScreen.style.display = "flex";
        requestAnimationFrame(() => {
            endingScreen.classList.add("visible");
        });

        document.getElementById("ending-title").textContent = "❤️ Манзура, ты согласилась!";
        document.getElementById("ending-body").innerHTML =
            "Ты прошла все испытания и нашла все подсказки.\n\n" +
            "Твой герой ждёт тебя на настоящем свидании.\n\n" +
            "Скоро ты узнаешь — где и когда. 🌸";
    }, 1200);
}

function spawnHearts() {
    const emojis = ["❤️","💕","💖","🌸","✨","💗","💝"];
    for (let i = 0; i < 28; i++) {
        setTimeout(() => {
            const el = document.createElement("div");
            el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
            el.style.cssText = `
                position:absolute;
                left:${Math.random()*90}%;
                top:${70 + Math.random()*20}%;
                font-size:${20 + Math.random()*24}px;
                animation: floatUp ${1.5 + Math.random()*2}s ease-out forwards;
                pointer-events:none;
            `;
            heartsOverlay.appendChild(el);
        }, i * 80);
    }
}

// ============================================================
// LOAD ROOM
// ============================================================
function loadRoom(name) {
    G.room = name;
    G.choiceActive = false;
    G.lockMove = false;
    G.talking = false;
    dialogueBox.style.display = "none";
    choiceContainer.style.display = "none";

    player.x = 380;
    player.y = 520;

    roomLabel.textContent = ROOM_LABELS[name] || name;

    const room = ROOMS[name];
    if (room && room.onEnter) room.onEnter();
}

// ============================================================
// COLLISION
// ============================================================
function hit(a, b) {
    return a.x < b.x + b.w &&
           a.x + a.w > b.x &&
           a.y < b.y + b.h &&
           a.y + a.h > b.y;
}

// ============================================================
// SPACE KEY — interaction
// ============================================================
document.addEventListener("keydown", e => {
    if (e.code !== "Space") return;

    if (!G.started) {
        G.started = true;
        loadRoom("forest_hub");
        return;
    }

    if (G.talking) {
        advanceDialogue();
        return;
    }

    const room = ROOMS[G.room];

    // HONEY PICKUP
    if (G.room === "forest_hub") {
        const item = room.item;
        if (item && item.active && hit(player, item)) {
            item.active = false;
            G.inventory.push("honey");
            hudHoney.textContent = "🍯 Мёд";
            hudHoney.className = "hud-item";
            talk("Frieren", ["Frieren: Ого, подобрала! Мёд пригодится — мишка явно не откажется."]);
            return;
        }
    }

    // BEAR INTERACTION
    if (G.room === "picnic" && room.bear && !G.bearSolved) {
        const b = room.bear;
        if (hit(player, { x: b.x, y: b.y, w: b.w, h: b.h })) {
            if (G.inventory.includes("honey")) {
                G.bearSolved = true;
                room.bear = null;
                room.clue.active = true;
                G.inventory = G.inventory.filter(i => i !== "honey");
                hudHoney.textContent = "— пусто —";
                hudHoney.className = "hud-item empty";
                talk("Frieren", [
                    "Frieren: Ты дала ему мёд!",
                    "Frieren: *довольное медвежье урчание*",
                    "Frieren: Первая подсказка свободна! Иди к корзине.",
                ]);
            } else {
                talk("Frieren", [
                    "Frieren: Медведь смотрит на тебя... голодными глазами.",
                    "Frieren: Может, мёд откуда-нибудь подберёшь?",
                ]);
            }
            return;
        }
    }

    // CLUE PICKUP — PICNIC
    if (G.room === "picnic" && room.clue && room.clue.active) {
        if (hit(player, room.clue)) {
            room.clue.active = false;
            talk("Frieren", [
                "Frieren: " + room.clue.text,
                "Frieren: Красивая подсказка, правда? 😏",
                "Frieren: Возвращайся в Forest Hub, там ещё кое-что ждёт.",
            ]);
            return;
        }
    }

    // CLUE PICKUP — DANCEHALL
    if (G.room === "dancehall" && room.clue && room.clue.active) {
        if (hit(player, room.clue)) {
            room.clue.active = false;
            talk("Frieren", [
                "Frieren: " + room.clue.text,
                "Frieren: Именно! Теперь иди дальше — к водопаду через логово соперницы.",
            ]);
            return;
        }
    }

    // ORB PICKUP — WATERFALL
    if (G.room === "waterfall" && room.orb && room.orb.active) {
        if (hit(player, room.orb)) {
            room.orb.active = false;
            G.orbCollected = true;
            talk("Frieren", [
                "Frieren: ✨ Orb of Truth подобран!",
                "Frieren: Последняя подсказка: «Там, где время замирает — и ты улыбаешься».",
                "Frieren: Теперь ступай в Оракул — налево →",
            ]);
            return;
        }
    }

    // NPC in oracle — re-trigger if needed
    if (G.room === "oracle" && !G.choiceActive) {
        const npc = room.npc;
        if (npc && hit(player, { x: npc.x, y: npc.y, w: 40, h: 50 })) {
            room.onEnter();
        }
    }
});

// ============================================================
// UPDATE LOOP
// ============================================================
let last = 0;

function update(dt) {
    if (G.lockMove) return;

    let dx = 0, dy = 0;
    if (keys["KeyW"] || keys["ArrowUp"])    dy--;
    if (keys["KeyS"] || keys["ArrowDown"])  dy++;
    if (keys["KeyA"] || keys["ArrowLeft"])  dx--;
    if (keys["KeyD"] || keys["ArrowRight"]) dx++;
    if (dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }

    player.x += dx * player.speed * dt;
    player.y += dy * player.speed * dt;
    player.x = Math.max(0, Math.min(760, player.x));
    player.y = Math.max(0, Math.min(750, player.y));

    const room = ROOMS[G.room];

    // EXIT CHECK
    for (const ex of room.exits || []) {
        if (hit(player, ex)) {
            loadRoom(ex.to);
            return;
        }
    }

    // RIVAL PATROL
    if (G.room === "rival_lair") {
        rival.x += rival.dir * rival.speed * dt;
        if (rival.x < rival.minX) { rival.x = rival.minX; rival.dir = 1; }
        if (rival.x > rival.maxX) { rival.x = rival.maxX; rival.dir = -1; }

        if (rivalSpots()) {
            talk("Frieren", [
                "Frieren: Ой-ой! Тебя заметили!",
                "Frieren: Давай ещё раз — прокрадись мимо красного конуса!",
            ]);
            rival.x = 200; rival.y = 300; rival.dir = 1;
            player.x = 380; player.y = 600;
        }
    }

    // ORACLE RUNE WALK
    if (G.room === "oracle" && G.choiceActive) {
        for (const rune of room.runes) {
            if (hit(player, rune)) {
                if (rune.type === "accept") {
                    choiceContainer.style.display = "none";
                    triggerEnding("yes");
                } else {
                    // runaway button — do nothing (button runs away on hover)
                }
            }
        }
    }
}

function rivalSpots() {
    const coneLen = 220, coneH = 110;
    if (rival.dir === 1  && player.x < rival.x) return false;
    if (rival.dir === -1 && player.x > rival.x) return false;
    if (Math.abs(player.x - rival.x) > coneLen) return false;
    if (Math.abs(player.y - rival.y) > coneH) return false;
    return true;
}

// ============================================================
// DRAW
// ============================================================
let pulseT = 0;

function draw() {
    // Map background
    ctx.drawImage(MAPS[G.room], 0, 0, 800, 800);

    const room = ROOMS[G.room];

    // Honey item (forest_hub)
    if (G.room === "forest_hub" && room.item && room.item.active) {
        const bob = Math.sin(Date.now() * 0.003) * 4;
        ctx.drawImage(SPR.honey, room.item.x, room.item.y + bob, 36, 36);
        ctx.fillStyle = "rgba(255,220,50,0.7)";
        ctx.font = "10px 'Press Start 2P'";
        ctx.textAlign = "center";
        ctx.fillText("SPACE", room.item.x + 18, room.item.y - 6);
    }

    // Bear (picnic)
    if (G.room === "picnic" && room.bear) {
        ctx.drawImage(SPR.bear, room.bear.x, room.bear.y, room.bear.w, room.bear.h);
        if (!G.inventory.includes("honey")) {
            ctx.fillStyle = "rgba(255,80,80,0.9)";
            ctx.font = "9px 'Press Start 2P'";
            ctx.textAlign = "center";
            ctx.fillText("🍯?", room.bear.x + 36, room.bear.y - 8);
        }
    }

    // Clue glow (picnic & dancehall)
    if ((G.room === "picnic" || G.room === "dancehall") && room.clue && room.clue.active) {
        const glow = 0.4 + Math.sin(Date.now() * 0.005) * 0.3;
        ctx.shadowBlur = 20;
        ctx.shadowColor = `rgba(255,180,255,${glow})`;
        ctx.fillStyle = `rgba(255,180,255,${glow})`;
        ctx.beginPath();
        ctx.arc(room.clue.x + 30, room.clue.y + 20, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "white";
        ctx.font = "18px serif";
        ctx.textAlign = "center";
        ctx.fillText("📜", room.clue.x + 30, room.clue.y + 26);
    }

    // Rival (rival_lair)
    if (G.room === "rival_lair") {
        // Vision cone
        ctx.fillStyle = "rgba(255,40,40,0.22)";
        ctx.beginPath();
        if (rival.dir === 1) {
            ctx.moveTo(rival.x + rival.w, rival.y + 25);
            ctx.lineTo(rival.x + rival.w + 220, rival.y - 110);
            ctx.lineTo(rival.x + rival.w + 220, rival.y + 110 + 25);
        } else {
            ctx.moveTo(rival.x, rival.y + 25);
            ctx.lineTo(rival.x - 220, rival.y - 110);
            ctx.lineTo(rival.x - 220, rival.y + 110 + 25);
        }
        ctx.closePath();
        ctx.fill();
        ctx.drawImage(SPR.rival, rival.x, rival.y, rival.w, rival.h);
    }

    // Orb (waterfall)
    if (G.room === "waterfall" && room.orb && room.orb.active) {
        const t = Date.now() * 0.004;
        const pulse = Math.sin(t) * 8;
        ctx.shadowBlur = 30;
        ctx.shadowColor = "rgba(100,220,255,0.8)";
        ctx.fillStyle = "rgba(100,220,255,0.9)";
        ctx.beginPath();
        ctx.arc(room.orb.x + 25, room.orb.y + 25 + Math.sin(t) * 5, 18 + pulse * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "white";
        ctx.font = "20px serif";
        ctx.textAlign = "center";
        ctx.fillText("🔮", room.orb.x + 25, room.orb.y + 32);
    }

    // NPC — forest_hub and oracle
    if (room.npc) {
        ctx.drawImage(SPR.npc, room.npc.x, room.npc.y, 40, 50);
        // "!" exclamation if near
        const dist = Math.hypot(player.x - room.npc.x, player.y - room.npc.y);
        if (dist < 80 && !G.talking) {
            const bounce = Math.sin(Date.now() * 0.006) * 3;
            ctx.fillStyle = "#ffdd00";
            ctx.font = "bold 18px 'Press Start 2P'";
            ctx.textAlign = "center";
            ctx.fillText("!", room.npc.x + 20, room.npc.y - 12 + bounce);
        }
    }

    // Oracle runes
    if (G.room === "oracle" && G.choiceActive) {
        for (const rune of room.runes) {
            const pulse = Math.sin(Date.now() * 0.004) * 8;
            const runeImg = rune.type === "accept" ? SPR.heartRune : SPR.starRune;
            ctx.drawImage(runeImg, rune.x - pulse * 0.5, rune.y - pulse * 0.5, rune.w + pulse, rune.h + pulse);
            ctx.fillStyle = rune.type === "accept" ? "#ffb3c6" : "#99c2ff";
            ctx.font = "8px 'Press Start 2P'";
            ctx.textAlign = "center";
            ctx.fillText(rune.type === "accept" ? "❤️ ДА" : "🌟 НЕТ", rune.x + 50, rune.y + 116);
        }
    }

    // Player
    ctx.drawImage(SPR.player, player.x, player.y, player.w, player.h);

    // Exit arrows
    for (const ex of (room.exits || [])) {
        const dist = Math.hypot(
            player.x + 20 - (ex.x + ex.w / 2),
            player.y + 25 - (ex.y + ex.h / 2)
        );
        if (dist < 160) {
            ctx.fillStyle = "rgba(255,255,255,0.65)";
            ctx.font = "7px 'Press Start 2P'";
            ctx.textAlign = "center";
            ctx.fillText(ex.label || "→", ex.x + ex.w / 2, ex.y + ex.h / 2);
        }
    }
}

// ============================================================
// START SCREEN
// ============================================================
function drawStartScreen() {
    // Dark gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 800);
    grad.addColorStop(0, "#0d0d2b");
    grad.addColorStop(1, "#1a0a2e");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 800);

    // Stars
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    for (let i = 0; i < 80; i++) {
        const sx = (Math.sin(i * 137.5) * 0.5 + 0.5) * 800;
        const sy = (Math.cos(i * 97.3)  * 0.5 + 0.5) * 800;
        const ss = Math.random() < 0.1 ? 2 : 1;
        ctx.fillRect(sx, sy, ss, ss);
    }

    // Title glow
    ctx.shadowBlur = 30;
    ctx.shadowColor = "#ff4d6d";
    ctx.fillStyle = "#ffb3c6";
    ctx.font = "22px 'Press Start 2P'";
    ctx.textAlign = "center";
    ctx.fillText("✨ A Quest for Manzura ✨", 400, 310);
    ctx.shadowBlur = 0;

    ctx.fillStyle = "rgba(200,200,255,0.85)";
    ctx.font = "11px 'Press Start 2P'";
    ctx.fillText("Elven Date Adventure", 400, 355);

    // Blinking prompt
    const blink = Math.floor(Date.now() / 600) % 2 === 0;
    if (blink) {
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.font = "10px 'Press Start 2P'";
        ctx.fillText("— Нажми SPACE чтобы начать —", 400, 440);
    }

    // Decorative hearts
    const t = Date.now() * 0.001;
    const hearts = ["❤️","💖","🌸","✨"];
    for (let i = 0; i < hearts.length; i++) {
        const angle = t + (i / hearts.length) * Math.PI * 2;
        const hx = 400 + Math.cos(angle) * 120;
        const hy = 380 + Math.sin(angle) * 40;
        ctx.font = "20px serif";
        ctx.fillText(hearts[i], hx, hy);
    }
}

// ============================================================
// MAIN LOOP
// ============================================================
function loop(ts) {
    const dt = Math.min((ts - last) / 1000, 0.05);
    last = ts;

    ctx.clearRect(0, 0, 800, 800);

    if (!G.started) {
        drawStartScreen();
    } else {
        update(dt);
        draw();
    }

    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
