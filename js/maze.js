// Logik labirin untuk permainan coding RoboCilik.
// Digunakan oleh enjin permainan (pelayar) dan ujian (Node).
// Keadaan: [x, y, topengBintang]. BFS memberikan bilangan arahan minimum.

export function parseMap(map, opts = {}) {
  const rows = String(map).trim().split('\n').map((r) => r.trim()).filter(Boolean);
  const width = Math.max(...rows.map((r) => r.length));
  const walls = [];
  const stars = [];
  let start = null;
  let goal = null;

  rows.forEach((row, y) => {
    for (let x = 0; x < width; x += 1) {
      const ch = row[x] || '.';
      if (ch === '#') walls.push([x, y]);
      else if (ch === '*') stars.push([x, y]);
      else if (ch === 'S') start = [x, y];
      else if (ch === 'G') goal = [x, y];
    }
  });

  if (!start || !goal) throw new Error('Peta perlu mempunyai S (mula) dan G (destinasi).');

  return {
    cols: width,
    rows: rows.length,
    start,
    goal,
    walls,
    stars,
    maxCmds: opts.maxCmds || 0,
    optimal: !!opts.optimal,
    extra: opts.extra,
  };
}

const keyOf = (x, y, mask) => `${x},${y},${mask}`;

export function walkable(level, x, y) {
  if (x < 0 || y < 0 || x >= level.cols || y >= level.rows) return false;
  return !level.walls.some(([wx, wy]) => wx === x && wy === y);
}

export function starIndex(level, x, y) {
  return level.stars.findIndex(([sx, sy]) => sx === x && sy === y);
}

// BFS: cari bilangan arahan minimum untuk kutip semua bintang dan sampai ke G.
// Mengembalikan { moves, path } atau null jika tiada penyelesaian.
export function solveMaze(level) {
  const totalStars = level.stars.length;
  const allMask = (1 << totalStars) - 1;
  const [sx, sy] = level.start;
  const startMask = totalStars ? 0 : 0;
  const startKey = keyOf(sx, sy, startMask);
  const queue = [{ x: sx, y: sy, mask: startMask, path: [] }];
  const seen = new Set([startKey]);
  const dirs = [
    { dx: 0, dy: -1, name: 'atas' },
    { dx: 1, dy: 0, name: 'kanan' },
    { dx: 0, dy: 1, name: 'bawah' },
    { dx: -1, dy: 0, name: 'kiri' },
  ];

  while (queue.length) {
    const cur = queue.shift();
    const here = level.stars.length
      ? cur.mask
      : 0;
    if (cur.x === level.goal[0] && cur.y === level.goal[1] && here === allMask) {
      return { moves: cur.path.length, path: cur.path };
    }
    for (const d of dirs) {
      const nx = cur.x + d.dx;
      const ny = cur.y + d.dy;
      if (!walkable(level, nx, ny)) continue;
      let mask = cur.mask;
      const idx = starIndex(level, nx, ny);
      if (idx >= 0) mask |= 1 << idx;
      const k = keyOf(nx, ny, mask);
      if (seen.has(k)) continue;
      seen.add(k);
      queue.push({ x: nx, y: ny, mask, path: [...cur.path, d.name] });
    }
  }
  return null;
}

// Jalankan atur cara arahan (atas/kanan/bawah/kiri) dengan simulasi sebenar.
// Mengembalikan jejak langkah demi langkah + status.
export function runProgram(level, commands) {
  let x = level.start[0];
  let y = level.start[1];
  const collected = new Set();
  const trace = [];
  let hitWall = false;
  let outOfSteps = false;

  const idx0 = starIndex(level, x, y);
  if (idx0 >= 0) collected.add(idx0);

  for (let i = 0; i < commands.length; i += 1) {
    const cmd = commands[i];
    const map = { atas: [0, -1], kanan: [1, 0], bawah: [0, 1], kiri: [-1, 0] };
    if (!map[cmd]) {
      trace.push({ i, x, y, cmd, blocked: true, invalid: true });
      hitWall = true;
      continue;
    }
    const [dx, dy] = map[cmd];
    const nx = x + dx;
    const ny = y + dy;
    if (!walkable(level, nx, ny)) {
      hitWall = true;
      trace.push({ i, x, y, cmd, blocked: true });
      continue;
    }
    x = nx;
    y = ny;
    const si = starIndex(level, x, y);
    if (si >= 0) collected.add(si);
    trace.push({ i, x, y, cmd, blocked: false, star: si >= 0 });
  }

  if (commands.length > level.maxCmds) outOfSteps = true;
  const atGoal = x === level.goal[0] && y === level.goal[1];
  const success = atGoal && collected.size === level.stars.length && !hitWall && !outOfSteps;

  return {
    success,
    x,
    y,
    collected: [...collected],
    hitWall,
    outOfSteps,
    atGoal,
    trace,
  };
}
