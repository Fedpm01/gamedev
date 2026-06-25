// ============================================================
// 戦争のフリーレン — A Quest for Manzura
// Pixel RPG date invitation (upgraded)
// ============================================================

// ---- ASSET PATHS — РЕДАКТИРУЙ ЗДЕСЬ, если имена файлов другие ----
const ASSET_DIR = "assets/";
const FILES = {
    player:    "fern.png",
    npc:       "frieren.png",
    bear:      "bear.png",
    honey:     "honey.png",
    rival:     "rival.png",
    heartRune: "rune_heart.png",
    starRune:  "rune_star.png",
    // карты (имена совпадают с твоими загруженными файлами)
    map_forest_hub: "pixel_forest.png",
    map_picnic:     "pixel_picnic.png",
    map_dancehall:  "map_dancehall.png",
    map_rival_lair: "pixel_lair.png",
    map_waterfall:  "pixel_tryst.png",
    map_oracle:     "pixel_chamber.png",
};

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
canvas.width = 800;
canvas.height = 800;

// ---- UI ELEMENTS ----
const dialogueBox     = document.getElementById("dialogue-box");
const dialogueSpeaker = document.getElementById("dialogue-speaker");
const dialogueText    = document.getElementById("dialogue-text");
const endingScreen    = document.getElementById("ending-screen");
const heartsOverlay   = document.getElementById("hearts-overlay");
const roomLabel       = document.getElementById("room-label");
const hudHoney        = document.getElementById("hud-honey");
const wrapper         = document.getElementById("game-wrapper");
const titleScreen     = document.getElementById("title-screen");
const titleVideo      = document.getElementById("title-video");
const gameoverScreen  = document.getElementById("gameover-screen");

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---- LOAD IMAGE HELPER ----
function img(file) {
    const i = new Image();
    i.src = ASSET_DIR + file;
    return i;
}

// ---- SPRITES ----
const SPR = {
    player:    img(FILES.player),
    npc:       img(FILES.npc),
    bear:      img(FILES.bear),
    honey:     img(FILES.honey),
    rival:     img(FILES.rival),
    heartRune: img(FILES.heartRune),
    starRune:  img(FILES.starRune),
};

// ---- MAPS ----
const MAPS = {
    forest_hub: img(FILES.map_forest_hub),
    picnic:     img(FILES.map_picnic),
    dancehall:  img(FILES.map_dancehall),
    rival_lair: img(FILES.map_rival_lair),
    waterfall:  img(FILES.map_waterfall),
    oracle:     img(FILES.map_oracle),
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
    visited: {},
    curSpeaker: "",
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
        npc: { x: 380, y: 240 },
        item: { type: "honey", x: 610, y: 520, w: 36, h: 36, active: true },
        exits: [
            { x: 0,   y: 340, w: 50, h: 120, to: "picnic",    label: "← Пикник" },
            { x: 750, y: 340, w: 50, h: 120, to: "dancehall", label: "→ Танцевальный зал" },
        ],
        onEnter(first) {
            if (!first) return;
            talk("Frieren", [
                "Frieren: О, ты пришла... хорошо.",
                "Frieren: Ладно-ладно, не смотри на меня так — я специально тебя ждала.",
                "Frieren: Слушай, здесь спрятано несколько подсказок. Найди их все!",
                "Frieren: Мёд вон там блестит — подбери, пригодится. А налево ← на поляне мишка кое-что охраняет.",
            ]);
        }
    },

    picnic: {
        bear: { x: 360, y: 310, w: 72, h: 72 },
        clue: { x: 360, y: 290, w: 80, h: 50, active: false, text: "🌸 Подсказка 1: «Место, где пахнет цветами и смеётся ветер...»" },
        exits: [
            { x: 340, y: 750, w: 120, h: 50, to: "forest_hub", label: "↓ Назад" },
        ],
        onEnter(first) {
            if (!G.bearSolved && first) {
                talk("Frieren", [
                    "Frieren: Ага, видишь этого пушистика?",
                    "Frieren: Он охраняет первую подсказку к свиданию.",
                    "Frieren: Медведи, знаешь ли, без взятки не работают. Попробуй мёд!",
                ]);
            }
        }
    },

    dancehall: {
        clue: { x: 370, y: 200, w: 60, h: 60, active: true, text: "✨ Подсказка 2: «Там, где музыка — это тайный язык двоих...»" },
        exits: [
            { x: 340, y: 750, w: 120, h: 50, to: "forest_hub",  label: "↓ Назад" },
            { x: 340, y: 0,   w: 120, h: 50, to: "rival_lair",  label: "↑ Дальше" },
        ],
        onEnter(first) {
            if (!first) return;
            talk("Frieren", [
                "Frieren: Вау, да ты умеешь танцевать?",
                "Frieren: Ну, неважно — здесь спрятана вторая подсказка!",
                "Frieren: Ищи блестящую штуку в середине зала.",
                "Frieren: И да — там впереди логово соперницы. Она будет патрулировать. Не попадайся!",
            ]);
        }
    },

    rival_lair: {
        exits: [
            { x: 750, y: 340, w: 50, h: 120, to: "waterfall", label: "→ К водопаду" },
            { x: 340, y: 750, w: 120, h: 50, to: "dancehall", label: "↓ Назад" },
        ],
        onEnter(first) {
            if (!first) return;
            talk("Frieren", [
                "Frieren: Тсс! Это логово соперницы.",
                "Frieren: Она обожает мешать романтике. Классика жанра.",
                "Frieren: Обойди её — красный конус это её зрение. Проскользни к выходу →",
            ]);
        }
    },

    waterfall: {
        orb: { x: 370, y: 280, w: 50, h: 50, active: true },
        exits: [
            { x: 0,   y: 340, w: 50, h: 120, to: "oracle",     label: "← К Оракулу" },
            { x: 340, y: 750, w: 120, h: 50, to: "rival_lair", label: "↓ Назад" },
        ],
        onEnter(first) {
            if (!first) return;
            talk("Frieren", [
                "Frieren: Ах, водопад... романтика, да?",
                "Frieren: Здесь светится Orb of Truth — последняя подсказка перед финалом!",
                "Frieren: Подойди к нему и подбери.",
            ]);
        }
    },

    oracle: {
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
            ], () => { G.choiceActive = true; });
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
// DIALOGUE SYSTEM (with typewriter)
// ============================================================
let typeTimer = null, typing = false, fullLine = "";

function showLine(text) {
    let t = text;
    if (G.curSpeaker && t.startsWith(G.curSpeaker + ":")) t = t.slice(G.curSpeaker.length + 1).trim();
    fullLine = t;
    clearInterval(typeTimer);
    if (reduceMotion) { dialogueText.textContent = t; typing = false; return; }
    dialogueText.textContent = "";
    typing = true;
    let i = 0;
    typeTimer = setInterval(() => {
        dialogueText.textContent = t.slice(0, ++i);
        if (i >= t.length) { clearInterval(typeTimer); typing = false; }
    }, 26);
}

function talk(speaker, lines, onEnd) {
    G.talking = true;
    G.lockMove = true;
    G.dialogueIndex = 0;
    G.currentLines = lines;
    G.onDialogueEnd = onEnd || null;
    G.curSpeaker = speaker;

    dialogueSpeaker.textContent = speaker;
    dialogueBox.style.display = "block";
    showLine(lines[0]);
}

function advanceDialogue() {
    if (!G.talking) return;

    // First press finishes the current line instantly
    if (typing) { clearInterval(typeTimer); dialogueText.textContent = fullLine; typing = false; return; }

    G.dialogueIndex++;

    if (G.dialogueIndex >= G.currentLines.length) {
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

    showLine(G.currentLines[G.dialogueIndex]);
}

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
        requestAnimationFrame(() => endingScreen.classList.add("visible"));

        document.getElementById("ending-title").textContent = "❤️ Манзура, ты согласилась!";
        document.getElementById("ending-body").textContent =
            "Ты прошла все испытания и нашла все подсказки.\n\n" +
            "А теперь — самое настоящее свидание.\n\n" +
            "Где и когда — узнаешь совсем скоро. 🌸";
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
// GAME OVER (caught by rival)
// ============================================================
function showGameOver() {
    G.lockMove = true;
    G.talking = false;
    dialogueBox.style.display = "none";
    gameoverScreen.style.display = "flex";
}

function retryRival() {
    gameoverScreen.style.display = "none";
    rival.x = 200; rival.y = 300; rival.dir = 1;
    player.x = 380; player.y = 600;
    G.lockMove = false;
}

document.getElementById("retry-btn").addEventListener("click", retryRival);

// ============================================================
// LOAD ROOM
// ============================================================
function loadRoom(name) {
    G.room = name;
    G.choiceActive = false;
    G.lockMove = false;
    G.talking = false;
    dialogueBox.style.display = "none";

    player.x = 380;
    player.y = 520;

    roomLabel.textContent = ROOM_LABELS[name] || name;

    const room = ROOMS[name];
    const first = !G.visited[name];
    G.visited[name] = true;
    if (room && room.onEnter) room.onEnter(first);
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
// ACTION (SPACE / touch button) — interaction
// ============================================================
function pressAction() {
    if (!G.started) { startGame(); return; }

    if (G.talking) { advanceDialogue(); return; }

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
                "Frieren: Теперь ступай в Оракул — налево ←",
            ]);
            return;
        }
    }

    // NPC in oracle — re-trigger proposal if needed
    if (G.room === "oracle" && !G.choiceActive) {
        const npc = room.npc;
        if (npc && hit(player, { x: npc.x, y: npc.y, w: 40, h: 50 })) {
            room.onEnter();
        }
    }
}

document.addEventListener("keydown", e => {
    if (e.code === "Space") { e.preventDefault(); pressAction(); }
});

// ============================================================
// START
// ============================================================
function startGame() {
    if (G.started) return;
    G.started = true;
    titleScreen.style.display = "none";
    try { if (titleVideo) titleVideo.pause(); } catch (e) {}
    loadRoom("forest_hub");
}
document.getElementById("title-start").addEventListener("click", startGame);
titleScreen.addEventListener("click", startGame);

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
            showGameOver();
            return;
        }
    }

    // ORACLE RUNES
    if (G.room === "oracle" && G.choiceActive) {
        const heart = room.runes.find(r => r.type === "accept");
        const star  = room.runes.find(r => r.type === "decline");

        if (heart && hit(player, heart)) {
            triggerEnding("yes");
            return;
        }
        // The "star / no" rune playfully runs away when you get close
        if (star) {
            const d = Math.hypot(
                (player.x + player.w / 2) - (star.x + star.w / 2),
                (player.y + player.h / 2) - (star.y + star.h / 2)
            );
            if (d < 120) {
                star.x = 90 + Math.random() * 520;
                star.y = 300 + Math.random() * 270;
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
function draw() {
    // Map background (guard against not-yet-loaded images)
    const map = MAPS[G.room];
    if (map && map.complete && map.naturalWidth) {
        ctx.drawImage(map, 0, 0, 800, 800);
    } else {
        ctx.fillStyle = "#16121f";
        ctx.fillRect(0, 0, 800, 800);
    }

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
// RESPONSIVE FIT — scale the 800x800 stage to the viewport
// ============================================================
function fit() {
    const s = Math.min(window.innerWidth / 820, window.innerHeight / 820, 1);
    wrapper.style.transform = `translate(-50%,-50%) scale(${s})`;
}
window.addEventListener("resize", fit);
fit();

// ============================================================
// MAIN LOOP
// ============================================================
function loop(ts) {
    const dt = Math.min((ts - last) / 1000, 0.05);
    last = ts;

    ctx.clearRect(0, 0, 800, 800);

    if (G.started) {
        update(dt);
        draw();
    }

    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);