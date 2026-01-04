const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.style.touchAction = 'none';

const music = new Audio('assets/song.m4a');
music.loop = true;
music.volume = 0.6;
let musicStarted = false;
const MULTIPLAYER_URL = window.MULTIPLAYER_URL || 'wss://YOUR-RENDER-URL';
function startMusic() {
  if (musicStarted) return;
  musicStarted = true;
  music.play().catch(() => {
    musicStarted = false;
  });
}

const restartButton = document.getElementById('restart');
const restartPrompt = document.getElementById('restartPrompt');
const restartYes = document.getElementById('restartYes');
const restartNo = document.getElementById('restartNo');
if (restartButton) {
  restartButton.addEventListener('click', () => {
    if (restartPrompt) {
      restartPrompt.style.display = 'flex';
      restartPrompt.setAttribute('aria-hidden', 'false');
      restartPrompt.style.opacity = '1';
      restartPrompt.style.visibility = 'visible';
      restartPrompt.style.pointerEvents = 'auto';
      setDebugStatus('Restart prompt');
    } else {
      setDebugStatus('Restart now');
      resetGame();
    }
  });
}
if (restartYes) {
  restartYes.addEventListener('click', () => {
    if (restartPrompt) {
      restartPrompt.style.display = 'none';
      restartPrompt.setAttribute('aria-hidden', 'true');
    }
    setDebugStatus('Restart yes');
    resetGame();
  });
}
if (restartNo) {
  restartNo.addEventListener('click', () => {
    if (restartPrompt) {
      restartPrompt.style.display = 'none';
      restartPrompt.setAttribute('aria-hidden', 'true');
    }
    setDebugStatus('Restart no');
    gameStarted = false;
    if (mainMenu) {
      mainMenu.style.display = 'flex';
      mainMenu.setAttribute('aria-hidden', 'false');
    }
    setDebugStatus('Menu');
  });
}

const world = {
  width: 0,
  height: 0
};

const camera = {
  x: 0,
  y: 0,
  followStrength: 0.12
};

const START_POINTS = 10;
const MIN_POINTS = 10;
const POINTS_PER_SIZE = 10;
const SHRINK_PER_SHOT = 1;
const GROW_PER_SPLAT = 1;
const RENDER_SCALE = 0.75;
const MAX_PLAYER_RADIUS_SCALE = 0.45;
const CAMERA_ZOOM = 0.75;

function resize() {
  // match CSS sizing but set actual pixel size for crisp canvas
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(300, Math.floor(rect.width));
  canvas.height = Math.max(200, Math.floor(rect.height));
  world.width = canvas.width * 6;
  world.height = canvas.height * 6;
}
window.addEventListener('resize', resize);
resize();

const savedName = window.localStorage.getItem('pancakeNickname');
let nickname = savedName;
if (!nickname) {
  const inputName = window.prompt('Enter a nickname (2-25 chars):');
  nickname = sanitizeName(inputName);
  window.localStorage.setItem('pancakeNickname', nickname);
}

const savedHighScore = Number(window.localStorage.getItem('pancakeHighScore')) || 0;
let highScore = savedHighScore;

const hudNameValue = document.getElementById('hudNameValue');
const hudHighScoreValue = document.getElementById('hudHighScoreValue');
const changeNameButton = document.getElementById('changeName');
const leaderboardList = document.getElementById('leaderboardList');
const controlsToggle = document.getElementById('controlsToggle');
const controlsPanel = document.getElementById('controlsPanel');
const mainMenu = document.getElementById('mainMenu');
const menuCard = document.getElementById('menuCard');
const startGameButton = document.getElementById('startGame');
const customizeButton = document.getElementById('customizePancake');
const customizePanel = document.getElementById('customizePanel');
const menuControls = document.getElementById('menuControls');
const menuNameInput = document.getElementById('menuNameInput');
const menuNameSave = document.getElementById('menuNameSave');
const hostGameButton = document.getElementById('hostGame');
const findGameButton = document.getElementById('findGame');
const roomsPanel = document.getElementById('roomsPanel');
const roomsList = document.getElementById('roomsList');
const roomsRefresh = document.getElementById('roomsRefresh');
const roomsClose = document.getElementById('roomsClose');
const toggleChips = document.getElementById('toggleChips');
const toggleCream = document.getElementById('toggleCream');
const toggleBlueberry = document.getElementById('toggleBlueberry');
const toggleStrawberry = document.getElementById('toggleStrawberry');
const toggleRaspberry = document.getElementById('toggleRaspberry');
const togglePineapple = document.getElementById('togglePineapple');
const toggleMaple = document.getElementById('toggleMaple');
const toggleMango = document.getElementById('toggleMango');
const toggleBanana = document.getElementById('toggleBanana');
const toggleChocolatePancake = document.getElementById('toggleChocolatePancake');
const customizeDone = document.getElementById('customizeDone');
const pancakePreview = document.getElementById('pancakePreview');
const previewCtx = pancakePreview ? pancakePreview.getContext('2d') : null;
const menuToggle = document.getElementById('menuToggle');
const debugStatus = document.getElementById('debugStatus');
const debugError = document.getElementById('debugError');

function setDebugStatus(message) {
  if (debugStatus) debugStatus.textContent = message;
}

function setDebugError(message) {
  if (debugError) debugError.textContent = message;
}

window.addEventListener('error', (event) => {
  setDebugStatus('Error');
  setDebugError(`${event.message}\n${event.filename}:${event.lineno}:${event.colno}`);
});

function updateHud() {
  if (hudNameValue) hudNameValue.textContent = nickname;
  if (hudHighScoreValue) hudHighScoreValue.textContent = String(highScore);
  if (toggleBlueberry) {
    const unlocked = highScore >= 1000;
    toggleBlueberry.disabled = !unlocked;
    if (!unlocked) toggleBlueberry.checked = false;
  }
  if (toggleStrawberry) {
    const unlocked = highScore >= 5000;
    toggleStrawberry.disabled = !unlocked;
    if (!unlocked) toggleStrawberry.checked = false;
  }
  if (toggleRaspberry) {
    const unlocked = highScore >= 10000;
    toggleRaspberry.disabled = !unlocked;
    if (!unlocked) toggleRaspberry.checked = false;
  }
  if (togglePineapple) {
    const unlocked = highScore >= 50000;
    togglePineapple.disabled = !unlocked;
    if (!unlocked) togglePineapple.checked = false;
  }
  if (toggleMaple) {
    const unlocked = highScore >= 75000;
    toggleMaple.disabled = !unlocked;
    if (!unlocked) toggleMaple.checked = false;
  }
  if (toggleMango) {
    const unlocked = highScore >= 100000;
    toggleMango.disabled = !unlocked;
    if (!unlocked) toggleMango.checked = false;
  }
  if (toggleBanana) {
    const unlocked = highScore >= 500000;
    toggleBanana.disabled = !unlocked;
    if (!unlocked) toggleBanana.checked = false;
  }
  if (toggleChocolatePancake) {
    const unlocked = highScore >= 1000000;
    toggleChocolatePancake.disabled = !unlocked;
    if (!unlocked) toggleChocolatePancake.checked = false;
  }
}

const multiplayer = {
  active: false,
  socket: null,
  roomId: null,
  playerId: null,
  state: null,
  lastSend: 0,
  moveOverride: null
};

function connectMultiplayer() {
  if (multiplayer.socket && multiplayer.socket.readyState === WebSocket.OPEN) return;
  multiplayer.socket = new WebSocket(MULTIPLAYER_URL);
  multiplayer.socket.addEventListener('message', (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }
    if (msg.type === 'rooms') {
      renderRooms(msg.rooms || []);
      return;
    }
    if (msg.type === 'joined') {
      multiplayer.active = true;
      multiplayer.roomId = msg.roomId;
      multiplayer.playerId = msg.playerId;
      gameStarted = true;
      if (mainMenu) {
        mainMenu.style.display = 'none';
        mainMenu.setAttribute('aria-hidden', 'true');
      }
      if (roomsPanel) {
        roomsPanel.style.display = 'none';
        roomsPanel.setAttribute('aria-hidden', 'true');
      }
      setDebugStatus('Multiplayer');
      return;
    }
    if (msg.type === 'state') {
      multiplayer.state = msg;
      const me = msg.players && msg.players.find((p) => p.id === multiplayer.playerId);
      if (me) {
        pancake.x = me.x;
        pancake.y = me.y;
        pancake.points = me.points;
        gameOver = !me.alive;
        if (gameOver) {
          document.body.classList.add('game-over');
        } else {
          document.body.classList.remove('game-over');
        }
      }
      if (msg.world) {
        world.width = msg.world.width;
        world.height = msg.world.height;
      }
      return;
    }
    if (msg.type === 'error') {
      setDebugStatus(msg.message || 'Multiplayer error');
    }
  });
  multiplayer.socket.addEventListener('close', () => {
    multiplayer.active = false;
    multiplayer.roomId = null;
    multiplayer.playerId = null;
    multiplayer.state = null;
  });
}

function sendMultiplayer(payload) {
  if (!multiplayer.socket || multiplayer.socket.readyState !== WebSocket.OPEN) return;
  multiplayer.socket.send(JSON.stringify(payload));
}

function renderRooms(rooms) {
  if (!roomsList) return;
  roomsList.textContent = '';
  if (!rooms.length) {
    roomsList.textContent = 'No active rooms yet.';
    return;
  }
  rooms.forEach((room) => {
    const row = document.createElement('div');
    row.className = 'room-entry';
    const label = document.createElement('div');
    label.textContent = `${room.name} (${room.count}/10)`;
    const join = document.createElement('button');
    join.textContent = 'Join';
    join.addEventListener('click', () => {
      connectMultiplayer();
      sendMultiplayer({ type: 'join', roomId: room.id, name: nickname });
    });
    row.appendChild(label);
    row.appendChild(join);
    roomsList.appendChild(row);
  });
}

function loadToppings() {
  try {
    const raw = window.localStorage.getItem('pancakeToppings');
    if (!raw) {
      return {
        chips: false,
        cream: false,
        blueberry: false,
        strawberry: false,
        raspberry: false,
        pineapple: false,
        maple: false,
        mango: false,
        banana: false,
        chocolatePancake: false
      };
    }
    const parsed = JSON.parse(raw);
    return {
      chips: Boolean(parsed.chips),
      cream: Boolean(parsed.cream),
      blueberry: Boolean(parsed.blueberry),
      strawberry: Boolean(parsed.strawberry),
      raspberry: Boolean(parsed.raspberry),
      pineapple: Boolean(parsed.pineapple),
      maple: Boolean(parsed.maple),
      mango: Boolean(parsed.mango),
      banana: Boolean(parsed.banana),
      chocolatePancake: Boolean(parsed.chocolatePancake)
    };
  } catch {
    return {
      chips: false,
      cream: false,
      blueberry: false,
      strawberry: false,
      raspberry: false,
      pineapple: false,
      maple: false,
      mango: false,
      banana: false,
      chocolatePancake: false
    };
  }
}

function saveToppings(toppings) {
  window.localStorage.setItem('pancakeToppings', JSON.stringify(toppings));
}

function createChipPattern(count = 8) {
  const pattern = [];
  for (let i = 0; i < count; i++) {
    pattern.push({
      angle: Math.random() * Math.PI * 2,
      dist: 0.2 + Math.random() * 0.6,
      size: 0.04 + Math.random() * 0.03
    });
  }
  return pattern;
}

function createBlueberryPattern(count = 6) {
  const pattern = [];
  for (let i = 0; i < count; i++) {
    pattern.push({
      angle: Math.random() * Math.PI * 2,
      dist: 0.15 + Math.random() * 0.55,
      size: 0.05 + Math.random() * 0.03
    });
  }
  return pattern;
}

function createStrawberryPattern(count = 4) {
  const pattern = [];
  for (let i = 0; i < count; i++) {
    pattern.push({
      angle: Math.random() * Math.PI * 2,
      dist: 0.12 + Math.random() * 0.5,
      size: 0.08 + Math.random() * 0.04
    });
  }
  return pattern;
}

function createRaspberryPattern(count = 6) {
  const pattern = [];
  for (let i = 0; i < count; i++) {
    pattern.push({
      angle: Math.random() * Math.PI * 2,
      dist: 0.15 + Math.random() * 0.55,
      size: 0.05 + Math.random() * 0.03
    });
  }
  return pattern;
}

function createPineapplePattern(count = 4) {
  const pattern = [];
  for (let i = 0; i < count; i++) {
    pattern.push({
      angle: Math.random() * Math.PI * 2,
      dist: 0.18 + Math.random() * 0.5,
      size: 0.1 + Math.random() * 0.05
    });
  }
  return pattern;
}

function createMaplePattern(count = 5) {
  const pattern = [];
  for (let i = 0; i < count; i++) {
    pattern.push({
      angle: Math.random() * Math.PI * 2,
      dist: 0.1 + Math.random() * 0.55,
      size: 0.12 + Math.random() * 0.06,
      rotation: Math.random() * Math.PI
    });
  }
  return pattern;
}

function createMangoPattern(count = 4) {
  const pattern = [];
  for (let i = 0; i < count; i++) {
    pattern.push({
      angle: Math.random() * Math.PI * 2,
      dist: 0.18 + Math.random() * 0.5,
      size: 0.08 + Math.random() * 0.04
    });
  }
  return pattern;
}

function createBananaPattern(count = 3) {
  const pattern = [];
  for (let i = 0; i < count; i++) {
    pattern.push({
      angle: Math.random() * Math.PI * 2,
      dist: 0.2 + Math.random() * 0.45,
      size: 0.16 + Math.random() * 0.05,
      rotation: Math.random() * Math.PI
    });
  }
  return pattern;
}

function getUnlockedToppings() {
  return {
    blueberry: highScore >= 1000,
    strawberry: highScore >= 5000,
    raspberry: highScore >= 10000,
    pineapple: highScore >= 50000,
    maple: highScore >= 75000,
    mango: highScore >= 100000,
    banana: highScore >= 500000,
    chocolatePancake: highScore >= 1000000
  };
}

function buildToppingPatterns(toppings) {
  return {
    chips: toppings.chips ? createChipPattern() : [],
    blueberry: toppings.blueberry ? createBlueberryPattern() : [],
    strawberry: toppings.strawberry ? createStrawberryPattern() : [],
    raspberry: toppings.raspberry ? createRaspberryPattern() : [],
    pineapple: toppings.pineapple ? createPineapplePattern() : [],
    maple: toppings.maple ? createMaplePattern() : [],
    mango: toppings.mango ? createMangoPattern() : [],
    banana: toppings.banana ? createBananaPattern() : []
  };
}

const savedToppings = loadToppings();

function updateLeaderboard() {
  if (!leaderboardList) return;
  const entries = [];
  if (multiplayer.active && multiplayer.state) {
    (multiplayer.state.players || []).forEach((player) => {
      if (!player.alive) return;
      entries.push({ name: player.name, points: player.points });
    });
    (multiplayer.state.ai || []).forEach((ai) => {
      entries.push({ name: ai.name, points: ai.points });
    });
  } else {
    if (!Array.isArray(aiPancakes)) return;
    entries.push({ name: pancake.name, points: pancake.points });
    aiPancakes.forEach((ai) => {
      if (!ai.alive) return;
      entries.push({ name: ai.name, points: ai.points });
    });
  }
  entries.sort((a, b) => b.points - a.points);
  const top = entries.slice(0, 5);

  leaderboardList.textContent = '';
  top.forEach((entry) => {
    const li = document.createElement('li');
    li.textContent = `${entry.name} (${entry.points})`;
    leaderboardList.appendChild(li);
  });
}

function changeNickname() {
  const inputName = window.prompt('Enter a new nickname (2-25 chars):', nickname);
  if (inputName != null) {
    nickname = sanitizeName(inputName);
    window.localStorage.setItem('pancakeNickname', nickname);
    pancake.name = nickname;
    updateHud();
  }
}

if (changeNameButton) {
  changeNameButton.addEventListener('click', changeNickname);
}

if (controlsToggle && controlsPanel) {
  controlsToggle.addEventListener('click', () => {
    const isHidden = controlsPanel.style.display === '' || controlsPanel.style.display === 'none';
    controlsPanel.style.display = isHidden ? 'block' : 'none';
    controlsPanel.setAttribute('aria-hidden', isHidden ? 'false' : 'true');
  });
}

if (menuControls && controlsPanel) {
  menuControls.addEventListener('click', () => {
    const isHidden = controlsPanel.style.display === '' || controlsPanel.style.display === 'none';
    controlsPanel.style.display = isHidden ? 'block' : 'none';
    controlsPanel.setAttribute('aria-hidden', isHidden ? 'false' : 'true');
  });
}

if (hostGameButton) {
  hostGameButton.addEventListener('click', () => {
    connectMultiplayer();
    const roomName = window.prompt('Room name (optional):') || '';
    sendMultiplayer({ type: 'host', name: nickname, roomName });
  });
}

if (findGameButton && roomsPanel) {
  findGameButton.addEventListener('click', () => {
    connectMultiplayer();
    roomsPanel.style.display = 'block';
    roomsPanel.setAttribute('aria-hidden', 'false');
    sendMultiplayer({ type: 'list_rooms' });
  });
}

if (roomsRefresh) {
  roomsRefresh.addEventListener('click', () => {
    connectMultiplayer();
    sendMultiplayer({ type: 'list_rooms' });
  });
}

if (roomsClose && roomsPanel) {
  roomsClose.addEventListener('click', () => {
    roomsPanel.style.display = 'none';
    roomsPanel.setAttribute('aria-hidden', 'true');
  });
}

if (menuNameInput) {
  menuNameInput.value = nickname;
}
if (menuNameSave) {
  menuNameSave.addEventListener('click', () => {
    if (!menuNameInput) return;
    const inputName = menuNameInput.value;
    const nextName = sanitizeName(inputName);
    nickname = nextName;
    window.localStorage.setItem('pancakeNickname', nickname);
    pancake.name = nickname;
    updateHud();
  });
}

function applyToppingsToPlayer(toppings) {
  const unlocks = getUnlockedToppings();
  pancake.toppings = {
    chips: Boolean(toppings.chips),
    cream: Boolean(toppings.cream),
    blueberry: unlocks.blueberry && Boolean(toppings.blueberry),
    strawberry: unlocks.strawberry && Boolean(toppings.strawberry),
    raspberry: unlocks.raspberry && Boolean(toppings.raspberry),
    pineapple: unlocks.pineapple && Boolean(toppings.pineapple),
    maple: unlocks.maple && Boolean(toppings.maple),
    mango: unlocks.mango && Boolean(toppings.mango),
    banana: unlocks.banana && Boolean(toppings.banana),
    chocolatePancake: unlocks.chocolatePancake && Boolean(toppings.chocolatePancake)
  };
  pancake.toppingPatterns = buildToppingPatterns(pancake.toppings);
}

function renderPancakePreview(toppings) {
  if (!previewCtx || !pancakePreview) return;
  previewCtx.clearRect(0, 0, pancakePreview.width, pancakePreview.height);
  const x = pancakePreview.width / 2;
  const y = pancakePreview.height / 2 + 10;
  const r = Math.min(pancakePreview.width, pancakePreview.height) * 0.28;

  drawPancakeTo(previewCtx, x, y, r, toppings, pancake.toppingPatterns);
}

if (customizeButton && customizePanel && menuCard) {
  customizeButton.addEventListener('click', () => {
    if (toggleChips) toggleChips.checked = savedToppings.chips;
    if (toggleCream) toggleCream.checked = savedToppings.cream;
    if (toggleBlueberry) {
      toggleBlueberry.checked = highScore >= 1000 && savedToppings.blueberry;
    }
    if (toggleStrawberry) {
      toggleStrawberry.checked = highScore >= 5000 && savedToppings.strawberry;
    }
    if (toggleRaspberry) {
      toggleRaspberry.checked = highScore >= 10000 && savedToppings.raspberry;
    }
    if (togglePineapple) {
      togglePineapple.checked = highScore >= 50000 && savedToppings.pineapple;
    }
    if (toggleMaple) {
      toggleMaple.checked = highScore >= 75000 && savedToppings.maple;
    }
    if (toggleMango) {
      toggleMango.checked = highScore >= 100000 && savedToppings.mango;
    }
    if (toggleBanana) {
      toggleBanana.checked = highScore >= 500000 && savedToppings.banana;
    }
    if (toggleChocolatePancake) {
      const unlocked = highScore >= 1000000;
      toggleChocolatePancake.checked = unlocked && savedToppings.chocolatePancake;
    }
    customizePanel.style.display = 'block';
    customizePanel.setAttribute('aria-hidden', 'false');
    menuCard.style.display = 'none';
    renderPancakePreview(savedToppings);
  });
}

if (customizeDone && customizePanel && menuCard) {
  customizeDone.addEventListener('click', () => {
    const nextToppings = {
      chips: Boolean(toggleChips && toggleChips.checked),
      cream: Boolean(toggleCream && toggleCream.checked),
      blueberry: Boolean(toggleBlueberry && toggleBlueberry.checked),
      strawberry: Boolean(toggleStrawberry && toggleStrawberry.checked),
      raspberry: Boolean(toggleRaspberry && toggleRaspberry.checked),
      pineapple: Boolean(togglePineapple && togglePineapple.checked),
      maple: Boolean(toggleMaple && toggleMaple.checked),
      mango: Boolean(toggleMango && toggleMango.checked),
      banana: Boolean(toggleBanana && toggleBanana.checked),
      chocolatePancake: Boolean(toggleChocolatePancake && toggleChocolatePancake.checked)
    };
    savedToppings.chips = nextToppings.chips;
    savedToppings.cream = nextToppings.cream;
    savedToppings.blueberry = nextToppings.blueberry;
    savedToppings.strawberry = nextToppings.strawberry;
    savedToppings.raspberry = nextToppings.raspberry;
    savedToppings.pineapple = nextToppings.pineapple;
    savedToppings.maple = nextToppings.maple;
    savedToppings.mango = nextToppings.mango;
    savedToppings.banana = nextToppings.banana;
    savedToppings.chocolatePancake = nextToppings.chocolatePancake;
    saveToppings(savedToppings);
    applyToppingsToPlayer(savedToppings);
    customizePanel.style.display = 'none';
    customizePanel.setAttribute('aria-hidden', 'true');
    menuCard.style.display = 'block';
  });
}

if (toggleChips || toggleCream || toggleBlueberry || toggleStrawberry || toggleRaspberry || togglePineapple || toggleMaple || toggleMango || toggleBanana || toggleChocolatePancake) {
  const updatePreviewFromToggles = () => {
    const nextToppings = {
      chips: Boolean(toggleChips && toggleChips.checked),
      cream: Boolean(toggleCream && toggleCream.checked),
      blueberry: Boolean(toggleBlueberry && toggleBlueberry.checked),
      strawberry: Boolean(toggleStrawberry && toggleStrawberry.checked),
      raspberry: Boolean(toggleRaspberry && toggleRaspberry.checked),
      pineapple: Boolean(togglePineapple && togglePineapple.checked),
      maple: Boolean(toggleMaple && toggleMaple.checked),
      mango: Boolean(toggleMango && toggleMango.checked),
      banana: Boolean(toggleBanana && toggleBanana.checked),
      chocolatePancake: Boolean(toggleChocolatePancake && toggleChocolatePancake.checked)
    };
    applyToppingsToPlayer(nextToppings);
    renderPancakePreview(nextToppings);
  };
  if (toggleChips) toggleChips.addEventListener('change', updatePreviewFromToggles);
  if (toggleCream) toggleCream.addEventListener('change', updatePreviewFromToggles);
  if (toggleBlueberry) toggleBlueberry.addEventListener('change', updatePreviewFromToggles);
  if (toggleStrawberry) toggleStrawberry.addEventListener('change', updatePreviewFromToggles);
  if (toggleRaspberry) toggleRaspberry.addEventListener('change', updatePreviewFromToggles);
  if (togglePineapple) togglePineapple.addEventListener('change', updatePreviewFromToggles);
  if (toggleMaple) toggleMaple.addEventListener('change', updatePreviewFromToggles);
  if (toggleMango) toggleMango.addEventListener('change', updatePreviewFromToggles);
  if (toggleBanana) toggleBanana.addEventListener('change', updatePreviewFromToggles);
  if (toggleChocolatePancake) toggleChocolatePancake.addEventListener('change', updatePreviewFromToggles);
}

if (startGameButton && mainMenu) {
  startGameButton.addEventListener('click', () => {
    gameStarted = true;
    mainMenu.style.display = 'none';
    mainMenu.setAttribute('aria-hidden', 'true');
    if (customizePanel) {
      customizePanel.style.display = 'none';
      customizePanel.setAttribute('aria-hidden', 'true');
    }
    if (menuCard) menuCard.style.display = 'block';
    setDebugStatus('Playing');
  });
}

if (menuToggle && mainMenu) {
  menuToggle.addEventListener('click', () => {
    gameStarted = false;
    mainMenu.style.display = 'flex';
    mainMenu.setAttribute('aria-hidden', 'false');
    if (customizePanel) {
      customizePanel.style.display = 'none';
      customizePanel.setAttribute('aria-hidden', 'true');
    }
    if (menuCard) menuCard.style.display = 'block';
    setDebugStatus('Menu');
  });
}

const pancake = {
  x: (canvas.width * 3) / 2,
  y: (canvas.height * 3) / 2,
  radius: Math.min(80, Math.min(canvas.width, canvas.height) * 0.12),
  speed: 450, // pixels per second
  points: START_POINTS,
  name: nickname,
  toppings: { chips: false, cream: false, blueberry: false, strawberry: false, raspberry: false, pineapple: false, maple: false, mango: false, banana: false, chocolatePancake: false },
  toppingPatterns: { chips: [], blueberry: [], strawberry: [], raspberry: [], pineapple: [], maple: [], mango: [], banana: [] }
};

updateHud();
applyToppingsToPlayer(savedToppings);

const TARGET_AI_COUNT = 10;
let nextAiId = 0;
const AI_NAMES = [
  'Syrup Sam',
  'Flapjack Jack',
  'Maple Moe',
  'Butter Bean',
  'Cinna Finn',
  'Griddle Gus',
  'Stacky Mac',
  'Honey Hank',
  'Waffle Wren',
  'Skillet Kit',
  'Brunch Benny',
  'Toasty Tori'
];

function randomAiName() {
  return AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)];
}

function sanitizeName(input) {
  if (!input) return 'No Name';
  const trimmed = input.trim();
  const normalized = trimmed.replace(/\s+/g, ' ');
  if (normalized.length < 2 || normalized.length > 25) return 'No Name';
  if (!/^[a-z0-9 _-]+$/i.test(normalized)) return 'No Name';
  const banned = ['badword1', 'badword2', 'badword3'];
  const lower = normalized.toLowerCase();
  if (banned.some((w) => lower.includes(w))) return 'No Name';
  return normalized;
}

function spawnAi() {
  const r = Math.min(60, Math.min(canvas.width, canvas.height) * 0.09);
  const points = 10 + Math.floor(Math.random() * 16);
  const unlocks = getUnlockedToppings();
  const toppings = {
      chips: Math.random() < 0.35,
      cream: Math.random() < 0.25,
      blueberry: unlocks.blueberry && Math.random() < 0.22,
      strawberry: unlocks.strawberry && Math.random() < 0.2,
      raspberry: unlocks.raspberry && Math.random() < 0.18,
      pineapple: unlocks.pineapple && Math.random() < 0.15,
      maple: unlocks.maple && Math.random() < 0.14,
      mango: unlocks.mango && Math.random() < 0.12,
      banana: unlocks.banana && Math.random() < 0.1,
      chocolatePancake: unlocks.chocolatePancake && Math.random() < 0.08
  };
  return {
    id: nextAiId++,
    name: randomAiName(),
    x: world.width * (0.05 + 0.9 * Math.random()),
    y: world.height * (0.05 + 0.9 * Math.random()),
    radius: r,
    points,
    speed: 300,
    toppings,
    toppingPatterns: buildToppingPatterns(toppings),
    vx: 0,
    vy: 0,
    wanderAngle: Math.random() * Math.PI * 2,
    shootTimer: Math.random() * 1.5,
    alive: true
  };
}

const aiPancakes = Array.from({ length: TARGET_AI_COUNT }, () => spawnAi());
updateLeaderboard();

const keys = {};
window.addEventListener('keydown', (e) => {
  startMusic();
  const k = (e.key && e.key.length === 1) ? e.key.toLowerCase() : e.key;
  if ((e.key === 'Enter' || e.key === 'NumpadEnter') && !e.repeat) {
    if (!gameOver && gameStarted) {
      const target = aim.hasTarget ? aim : { x: pancake.x + 1, y: pancake.y };
      shootSyrup(target);
    }
  }
  if (k === 'n' && !e.repeat) {
    changeNickname();
  }
  if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault();
  if (e.key === ' ' && !e.repeat) {
    if (!gameOver && gameStarted) {
      const target = aim.hasTarget ? aim : { x: pancake.x + 1, y: pancake.y };
      shootSyrup(target);
    }
  }
  if (k === 's' && !e.repeat) {
    if (!gameOver && gameStarted) {
      const target = aim.hasTarget ? aim : { x: pancake.x + 1, y: pancake.y };
      shootSyrup(target);
    }
  }
  keys[k] = true;
});
window.addEventListener('keyup', (e) => {
  const k = (e.key && e.key.length === 1) ? e.key.toLowerCase() : e.key;
  keys[k] = false;
});

const drag = {
  active: false,
  offsetX: 0,
  offsetY: 0
};
let pendingTapShoot = null;

const syrupShots = [];
const syrupSplats = [];
const pendingSplats = [];
let gameOver = false;
let gameStarted = false;
const aim = {
  x: 0,
  y: 0,
  hasTarget: false
};

function setGameOver() {
  if (gameOver) return;
  gameOver = true;
  drag.active = false;
  aim.hasTarget = false;
  setDebugStatus('Game over');
  document.body.classList.add('game-over');
  syrupSplats.push({
    x: pancake.x,
    y: pancake.y,
    rx: pancake.radius * 1.25,
    ry: pancake.radius * 0.6,
    rotation: Math.random() * Math.PI,
    ownerType: 'player',
    pickupRadius: pancake.radius * 1.2,
    pointsValue: Math.max(MIN_POINTS, pancake.points)
  });
}

function resetGame() {
  if (multiplayer.active) {
    gameOver = false;
    document.body.classList.remove('game-over');
    sendMultiplayer({ type: 'restart', roomId: multiplayer.roomId, playerId: multiplayer.playerId });
    setDebugStatus('Restart requested');
    return;
  }
  gameOver = false;
  gameStarted = true;
  drag.active = false;
  aim.hasTarget = false;
  document.body.classList.remove('game-over');
  Object.keys(keys).forEach((k) => {
    keys[k] = false;
  });
  pancake.points = START_POINTS;
  pancake.x = world.width / 2;
  pancake.y = world.height / 2;
  camera.x = 0;
  camera.y = 0;
  syrupShots.length = 0;
  syrupSplats.length = 0;
  pendingSplats.length = 0;
  aiPancakes.length = 0;
  nextAiId = 0;
  for (let i = 0; i < TARGET_AI_COUNT; i++) {
    aiPancakes.push(spawnAi());
  }
  updateHud();
  updateLeaderboard();
  if (customizePanel) {
    customizePanel.style.display = 'none';
    customizePanel.setAttribute('aria-hidden', 'true');
  }
  if (menuCard) menuCard.style.display = 'block';
  if (mainMenu) {
    mainMenu.style.display = 'none';
    mainMenu.setAttribute('aria-hidden', 'true');
  }
  last = performance.now();
  setDebugStatus('Playing');
}

function pointerToCanvas(e) {
  const rect = canvas.getBoundingClientRect();
  const zoomOffsetX = (canvas.width * (1 - CAMERA_ZOOM)) / 2;
  const zoomOffsetY = (canvas.height * (1 - CAMERA_ZOOM)) / 2;
  return {
    x: (e.clientX - rect.left - zoomOffsetX) / CAMERA_ZOOM,
    y: (e.clientY - rect.top - zoomOffsetY) / CAMERA_ZOOM
  };
}

function screenToWorld(p) {
  return {
    x: p.x + camera.x,
    y: p.y + camera.y
  };
}

function shootSyrup(target) {
  if (gameOver || !gameStarted) return;
  if (multiplayer.active) {
    sendMultiplayer({
      type: 'input',
      roomId: multiplayer.roomId,
      playerId: multiplayer.playerId,
      aimX: target.x,
      aimY: target.y,
      shoot: true
    });
    return;
  }
  if (pancake.points <= MIN_POINTS) return;
  shootSyrupFrom(pancake, target, 'player', -1);
  pancake.points = Math.max(MIN_POINTS, pancake.points - SHRINK_PER_SHOT);
}

function updateAimFromKeys() {
  let dx = 0;
  let dy = 0;
  if (keys['w'] || keys['q'] || keys['e']) dy -= 1;
  if (keys['s'] || keys['z'] || keys['c']) dy += 1;
  if (keys['a'] || keys['q'] || keys['z']) dx -= 1;
  if (keys['d'] || keys['e'] || keys['c']) dx += 1;
  if (dx === 0 && dy === 0) return;
  const len = Math.hypot(dx, dy) || 1;
  const dist = 220;
  aim.x = pancake.x + (dx / len) * dist;
  aim.y = pancake.y + (dy / len) * dist;
  aim.hasTarget = true;
}

function shootSyrupFrom(source, target, ownerType, ownerId) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const len = Math.hypot(dx, dy) || 1;
  const speed = 600;
  syrupShots.push({
    x: source.x,
    y: source.y,
    vx: (dx / len) * speed,
    vy: (dy / len) * speed,
    life: 0.7,
    ownerType,
    ownerId,
    ownerPoints: source.points || MIN_POINTS
  });
}

function scheduleSplat(splat, delay = 1.5) {
  pendingSplats.push({ splat, delay });
}

canvas.addEventListener('pointerdown', (e) => {
  startMusic();
  if (gameOver || !gameStarted) return;
  const p = screenToWorld(pointerToCanvas(e));
  const distance = Math.hypot(p.x - pancake.x, p.y - pancake.y);
  if (distance <= pancake.radius * 1.15) {
    drag.active = true;
    drag.offsetX = pancake.x - p.x;
    drag.offsetY = pancake.y - p.y;
    canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
  } else {
    if (e.pointerType === 'touch') {
      pendingTapShoot = p;
    } else {
      shootSyrup(p);
    }
    e.preventDefault();
  }
});

canvas.addEventListener('pointermove', (e) => {
  if (!drag.active) return;
  const p = screenToWorld(pointerToCanvas(e));
  if (multiplayer.active) {
    multiplayer.moveOverride = {
      x: p.x + drag.offsetX,
      y: p.y + drag.offsetY
    };
  } else {
    pancake.x = p.x + drag.offsetX;
    pancake.y = p.y + drag.offsetY;
  }
  e.preventDefault();
});

canvas.addEventListener('pointermove', (e) => {
  const p = screenToWorld(pointerToCanvas(e));
  aim.x = p.x;
  aim.y = p.y;
  aim.hasTarget = true;
});

function stopDrag(e) {
  if (!drag.active) return;
  drag.active = false;
  if (multiplayer.active) {
    multiplayer.moveOverride = null;
  }
  if (e && e.pointerId != null) {
    canvas.releasePointerCapture(e.pointerId);
  }
}

canvas.addEventListener('pointerup', stopDrag);
canvas.addEventListener('pointercancel', stopDrag);
canvas.addEventListener('pointerup', () => {
  if (pendingTapShoot && !drag.active) {
    shootSyrup(pendingTapShoot);
  }
  pendingTapShoot = null;
});
canvas.addEventListener('pointercancel', () => {
  pendingTapShoot = null;
});

function drawPancakeTo(renderCtx, x, y, r, toppings = null, patterns = null) {
  if (!renderCtx) return;
  if (r <= 0) return;
  renderCtx.save();
  // shadow
  renderCtx.beginPath();
  renderCtx.ellipse(x + 6, y + 10, r * 1.25, r * 0.6, 0, 0, Math.PI * 2);
  renderCtx.fillStyle = 'rgba(0,0,0,0.12)';
  renderCtx.fill();

  // pancake stack (three slightly different fills for depth)
  const colors = (toppings && toppings.chocolatePancake)
    ? ['#6b3a1f', '#7a4526', '#5a3018']
    : ['#d89f5a', '#e3b36b', '#c17f3d'];
  for (let i = 0; i < 3; i++) {
    const layerRadius = r - i * 6;
    const layerYRadius = r * 0.6 - i * 3;
    if (layerRadius <= 0 || layerYRadius <= 0) continue;
    renderCtx.beginPath();
    renderCtx.ellipse(x, y + i * 3, layerRadius, layerYRadius, 0, 0, Math.PI * 2);
    renderCtx.fillStyle = colors[i] || colors[0];
    renderCtx.fill();
  }

  // syrup drizzle
  renderCtx.beginPath();
  renderCtx.moveTo(x - r * 0.5, y - r * 0.1);
  renderCtx.bezierCurveTo(x - r * 0.1, y - r * 0.5, x + r * 0.2, y + r * 0.4, x + r * 0.6, y + r * 0.2);
  renderCtx.lineWidth = Math.max(6, r * 0.08);
  renderCtx.strokeStyle = '#8b4b1b';
  renderCtx.lineCap = 'round';
  renderCtx.stroke();

  // butter pat
  renderCtx.fillStyle = '#ffd94d';
  const bw = r * 0.22;
  const bh = r * 0.11;
  renderCtx.save();
  renderCtx.translate(x - bw / 2, y - bh / 2);
  roundRect(renderCtx, 0, 0, bw, bh, 4);
  renderCtx.fill();
  renderCtx.restore();

  if (toppings && toppings.chips && patterns && Array.isArray(patterns.chips)) {
    drawChocolateChipsTo(renderCtx, x, y, r, patterns.chips);
  }
  if (toppings && toppings.cream) {
    drawWhippedCreamTo(renderCtx, x, y, r);
  }
  if (toppings && toppings.blueberry && patterns && Array.isArray(patterns.blueberry)) {
    drawBlueberriesTo(renderCtx, x, y, r, patterns.blueberry);
  }
  if (toppings && toppings.strawberry && patterns && Array.isArray(patterns.strawberry)) {
    drawStrawberriesTo(renderCtx, x, y, r, patterns.strawberry);
  }
  if (toppings && toppings.raspberry && patterns && Array.isArray(patterns.raspberry)) {
    drawRaspberriesTo(renderCtx, x, y, r, patterns.raspberry);
  }
  if (toppings && toppings.pineapple && patterns && Array.isArray(patterns.pineapple)) {
    drawPineappleTo(renderCtx, x, y, r, patterns.pineapple);
  }
  if (toppings && toppings.maple && patterns && Array.isArray(patterns.maple)) {
    drawMapleTo(renderCtx, x, y, r, patterns.maple);
  }
  if (toppings && toppings.mango && patterns && Array.isArray(patterns.mango)) {
    drawMangoTo(renderCtx, x, y, r, patterns.mango);
  }
  if (toppings && toppings.banana && patterns && Array.isArray(patterns.banana)) {
    drawBananaTo(renderCtx, x, y, r, patterns.banana);
  }

  renderCtx.restore();
}

function drawPancake(x, y, r, toppings = null, patterns = null) {
  drawPancakeTo(ctx, x, y, r, toppings, patterns);
}

function drawChocolateChipsTo(renderCtx, x, y, r, pattern) {
  if (!renderCtx) return;
  renderCtx.save();
  renderCtx.fillStyle = '#4a2510';
  renderCtx.strokeStyle = '#2b1408';
  renderCtx.lineWidth = 1.5;
  pattern.forEach((chip) => {
    const px = x + Math.cos(chip.angle) * r * chip.dist;
    const py = y - r * 0.12 + Math.sin(chip.angle) * r * chip.dist * 0.8;
    const size = r * chip.size;
    renderCtx.beginPath();
    renderCtx.ellipse(px, py, size * 1.2, size, chip.angle, 0, Math.PI * 2);
    renderCtx.fill();
    renderCtx.stroke();
    renderCtx.fillStyle = '#6a3516';
    renderCtx.beginPath();
    renderCtx.ellipse(px - size * 0.2, py - size * 0.2, size * 0.45, size * 0.35, chip.angle, 0, Math.PI * 2);
    renderCtx.fill();
  });
  renderCtx.restore();
}

function drawChocolateChips(x, y, r, pattern) {
  drawChocolateChipsTo(ctx, x, y, r, pattern);
}

function drawBlueberriesTo(renderCtx, x, y, r, pattern) {
  if (!renderCtx) return;
  renderCtx.save();
  renderCtx.fillStyle = '#2f4b9e';
  renderCtx.strokeStyle = '#182455';
  renderCtx.lineWidth = 2;
  pattern.forEach((berry) => {
    const px = x + Math.cos(berry.angle) * r * berry.dist;
    const py = y - r * 0.16 + Math.sin(berry.angle) * r * berry.dist * 0.7;
    const size = r * berry.size;
    renderCtx.beginPath();
    renderCtx.ellipse(px, py, size, size, 0, 0, Math.PI * 2);
    renderCtx.fill();
    renderCtx.stroke();
    // bloom
    renderCtx.fillStyle = 'rgba(210, 220, 255, 0.55)';
    renderCtx.beginPath();
    renderCtx.ellipse(px + size * 0.1, py - size * 0.1, size * 0.45, size * 0.35, 0, 0, Math.PI * 2);
    renderCtx.fill();
    renderCtx.fillStyle = '#5b74c8';
    renderCtx.beginPath();
    renderCtx.ellipse(px - size * 0.25, py - size * 0.2, size * 0.35, size * 0.28, 0, 0, Math.PI * 2);
    renderCtx.fill();
    renderCtx.fillStyle = '#2f4b9e';
  });
  renderCtx.restore();
}

function drawStrawberriesTo(renderCtx, x, y, r, pattern) {
  if (!renderCtx) return;
  renderCtx.save();
  renderCtx.fillStyle = '#d9493f';
  renderCtx.strokeStyle = '#7f2220';
  renderCtx.lineWidth = 2;
  pattern.forEach((piece) => {
    const px = x + Math.cos(piece.angle) * r * piece.dist;
    const py = y - r * 0.18 + Math.sin(piece.angle) * r * piece.dist * 0.7;
    const size = r * piece.size;
    renderCtx.beginPath();
    renderCtx.ellipse(px, py, size * 1.1, size * 0.9, 0, 0, Math.PI * 2);
    renderCtx.fill();
    renderCtx.stroke();
    // seeds
    renderCtx.fillStyle = '#f7d66b';
    for (let i = 0; i < 5; i++) {
      const sx = px + (Math.random() - 0.5) * size * 1.1;
      const sy = py + (Math.random() - 0.5) * size * 0.9;
      renderCtx.beginPath();
      renderCtx.ellipse(sx, sy, size * 0.08, size * 0.06, 0, 0, Math.PI * 2);
      renderCtx.fill();
    }
    renderCtx.fillStyle = '#f06a63';
    renderCtx.beginPath();
    renderCtx.ellipse(px - size * 0.2, py - size * 0.2, size * 0.35, size * 0.25, 0, 0, Math.PI * 2);
    renderCtx.fill();
    renderCtx.fillStyle = '#d9493f';
    renderCtx.fillStyle = '#5ea84f';
    renderCtx.beginPath();
    renderCtx.ellipse(px, py - size * 0.45, size * 0.3, size * 0.18, 0, 0, Math.PI * 2);
    renderCtx.fill();
    renderCtx.fillStyle = '#d9493f';
  });
  renderCtx.restore();
}

function drawRaspberriesTo(renderCtx, x, y, r, pattern) {
  if (!renderCtx) return;
  renderCtx.save();
  renderCtx.fillStyle = '#c92a5a';
  renderCtx.strokeStyle = '#7a1433';
  renderCtx.lineWidth = 2;
  pattern.forEach((berry) => {
    const px = x + Math.cos(berry.angle) * r * berry.dist;
    const py = y - r * 0.16 + Math.sin(berry.angle) * r * berry.dist * 0.7;
    const size = r * berry.size;
    renderCtx.beginPath();
    renderCtx.ellipse(px, py, size, size, 0, 0, Math.PI * 2);
    renderCtx.fill();
    renderCtx.stroke();
    // sections
    renderCtx.fillStyle = '#e04b7a';
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const bx = px + Math.cos(angle) * size * 0.4;
      const by = py + Math.sin(angle) * size * 0.35;
      renderCtx.beginPath();
      renderCtx.ellipse(bx, by, size * 0.35, size * 0.3, 0, 0, Math.PI * 2);
      renderCtx.fill();
    }
    renderCtx.fillStyle = '#e04b7a';
    renderCtx.beginPath();
    renderCtx.ellipse(px - size * 0.2, py - size * 0.2, size * 0.35, size * 0.25, 0, 0, Math.PI * 2);
    renderCtx.fill();
    renderCtx.fillStyle = '#c92a5a';
  });
  renderCtx.restore();
}

function drawPineappleTo(renderCtx, x, y, r, pattern) {
  if (!renderCtx) return;
  renderCtx.save();
  renderCtx.fillStyle = '#f0c54e';
  renderCtx.strokeStyle = '#b07a16';
  renderCtx.lineWidth = 2;
  pattern.forEach((piece) => {
    const px = x + Math.cos(piece.angle) * r * piece.dist;
    const py = y - r * 0.12 + Math.sin(piece.angle) * r * piece.dist * 0.7;
    const size = r * piece.size;
    renderCtx.beginPath();
    renderCtx.ellipse(px, py, size * 1.3, size * 0.9, 0, 0, Math.PI * 2);
    renderCtx.fill();
    renderCtx.stroke();
    renderCtx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    renderCtx.lineWidth = 1;
    renderCtx.beginPath();
    renderCtx.moveTo(px - size * 0.6, py);
    renderCtx.lineTo(px + size * 0.6, py);
    renderCtx.stroke();
    renderCtx.strokeStyle = '#b07a16';
    renderCtx.lineWidth = 2;
  });
  renderCtx.restore();
}

function drawMapleTo(renderCtx, x, y, r, pattern) {
  if (!renderCtx) return;
  renderCtx.save();
  renderCtx.fillStyle = 'rgba(168, 92, 31, 0.55)';
  renderCtx.strokeStyle = 'rgba(122, 63, 20, 0.6)';
  renderCtx.lineWidth = 2;
  renderCtx.beginPath();
  renderCtx.ellipse(x, y - r * 0.12, r * 0.55, r * 0.28, 0, 0, Math.PI * 2);
  renderCtx.fill();
  renderCtx.stroke();
  renderCtx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  renderCtx.lineWidth = 1.5;
  renderCtx.beginPath();
  renderCtx.ellipse(x - r * 0.12, y - r * 0.16, r * 0.18, r * 0.08, 0.2, 0, Math.PI * 2);
  renderCtx.stroke();
  renderCtx.strokeStyle = 'rgba(122, 63, 20, 0.6)';
  renderCtx.lineWidth = 2;
  pattern.forEach((drop) => {
    const px = x + Math.cos(drop.angle) * r * drop.dist * 0.7;
    const py = y - r * 0.12 + Math.sin(drop.angle) * r * drop.dist * 0.5;
    const size = r * drop.size * 0.6;
    renderCtx.beginPath();
    renderCtx.ellipse(px, py, size * 1.2, size * 0.7, drop.rotation, 0, Math.PI * 2);
    renderCtx.fill();
  });
  renderCtx.restore();
}

function drawMangoTo(renderCtx, x, y, r, pattern) {
  if (!renderCtx) return;
  renderCtx.save();
  renderCtx.fillStyle = '#f7a83a';
  renderCtx.strokeStyle = '#b76514';
  renderCtx.lineWidth = 2;
  pattern.forEach((piece) => {
    const px = x + Math.cos(piece.angle) * r * piece.dist;
    const py = y - r * 0.12 + Math.sin(piece.angle) * r * piece.dist * 0.7;
    const size = r * piece.size;
    renderCtx.beginPath();
    renderCtx.ellipse(px, py, size * 1.2, size, 0, 0, Math.PI * 2);
    renderCtx.fill();
    renderCtx.stroke();
    // fibers
    renderCtx.strokeStyle = 'rgba(255, 220, 160, 0.7)';
    renderCtx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const fx = px - size * 0.4 + i * size * 0.4;
      renderCtx.beginPath();
      renderCtx.moveTo(fx, py - size * 0.3);
      renderCtx.lineTo(fx + size * 0.2, py + size * 0.3);
      renderCtx.stroke();
    }
    renderCtx.strokeStyle = '#b76514';
    renderCtx.lineWidth = 2;
    renderCtx.fillStyle = '#ffd07a';
    renderCtx.beginPath();
    renderCtx.ellipse(px - size * 0.2, py - size * 0.2, size * 0.35, size * 0.25, 0, 0, Math.PI * 2);
    renderCtx.fill();
    renderCtx.fillStyle = '#f7a83a';
  });
  renderCtx.restore();
}

function drawBananaTo(renderCtx, x, y, r, pattern) {
  if (!renderCtx) return;
  renderCtx.save();
  renderCtx.fillStyle = '#f6d04d';
  renderCtx.strokeStyle = '#b48c1f';
  renderCtx.lineWidth = 2;
  pattern.forEach((piece) => {
    const px = x + Math.cos(piece.angle) * r * piece.dist;
    const py = y - r * 0.1 + Math.sin(piece.angle) * r * piece.dist * 0.7;
    const size = r * piece.size;
    renderCtx.beginPath();
    renderCtx.ellipse(px, py, size * 1.6, size * 0.7, piece.rotation, 0, Math.PI * 2);
    renderCtx.fill();
    renderCtx.stroke();
    // texture lines
    renderCtx.strokeStyle = 'rgba(180, 140, 31, 0.6)';
    renderCtx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) {
      renderCtx.beginPath();
      renderCtx.moveTo(px - size * 0.6, py + i * size * 0.12);
      renderCtx.lineTo(px + size * 0.6, py + i * size * 0.12);
      renderCtx.stroke();
    }
    renderCtx.strokeStyle = '#b48c1f';
    renderCtx.lineWidth = 2;
    renderCtx.fillStyle = '#ffe58f';
    renderCtx.beginPath();
    renderCtx.ellipse(px - size * 0.25, py - size * 0.1, size * 0.5, size * 0.25, piece.rotation, 0, Math.PI * 2);
    renderCtx.fill();
    renderCtx.fillStyle = '#f6d04d';
  });
  renderCtx.restore();
}

function drawWhippedCreamTo(renderCtx, x, y, r) {
  if (!renderCtx) return;
  renderCtx.save();
  const topY = y - r * 0.35;
  renderCtx.fillStyle = '#fff7ec';
  renderCtx.beginPath();
  renderCtx.ellipse(x, topY, r * 0.36, r * 0.22, 0, 0, Math.PI * 2);
  renderCtx.ellipse(x - r * 0.2, topY + r * 0.07, r * 0.24, r * 0.16, 0, 0, Math.PI * 2);
  renderCtx.ellipse(x + r * 0.2, topY + r * 0.07, r * 0.24, r * 0.16, 0, 0, Math.PI * 2);
  renderCtx.fill();
  renderCtx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  renderCtx.lineWidth = 2;
  renderCtx.stroke();
  renderCtx.restore();
}

function drawWhippedCream(x, y, r) {
  drawWhippedCreamTo(ctx, x, y, r);
}

function drawNameLabel(name, x, y, r) {
  ctx.save();
  ctx.fillStyle = '#5a3d24';
  ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(name, x, y - r * 0.9);
  ctx.restore();
}

function drawSyrupShot(shot) {
  ctx.save();
  ctx.translate(shot.x - camera.x, shot.y - camera.y);
  const fill = shot.ownerType === 'ai' ? '#d1782b' : '#a6541a';
  const stroke = shot.ownerType === 'ai' ? '#f7b05d' : '#f5a34e';
  ctx.beginPath();
  ctx.ellipse(0, 0, 30, 18, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = stroke;
  ctx.stroke();
  ctx.restore();
}

function drawSyrupSplat(splat) {
  ctx.save();
  ctx.translate(splat.x - camera.x, splat.y - camera.y);
  const fill = splat.ownerType === 'ai' ? '#d1782b' : '#a6541a';
  const stroke = splat.ownerType === 'ai' ? '#f7b05d' : '#f5a34e';
  ctx.beginPath();
  ctx.ellipse(0, 0, splat.rx, splat.ry, splat.rotation, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = stroke;
  ctx.stroke();
  ctx.restore();
}

function hash2(x, y) {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

function drawBottle(x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.fillStyle = '#f3c27a';
  roundRect(ctx, -6, -14, 12, 22, 3);
  ctx.fill();

  ctx.fillStyle = '#b36b2c';
  roundRect(ctx, -4, -18, 8, 5, 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(0, -4, 3.4, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawBackground() {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const tile = 160;
  const startX = Math.floor(camera.x / tile) * tile;
  const startY = Math.floor(camera.y / tile) * tile;
  const endX = camera.x + canvas.width + tile;
  const endY = camera.y + canvas.height + tile;

  for (let x = startX; x <= endX; x += tile) {
    for (let y = startY; y <= endY; y += tile) {
      const jitterX = (hash2(x, y) - 0.5) * 30;
      const jitterY = (hash2(y, x) - 0.5) * 30;
      const screenX = x - camera.x + tile * 0.35 + jitterX;
      const screenY = y - camera.y + tile * 0.35 + jitterY;
      const scale = 0.9 + hash2(x + 12, y + 7) * 0.4;
      drawBottle(screenX, screenY, scale);
    }
  }
}

function drawGameOver() {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px system-ui, -apple-system, Segoe UI, Roboto, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Syruped!', canvas.width / 2, canvas.height / 2 - 10);
  ctx.font = '20px system-ui, -apple-system, Segoe UI, Roboto, Arial';
  ctx.fillText('Tap Restart to restart', canvas.width / 2, canvas.height / 2 + 28);
  ctx.font = '16px system-ui, -apple-system, Segoe UI, Roboto, Arial';
  ctx.fillText('Thanks for playing', canvas.width / 2, canvas.height / 2 + 52);
  ctx.restore();
}

function drawHud() {
  ctx.save();
  const text = `Points: ${pancake.points}`;
  const fontSize = 16;
  ctx.font = `${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  const paddingX = 8;
  const paddingY = 6;
  const x = canvas.width - 12;
  const y = canvas.height - 12;
  const textWidth = ctx.measureText(text).width;
  const boxWidth = textWidth + paddingX * 2;
  const boxHeight = fontSize + paddingY * 2;
  const boxX = x - boxWidth;
  const boxY = y - boxHeight;
  ctx.fillStyle = 'rgba(255, 245, 231, 0.92)';
  roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 8);
  ctx.fill();
  ctx.fillStyle = '#2b2b2b';
  ctx.fillText(text, x - paddingX, y - paddingY);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function clampToCanvas(obj) {
  obj.x = Math.max(obj.radius, Math.min(world.width - obj.radius, obj.x));
  obj.y = Math.max(obj.radius, Math.min(world.height - obj.radius, obj.y));
}

function bounceIfOut(ai) {
  const minX = ai.radius;
  const maxX = world.width - ai.radius;
  const minY = ai.radius;
  const maxY = world.height - ai.radius;

  if (ai.x <= minX || ai.x >= maxX) {
    ai.wanderAngle = Math.PI - ai.wanderAngle;
  }
  if (ai.y <= minY || ai.y >= maxY) {
    ai.wanderAngle = -ai.wanderAngle;
  }
  clampToCanvas(ai);
}

function resolvePlayerCollisions() {
  aiPancakes.forEach((ai) => {
    if (!ai.alive) return;
    const dx = pancake.x - ai.x;
    const dy = pancake.y - ai.y;
    const dist = Math.hypot(dx, dy);
    const minDist = pancake.radius + ai.radius * 0.9;
    if (dist > 0 && dist < minDist) {
      const push = (minDist - dist);
      if (pancake.points > ai.points) {
        ai.x -= (dx / dist) * push;
        ai.y -= (dy / dist) * push;
      } else if (ai.points > pancake.points) {
        const vlen = Math.hypot(ai.vx, ai.vy);
        if (vlen > 0) {
          pancake.x += (ai.vx / vlen) * push;
          pancake.y += (ai.vy / vlen) * push;
        } else {
          pancake.x += (dx / dist) * push;
          pancake.y += (dy / dist) * push;
        }
      }
    } else if (dist === 0) {
      pancake.x += minDist;
    }
  });
  clampToCanvas(pancake);
}

let last = performance.now();
let lastLeaderboardUpdate = 0;
function loop(now) {
  const dt = ((now - last) / 1000) * 0.75;
  last = now;

  // update size-based radius if resized
  const basePlayerRadius = Math.min(80, Math.min(canvas.width, canvas.height) * 0.12);
  const maxPlayerRadius = Math.min(canvas.width, canvas.height) * MAX_PLAYER_RADIUS_SCALE;
  pancake.radius = Math.min(maxPlayerRadius, basePlayerRadius * (pancake.points / POINTS_PER_SIZE));
  const baseAiRadius = Math.min(60, Math.min(canvas.width, canvas.height) * 0.09);
  aiPancakes.forEach((ai) => {
    ai.radius = Math.max(0, baseAiRadius * (ai.points / POINTS_PER_SIZE));
  });
  if (pancake.points > highScore) {
    highScore = pancake.points;
    window.localStorage.setItem('pancakeHighScore', String(highScore));
    updateHud();
  }
  if (now - lastLeaderboardUpdate > 200) {
    updateLeaderboard();
    lastLeaderboardUpdate = now;
  }

  const isPaused = gameOver || !gameStarted || multiplayer.active;

  // movement
  if (!isPaused) {
    let dx = 0, dy = 0;
    if (!drag.active) {
      if (keys['ArrowLeft']) dx -= 1;
      if (keys['ArrowRight']) dx += 1;
      if (keys['ArrowUp']) dy -= 1;
      if (keys['ArrowDown']) dy += 1;
    }
    const len = Math.hypot(dx, dy) || 1;
    pancake.x += (dx / len) * pancake.speed * dt;
    pancake.y += (dy / len) * pancake.speed * dt;
  }
  if (!gameOver && gameStarted) {
    updateAimFromKeys();
  }

  if (multiplayer.active && multiplayer.roomId) {
    let moveX = 0;
    let moveY = 0;
    if (multiplayer.moveOverride) {
      const dx = multiplayer.moveOverride.x - pancake.x;
      const dy = multiplayer.moveOverride.y - pancake.y;
      const len = Math.hypot(dx, dy) || 1;
      moveX = dx / len;
      moveY = dy / len;
    } else {
      if (keys['ArrowLeft']) moveX -= 1;
      if (keys['ArrowRight']) moveX += 1;
      if (keys['ArrowUp']) moveY -= 1;
      if (keys['ArrowDown']) moveY += 1;
    }
    const nowMs = now;
    if (nowMs - multiplayer.lastSend > 50) {
      const target = aim.hasTarget ? aim : { x: pancake.x + 1, y: pancake.y };
      sendMultiplayer({
        type: 'input',
        roomId: multiplayer.roomId,
        playerId: multiplayer.playerId,
        moveX,
        moveY,
        aimX: target.x,
        aimY: target.y
      });
      multiplayer.lastSend = nowMs;
    }
  }

  // AI movement
  if (!isPaused) {
    aiPancakes.forEach((ai) => {
      if (!ai.alive) return;
      ai.wanderAngle += (Math.random() - 0.5) * 1.8 * dt;
      const dirX = Math.cos(ai.wanderAngle);
      const dirY = Math.sin(ai.wanderAngle);
      ai.vx = dirX * ai.speed;
      ai.vy = dirY * ai.speed;
      ai.x += ai.vx * dt;
      ai.y += ai.vy * dt;
      bounceIfOut(ai);

      const playerIsBigger = pancake.points > ai.points;
      const aiIsBigger = ai.points > pancake.points;
      const hitDist = pancake.radius + ai.radius * 0.6;
      if (aiIsBigger && Math.hypot(ai.x - pancake.x, ai.y - pancake.y) <= hitDist) {
        setDebugStatus('Collided with bigger AI');
      }

      ai.shootTimer -= dt;
      if (ai.shootTimer <= 0 && ai.points > MIN_POINTS) {
        let bestTarget = null;
        let bestDist = Infinity;
        aiPancakes.forEach((other) => {
          if (!other.alive || other.id === ai.id) return;
          const d = Math.hypot(other.x - ai.x, other.y - ai.y);
          if (d < bestDist) {
            bestDist = d;
            bestTarget = other;
          }
        });
        const distToPlayer = Math.hypot(pancake.x - ai.x, pancake.y - ai.y);
        if (pancake.points >= 15 && playerIsBigger && distToPlayer <= bestDist) {
          bestTarget = pancake;
          bestDist = distToPlayer;
        }
        const target = bestTarget
          ? { x: bestTarget.x, y: bestTarget.y }
          : { x: ai.x + Math.cos(ai.wanderAngle) * 200, y: ai.y + Math.sin(ai.wanderAngle) * 200 };
        shootSyrupFrom(ai, target, 'ai', ai.id);
        ai.points = Math.max(MIN_POINTS, ai.points - SHRINK_PER_SHOT);
        ai.shootTimer = 0.8 + Math.random() * 1.4;
      }
    });
  }

  if (!isPaused) {
    let aliveCount = 0;
    for (let i = 0; i < aiPancakes.length; i++) {
      if (aiPancakes[i].alive) aliveCount++;
    }
    while (aliveCount < TARGET_AI_COUNT) {
      aiPancakes.push(spawnAi());
      aliveCount++;
    }
  }

  if (!isPaused) {
    const allSmall = aiPancakes.every((ai) => ai.alive && ai.points < 5);
    if (allSmall) {
      aiPancakes.forEach((ai) => {
        if (!ai.alive) return;
        ai.points = 10 + Math.floor(Math.random() * 16);
      });
    }
  }

  if (!isPaused) {
    for (let i = 0; i < aiPancakes.length; i++) {
      const ai = aiPancakes[i];
      if (!ai.alive) continue;
      for (let j = i + 1; j < aiPancakes.length; j++) {
        const other = aiPancakes[j];
        if (!other.alive) continue;
        const hitDist = (ai.radius + other.radius) * 0.7;
        if (Math.hypot(ai.x - other.x, ai.y - other.y) <= hitDist) {
          ai.alive = false;
          other.alive = false;
          scheduleSplat({
            x: ai.x,
            y: ai.y,
            rx: ai.radius * 1.25,
            ry: ai.radius * 0.6,
            rotation: Math.random() * Math.PI,
            ownerType: 'ai',
            pickupRadius: ai.radius * 1.2,
            pointsValue: Math.max(MIN_POINTS, ai.points)
          });
          scheduleSplat({
            x: other.x,
            y: other.y,
            rx: other.radius * 1.25,
            ry: other.radius * 0.6,
            rotation: Math.random() * Math.PI,
            ownerType: 'ai',
            pickupRadius: other.radius * 1.2,
            pointsValue: Math.max(MIN_POINTS, other.points)
          });
        }
      }
    }
  }

  // clamp to canvas
  if (!isPaused) {
    clampToCanvas(pancake);
    resolvePlayerCollisions();
  }

  // syrup shots
  if (!isPaused) {
    for (let i = syrupShots.length - 1; i >= 0; i--) {
      const shot = syrupShots[i];
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      shot.life -= dt;
      if (!gameOver && shot.ownerType === 'ai') {
        const hitDist = Math.max(18, pancake.radius * 0.7);
        if (pancake.points >= 25 && Math.hypot(shot.x - pancake.x, shot.y - pancake.y) <= hitDist) {
          if (pancake.points < 250) {
            setDebugStatus('Hit by syrup (under 250)');
            setGameOver();
          } else {
            pancake.points = MIN_POINTS;
            setDebugStatus('Hit by syrup');
          }
          syrupSplats.push({
            x: shot.x,
            y: shot.y,
            rx: pancake.radius * 1.25,
            ry: pancake.radius * 0.6,
            rotation: Math.random() * Math.PI,
            ownerType: 'ai',
            pickupRadius: 26,
            pointsValue: 0
          });
          shot.splashed = true;
          shot.life = 0;
        }
      }
      if (shot.ownerType !== 'ai') {
        for (let a = 0; a < aiPancakes.length; a++) {
          const ai = aiPancakes[a];
          if (!ai.alive) continue;
          const hitDist = ai.radius * 1.4;
          if (Math.hypot(shot.x - ai.x, shot.y - ai.y) <= hitDist) {
            ai.alive = false;
            scheduleSplat({
              x: ai.x,
              y: ai.y,
              rx: ai.radius * 1.25,
              ry: ai.radius * 0.6,
              rotation: Math.random() * Math.PI,
              ownerType: 'player',
              pickupRadius: ai.radius * 1.2,
              pointsValue: Math.max(MIN_POINTS, ai.points)
            });
            shot.splashed = true;
            shot.life = 0;
            break;
          }
        }
      } else {
        for (let a = 0; a < aiPancakes.length; a++) {
          const ai = aiPancakes[a];
          if (!ai.alive || ai.id === shot.ownerId) continue;
          const hitDist = ai.radius * 1.4;
          if (Math.hypot(shot.x - ai.x, shot.y - ai.y) <= hitDist) {
            ai.alive = false;
            scheduleSplat({
              x: ai.x,
              y: ai.y,
              rx: ai.radius * 1.25,
              ry: ai.radius * 0.6,
              rotation: Math.random() * Math.PI,
              ownerType: 'ai',
              pickupRadius: ai.radius * 1.2,
              pointsValue: Math.max(MIN_POINTS, ai.points)
            });
            shot.splashed = true;
            shot.life = 0;
            break;
          }
        }
      }
      if (
        shot.life <= 0 ||
        shot.x < 0 ||
        shot.y < 0 ||
        shot.x > world.width ||
        shot.y > world.height
      ) {
        if (!shot.splashed) {
          syrupSplats.push({
            x: Math.max(0, Math.min(world.width, shot.x)),
            y: Math.max(0, Math.min(world.height, shot.y)),
            rx: 30,
            ry: 18,
            rotation: Math.random() * Math.PI,
            ownerType: shot.ownerType,
            pickupRadius: 26,
            pointsValue: shot.ownerType === 'ai'
              ? Math.max(MIN_POINTS, Math.floor((shot.ownerPoints || MIN_POINTS) * 0.25))
              : GROW_PER_SPLAT
          });
        }
        syrupShots.splice(i, 1);
      }
    }
  }

  // pending splats
  if (!isPaused) {
    for (let i = pendingSplats.length - 1; i >= 0; i--) {
      const pending = pendingSplats[i];
      pending.delay -= dt;
      if (pending.delay <= 0) {
        syrupSplats.push(pending.splat);
        pendingSplats.splice(i, 1);
      }
    }
  }

  // syrup pickup (grow when stepping on splats)
  for (let i = syrupSplats.length - 1; i >= 0; i--) {
    const splat = syrupSplats[i];
    const hitDist = Math.max(pancake.radius * 0.9, splat.pickupRadius || 0);
    if (Math.hypot(splat.x - pancake.x, splat.y - pancake.y) <= hitDist) {
      const value = typeof splat.pointsValue === 'number' ? splat.pointsValue : GROW_PER_SPLAT;
      const gained = Math.floor(value * 0.5);
      pancake.points += gained;
      syrupSplats.splice(i, 1);
      continue;
    }
    for (let a = 0; a < aiPancakes.length; a++) {
      const ai = aiPancakes[a];
      if (!ai.alive) continue;
      const aiHitDist = Math.max(ai.radius * 0.9, splat.pickupRadius || 0);
      if (Math.hypot(splat.x - ai.x, splat.y - ai.y) <= aiHitDist) {
        const value = typeof splat.pointsValue === 'number' ? splat.pointsValue : GROW_PER_SPLAT;
        ai.points += value;
        syrupSplats.splice(i, 1);
        break;
      }
    }
  }

  // camera follows player inside world bounds
  const targetX = Math.max(0, Math.min(world.width - canvas.width, pancake.x - canvas.width / 2));
  const targetY = Math.max(0, Math.min(world.height - canvas.height, pancake.y - canvas.height / 2));
  camera.x += (targetX - camera.x) * camera.followStrength;
  camera.y += (targetY - camera.y) * camera.followStrength;

  // draw
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  ctx.save();
  const zoomOffsetX = (canvas.width * (1 - CAMERA_ZOOM)) / 2;
  const zoomOffsetY = (canvas.height * (1 - CAMERA_ZOOM)) / 2;
  ctx.translate(zoomOffsetX, zoomOffsetY);
  ctx.scale(CAMERA_ZOOM, CAMERA_ZOOM);
  drawBackground();
  if (multiplayer.active && multiplayer.state) {
    const mp = multiplayer.state;
    const basePlayerRadius = Math.min(80, Math.min(canvas.width, canvas.height) * 0.12);
    const baseAiRadius = Math.min(60, Math.min(canvas.width, canvas.height) * 0.09);
    (mp.splats || []).forEach(drawSyrupSplat);
    (mp.ai || []).forEach((ai) => {
      const drawX = ai.x - camera.x;
      const drawY = ai.y - camera.y;
      const drawR = Math.max(8, (baseAiRadius * (ai.points / POINTS_PER_SIZE)) * RENDER_SCALE);
      if (drawR > 0) {
        drawPancake(drawX, drawY, drawR);
        drawNameLabel(ai.name, drawX, drawY, drawR);
      }
    });
    (mp.shots || []).forEach(drawSyrupShot);
    (mp.players || []).forEach((player) => {
      if (!player.alive) return;
      const drawX = player.x - camera.x;
      const drawY = player.y - camera.y;
      const drawR = Math.max(10, (basePlayerRadius * (player.points / POINTS_PER_SIZE)) * RENDER_SCALE);
      drawPancake(drawX, drawY, drawR, player.id === multiplayer.playerId ? pancake.toppings : null, player.id === multiplayer.playerId ? pancake.toppingPatterns : null);
      drawNameLabel(player.name, drawX, drawY, drawR);
    });
  } else {
    syrupSplats.forEach(drawSyrupSplat);
    aiPancakes.forEach((ai) => {
      if (!ai.alive) return;
      const drawX = ai.x - camera.x;
      const drawY = ai.y - camera.y;
      const drawR = Math.max(8, ai.radius * RENDER_SCALE);
      if (drawR > 0) {
        drawPancake(drawX, drawY, drawR, ai.toppings, ai.toppingPatterns);
        drawNameLabel(ai.name, drawX, drawY, drawR);
      }
    });
    syrupShots.forEach(drawSyrupShot);
    const playerDrawX = pancake.x - camera.x;
    const playerDrawY = pancake.y - camera.y;
    const playerDrawR = Math.max(10, pancake.radius * RENDER_SCALE);
    if (!gameOver && gameStarted) {
      drawPancake(playerDrawX, playerDrawY, playerDrawR, pancake.toppings, pancake.toppingPatterns);
      drawNameLabel(pancake.name, playerDrawX, playerDrawY, playerDrawR);
    }
  }
  ctx.restore();

  drawHud();
  if (gameOver) {
    drawGameOver();
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
