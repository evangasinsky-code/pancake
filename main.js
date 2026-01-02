const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.style.touchAction = 'none';

const music = new Audio('assets/song.m4a');
music.loop = true;
music.volume = 0.6;
let musicStarted = false;
function startMusic() {
  if (musicStarted) return;
  musicStarted = true;
  music.play().catch(() => {
    musicStarted = false;
  });
}

const restartOverlay = document.getElementById('restartOverlay');
const restartButton = document.getElementById('restart');
if (restartButton) {
  restartButton.addEventListener('click', () => {
    window.location.reload();
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
const MIN_POINTS = 1;
const POINTS_PER_SIZE = 10;
const SHRINK_PER_SHOT = 1;
const GROW_PER_SPLAT = 1;
const RENDER_SCALE = 0.75;

function resize() {
  // match CSS sizing but set actual pixel size for crisp canvas
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(300, Math.floor(rect.width));
  canvas.height = Math.max(200, Math.floor(rect.height));
  world.width = canvas.width * 3;
  world.height = canvas.height * 3;
}
window.addEventListener('resize', resize);
resize();

const savedName = window.localStorage.getItem('pancakeNickname');
let nickname = savedName;
if (!nickname) {
  const inputName = window.prompt('Enter a nickname (2-16 chars):');
  nickname = sanitizeName(inputName);
  window.localStorage.setItem('pancakeNickname', nickname);
}

const pancake = {
  x: (canvas.width * 3) / 2,
  y: (canvas.height * 3) / 2,
  radius: Math.min(80, Math.min(canvas.width, canvas.height) * 0.12),
  speed: 300, // pixels per second
  points: START_POINTS,
  name: nickname
};

const TARGET_AI_COUNT = 35;
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
  if (trimmed.length < 2 || trimmed.length > 16) return 'No Name';
  if (!/^[a-z0-9 _-]+$/i.test(trimmed)) return 'No Name';
  const banned = ['badword1', 'badword2', 'badword3'];
  const lower = trimmed.toLowerCase();
  if (banned.some((w) => lower.includes(w))) return 'No Name';
  return trimmed;
}

function spawnAi() {
  const r = Math.min(60, Math.min(canvas.width, canvas.height) * 0.09);
  const points = 6 + Math.floor(Math.random() * 10);
  return {
    id: nextAiId++,
    name: randomAiName(),
    x: (canvas.width * 3) * (0.2 + 0.6 * Math.random()),
    y: (canvas.height * 3) * (0.2 + 0.6 * Math.random()),
    radius: r,
    points,
    speed: 300,
    wanderAngle: Math.random() * Math.PI * 2,
    shootTimer: Math.random() * 1.5,
    alive: true
  };
}

const aiPancakes = Array.from({ length: TARGET_AI_COUNT }, () => spawnAi());

const keys = {};
window.addEventListener('keydown', (e) => {
  startMusic();
  const k = (e.key && e.key.length === 1) ? e.key.toLowerCase() : e.key;
  if (k === 'n' && !e.repeat) {
    const inputName = window.prompt('Enter a new nickname (2-16 chars):', nickname);
    if (inputName != null) {
      nickname = sanitizeName(inputName);
      window.localStorage.setItem('pancakeNickname', nickname);
      pancake.name = nickname;
    }
  }
  if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault();
  if (e.key === ' ' && !e.repeat) {
    const target = aim.hasTarget ? aim : { x: pancake.x + 1, y: pancake.y };
    shootSyrup(target);
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

const syrupShots = [];
const syrupSplats = [];
let gameOver = false;
const aim = {
  x: 0,
  y: 0,
  hasTarget: false
};

function setGameOver() {
  if (gameOver) return;
  gameOver = true;
  if (restartOverlay) {
    restartOverlay.style.display = 'flex';
    restartOverlay.setAttribute('aria-hidden', 'false');
  }
}

function pointerToCanvas(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

function screenToWorld(p) {
  return {
    x: p.x + camera.x,
    y: p.y + camera.y
  };
}

function shootSyrup(target) {
  if (pancake.points <= MIN_POINTS) return;
  shootSyrupFrom(pancake, target, 'player', -1);
  pancake.points = Math.max(MIN_POINTS, pancake.points - SHRINK_PER_SHOT);
}

function shootSyrupFrom(source, target, ownerType, ownerId) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const len = Math.hypot(dx, dy) || 1;
  const speed = 520;
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

canvas.addEventListener('pointerdown', (e) => {
  startMusic();
  const p = screenToWorld(pointerToCanvas(e));
  const distance = Math.hypot(p.x - pancake.x, p.y - pancake.y);
  if (distance <= pancake.radius * 1.15) {
    drag.active = true;
    drag.offsetX = pancake.x - p.x;
    drag.offsetY = pancake.y - p.y;
    canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
  }
});

canvas.addEventListener('pointermove', (e) => {
  if (!drag.active) return;
  const p = screenToWorld(pointerToCanvas(e));
  pancake.x = p.x + drag.offsetX;
  pancake.y = p.y + drag.offsetY;
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
  if (e && e.pointerId != null) {
    canvas.releasePointerCapture(e.pointerId);
  }
}

canvas.addEventListener('pointerup', stopDrag);
canvas.addEventListener('pointercancel', stopDrag);

function drawPancake(x, y, r) {
  ctx.save();
  // shadow
  ctx.beginPath();
  ctx.ellipse(x + 6, y + 10, r * 1.25, r * 0.6, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fill();

  // pancake stack (three slightly different fills for depth)
  const colors = ['#d89f5a', '#e3b36b', '#c17f3d'];
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(x, y + i * 3, r - i * 6, r * 0.6 - i * 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = colors[i] || colors[0];
    ctx.fill();
  }

  // syrup drizzle
  ctx.beginPath();
  ctx.moveTo(x - r * 0.5, y - r * 0.1);
  ctx.bezierCurveTo(x - r * 0.1, y - r * 0.5, x + r * 0.2, y + r * 0.4, x + r * 0.6, y + r * 0.2);
  ctx.lineWidth = Math.max(6, r * 0.08);
  ctx.strokeStyle = '#8b4b1b';
  ctx.lineCap = 'round';
  ctx.stroke();

  // butter pat
  ctx.fillStyle = '#ffd94d';
  const bw = r * 0.22;
  const bh = r * 0.11;
  ctx.translate(x - bw / 2, y - bh / 2);
  roundRect(ctx, 0, 0, bw, bh, 4);
  ctx.fill();

  ctx.restore();
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
  ctx.fillStyle = shot.ownerType === 'ai' ? '#a05b22' : '#8b4b1b';
  ctx.beginPath();
  ctx.ellipse(0, 0, 25, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSyrupSplat(splat) {
  ctx.save();
  ctx.translate(splat.x - camera.x, splat.y - camera.y);
  ctx.fillStyle = splat.ownerType === 'ai' ? '#a05b22' : '#8b4b1b';
  ctx.beginPath();
  ctx.ellipse(0, 0, splat.rx, splat.ry, splat.rotation, 0, Math.PI * 2);
  ctx.fill();
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
  ctx.fillText('Hit Restart to try again', canvas.width / 2, canvas.height / 2 + 28);
  ctx.restore();
}

function drawHud() {
  ctx.save();
  ctx.fillStyle = '#2b2b2b';
  ctx.font = '16px system-ui, -apple-system, Segoe UI, Roboto, Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`Points: ${pancake.points}`, 12, 12);
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
      pancake.x += (dx / dist) * push;
      pancake.y += (dy / dist) * push;
    } else if (dist === 0) {
      pancake.x += minDist;
    }
  });
  clampToCanvas(pancake);
}

let last = performance.now();
function loop(now) {
  const dt = (now - last) / 1000;
  last = now;

  // update size-based radius if resized
  const basePlayerRadius = Math.min(80, Math.min(canvas.width, canvas.height) * 0.12);
  pancake.radius = basePlayerRadius * (pancake.points / POINTS_PER_SIZE);
  const baseAiRadius = Math.min(60, Math.min(canvas.width, canvas.height) * 0.09);
  aiPancakes.forEach((ai) => {
    ai.radius = baseAiRadius * (ai.points / POINTS_PER_SIZE);
  });

  // movement
  if (!gameOver) {
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

  // AI movement
  if (!gameOver) {
    aiPancakes.forEach((ai) => {
      if (!ai.alive) return;
      ai.wanderAngle += (Math.random() - 0.5) * 1.8 * dt;
      const dirX = Math.cos(ai.wanderAngle);
      const dirY = Math.sin(ai.wanderAngle);
      ai.x += dirX * ai.speed * dt;
      ai.y += dirY * ai.speed * dt;
      bounceIfOut(ai);

      const playerIsBigger = pancake.points > ai.points;
      const hitDist = pancake.radius + ai.radius * 0.6;
      if (pancake.points >= 17 && playerIsBigger && Math.hypot(ai.x - pancake.x, ai.y - pancake.y) <= hitDist) {
        setGameOver();
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

  if (!gameOver) {
    let aliveCount = 0;
    for (let i = 0; i < aiPancakes.length; i++) {
      if (aiPancakes[i].alive) aliveCount++;
    }
    while (aliveCount < TARGET_AI_COUNT) {
      aiPancakes.push(spawnAi());
      aliveCount++;
    }
  }

  if (!gameOver) {
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
        }
      }
    }
  }

  // clamp to canvas
  clampToCanvas(pancake);
  resolvePlayerCollisions();

  // syrup shots
  for (let i = syrupShots.length - 1; i >= 0; i--) {
    const shot = syrupShots[i];
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.life -= dt;
    if (!gameOver && shot.ownerType === 'ai') {
      const hitDist = pancake.radius * 1.4;
      if (pancake.points >= 17 && Math.hypot(shot.x - pancake.x, shot.y - pancake.y) <= hitDist) {
        setGameOver();
      }
    }
    if (shot.ownerType !== 'ai') {
      for (let a = 0; a < aiPancakes.length; a++) {
        const ai = aiPancakes[a];
        if (!ai.alive) continue;
        const hitDist = ai.radius * 1.4;
        if (Math.hypot(shot.x - ai.x, shot.y - ai.y) <= hitDist) {
          ai.alive = false;
          syrupSplats.push({
            x: ai.x,
            y: ai.y,
            rx: ai.radius * 1.1,
            ry: ai.radius * 0.7,
            rotation: Math.random() * Math.PI,
            ownerType: 'player',
            pickupRadius: ai.radius * 1.2,
            pointsValue: Math.max(MIN_POINTS, Math.floor(ai.points * 0.25))
          });
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
          syrupSplats.push({
            x: ai.x,
            y: ai.y,
            rx: ai.radius * 1.1,
            ry: ai.radius * 0.7,
            rotation: Math.random() * Math.PI,
            ownerType: 'ai',
            pickupRadius: ai.radius * 1.2,
            pointsValue: Math.max(MIN_POINTS, Math.floor(ai.points * 0.25))
          });
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
      syrupShots.splice(i, 1);
    }
  }

  // syrup pickup (grow when stepping on splats)
  for (let i = syrupSplats.length - 1; i >= 0; i--) {
    const splat = syrupSplats[i];
    const hitDist = Math.max(pancake.radius * 0.9, splat.pickupRadius || 0);
    if (Math.hypot(splat.x - pancake.x, splat.y - pancake.y) <= hitDist) {
      const value = typeof splat.pointsValue === 'number' ? splat.pointsValue : GROW_PER_SPLAT;
      pancake.points += value;
      syrupSplats.splice(i, 1);
      continue;
    }
    for (let a = 0; a < aiPancakes.length; a++) {
      const ai = aiPancakes[a];
      if (!ai.alive) continue;
      const aiHitDist = ai.radius * 0.9;
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
  drawBackground();
  syrupSplats.forEach(drawSyrupSplat);
  aiPancakes.forEach((ai) => {
    if (!ai.alive) return;
    const drawX = ai.x - camera.x;
    const drawY = ai.y - camera.y;
    const drawR = ai.radius * RENDER_SCALE;
    drawPancake(drawX, drawY, drawR);
    drawNameLabel(ai.name, drawX, drawY, drawR);
  });
  syrupShots.forEach(drawSyrupShot);
  const playerDrawX = pancake.x - camera.x;
  const playerDrawY = pancake.y - camera.y;
  const playerDrawR = pancake.radius * RENDER_SCALE;
  drawPancake(playerDrawX, playerDrawY, playerDrawR);
  drawNameLabel(pancake.name, playerDrawX, playerDrawY, playerDrawR);
  drawHud();
  if (gameOver) {
    drawGameOver();
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
