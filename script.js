'use strict';

const STORAGE_KEY = 'project-tracker-v1';
const COLORS = ['#2196F3', '#4CAF50', '#FF9800', '#F44336', '#9C27B0', '#00BCD4'];
const PADDING = 10;

let state = { projects: [] };

function genId() {
  return crypto.randomUUID?.() ?? (Date.now().toString(36) + Math.random().toString(36).slice(2));
}

function defaultStart() {
  const d = new Date(); d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function defaultEnd() {
  const d = new Date(); d.setMonth(d.getMonth() + 6);
  return d.toISOString().slice(0, 10);
}

function fmtDate(isoDate) {
  return new Date(isoDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state = JSON.parse(raw);
  } catch (_) { state = { projects: [] }; }
  state.projects.forEach(p => {
    p.subtitle      ??= '';
    p.timelineStart ??= defaultStart();
    p.timelineEnd   ??= defaultEnd();
    if (!p.timelines) {
      p.timelines = [{ id: genId(), name: 'Zeitleiste 1', markers: p.markers ?? [] }];
      delete p.markers;
    }
  });
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
}

// ── Timeline math ────────────────────────────────────────────

function calcMarkerPositions(markers, startDate, endDate) {
  const minT = +new Date(startDate);
  const maxT = +new Date(endDate);
  if (isNaN(minT) || isNaN(maxT) || maxT <= minT) {
    return markers.map(m => ({ ...m, left: 50 }));
  }
  return markers.map(m => {
    const t = +new Date(m.date);
    const left = isNaN(t)
      ? 50
      : PADDING + ((t - minT) / (maxT - minT)) * (100 - 2 * PADDING);
    return { ...m, left: Math.max(0, Math.min(100, left)) };
  });
}

// ── Drag helpers ─────────────────────────────────────────────

function calcPct(clientX, rect) {
  return Math.max(0, Math.min(100, (clientX - rect.left) / rect.width * 100));
}

function pctToDate(pct, minT, maxT) {
  const t = minT + ((pct - PADDING) / (100 - 2 * PADDING)) * (maxT - minT);
  return new Date(Math.round(t)).toISOString().slice(0, 10);
}

function attachDrag(dot, markerEl, projectId, timelineId, markerId) {
  let active = false, hasDragged = false, trackRect, minT, maxT;

  dot.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    e.preventDefault();
    dot.setPointerCapture(e.pointerId);
    active = true;
    hasDragged = false;
    trackRect = markerEl.parentElement.getBoundingClientRect();
    const p = state.projects.find(x => x.id === projectId);
    minT = +new Date(p.timelineStart);
    maxT = +new Date(p.timelineEnd);
    markerEl.classList.add('dragging');
    document.body.style.userSelect = 'none';
  });

  dot.addEventListener('pointermove', e => {
    if (!active) return;
    hasDragged = true;
    const pct = calcPct(e.clientX, trackRect);
    markerEl.style.left = pct + '%';
    const tooltip = markerEl.querySelector('.marker-tooltip');
    if (tooltip) tooltip.textContent = fmtDate(pctToDate(pct, minT, maxT));
    const di = markerEl.querySelector('.marker-date-input');
    if (di) di.value = pctToDate(pct, minT, maxT);
  });

  dot.addEventListener('pointerup', e => {
    if (!active) return;
    active = false;
    markerEl.classList.remove('dragging');
    document.body.style.userSelect = '';
    if (hasDragged) {
      updateMarker(projectId, timelineId, markerId, {
        date: pctToDate(calcPct(e.clientX, trackRect), minT, maxT)
      });
    }
  });

  dot.addEventListener('pointercancel', () => {
    active = false;
    markerEl.classList.remove('dragging');
    document.body.style.userSelect = '';
  });

  dot.addEventListener('click', e => {
    if (hasDragged) { hasDragged = false; return; }
    e.stopPropagation();
    const wasEditing = markerEl.classList.contains('editing');
    document.querySelectorAll('.marker.editing').forEach(m => m.classList.remove('editing'));
    if (!wasEditing) markerEl.classList.add('editing');
  });
}

// ── State mutations ──────────────────────────────────────────

function addProject() {
  const today = new Date().toISOString().slice(0, 10);
  state.projects.push({
    id: genId(),
    name: 'Neues Projekt',
    subtitle: '',
    timelineStart: defaultStart(),
    timelineEnd: defaultEnd(),
    budget: { total: 0, used: 0 },
    timelines: [{
      id: genId(),
      name: 'Zeitleiste 1',
      markers: [{ id: genId(), label: 'Start', date: today, color: COLORS[0] }]
    }]
  });
  saveState();
  render();
}

function removeProject(id) {
  state.projects = state.projects.filter(p => p.id !== id);
  saveState();
  render();
}

function updateBudget(projectId, field, rawValue) {
  const p = state.projects.find(x => x.id === projectId);
  if (!p) return;
  p.budget[field] = Math.max(0, parseFloat(rawValue) || 0);
  saveState();
  render();
}

function addTimeline(projectId) {
  const p = state.projects.find(x => x.id === projectId);
  if (!p) return;
  p.timelines.push({ id: genId(), name: `Zeitleiste ${p.timelines.length + 1}`, markers: [] });
  saveState();
  render();
}

function removeTimeline(projectId, timelineId) {
  const p = state.projects.find(x => x.id === projectId);
  if (!p || p.timelines.length <= 1) return;
  p.timelines = p.timelines.filter(t => t.id !== timelineId);
  saveState();
  render();
}

function addMarker(projectId, timelineId) {
  const p = state.projects.find(x => x.id === projectId);
  const tl = p?.timelines.find(t => t.id === timelineId);
  if (!tl) return;
  const today = new Date().toISOString().slice(0, 10);
  const used = new Set(tl.markers.map(m => m.color));
  const color = COLORS.find(c => !used.has(c)) ?? COLORS[tl.markers.length % COLORS.length];
  tl.markers.push({ id: genId(), label: 'Meilenstein', date: today, color });
  saveState();
  render();
}

function removeMarker(projectId, timelineId, markerId) {
  const p = state.projects.find(x => x.id === projectId);
  const tl = p?.timelines.find(t => t.id === timelineId);
  if (!tl) return;
  tl.markers = tl.markers.filter(m => m.id !== markerId);
  saveState();
  render();
}

function updateMarker(projectId, timelineId, markerId, patch) {
  const p = state.projects.find(x => x.id === projectId);
  const tl = p?.timelines.find(t => t.id === timelineId);
  if (!tl) return;
  const m = tl.markers.find(x => x.id === markerId);
  if (m) Object.assign(m, patch);
  saveState();
  render();
}

// ── Render: project header ───────────────────────────────────

function renderProjectHeader(p) {
  const header = document.createElement('div');
  header.className = 'project-header';

  const titles = document.createElement('div');
  titles.className = 'project-titles';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'project-name-input';
  nameInput.value = p.name;
  nameInput.placeholder = 'Projektname';
  nameInput.addEventListener('input', e => {
    const proj = state.projects.find(x => x.id === p.id);
    if (proj) { proj.name = e.target.value; saveState(); }
  });

  const subtitleInput = document.createElement('input');
  subtitleInput.type = 'text';
  subtitleInput.className = 'project-subtitle-input';
  subtitleInput.value = p.subtitle;
  subtitleInput.placeholder = 'Untertitel hinzufügen…';
  subtitleInput.addEventListener('input', e => {
    const proj = state.projects.find(x => x.id === p.id);
    if (proj) { proj.subtitle = e.target.value; saveState(); }
  });

  titles.append(nameInput, subtitleInput);

  const removeBtn = document.createElement('button');
  removeBtn.className = 'btn-icon remove-project-btn';
  removeBtn.title = 'Projekt entfernen';
  removeBtn.textContent = '✕';
  removeBtn.addEventListener('mousedown', e => { e.preventDefault(); removeProject(p.id); });

  header.append(titles, removeBtn);
  return header;
}

// ── Render: budget bar ───────────────────────────────────────

function renderBudget(p) {
  const section = document.createElement('div');
  section.className = 'budget-section';

  const { total, used } = p.budget;
  const overBudget = total > 0 && used > total;
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : (used > 0 ? 100 : 0);

  const row = document.createElement('div');
  row.className = 'budget-inputs';

  function makeBudgetField(labelText, field, value) {
    const label = document.createElement('label');
    label.className = 'budget-field';
    const span = document.createElement('span');
    span.textContent = labelText;
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'budget-input';
    input.min = '0';
    input.step = '100';
    input.placeholder = '0';
    if (value > 0) input.value = value;
    input.addEventListener('change', e => updateBudget(p.id, field, e.target.value));
    label.append(span, input);
    return label;
  }

  row.append(
    makeBudgetField('Gesamtbudget (€)', 'total', total),
    makeBudgetField('Verbraucht (€)', 'used', used)
  );

  if (overBudget) {
    const warn = document.createElement('span');
    warn.className = 'budget-over-label';
    warn.textContent = `⚠ ${(used - total).toLocaleString('de-DE')} € über Budget`;
    row.append(warn);
  }

  const track = document.createElement('div');
  track.className = 'budget-bar-track';
  const fill = document.createElement('div');
  fill.className = 'budget-bar-fill' + (overBudget ? ' over' : '');
  fill.style.width = pct + '%';
  track.append(fill);

  const pctLabel = document.createElement('div');
  pctLabel.className = 'budget-pct';
  if (total > 0) pctLabel.textContent = Math.round((used / total) * 100) + ' %';

  section.append(row, track, pctLabel);
  return section;
}

// ── Render: timeline bounds ──────────────────────────────────

function renderTimelineBounds(p) {
  const row = document.createElement('div');
  row.className = 'timeline-bounds';

  function makeDateField(labelText, field, value) {
    const wrap = document.createElement('label');
    wrap.className = 'tl-bound-field';
    const span = document.createElement('span');
    span.textContent = labelText;
    const input = document.createElement('input');
    input.type = 'date';
    input.className = 'tl-bound-input';
    input.value = value;
    input.addEventListener('change', e => {
      const proj = state.projects.find(x => x.id === p.id);
      if (proj) { proj[field] = e.target.value; saveState(); render(); }
    });
    wrap.append(span, input);
    return wrap;
  }

  row.append(
    makeDateField('Beginn', 'timelineStart', p.timelineStart),
    makeDateField('Ende', 'timelineEnd', p.timelineEnd)
  );
  return row;
}

// ── Render: date ruler ───────────────────────────────────────

function renderDateRuler(p) {
  const ruler = document.createElement('div');
  ruler.className = 'date-ruler';

  const allDates = [...new Set(
    p.timelines.flatMap(tl => tl.markers.map(m => m.date))
  )].filter(Boolean).sort();

  const minT = +new Date(p.timelineStart);
  const maxT = +new Date(p.timelineEnd);
  if (isNaN(minT) || isNaN(maxT) || maxT <= minT) return ruler;

  allDates.forEach(date => {
    const t = +new Date(date);
    if (isNaN(t)) return;
    const left = PADDING + ((t - minT) / (maxT - minT)) * (100 - 2 * PADDING);
    if (left < 0 || left > 100) return;

    const tick = document.createElement('div');
    tick.className = 'ruler-tick';
    tick.style.left = left + '%';

    const label = document.createElement('span');
    label.className = 'ruler-label';
    label.textContent = new Date(date).toLocaleDateString('de-DE', {
      day: '2-digit', month: '2-digit', year: '2-digit'
    });
    tick.append(label);
    ruler.append(tick);
  });

  return ruler;
}

// ── Render: today line ───────────────────────────────────────

function renderTodayLine(p) {
  const minT = +new Date(p.timelineStart);
  const maxT = +new Date(p.timelineEnd);
  const todayT = +new Date(new Date().toISOString().slice(0, 10));
  if (todayT < minT || todayT > maxT) return null;
  const left = PADDING + ((todayT - minT) / (maxT - minT)) * (100 - 2 * PADDING);

  const line = document.createElement('div');
  line.className = 'today-line';
  line.style.left = left + '%';

  const lbl = document.createElement('span');
  lbl.className = 'today-label';
  lbl.textContent = 'Heute';
  line.append(lbl);
  return line;
}

// ── Render: single marker ────────────────────────────────────

function renderMarker(p, tl, m) {
  const el = document.createElement('div');
  el.className = 'marker';
  el.style.left = m.left + '%';

  const dot = document.createElement('span');
  dot.className = 'marker-dot';
  dot.style.backgroundColor = m.color;
  dot.style.outline = `2.5px solid ${m.color}`;
  dot.style.outlineOffset = '2px';

  const tooltip = document.createElement('span');
  tooltip.className = 'marker-tooltip';
  tooltip.textContent = fmtDate(m.date);

  const body = document.createElement('div');
  body.className = 'marker-body';

  const labelInput = document.createElement('input');
  labelInput.type = 'text';
  labelInput.className = 'marker-label-input';
  labelInput.value = m.label;
  labelInput.placeholder = 'Bezeichnung';
  labelInput.style.color = m.color;
  labelInput.addEventListener('input', e => {
    const proj = state.projects.find(x => x.id === p.id);
    const timeline = proj?.timelines.find(x => x.id === tl.id);
    const mark = timeline?.markers.find(x => x.id === m.id);
    if (mark) { mark.label = e.target.value; saveState(); }
  });

  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.className = 'marker-date-input';
  dateInput.value = m.date;
  dateInput.addEventListener('change', e => updateMarker(p.id, tl.id, m.id, { date: e.target.value }));

  const colorPicker = document.createElement('div');
  colorPicker.className = 'color-picker';
  COLORS.forEach(c => {
    const chip = document.createElement('button');
    chip.className = 'color-chip' + (c === m.color ? ' active' : '');
    chip.style.backgroundColor = c;
    chip.title = c;
    chip.addEventListener('mousedown', e => {
      e.preventDefault();
      updateMarker(p.id, tl.id, m.id, { color: c });
    });
    colorPicker.append(chip);
  });

  const removeBtn = document.createElement('button');
  removeBtn.className = 'btn-icon remove-marker-btn';
  removeBtn.title = 'Meilenstein entfernen';
  removeBtn.textContent = '✕';
  removeBtn.addEventListener('mousedown', e => {
    e.preventDefault();
    removeMarker(p.id, tl.id, m.id);
  });

  body.append(labelInput, dateInput, colorPicker, removeBtn);
  el.append(dot, tooltip, body);

  attachDrag(dot, el, p.id, tl.id, m.id);
  return el;
}

// ── Render: single timeline row ──────────────────────────────

function renderSingleTimeline(p, tl) {
  const row = document.createElement('div');
  row.className = 'tl-row';

  const header = document.createElement('div');
  header.className = 'tl-header';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'tl-name-input';
  nameInput.value = tl.name;
  nameInput.placeholder = 'Zeitleiste benennen…';
  nameInput.addEventListener('input', e => {
    const proj = state.projects.find(x => x.id === p.id);
    const timeline = proj?.timelines.find(x => x.id === tl.id);
    if (timeline) { timeline.name = e.target.value; saveState(); }
  });

  const addMarkerBtn = document.createElement('button');
  addMarkerBtn.className = 'add-marker-btn';
  addMarkerBtn.textContent = '+ Meilenstein';
  addMarkerBtn.addEventListener('click', () => addMarker(p.id, tl.id));

  const removeBtn = document.createElement('button');
  removeBtn.className = 'btn-icon';
  removeBtn.title = 'Zeitleiste entfernen';
  removeBtn.textContent = '✕';
  removeBtn.style.visibility = p.timelines.length > 1 ? 'visible' : 'hidden';
  removeBtn.addEventListener('mousedown', e => {
    e.preventDefault();
    removeTimeline(p.id, tl.id);
  });

  header.append(nameInput, addMarkerBtn, removeBtn);

  const track = document.createElement('div');
  track.className = 'timeline-track';

  const todayLine = renderTodayLine(p);
  if (todayLine) track.append(todayLine);

  calcMarkerPositions(tl.markers, p.timelineStart, p.timelineEnd)
    .forEach(m => track.append(renderMarker(p, tl, m)));

  row.append(header, track);
  return row;
}

// ── Render: timeline section ─────────────────────────────────

function renderTimeline(p) {
  const section = document.createElement('div');
  section.className = 'timeline-section';

  section.append(renderTimelineBounds(p));
  section.append(renderDateRuler(p));

  p.timelines.forEach(tl => section.append(renderSingleTimeline(p, tl)));

  const addTlBtn = document.createElement('button');
  addTlBtn.className = 'add-timeline-btn';
  addTlBtn.textContent = '+ Zeitleiste';
  addTlBtn.addEventListener('click', () => addTimeline(p.id));
  section.append(addTlBtn);

  return section;
}

// ── Render: project card ─────────────────────────────────────

function renderProject(p) {
  const card = document.createElement('article');
  card.className = 'project-card';
  card.append(renderProjectHeader(p), renderBudget(p), renderTimeline(p));
  return card;
}

// ── Root render ──────────────────────────────────────────────

function render() {
  const container = document.getElementById('projects-container');
  container.innerHTML = '';

  if (!state.projects.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = '<p>Noch keine Projekte.<br>Klicke <strong>+ Projekt hinzufügen</strong>, um zu starten.</p>';
    container.append(empty);
    return;
  }

  state.projects.forEach(p => container.append(renderProject(p)));
}

// ── Global: close editing panels on outside click ────────────

document.addEventListener('click', e => {
  if (!e.target.closest('.marker')) {
    document.querySelectorAll('.marker.editing')
      .forEach(m => m.classList.remove('editing'));
  }
});

// ── Init ─────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadState();
  render();
  document.getElementById('add-project-btn').addEventListener('click', addProject);
});
