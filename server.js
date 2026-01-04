const http = require('http');
const WebSocket = require('ws');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const TICK_RATE = 30;
const TICK_DT = 1 / TICK_RATE;
const WORLD_WIDTH = 3600;
const WORLD_HEIGHT = 2400;
const TARGET_AI_COUNT = 10;
const MIN_POINTS = 10;
const PLAYER_SPEED = 450;
const AI_SPEED = 300;
const SHOT_SPEED = 600;
const SHOT_LIFE = 0.7;
const SPLAT_DELAY = 1.5;

const rooms = new Map();

function uid(prefix) {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function spawnAi(room) {
  const points = 10 + Math.floor(Math.random() * 16);
  return {
    id: uid('ai'),
    name: randomAiName(),
    x: WORLD_WIDTH * (0.05 + 0.9 * Math.random()),
    y: WORLD_HEIGHT * (0.05 + 0.9 * Math.random()),
    points,
    speed: AI_SPEED,
    wanderAngle: Math.random() * Math.PI * 2,
    shootTimer: Math.random() * 1.5,
    alive: true
  };
}

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

function createRoom(hostName, roomName) {
  const id = uid('room');
  const room = {
    id,
    name: roomName || `${hostName}'s Room`,
    players: new Map(),
    ai: [],
    shots: [],
    splats: [],
    pendingSplats: [],
    lastActive: Date.now()
  };
  for (let i = 0; i < TARGET_AI_COUNT; i++) {
    room.ai.push(spawnAi(room));
  }
  rooms.set(id, room);
  return room;
}

function createPlayer(name) {
  return {
    id: uid('player'),
    name,
    x: WORLD_WIDTH / 2,
    y: WORLD_HEIGHT / 2,
    points: MIN_POINTS,
    alive: true,
    moveX: 0,
    moveY: 0,
    aimX: WORLD_WIDTH / 2 + 1,
    aimY: WORLD_HEIGHT / 2,
    shootQueued: false
  };
}

function scheduleSplat(room, splat, delay = SPLAT_DELAY) {
  room.pendingSplats.push({ splat, delay });
}

function shootFrom(room, source, targetX, targetY, ownerType, ownerId) {
  const dx = targetX - source.x;
  const dy = targetY - source.y;
  const len = Math.hypot(dx, dy) || 1;
  room.shots.push({
    x: source.x,
    y: source.y,
    vx: (dx / len) * SHOT_SPEED,
    vy: (dy / len) * SHOT_SPEED,
    life: SHOT_LIFE,
    ownerType,
    ownerId,
    ownerPoints: source.points || MIN_POINTS
  });
}

function tickRoom(room) {
  room.lastActive = Date.now();

  // Update AI
  room.ai.forEach((ai) => {
    if (!ai.alive) return;
    ai.wanderAngle += (Math.random() - 0.5) * 1.8 * TICK_DT;
    const dirX = Math.cos(ai.wanderAngle);
    const dirY = Math.sin(ai.wanderAngle);
    ai.x += dirX * ai.speed * TICK_DT;
    ai.y += dirY * ai.speed * TICK_DT;
    ai.x = clamp(ai.x, 20, WORLD_WIDTH - 20);
    ai.y = clamp(ai.y, 20, WORLD_HEIGHT - 20);

    ai.shootTimer -= TICK_DT;
    if (ai.shootTimer <= 0 && ai.points > MIN_POINTS) {
      const players = Array.from(room.players.values()).filter((p) => p.alive);
      const target = players[Math.floor(Math.random() * players.length)];
      const aim = target ? { x: target.x, y: target.y } : {
        x: ai.x + Math.cos(ai.wanderAngle) * 200,
        y: ai.y + Math.sin(ai.wanderAngle) * 200
      };
      shootFrom(room, ai, aim.x, aim.y, 'ai', ai.id);
      ai.points = Math.max(MIN_POINTS, ai.points - 1);
      ai.shootTimer = 0.8 + Math.random() * 1.4;
    }
  });

  // Ensure AI count
  const aliveCount = room.ai.filter((ai) => ai.alive).length;
  for (let i = aliveCount; i < TARGET_AI_COUNT; i++) {
    room.ai.push(spawnAi(room));
  }

  // Update players
  room.players.forEach((player) => {
    if (!player.alive) return;
    player.x += player.moveX * PLAYER_SPEED * TICK_DT;
    player.y += player.moveY * PLAYER_SPEED * TICK_DT;
    player.x = clamp(player.x, 20, WORLD_WIDTH - 20);
    player.y = clamp(player.y, 20, WORLD_HEIGHT - 20);

    if (player.shootQueued && player.points > MIN_POINTS) {
      shootFrom(room, player, player.aimX, player.aimY, 'player', player.id);
      player.points = Math.max(MIN_POINTS, player.points - 1);
    }
    player.shootQueued = false;
  });

  // Update shots
  for (let i = room.shots.length - 1; i >= 0; i--) {
    const shot = room.shots[i];
    shot.x += shot.vx * TICK_DT;
    shot.y += shot.vy * TICK_DT;
    shot.life -= TICK_DT;

    if (shot.ownerType === 'ai') {
      room.players.forEach((player) => {
        if (!player.alive) return;
        const hitDist = 30;
        if (Math.hypot(shot.x - player.x, shot.y - player.y) <= hitDist) {
          if (player.points < 250) {
            player.alive = false;
          } else {
            player.points = MIN_POINTS;
          }
          shot.life = 0;
        }
      });
    } else {
      room.ai.forEach((ai) => {
        if (!ai.alive) return;
        if (Math.hypot(shot.x - ai.x, shot.y - ai.y) <= 40) {
          ai.alive = false;
          scheduleSplat(room, {
            x: ai.x,
            y: ai.y,
            rx: 40,
            ry: 24,
            rotation: Math.random() * Math.PI,
            ownerType: 'player',
            pickupRadius: 40,
            pointsValue: Math.max(MIN_POINTS, ai.points)
          });
          shot.life = 0;
        }
      });
      room.players.forEach((player) => {
        if (!player.alive || player.id === shot.ownerId) return;
        if (Math.hypot(shot.x - player.x, shot.y - player.y) <= 30) {
          if (player.points < 250) {
            player.alive = false;
          } else {
            player.points = MIN_POINTS;
          }
          shot.life = 0;
        }
      });
    }

    if (shot.life <= 0 || shot.x < 0 || shot.y < 0 || shot.x > WORLD_WIDTH || shot.y > WORLD_HEIGHT) {
      room.shots.splice(i, 1);
    }
  }

  // pending splats
  for (let i = room.pendingSplats.length - 1; i >= 0; i--) {
    const pending = room.pendingSplats[i];
    pending.delay -= TICK_DT;
    if (pending.delay <= 0) {
      room.splats.push(pending.splat);
      room.pendingSplats.splice(i, 1);
    }
  }

  // pickup splats
  for (let i = room.splats.length - 1; i >= 0; i--) {
    const splat = room.splats[i];
    let picked = false;
    room.players.forEach((player) => {
      if (!player.alive || picked) return;
      if (Math.hypot(splat.x - player.x, splat.y - player.y) <= (splat.pickupRadius || 30)) {
        const value = typeof splat.pointsValue === 'number' ? splat.pointsValue : 1;
        player.points += Math.floor(value * 0.5);
        picked = true;
      }
    });
    if (!picked) {
      room.ai.forEach((ai) => {
        if (!ai.alive || picked) return;
        if (Math.hypot(splat.x - ai.x, splat.y - ai.y) <= (splat.pickupRadius || 30)) {
          const value = typeof splat.pointsValue === 'number' ? splat.pointsValue : 1;
          ai.points += value;
          picked = true;
        }
      });
    }
    if (picked) {
      room.splats.splice(i, 1);
    }
  }
}

function broadcastRoom(room) {
  const state = {
    type: 'state',
    roomId: room.id,
    world: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
    players: Array.from(room.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      x: p.x,
      y: p.y,
      points: p.points,
      alive: p.alive
    })),
    ai: room.ai.filter((ai) => ai.alive).map((ai) => ({
      id: ai.id,
      name: ai.name,
      x: ai.x,
      y: ai.y,
      points: ai.points
    })),
    shots: room.shots.map((s) => ({
      x: s.x,
      y: s.y,
      ownerType: s.ownerType
    })),
    splats: room.splats.map((s) => ({
      x: s.x,
      y: s.y,
      rx: s.rx,
      ry: s.ry,
      rotation: s.rotation,
      ownerType: s.ownerType
    }))
  };

  const payload = JSON.stringify(state);
  room.players.forEach((player) => {
    if (player.socket && player.socket.readyState === WebSocket.OPEN) {
      player.socket.send(payload);
    }
  });
}

function listRooms() {
  return Array.from(rooms.values()).map((room) => ({
    id: room.id,
    name: room.name,
    count: Array.from(room.players.values()).filter((p) => p.alive).length
  }));
}

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('OK');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }

    if (msg.type === 'list_rooms') {
      ws.send(JSON.stringify({ type: 'rooms', rooms: listRooms() }));
      return;
    }

    if (msg.type === 'host') {
      const room = createRoom(msg.name || 'Player', msg.roomName || 'Room');
      const player = createPlayer(msg.name || 'Player');
      player.socket = ws;
      room.players.set(player.id, player);
      ws.roomId = room.id;
      ws.playerId = player.id;
      ws.send(JSON.stringify({ type: 'joined', roomId: room.id, playerId: player.id }));
      return;
    }

    if (msg.type === 'join') {
      const room = rooms.get(msg.roomId);
      if (!room) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
        return;
      }
      if (room.players.size >= 10) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room full' }));
        return;
      }
      const player = createPlayer(msg.name || 'Player');
      player.socket = ws;
      room.players.set(player.id, player);
      ws.roomId = room.id;
      ws.playerId = player.id;
      ws.send(JSON.stringify({ type: 'joined', roomId: room.id, playerId: player.id }));
      return;
    }

    if (msg.type === 'input') {
      const room = rooms.get(msg.roomId || ws.roomId);
      if (!room) return;
      const player = room.players.get(ws.playerId || msg.playerId);
      if (!player) return;
      if (typeof msg.moveX === 'number' && typeof msg.moveY === 'number') {
        const len = Math.hypot(msg.moveX, msg.moveY) || 1;
        player.moveX = clamp(msg.moveX, -1, 1);
        player.moveY = clamp(msg.moveY, -1, 1);
        if (Math.hypot(player.moveX, player.moveY) > 1) {
          player.moveX /= len;
          player.moveY /= len;
        }
      }
      if (typeof msg.aimX === 'number' && typeof msg.aimY === 'number') {
        player.aimX = clamp(msg.aimX, 0, WORLD_WIDTH);
        player.aimY = clamp(msg.aimY, 0, WORLD_HEIGHT);
      }
      if (msg.shoot) {
        player.shootQueued = true;
      }
      return;
    }

    if (msg.type === 'restart') {
      const room = rooms.get(msg.roomId || ws.roomId);
      if (!room) return;
      const player = room.players.get(ws.playerId || msg.playerId);
      if (!player) return;
      player.alive = true;
      player.points = MIN_POINTS;
      player.x = WORLD_WIDTH / 2;
      player.y = WORLD_HEIGHT / 2;
      return;
    }
  });

  ws.on('close', () => {
    const room = rooms.get(ws.roomId);
    if (!room) return;
    room.players.delete(ws.playerId);
    if (room.players.size === 0) {
      rooms.delete(room.id);
    }
  });
});

setInterval(() => {
  rooms.forEach((room) => {
    tickRoom(room);
    broadcastRoom(room);
  });
}, 1000 / TICK_RATE);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
