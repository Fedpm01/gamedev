// ============================================================
// 戦争のフリーレン — A Quest for Manzura
// Pixel RPG date invitation (upgraded: audio, collision, sizes, restart)
// ============================================================

// ---- ASSET PATHS — РЕДАКТИРУЙ ЗДЕСЬ, если имена/папка другие ----
const ASSET_DIR = "assets/";   // если картинки лежат рядом с index.html (без папки), поставь ""
const FILES = {
    player:    "fern.png",
    npc:       "frieren.png",
    bear:      "bear.png",
    honey:     "honey.png",
    rival:     "rival.png",
    heartRune: "rune_heart.png",
    starRune:  "rune_star.png",
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
const bgMusic         = document.getElementById("bg-music");
const volEl           = document.getElementById("vol");
const muteBtn         = document.getElementById("mute-btn");

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---- LOAD IMAGE HELPER ----
let assetErrors = [];
function img(file) {
    const i = new Image();
    i.onerror = () => { if (!assetErrors.includes(file)) assetErrors.push(file); console.warn("⚠ Не загрузилось:", i.src); };
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
    started: false, room: "forest_hub", inventory: [], talking: false,
    dialogueIndex: 0, currentLines: [], onDialogueEnd: null, choiceActive: false,
    lockMove: false, bearSolved: false, orbCollected: false, visited: {}, curSpeaker: "",
};

let debug = false;   // нажми C в игре, чтобы видеть блоки-препятствия

// ---- INPUT ----
const keys = {};
document.addEventListener("keydown", e => { keys[e.code] = true; });
document.addEventListener("keyup",   e => { keys[e.code] = false; });

// ---- PLAYER (Ферн) — размер как есть ----
const player = { x: 380, y: 520, w: 40, h: 50, speed: 260 };

// ---- RIVAL (соперница) ----
const CONE_LEN = 300, CONE_H = 95;
const rival = { x: 200, y: 450, w: 62, h: 74, dir: 1, speed: 130, minX: 140, maxX: 600, pause: 0, pauseMax: 0.7 };

// ============================================================
// ROOMS — npc/item размеры + blocks (препятствия) + onEnter
//   blocks: прямоугольники, куда нельзя зайти. Жми C, чтобы их видеть и подгонять.
// ============================================================
const ROOMS = {

    forest_hub: {
        npc: { x: 380, y: 240 },                                   // Фрирен — размер как есть
        item: { type: "honey", x: 610, y: 520, w: 48, h: 48, active: true },
        blocks: [
            { x: 330, y: 115, w: 165, h: 115 },   // вход в пещеру
            { x: 165, y: 285, w: 95,  h: 70  },   // валун слева
            { x: 560, y: 585, w: 130, h: 95  },   // камни справа-внизу
        ],
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
        bear: { x: 360, y: 320, w: 84, h: 84 },
        clue: { x: 360, y: 300, w: 80, h: 50, active: false, text: "🌸 Подсказка 1: «Место, где пахнет цветами и смеётся ветер...»" },
        blocks: [
            { x: 0,   y: 0,   w: 800, h: 115 },   // деревья сверху
            { x: 0,   y: 115, w: 120, h: 560 },   // деревья слева
            { x: 680, y: 115, w: 120, h: 560 },   // деревья справа
            { x: 0,   y: 600, w: 300, h: 200 },   // деревья снизу-слева
            { x: 500, y: 600, w: 300, h: 200 },   // деревья снизу-справа (оставлен проход к выходу)
        ],
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
        // ходить можно только по залу (паркет + камень снизу), НЕ по небу/балюстраде
        walk: [ { x: 120, y: 270, w: 560, h: 510 } ],
        clue: { x: 370, y: 360, w: 60, h: 60, active: true, text: "✨ Подсказка 2: «Там, где музыка — это тайный язык двоих...»" },
        exits: [
            { x: 340, y: 750, w: 120, h: 50, to: "forest_hub",  label: "↓ Назад" },
            { x: 340, y: 262, w: 120, h: 30, to: "rival_lair",  label: "↑ Дальше" },
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
        // коридор: ходить можно поперёк, мимо патрулирующей соперницы
        walk: [ { x: 70, y: 300, w: 660, h: 300 } ],
        spawn: { x: 110, y: 450 },
        exits: [
            { x: 670, y: 440, w: 130, h: 130, to: "waterfall", label: "→ К водопаду" },
        ],
        onEnter(first) {
            if (!first) return;
            talk("Frieren", [
                "Frieren: Тсс! Это логово соперницы.",
                "Frieren: Она ходит туда-сюда, а красный конус — это её взгляд.",
                "Frieren: Прокрадись СВЕРХУ, вне её зрения, и проскользни к выходу справа, когда она отвернётся →",
            ]);
        }
    },

    waterfall: {
        orb: { x: 380, y: 500, w: 50, h: 50, active: true },
        // ходить можно ТОЛЬКО по каменной площадке и тропе вниз — НЕ по воде
        walk: [
            { x: 235, y: 420, w: 330, h: 210 },   // центральная каменная площадка
            { x: 330, y: 610, w: 150, h: 190 },   // тропа вниз к Оракулу
        ],
        exits: [
            { x: 330, y: 760, w: 150, h: 40, to: "oracle", label: "↓ К Оракулу" },
        ],
        onEnter(first) {
            if (!first) return;
            talk("Frieren", [
                "Frieren: Ах, водопад... романтика, да?",
                "Frieren: Здесь светится Orb of Truth — последняя подсказка перед финалом!",
                "Frieren: Подойди и подбери его, потом ступай вниз ↓ к Оракулу.",
            ]);
        }
    },

    oracle: {
        npc: { x: 360, y: 230 },
        runes: [
            { type: "accept",  x: 220, y: 400, w: 84, h: 84 },
            { type: "decline", x: 480, y: 400, w: 84, h: 84 },
        ],
        blocks: [
            { x: 355, y: 355, w: 90,  h: 110 },   // пьедестал с шаром (центр)
            { x: 120, y: 230, w: 70,  h: 200 },   // колонна слева
            { x: 610, y: 230, w: 70,  h: 200 },   // колонна справа
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

const ROOM_LABELS = {
    forest_hub: "🌲 Forest Hub",
    picnic:     "🌸 Romantic Picnic Grove",
    dancehall:  "💃 Starlit Dance Hall",
    rival_lair: "⚔️ Rival's Lair",
    waterfall:  "💧 Waterfall Tryst",
    oracle:     "🔮 Oracle Chamber",
};

// ============================================================
// AUDIO (музыка-файл + процедурные звуки + громкость)
// ============================================================
let actx = null, master = null, muted = false;
let musicDuck = 1.0;   // 1.0 на титульнике, ~0.3 в игре — чтобы был слышен голос

function curVol() { return muted ? 0 : (parseInt(volEl.value, 10) / 100); }
function musicVol() { return curVol() * musicDuck; }

function initAudio() {
    if (actx) return;
    try {
        actx = new (window.AudioContext || window.webkitAudioContext)();
        master = actx.createGain();
        master.gain.value = curVol();
        master.connect(actx.destination);
    } catch (e) { /* без Web Audio просто не будет звуков */ }
}

function beep(freq, dur, type, when, gain) {
    if (!actx || !master) return;
    try {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = type || "square";
        o.frequency.value = freq;
        const t = actx.currentTime + (when || 0);
        o.connect(g); g.connect(master);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(gain || 0.18, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.1));
        o.start(t); o.stop(t + (dur || 0.1) + 0.03);
    } catch (e) {}
}
function sfxBlip()   { beep(520, 0.05, "square", 0, 0.08); }
function sfxPickup() { beep(660, 0.08, "square", 0, 0.18); beep(990, 0.10, "square", 0.07, 0.16); }
function sfxWin()    { [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.20, "triangle", i * 0.12, 0.22)); }

function applyVolume() {
    if (bgMusic) bgMusic.volume = musicVol();
    if (master) master.gain.value = curVol();
}
// какая музыка в какой комнате (имена = ТВОИ файлы в assets/)
const MUSIC = {
    default:    "Evan Call - The Magic Within.mp3",   // спокойная — почти везде
    rival_lair: "Evan Call - Dragon Smasher.mp3",     // напряжённая — у соперницы
    // хочешь — назначь свои, напр.: oracle: "Vollzanbel.mp3", dancehall: "Judradjim.mp3"
    // (если хочешь Dragon Smasher главной темой — поставь её в default)
};
let currentTrack = null;
function playRoomMusic(room) {
    if (!bgMusic) return;
    const track = MUSIC[room] || MUSIC.default;
    if (track === currentTrack) return;          // та же музыка — не перезапускаем
    currentTrack = track;
    bgMusic.src = ASSET_DIR + encodeURIComponent(track);
    bgMusic.volume = musicVol();
    bgMusic.play().catch(() => {/* нет файла — не страшно */});
}
volEl.addEventListener("input", applyVolume);
muteBtn.addEventListener("click", () => {
    muted = !muted;
    muteBtn.textContent = muted ? "🔇" : "🔊";
    if (bgMusic) bgMusic.muted = muted;
    if (muted) stopVoice();
    applyVolume();
});

// запустить музыку как можно раньше — уже на титульном экране
function ensureMusic() {
    if (!bgMusic) return;
    if (!bgMusic.src) { currentTrack = MUSIC.default; bgMusic.src = ASSET_DIR + encodeURIComponent(MUSIC.default); }
    bgMusic.volume = musicVol();
    bgMusic.play().catch(() => {/* браузер ждёт первого касания/клика */});
}
// первое действие пользователя (даже движок ползунка громкости) запускает музыку
function firstInteract() {
    ensureMusic();
    window.removeEventListener("pointerdown", firstInteract);
    window.removeEventListener("keydown", firstInteract);
    window.removeEventListener("touchstart", firstInteract);
}
window.addEventListener("pointerdown", firstInteract);
window.addEventListener("keydown", firstInteract);
window.addEventListener("touchstart", firstInteract);
ensureMusic();   // попытка автозапуска (если браузер разрешит)

// ---- ГОЛОС ФРИРЕН ----
// Хочешь НАСТОЯЩИЙ голос Фрирен из аниме? Накидай короткие звуковые клипы её реплик
// в assets/ (например, её «хм», «фуэ?», вздохи, 1-2 сек) и впиши имена файлов сюда —
// игра будет проигрывать случайный клип на каждую реплику = её настоящий голос:
const VOICE_CLIPS = []; // напр.: ["fri1.mp3", "fri2.mp3", "fri3.mp3"]
let voiceOn = true;
let voiceAudio = null;
function playVoiceClip() {
    if (!VOICE_CLIPS.length) return false;
    try {
        if (!voiceAudio) voiceAudio = new Audio();
        voiceAudio.src = ASSET_DIR + encodeURIComponent(VOICE_CLIPS[Math.floor(Math.random() * VOICE_CLIPS.length)]);
        voiceAudio.volume = Math.min(1, curVol() * 1.7);
        voiceAudio.play().catch(() => {});
        return true;
    } catch (e) { return false; }
}
// если клипов нет — мягкое «бормотание» под печать текста (стиль Undertale), приятнее робота
function voiceBlip() { beep(300 + Math.random() * 120, 0.04, "square", 0, 0.12); }
function stopVoice() { try { if (voiceAudio) { voiceAudio.pause(); voiceAudio.currentTime = 0; } } catch (e) {} }
const voiceBtn = document.getElementById("voice-btn");
voiceBtn.addEventListener("click", () => {
    voiceOn = !voiceOn;
    voiceBtn.textContent = voiceOn ? "🗣️" : "🤫";
    if (!voiceOn) stopVoice();
});

// ============================================================
// DIALOGUE SYSTEM (typewriter)
// ============================================================
let typeTimer = null, typing = false, fullLine = "";

function showLine(text) {
    let t = text;
    if (G.curSpeaker && t.startsWith(G.curSpeaker + ":")) t = t.slice(G.curSpeaker.length + 1).trim();
    fullLine = t;
    clearInterval(typeTimer);
    let chatter = false;
    if (voiceOn && !muted) { if (!playVoiceClip()) chatter = true; }
    if (reduceMotion) { dialogueText.textContent = t; typing = false; return; }
    dialogueText.textContent = "";
    typing = true;
    let i = 0;
    typeTimer = setInterval(() => {
        const ch = t[i];
        dialogueText.textContent = t.slice(0, ++i);
        if (chatter && ch && ch !== " " && i % 2 === 0) voiceBlip();
        if (i >= t.length) { clearInterval(typeTimer); typing = false; }
    }, 26);
}

function talk(speaker, lines, onEnd) {
    G.talking = true; G.lockMove = true; G.dialogueIndex = 0;
    G.currentLines = lines; G.onDialogueEnd = onEnd || null; G.curSpeaker = speaker;
    dialogueSpeaker.textContent = speaker;
    dialogueBox.style.display = "block";
    showLine(lines[0]);
}

function advanceDialogue() {
    if (!G.talking) return;
    if (typing) { clearInterval(typeTimer); dialogueText.textContent = fullLine; typing = false; return; }
    G.dialogueIndex++;
    if (G.dialogueIndex >= G.currentLines.length) {
        G.talking = false; dialogueBox.style.display = "none"; G.lockMove = false; stopVoice();
        if (G.onDialogueEnd) { const cb = G.onDialogueEnd; G.onDialogueEnd = null; cb(); }
        return;
    }
    showLine(G.currentLines[G.dialogueIndex]);
}

// ============================================================
// ENDING
// ============================================================
function triggerEnding(type) {
    G.lockMove = true; G.choiceActive = false;
    heartsOverlay.style.display = "block";
    spawnHearts();
    sfxWin();
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

document.getElementById("restart-btn").addEventListener("click", () => location.reload());

// ============================================================
// GAME OVER (поймала соперница)
// ============================================================
function showGameOver() {
    G.lockMove = true; G.talking = false;
    dialogueBox.style.display = "none";
    gameoverScreen.style.display = "flex";
}
function retryRival() {
    gameoverScreen.style.display = "none";
    rival.x = 200; rival.dir = 1; rival.pause = 0;
    const sp = ROOMS.rival_lair.spawn;
    player.x = sp.x; player.y = sp.y;
    G.lockMove = false;
}
document.getElementById("retry-btn").addEventListener("click", retryRival);

// ============================================================
// LOAD ROOM
// ============================================================
function loadRoom(name) {
    G.room = name; G.choiceActive = false; G.lockMove = false; G.talking = false;
    dialogueBox.style.display = "none";
    const sp = (ROOMS[name] && ROOMS[name].spawn) || { x: 380, y: 520 };
    player.x = sp.x; player.y = sp.y;
    roomLabel.textContent = ROOM_LABELS[name] || name;
    const room = ROOMS[name];
    const first = !G.visited[name];
    G.visited[name] = true;
    if (room && room.onEnter) room.onEnter(first);
    playRoomMusic(name);
}

// ============================================================
// COLLISION
// ============================================================
function hit(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
// маленький "хитбокс ног" внизу спрайта — так упирание в стены ощущается естественно
function feetBox(x, y) { return { x: x + 8, y: y + player.h - 16, w: player.w - 16, h: 14 }; }
function rectInside(a, b) {   // a полностью внутри b
    return a.x >= b.x && a.x + a.w <= b.x + b.w && a.y >= b.y && a.y + a.h <= b.y + b.h;
}
function canStand(x, y) {
    const f = feetBox(x, y);
    const room = ROOMS[G.room];
    // в выход зайти можно всегда (даже если за ним вода/небо)
    for (const ex of room.exits || []) { if (hit(f, ex)) return true; }
    // walk = белый список: если задан, ноги ДОЛЖНЫ быть внутри одной из зон
    if (room.walk) {
        let ok = false;
        for (const w of room.walk) { if (rectInside(f, w)) { ok = true; break; } }
        if (!ok) return false;
    }
    // blocks = чёрный список препятствий
    for (const b of room.blocks || []) { if (hit(f, b)) return false; }
    return true;
}

// ============================================================
// ACTION (SPACE / клик) — взаимодействие
// ============================================================
function pressAction() {
    if (!G.started) { startGame(); return; }
    if (G.talking) { advanceDialogue(); return; }

    const room = ROOMS[G.room];

    if (G.room === "forest_hub") {
        const item = room.item;
        if (item && item.active && hit(player, item)) {
            item.active = false; G.inventory.push("honey");
            hudHoney.textContent = "🍯 Мёд"; hudHoney.className = "hud-item";
            sfxPickup();
            talk("Frieren", ["Frieren: Ого, подобрала! Мёд пригодится — мишка явно не откажется."]);
            return;
        }
    }

    if (G.room === "picnic" && room.bear && !G.bearSolved) {
        const b = room.bear;
        if (hit(player, { x: b.x, y: b.y, w: b.w, h: b.h })) {
            if (G.inventory.includes("honey")) {
                G.bearSolved = true; room.bear = null; room.clue.active = true;
                G.inventory = G.inventory.filter(i => i !== "honey");
                hudHoney.textContent = "— пусто —"; hudHoney.className = "hud-item empty";
                sfxPickup();
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

    if (G.room === "picnic" && room.clue && room.clue.active && hit(player, room.clue)) {
        room.clue.active = false; sfxPickup();
        talk("Frieren", [
            "Frieren: " + room.clue.text,
            "Frieren: Красивая подсказка, правда? 😏",
            "Frieren: Возвращайся в Forest Hub, там ещё кое-что ждёт.",
        ]);
        return;
    }

    if (G.room === "dancehall" && room.clue && room.clue.active && hit(player, room.clue)) {
        room.clue.active = false; sfxPickup();
        talk("Frieren", [
            "Frieren: " + room.clue.text,
            "Frieren: Именно! Теперь иди дальше — к водопаду через логово соперницы.",
        ]);
        return;
    }

    if (G.room === "waterfall" && room.orb && room.orb.active && hit(player, room.orb)) {
        room.orb.active = false; G.orbCollected = true; sfxPickup();
        talk("Frieren", [
            "Frieren: ✨ Orb of Truth подобран!",
            "Frieren: Последняя подсказка: «Там, где время замирает — и ты улыбаешься».",
            "Frieren: Теперь ступай в Оракул — налево ←",
        ]);
        return;
    }

    if (G.room === "oracle" && !G.choiceActive) {
        const npc = room.npc;
        if (npc && hit(player, { x: npc.x, y: npc.y, w: 40, h: 50 })) room.onEnter();
    }
}

document.addEventListener("keydown", e => {
    if (e.code === "Space") { e.preventDefault(); pressAction(); }
    if (e.code === "KeyC")  { debug = !debug; }
});

// ============================================================
// START
// ============================================================
function startGame() {
    if (G.started) return;
    G.started = true;
    titleScreen.style.display = "none";
    try { if (titleVideo) titleVideo.pause(); } catch (e) {}
    initAudio();
    musicDuck = 0.3;   // приглушить фон — теперь слышно голос Фрирен
    applyVolume();
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

    // движение по осям отдельно + проверка препятствий (скольжение вдоль стен)
    let nx = Math.max(0, Math.min(760, player.x + dx * player.speed * dt));
    let ny = Math.max(0, Math.min(750, player.y + dy * player.speed * dt));
    if (canStand(nx, player.y)) player.x = nx;
    if (canStand(player.x, ny)) player.y = ny;

    const room = ROOMS[G.room];

    // выходы
    for (const ex of room.exits || []) {
        if (hit(player, ex)) { loadRoom(ex.to); return; }
    }

    // патруль соперницы
    if (G.room === "rival_lair") {
        if (rival.pause > 0) {
            rival.pause -= dt;
        } else {
            rival.x += rival.dir * rival.speed * dt;
            if (rival.x <= rival.minX) { rival.x = rival.minX; rival.dir = 1;  rival.pause = rival.pauseMax; }
            if (rival.x >= rival.maxX) { rival.x = rival.maxX; rival.dir = -1; rival.pause = rival.pauseMax; }
        }
        if (rivalSpots()) { showGameOver(); return; }
    }

    // руны оракула
    if (G.room === "oracle" && G.choiceActive) {
        const heart = room.runes.find(r => r.type === "accept");
        const star  = room.runes.find(r => r.type === "decline");
        if (heart && hit(player, heart)) { triggerEnding("yes"); return; }
        if (star) {
            const d = Math.hypot(
                (player.x + player.w / 2) - (star.x + star.w / 2),
                (player.y + player.h / 2) - (star.y + star.h / 2)
            );
            if (d < 120) { star.x = 90 + Math.random() * 520; star.y = 300 + Math.random() * 270; }
        }
    }
}

function rivalSpots() {
    if (rival.dir === 1  && player.x < rival.x) return false;
    if (rival.dir === -1 && player.x > rival.x) return false;
    if (Math.abs(player.x - rival.x) > CONE_LEN) return false;
    if (Math.abs(player.y - rival.y) > CONE_H) return false;
    return true;
}

// ============================================================
// DRAW
// ============================================================
function drawImg(im, x, y, w, h) {
    if (im && im.complete && im.naturalWidth) ctx.drawImage(im, x, y, w, h);
}

function draw() {
    const map = MAPS[G.room];
    if (map && map.complete && map.naturalWidth) ctx.drawImage(map, 0, 0, 800, 800);
    else { ctx.fillStyle = "#16121f"; ctx.fillRect(0, 0, 800, 800); }

    const room = ROOMS[G.room];

    // мёд (forest_hub)
    if (G.room === "forest_hub" && room.item && room.item.active) {
        const bob = Math.sin(Date.now() * 0.003) * 4;
        drawImg(SPR.honey, room.item.x, room.item.y + bob, room.item.w, room.item.h);
        ctx.fillStyle = "rgba(255,220,50,0.7)"; ctx.font = "10px 'Press Start 2P'"; ctx.textAlign = "center";
        ctx.fillText("SPACE", room.item.x + room.item.w / 2, room.item.y - 6);
    }

    // медведь (picnic)
    if (G.room === "picnic" && room.bear) {
        drawImg(SPR.bear, room.bear.x, room.bear.y, room.bear.w, room.bear.h);
        if (!G.inventory.includes("honey")) {
            ctx.fillStyle = "rgba(255,80,80,0.9)"; ctx.font = "9px 'Press Start 2P'"; ctx.textAlign = "center";
            ctx.fillText("🍯?", room.bear.x + room.bear.w / 2, room.bear.y - 8);
        }
    }

    // свечение подсказки (picnic & dancehall)
    if ((G.room === "picnic" || G.room === "dancehall") && room.clue && room.clue.active) {
        const glow = 0.4 + Math.sin(Date.now() * 0.005) * 0.3;
        const cx = room.clue.x + room.clue.w / 2, cy = room.clue.y + room.clue.h / 2;
        ctx.shadowBlur = 26; ctx.shadowColor = `rgba(255,180,255,${glow})`; ctx.fillStyle = `rgba(255,180,255,${glow})`;
        ctx.beginPath(); ctx.arc(cx, cy, 24, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.fillStyle = "white"; ctx.font = "30px serif"; ctx.textAlign = "center";
        ctx.fillText("📜", cx, cy + 10);
    }

    // соперница (rival_lair)
    if (G.room === "rival_lair") {
        const cyR = rival.y + rival.h / 2;
        ctx.fillStyle = "rgba(255,40,40,0.22)"; ctx.beginPath();
        if (rival.dir === 1) {
            ctx.moveTo(rival.x + rival.w, cyR);
            ctx.lineTo(rival.x + rival.w + CONE_LEN, cyR - CONE_H);
            ctx.lineTo(rival.x + rival.w + CONE_LEN, cyR + CONE_H);
        } else {
            ctx.moveTo(rival.x, cyR);
            ctx.lineTo(rival.x - CONE_LEN, cyR - CONE_H);
            ctx.lineTo(rival.x - CONE_LEN, cyR + CONE_H);
        }
        ctx.closePath(); ctx.fill();
        drawImg(SPR.rival, rival.x, rival.y, rival.w, rival.h);
    }

    // орб (waterfall)
    if (G.room === "waterfall" && room.orb && room.orb.active) {
        const t = Date.now() * 0.004, pulse = Math.sin(t) * 8;
        ctx.shadowBlur = 30; ctx.shadowColor = "rgba(100,220,255,0.8)"; ctx.fillStyle = "rgba(100,220,255,0.9)";
        ctx.beginPath(); ctx.arc(room.orb.x + room.orb.w / 2, room.orb.y + room.orb.h / 2 + Math.sin(t) * 5, 16 + pulse * 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.fillStyle = "white"; ctx.font = "18px serif"; ctx.textAlign = "center";
        ctx.fillText("🔮", room.orb.x + room.orb.w / 2, room.orb.y + room.orb.h / 2 + 6);
    }

    // NPC (Фрирен) — forest_hub и oracle
    if (room.npc) {
        drawImg(SPR.npc, room.npc.x, room.npc.y, 40, 50);
        const dist = Math.hypot(player.x - room.npc.x, player.y - room.npc.y);
        if (dist < 80 && !G.talking) {
            const bounce = Math.sin(Date.now() * 0.006) * 3;
            ctx.fillStyle = "#ffdd00"; ctx.font = "bold 18px 'Press Start 2P'"; ctx.textAlign = "center";
            ctx.fillText("!", room.npc.x + 20, room.npc.y - 12 + bounce);
        }
    }

    // руны оракула
    if (G.room === "oracle" && G.choiceActive) {
        for (const rune of room.runes) {
            const pulse = Math.sin(Date.now() * 0.004) * 8;
            const runeImg = rune.type === "accept" ? SPR.heartRune : SPR.starRune;
            drawImg(runeImg, rune.x - pulse * 0.5, rune.y - pulse * 0.5, rune.w + pulse, rune.h + pulse);
            ctx.fillStyle = rune.type === "accept" ? "#ffb3c6" : "#99c2ff";
            ctx.font = "8px 'Press Start 2P'"; ctx.textAlign = "center";
            ctx.fillText(rune.type === "accept" ? "❤️ ДА" : "🌟 НЕТ", rune.x + rune.w / 2, rune.y + rune.h + 14);
        }
    }

    // игрок (Ферн)
    drawImg(SPR.player, player.x, player.y, player.w, player.h);

    // стрелки выходов
    for (const ex of (room.exits || [])) {
        const d = Math.hypot(player.x + 20 - (ex.x + ex.w / 2), player.y + 25 - (ex.y + ex.h / 2));
        if (d < 160) {
            ctx.fillStyle = "rgba(255,255,255,0.65)"; ctx.font = "7px 'Press Start 2P'"; ctx.textAlign = "center";
            ctx.fillText(ex.label || "→", ex.x + ex.w / 2, ex.y + ex.h / 2);
        }
    }

    // DEBUG: показать блоки-препятствия (клавиша C)
    if (debug) {
        ctx.lineWidth = 2;
        // walk-зоны (зелёные) — где ХОДИТЬ можно
        if (room.walk) { ctx.strokeStyle = "rgba(60,255,120,0.9)"; for (const w of room.walk) ctx.strokeRect(w.x, w.y, w.w, w.h); }
        // blocks (красные) — куда НЕЛЬЗЯ
        ctx.strokeStyle = "rgba(255,60,60,0.9)";
        for (const b of (room.blocks || [])) ctx.strokeRect(b.x, b.y, b.w, b.h);
        const f = feetBox(player.x, player.y);
        ctx.strokeStyle = "cyan"; ctx.strokeRect(f.x, f.y, f.w, f.h);
        ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.font = "8px 'Press Start 2P'"; ctx.textAlign = "left";
        ctx.fillText("DEBUG (C): зелёное=ходить, красное=стены, синее=ноги", 12, 792);
    }

    // подсказка, если ассеты не нашлись
    if (assetErrors.length) {
        ctx.fillStyle = "rgba(0,0,0,0.78)"; ctx.fillRect(36, 36, 728, 74);
        ctx.fillStyle = "#ffb3c6"; ctx.font = "10px 'Press Start 2P'"; ctx.textAlign = "left";
        ctx.fillText("Не найдено ассетов: " + assetErrors.length + ". Проверь папку assets/", 52, 68);
        ctx.fillText("F12 -> Console, либо открой localhost:3000/assets/fern.png", 52, 92);
    }
}

// ============================================================
// RESPONSIVE FIT
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
    if (G.started) { update(dt); draw(); }
    requestAnimationFrame(loop);
}
requestAnimationFrame(loop);