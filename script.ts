interface Point { x: number; y: number; }

interface PathObj { type: 'path'; points: Point[]; }
interface RectObj { type: 'rect'; x: number; y: number; w: number; h: number; }
interface LineObj { type: 'line'; x1: number; y1: number; x2: number; y2: number; }
interface TextObj {
  type: 'text';
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  align: CanvasTextAlign;
  color: string;
}
type DrawObject = PathObj | RectObj | LineObj | TextObj;

interface State {
  tool: 'draw' | 'rect' | 'line' | 'text' | 'select';
  objects: DrawObject[];
  current: DrawObject | null;
  selected: DrawObject | null;
  handle?: string;
  moveStart?: Point;
  pan: Point;
  startPan?: Point;
  scale: number;
  isPanning: boolean;
}

const canvas = document.getElementById('board') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let state: State = {
  tool: 'draw',
  objects: [],
  current: null,
  selected: null,
  moveStart: undefined,
  pan: { x: 0, y: 0 },
  scale: 1,
  isPanning: false,
};

let space = false;
let saveTimer: number;
let undoStack: DrawObject[][] = [];
let redoStack: DrawObject[][] = [];

let editingText: TextObj | null = null;
let textarea: HTMLTextAreaElement | null = null;
const colorMenu = document.getElementById('text-colors') as HTMLDivElement;
const colorButtons = Array.from(colorMenu.querySelectorAll<HTMLButtonElement>('button'));
let currentTextColor = '#000000';
colorButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    currentTextColor = btn.dataset.color || '#000000';
    colorButtons.forEach(b => b.classList.toggle('active', b === btn));
    if (editingText) {
      editingText.color = currentTextColor;
      if (textarea) textarea.style.color = currentTextColor;
      draw();
      scheduleSave();
    }
  });
});

interface SaveEntry { id: string; title: string; data: DrawObject[]; }
let saves: SaveEntry[] = [];
let currentSaveId: string | null = null;

const saveSelect = document.getElementById('drawing-list') as HTMLSelectElement;
const saveTitle = document.getElementById('drawing-title') as HTMLInputElement;
const saveBtn = document.getElementById('save-drawing') as HTMLButtonElement;

function loadSaves(): void {
  const raw = localStorage.getItem('draw-saves');
  saves = raw ? JSON.parse(raw) as SaveEntry[] : [];
}

function saveSaves(): void {
  localStorage.setItem('draw-saves', JSON.stringify(saves));
}

function populateSaveList(): void {
  if (!saveSelect) return;
  saveSelect.innerHTML = '';
  const optNew = document.createElement('option');
  optNew.value = '';
  optNew.textContent = '(Nuevo dibujo)';
  saveSelect.appendChild(optNew);
  saves.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.title;
    saveSelect.appendChild(opt);
  });
  saveSelect.value = currentSaveId ?? '';
}

function loadFromSave(id: string): void {
  const s = saves.find(v => v.id === id);
  if (!s) return;
  finishTextEdit();
  state.objects = JSON.parse(JSON.stringify(s.data));
  currentSaveId = id;
  localStorage.setItem('current-save', id);
  if (saveTitle) saveTitle.value = s.title;
  undoStack = [];
  redoStack = [];
  state.selected = null;
  state.current = null;
  state.handle = undefined;
  scheduleSave();
  draw();
}

function createNewBoard(): void {
  currentSaveId = null;
  if (saveTitle) saveTitle.value = '';
  finishTextEdit();
  state.objects = [];
  undoStack = [];
  redoStack = [];
  state.selected = null;
  state.current = null;
  state.handle = undefined;
  localStorage.removeItem('current-save');
  scheduleSave();
  draw();
}

function saveCurrent(): void {
  const title = (saveTitle?.value.trim() || 'Dibujo sin titulo');
  const data = JSON.parse(JSON.stringify(state.objects));
  if (currentSaveId) {
    const existing = saves.find(s => s.id === currentSaveId);
    if (existing) {
      existing.title = title;
      existing.data = data;
    }
  } else {
    const id = Date.now().toString();
    saves.push({ id, title, data });
    currentSaveId = id;
    localStorage.setItem('current-save', id);
  }
  if (saveTitle) saveTitle.value = title;
  saveSaves();
  populateSaveList();
  if (saveSelect) saveSelect.value = currentSaveId ?? '';
  state.selected = null;
  state.current = null;
  state.handle = undefined;
  scheduleSave();
  draw();
}

function pushUndo(): void {
  undoStack.push(JSON.parse(JSON.stringify(state.objects)));
  if (undoStack.length > 50) undoStack.shift();
  redoStack = [];
}

function resize(): void {
  state.pan.x = (window.innerWidth - canvas.width) / 2;
  state.pan.y = (window.innerHeight - canvas.height) / 2;
  draw();
}

function load(): void {
  loadSaves();
  currentSaveId = localStorage.getItem('current-save');
  if (currentSaveId && saves.some(s => s.id === currentSaveId)) {
    const s = saves.find(v => v.id === currentSaveId)!;
    state.objects = s.data.map(o => {
      if (o.type === 'text' && !(o as TextObj).color) {
        (o as TextObj).color = '#000000';
      }
      return o;
    });
    if (saveTitle) saveTitle.value = s.title;
  } else {
    currentSaveId = null;
    const data = localStorage.getItem('draw-data');
    if (data) {
      state.objects = (JSON.parse(data) as DrawObject[]).map(o => {
        if (o.type === 'text' && !(o as TextObj).color) {
          (o as TextObj).color = '#000000';
        }
        return o;
      });
    }
  }
  populateSaveList();
  if (saveSelect) saveSelect.value = currentSaveId ?? '';
}

function save(): void {
  localStorage.setItem('draw-data', JSON.stringify(state.objects));
}

function scheduleSave(): void {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 5000);
}

function setTool(t: State['tool']): void {
  state.tool = t;
  state.current = null;
  state.selected = null;
  state.moveStart = undefined;
  canvas.style.cursor = t === 'select' ? 'default' : 'crosshair';
  colorMenu.classList.toggle('show', t === 'text');
}

document.getElementById('tool-draw')!.onclick = () => setTool('draw');
document.getElementById('tool-rect')!.onclick = () => setTool('rect');
document.getElementById('tool-line')!.onclick = () => setTool('line');
document.getElementById('tool-text')!.onclick = () => setTool('text');
document.getElementById('tool-select')!.onclick = () => setTool('select');
document.getElementById('clear')!.onclick = clearBoard;
document.getElementById('undo')!.onclick = undo;
document.getElementById('redo')!.onclick = redo;
if (saveBtn) saveBtn.onclick = saveCurrent;
if (saveSelect) saveSelect.onchange = () => {
  const val = saveSelect.value;
  if (val === '') createNewBoard();
  else loadFromSave(val);
};

window.addEventListener('keydown', e => {
  if (e.code === 'Space') space = true;
  if (e.ctrlKey && e.code === 'KeyZ') { e.preventDefault(); undo(); }
  if (e.ctrlKey && e.code === 'KeyY') { e.preventDefault(); redo(); }
});
window.addEventListener('keyup', e => { if (e.code === 'Space') space = false; });
window.addEventListener('pagehide', save);
canvas.addEventListener('dblclick', e => {
  const p = toWorld(e.clientX, e.clientY);
  if (state.selected && state.selected.type === 'text' && hitTestObject(state.selected, p)) {
    startTextEdit(state.selected);
  }
});

function toWorld(x: number, y: number): Point {
  return { x: (x - state.pan.x) / state.scale, y: (y - state.pan.y) / state.scale };
}

function toScreen(x: number, y: number): Point {
  return { x: x * state.scale + state.pan.x, y: y * state.scale + state.pan.y };
}

function startTextEdit(obj: TextObj): void {
  finishTextEdit();
  editingText = obj;
  textarea = document.createElement('textarea');
  textarea.className = 'text-edit';
  textarea.value = obj.text;
  textarea.style.position = 'fixed';
  textarea.style.color = obj.color;
  document.body.appendChild(textarea);
  currentTextColor = obj.color;
  colorButtons.forEach(b => b.classList.toggle('active', b.dataset.color === obj.color));
  colorMenu.classList.add('show');
  updateTextAreaPos();
  textarea.focus();
  textarea.addEventListener('blur', finishTextEdit);
  textarea.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); textarea!.blur(); }
  });
}

function finishTextEdit(): void {
  if (!textarea || !editingText) return;
  editingText.text = textarea.value;
  document.body.removeChild(textarea);
  textarea = null;
  editingText = null;
  if (state.tool !== 'text') colorMenu.classList.remove('show');
  scheduleSave();
  draw();
}

function updateTextAreaPos(): void {
  if (!textarea || !editingText) return;
  const left = Math.min(editingText.x, editingText.x + editingText.w);
  const top = Math.min(editingText.y, editingText.y + editingText.h);
  const p = toScreen(left, top);
  textarea.style.left = `${p.x}px`;
  textarea.style.top = `${p.y}px`;
  const w = Math.abs(editingText.w * state.scale);
  const h = Math.abs(editingText.h * state.scale);
  textarea.style.width = `${w}px`;
  textarea.style.height = `${h}px`;
  textarea.style.fontSize = `${h}px`;
  textarea.style.lineHeight = `${h}px`;
  textarea.style.color = editingText.color;
}

canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId);
  finishTextEdit();
  if (e.button === 2 || space) {
    state.isPanning = true;
    state.startPan = { x: e.clientX, y: e.clientY };
    return;
  }
  const p = toWorld(e.clientX, e.clientY);
  if (state.selected) {
    const h = hitTestHandle(state.selected, p);
    if (h) {
      state.handle = h;
      pushUndo();
      return;
    }
    if (state.tool === 'select' && hitTestObject(state.selected, p)) {
      state.moveStart = p;
      pushUndo();
      return;
    }
  }
  if (state.tool === 'select') {
    state.selected = null;
    for (let i = state.objects.length - 1; i >= 0; i--) {
      if (hitTestObject(state.objects[i], p)) {
        state.selected = state.objects[i];
        state.moveStart = p;
        pushUndo();
        draw();
        return;
      }
    }
    state.isPanning = true;
    state.startPan = { x: e.clientX, y: e.clientY };
    return;
  }
  state.selected = null;
  if (state.tool === 'draw') state.current = { type: 'path', points: [p] };
  else if (state.tool === 'rect') state.current = { type: 'rect', x: p.x, y: p.y, w: 0, h: 0 };
  else if (state.tool === 'line') state.current = { type: 'line', x1: p.x, y1: p.y, x2: p.x, y2: p.y };
  else if (state.tool === 'text') state.current = { type: 'text', x: p.x, y: p.y, w: 0, h: 0, text: '', align: 'left', color: currentTextColor };
});

canvas.addEventListener('pointermove', e => {
  if (state.isPanning && state.startPan) {
    const dx = e.clientX - state.startPan.x, dy = e.clientY - state.startPan.y;
    state.startPan = { x: e.clientX, y: e.clientY };
    state.pan.x += dx;
    state.pan.y += dy;
    draw();
    return;
  }
  const p = toWorld(e.clientX, e.clientY);
  if (state.handle && state.selected) {
    if (state.selected.type === 'rect' || state.selected.type === 'text') updateRectFromHandle(state.selected, state.handle, p);
    else if (state.selected.type === 'line') updateLineFromHandle(state.selected, state.handle, p);
    else if (state.selected.type === 'path') updatePathFromHandle(state.selected, state.handle, p);
    draw();
    return;
  }
  if (state.moveStart && state.selected) {
    const dx = p.x - state.moveStart.x;
    const dy = p.y - state.moveStart.y;
    moveObject(state.selected, dx, dy);
    state.moveStart = p;
    draw();
    return;
  }
  if (!state.current) return;
  if (state.current.type === 'path') state.current.points.push(p);
  else if (state.current.type === 'rect') { state.current.w = p.x - state.current.x; state.current.h = p.y - state.current.y; }
  else if (state.current.type === 'line') { state.current.x2 = p.x; state.current.y2 = p.y; }
  else if (state.current.type === 'text') { state.current.w = p.x - state.current.x; state.current.h = p.y - state.current.y; }
  draw();
});

canvas.addEventListener('pointerup', () => {
  if (state.isPanning) { state.isPanning = false; return; }
  if (state.handle) {
    state.handle = undefined;
    scheduleSave();
    draw();
    return;
  }
  if (state.moveStart) {
    state.moveStart = undefined;
    scheduleSave();
    draw();
    return;
  }
  if (state.current) {
    pushUndo();
    const obj = state.current;
    state.current = null;
    state.objects.push(obj);
    state.selected = obj;
    if (obj.type === 'text') {
      startTextEdit(obj);
    }
    scheduleSave();
    draw();
  }
});

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1.1 : 0.9;
  const newScale = Math.min(4, Math.max(0.1, state.scale * factor));
  const wx = (e.offsetX - state.pan.x) / state.scale;
  const wy = (e.offsetY - state.pan.y) / state.scale;
  state.pan.x = e.offsetX - wx * newScale;
  state.pan.y = e.offsetY - wy * newScale;
  state.scale = newScale;
  draw();
});

function draw(): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(state.scale, 0, 0, state.scale, state.pan.x, state.pan.y);
  ctx.lineCap = 'round';
  ctx.fillStyle = '#000';
  state.objects.forEach(o => drawObj(o));
  if (state.current) drawObj(state.current);
  if (state.selected) drawHandles(state.selected);
  updateTextAreaPos();
}

function drawObj(o: DrawObject): void {
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2 / state.scale;
  if (o.type === 'path') {
    ctx.beginPath();
    ctx.moveTo(o.points[0].x, o.points[0].y);
    o.points.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
    ctx.stroke();
  } else if (o.type === 'rect') {
    ctx.strokeRect(o.x, o.y, o.w, o.h);
  } else if (o.type === 'line') {
    ctx.beginPath();
    ctx.moveTo(o.x1, o.y1); ctx.lineTo(o.x2, o.y2); ctx.stroke();
  } else if (o.type === 'text') {
    if (state.selected === o || editingText === o) {
      const left = Math.min(o.x, o.x + o.w);
      const top = Math.min(o.y, o.y + o.h);
      ctx.strokeRect(left, top, Math.abs(o.w), Math.abs(o.h));
    }
    if (editingText === o) return;
    ctx.font = `${Math.abs(o.h)}px sans-serif`;
    ctx.textAlign = o.align;
    const left = Math.min(o.x, o.x + o.w);
    const right = Math.max(o.x, o.x + o.w);
    const top = Math.min(o.y, o.y + o.h);
    ctx.textBaseline = 'top';
    ctx.fillStyle = o.color;
    let x = left;
    if (o.align === 'center') x = (left + right) / 2;
    else if (o.align === 'right') x = right;
    ctx.fillText(o.text, x, top);
  }
}

function drawHandles(o: DrawObject): void {
  const r = 6 / state.scale;
  ctx.fillStyle = 'orange';
  if (o.type === 'rect' || o.type === 'text') {
    const pts = [
      { x: o.x, y: o.y, id: 'tl' },
      { x: o.x + o.w, y: o.y, id: 'tr' },
      { x: o.x, y: o.y + o.h, id: 'bl' },
      { x: o.x + o.w, y: o.y + o.h, id: 'br' },
    ];
    pts.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (o.type === 'line') {
    const pts = [
      { x: o.x1, y: o.y1, id: 'start' },
      { x: o.x2, y: o.y2, id: 'end' },
    ];
    pts.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  else if (o.type === 'path') {
    o.points.forEach((pt, i) => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

function hitTestHandle(o: DrawObject, p: Point): string | null {
  const r = 8 / state.scale;
  if (o.type === 'rect' || o.type === 'text') {
    const handles = {
      tl: { x: o.x, y: o.y },
      tr: { x: o.x + o.w, y: o.y },
      bl: { x: o.x, y: o.y + o.h },
      br: { x: o.x + o.w, y: o.y + o.h },
    } as const;
    for (const key in handles) {
      const h = handles[key as keyof typeof handles];
      const dx = p.x - h.x, dy = p.y - h.y;
      if (dx * dx + dy * dy <= r * r) return key;
    }
  } else if (o.type === 'line') {
    const handles = { start: { x: o.x1, y: o.y1 }, end: { x: o.x2, y: o.y2 } };
    for (const key in handles) {
      const h = handles[key as keyof typeof handles];
      const dx = p.x - h.x, dy = p.y - h.y;
      if (dx * dx + dy * dy <= r * r) return key;
    }
  } else if (o.type === 'path') {
    for (let i = 0; i < o.points.length; i++) {
      const pt = o.points[i];
      const dx = p.x - pt.x, dy = p.y - pt.y;
      if (dx * dx + dy * dy <= r * r) return `p${i}`;
    }
  }
  return null;
}

function hitTestObject(o: DrawObject, p: Point): boolean {
  const tol = 6 / state.scale;
  if (o.type === 'rect' || o.type === 'text') {
    return p.x >= o.x && p.x <= o.x + o.w && p.y >= o.y && p.y <= o.y + o.h;
  } else if (o.type === 'line') {
    return pointToSegment(p, { x: o.x1, y: o.y1 }, { x: o.x2, y: o.y2 }) <= tol;
  } else {
    for (let i = 0; i < o.points.length - 1; i++) {
      const a = o.points[i], b = o.points[i + 1];
      if (pointToSegment(p, a, b) <= tol) return true;
    }
  }
  return false;
}

function pointToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  const px = a.x + t * dx, py = a.y + t * dy;
  return Math.hypot(p.x - px, p.y - py);
}

function moveObject(o: DrawObject, dx: number, dy: number): void {
  if (o.type === 'rect' || o.type === 'text') {
    o.x += dx; o.y += dy;
  } else if (o.type === 'line') {
    o.x1 += dx; o.y1 += dy; o.x2 += dx; o.y2 += dy;
  } else {
    o.points.forEach(pt => { pt.x += dx; pt.y += dy; });
  }
}

function updatePathFromHandle(o: PathObj, handle: string, p: Point): void {
  const idx = parseInt(handle.slice(1), 10);
  if (!isNaN(idx) && o.points[idx]) {
    o.points[idx] = p;
  }
}

function updateRectFromHandle(o: RectObj | TextObj, handle: string, p: Point): void {
  const x2 = o.x + o.w;
  const y2 = o.y + o.h;
  switch (handle) {
    case 'tl':
      o.x = p.x; o.y = p.y; o.w = x2 - p.x; o.h = y2 - p.y; break;
    case 'tr':
      o.y = p.y; o.w = p.x - o.x; o.h = y2 - p.y; break;
    case 'bl':
      o.x = p.x; o.w = x2 - p.x; o.h = p.y - o.y; break;
    case 'br':
      o.w = p.x - o.x; o.h = p.y - o.y; break;
  }
}

function updateLineFromHandle(o: LineObj, handle: string, p: Point): void {
  if (handle === 'start') { o.x1 = p.x; o.y1 = p.y; }
  else if (handle === 'end') { o.x2 = p.x; o.y2 = p.y; }
}

function clearBoard(): void {
  if (state.objects.length === 0) return;
  pushUndo();
  state.objects = [];
  scheduleSave();
  draw();
}

function undo(): void {
  const prev = undoStack.pop();
  if (!prev) return;
  redoStack.push(JSON.parse(JSON.stringify(state.objects)));
  state.objects = prev;
  scheduleSave();
  draw();
}

function redo(): void {
  const next = redoStack.pop();
  if (!next) return;
  undoStack.push(JSON.parse(JSON.stringify(state.objects)));
  state.objects = next;
  scheduleSave();
  draw();
}

window.oncontextmenu = e => e.preventDefault();
load();
resize();
window.addEventListener('resize', resize);
