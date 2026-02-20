const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const SHAPES = {
  I: [[1, 1, 1, 1]],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
  ],
};

const COLORS = {
  I: '#38bdf8',
  O: '#facc15',
  T: '#c084fc',
  S: '#4ade80',
  Z: '#f87171',
  J: '#60a5fa',
  L: '#fb923c',
};

const boardCanvas = document.getElementById('board');
const nextCanvas = document.getElementById('next');
const boardCtx = boardCanvas.getContext('2d');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const linesEl = document.getElementById('lines');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');

let board = [];
let current = null;
let next = null;
let score = 0;
let lines = 0;
let level = 1;
let dropCounter = 0;
let dropInterval = 800;
let lastTime = 0;
let running = false;
let paused = false;
let animationFrame = null;

function createEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function randomType() {
  const types = Object.keys(SHAPES);
  return types[Math.floor(Math.random() * types.length)];
}

function cloneMatrix(matrix) {
  return matrix.map((row) => [...row]);
}

function createPiece(type = randomType()) {
  const matrix = cloneMatrix(SHAPES[type]);
  return {
    type,
    matrix,
    x: Math.floor((COLS - matrix[0].length) / 2),
    y: 0,
  };
}

function rotate(matrix) {
  const h = matrix.length;
  const w = matrix[0].length;
  const rotated = Array.from({ length: w }, () => Array(h).fill(0));
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      rotated[x][h - 1 - y] = matrix[y][x];
    }
  }
  return rotated;
}

function collide(piece, offsetX = 0, offsetY = 0) {
  return piece.matrix.some((row, y) =>
    row.some((value, x) => {
      if (!value) return false;
      const nx = piece.x + x + offsetX;
      const ny = piece.y + y + offsetY;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny < 0) return false;
      return Boolean(board[ny][nx]);
    }),
  );
}

function mergePiece(piece) {
  piece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        board[piece.y + y][piece.x + x] = piece.type;
      }
    });
  });
}

function clearLines() {
  let cleared = 0;
  for (let y = ROWS - 1; y >= 0; y -= 1) {
    if (board[y].every(Boolean)) {
      board.splice(y, 1);
      board.unshift(Array(COLS).fill(null));
      cleared += 1;
      y += 1;
    }
  }

  if (cleared > 0) {
    const points = [0, 100, 300, 500, 800];
    score += points[cleared] * level;
    lines += cleared;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(120, 800 - (level - 1) * 60);
    updateStats();
  }
}

function updateStats() {
  scoreEl.textContent = String(score);
  linesEl.textContent = String(lines);
  levelEl.textContent = String(level);
}

function spawnPiece() {
  current = next || createPiece();
  current.x = Math.floor((COLS - current.matrix[0].length) / 2);
  current.y = 0;
  next = createPiece();
  drawNext();

  if (collide(current)) {
    gameOver();
  }
}

function gameOver() {
  running = false;
  cancelAnimationFrame(animationFrame);
  boardCtx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  boardCtx.fillRect(0, 0, boardCanvas.width, boardCanvas.height);
  boardCtx.fillStyle = '#ffffff';
  boardCtx.font = 'bold 32px sans-serif';
  boardCtx.textAlign = 'center';
  boardCtx.fillText('游戏结束', boardCanvas.width / 2, boardCanvas.height / 2);
}

function move(dir) {
  if (!running || paused) return;
  if (!collide(current, dir, 0)) {
    current.x += dir;
  }
}

function softDrop() {
  if (!running || paused) return;
  if (!collide(current, 0, 1)) {
    current.y += 1;
    score += 1;
    updateStats();
  } else {
    lockPiece();
  }
  dropCounter = 0;
}

function hardDrop() {
  if (!running || paused) return;
  while (!collide(current, 0, 1)) {
    current.y += 1;
    score += 2;
  }
  updateStats();
  lockPiece();
  dropCounter = 0;
}

function rotateCurrent() {
  if (!running || paused) return;
  const rotated = rotate(current.matrix);
  const original = current.matrix;
  current.matrix = rotated;

  const kicks = [0, -1, 1, -2, 2];
  const success = kicks.some((dx) => {
    if (!collide(current, dx, 0)) {
      current.x += dx;
      return true;
    }
    return false;
  });

  if (!success) {
    current.matrix = original;
  }
}

function lockPiece() {
  mergePiece(current);
  clearLines();
  spawnPiece();
}

function drawCell(ctx, x, y, color, size) {
  ctx.fillStyle = color;
  ctx.fillRect(x * size, y * size, size, size);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.strokeRect(x * size, y * size, size, size);
}

function drawBoard() {
  boardCtx.clearRect(0, 0, boardCanvas.width, boardCanvas.height);

  board.forEach((row, y) => {
    row.forEach((type, x) => {
      if (type) {
        drawCell(boardCtx, x, y, COLORS[type], BLOCK);
      }
    });
  });

  if (current) {
    current.matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          drawCell(boardCtx, current.x + x, current.y + y, COLORS[current.type], BLOCK);
        }
      });
    });
  }
}

function drawNext() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  if (!next) return;

  const size = 24;
  const w = next.matrix[0].length;
  const h = next.matrix.length;
  const offsetX = Math.floor((nextCanvas.width - w * size) / 2 / size);
  const offsetY = Math.floor((nextCanvas.height - h * size) / 2 / size);

  next.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        drawCell(nextCtx, offsetX + x, offsetY + y, COLORS[next.type], size);
      }
    });
  });
}

function update(time = 0) {
  if (!running) return;

  const delta = time - lastTime;
  lastTime = time;

  if (!paused) {
    dropCounter += delta;
    if (dropCounter > dropInterval) {
      if (!collide(current, 0, 1)) {
        current.y += 1;
      } else {
        lockPiece();
      }
      dropCounter = 0;
    }

    drawBoard();
  }

  animationFrame = requestAnimationFrame(update);
}

function togglePause() {
  if (!running) return;
  paused = !paused;
  pauseBtn.textContent = paused ? '继续' : '暂停';
  if (!paused) {
    lastTime = performance.now();
  }
}

function startGame() {
  board = createEmptyBoard();
  score = 0;
  lines = 0;
  level = 1;
  dropInterval = 800;
  dropCounter = 0;
  paused = false;
  running = true;
  pauseBtn.textContent = '暂停';
  updateStats();

  next = createPiece();
  spawnPiece();

  cancelAnimationFrame(animationFrame);
  lastTime = performance.now();
  animationFrame = requestAnimationFrame(update);
}

document.addEventListener('keydown', (e) => {
  switch (e.code) {
    case 'ArrowLeft':
      move(-1);
      break;
    case 'ArrowRight':
      move(1);
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
      rotateCurrent();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
    case 'KeyP':
      togglePause();
      break;
    default:
      break;
  }
});

startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', togglePause);

startGame();
