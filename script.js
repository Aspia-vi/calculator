
/* ===== ТЕМА ===== */
const THEME_KEY = 'arina_calc_theme';
const MOON_ICON = '<path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/>';
const SUN_ICON = '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.4M12 19.1v2.4M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7"/>';

function applyTheme(theme) {
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    document.getElementById('theme-icon').innerHTML = SUN_ICON;
  } else {
    document.documentElement.removeAttribute('data-theme');
    document.getElementById('theme-icon').innerHTML = MOON_ICON;
  }
}
function toggleTheme() {
  const current = localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
  const next = current === 'light' ? 'dark' : 'light';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}
document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
applyTheme(localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark');

/* ===== ТАРИФЫ ===== */
const TARIFFS = Object.freeze({
  dozvonPct: 0.85,
  tarifMab: 0.60,
  tarifTarifikacia: 1.32,
  tarifArina: { out: 5.79, in: 3.55 },
  scenario: { dialog: 6800.00, monolog: 5200.00 },
  tarifSms: 7.00
});
const SCENARIO_LABELS = { dialog: 'С вопросами (Диалог)', monolog: 'Информирование (Монолог)' };
const DIRECTION_LABELS = { out: 'Исходящее', in: 'Входящее' };
const HISTORY_KEY = 'arina_calc_history';

function fmt(n) { return n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' р.'; }

let editingId = null;

/* ===== ХРАНИЛИЩЕ ===== */
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
  catch (e) { return []; }
}
function saveHistory(list) { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); }

function renderHistory() {
  const list = loadHistory();
  const container = document.getElementById('history-list');
  if (!list.length) {
    container.innerHTML = '<div class="history-empty">Пока нет расчётов</div>';
    return;
  }
  container.innerHTML = list.slice().reverse().map((item) => `
    <div class="history-item" data-id="${item.id}">
      <div class="h-name">${escapeHtml(item.projectName)}</div>
      <div class="h-line">Кол-во ИНН: <b>${item.inn}</b></div>
      <div class="h-line">Стоимость проекта: <b>${item.itogoFmt}</b></div>
      <div class="history-item-actions">
        <button class="act-edit" title="Изменить" data-action="edit" data-id="${item.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="act-delete" title="Удалить" data-action="delete" data-id="${item.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
        </button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.history-item').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      openHistoryItem(el.dataset.id);
    });
  });
  container.querySelectorAll('[data-action="edit"]').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); loadIntoForm(btn.dataset.id); });
  });
  container.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!confirm('Удалить этот расчёт из истории?')) return;
      const list = loadHistory().filter(x => x.id !== btn.dataset.id);
      saveHistory(list);
      renderHistory();
    });
  });
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function findItem(id) { return loadHistory().find(x => x.id === id); }

function openHistoryItem(id) {
  const item = findItem(id);
  if (!item) return;
  document.getElementById('modal-title').innerText = item.projectName;
  document.getElementById('modal-date').innerText = item.date;
  document.getElementById('modal-body').innerHTML = `
    Кол-во ИНН: <b>${item.inn}</b><br>
    Кол-во номеров на 1 компанию: <b>${item.phones}</b><br>
    Звонков на номер: <b>${item.attempts}</b><br>
    Длина разговора: <b>${item.length} мин</b><br>
    Направление: <b>${DIRECTION_LABELS[item.direction]}</b><br>
    Сценарий: <b>${SCENARIO_LABELS[item.scenario]}</b><br>
    Отправка SMS: <b>${item.smsEnabled === 'yes' ? 'Да' : 'Нет'}</b><br>
    Конверсия в SMS: <b>${item.conversion}%</b><br><br>
    Звонков всего: <b>${item.kolZvonkov}</b><br>
    Дозвонов (85%): <b>${item.kolDozvonov}</b><br>
    Минут разговора: <b>${item.minuty}</b><br>
    Кол-во SMS: <b>${item.smsCount}</b><br><br>
    Телефония: <b>${item.stoimostTelefoniiFmt}</b><br>
    Арина: <b>${item.stoimostArinyFmt}</b><br>
    Сценарий: <b>${item.scenarioCostFmt}</b><br>
    СМС: <b>${item.smsCostFmt}</b><br><br>
    <b style="font-size:16px">Итого: ${item.itogoFmt}</b>
  `;
  document.getElementById('modal-edit-btn').dataset.id = id;
  document.getElementById('modal-overlay').classList.add('active');
}

function loadIntoForm(id) {
  const item = findItem(id);
  if (!item) return;
  document.getElementById('projectName').value = item.projectName;
  document.getElementById('inn').value = item.inn;
  document.getElementById('phones').value = item.phones;
  document.getElementById('attempts').value = item.attempts;
  document.getElementById('length').value = item.length;
  document.getElementById('direction').value = item.direction;
  document.getElementById('scenario').value = item.scenario;
  document.getElementById('smsEnabled').value = item.smsEnabled || 'yes';
  document.getElementById('conversion').value = item.conversion;
  editingId = id;
  closeModal();
  applySmsLock();
  updateSmsCount();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeModal() { document.getElementById('modal-overlay').classList.remove('active'); }
document.getElementById('modal-close-btn').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', (e) => { if (e.target.id === 'modal-overlay') closeModal(); });
document.getElementById('modal-edit-btn').addEventListener('click', (e) => loadIntoForm(e.target.dataset.id));

/* ===== ДОНУТ ===== */
function drawDonut(values, colors) {
  const canvas = document.getElementById('donut-chart');
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const cx = size / 2, cy = size / 2;
  const rOuter = size / 2 - 6;
  const rInner = rOuter * 0.6;
  ctx.clearRect(0, 0, size, size);
  const total = values.reduce((a, b) => a + b, 0);
  if (total <= 0) return;
  let start = -Math.PI / 2;
  values.forEach((v, i) => {
    if (v <= 0) return;
    const angle = (v / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, rOuter, start, start + angle);
    ctx.closePath();
    ctx.fillStyle = colors[i];
    ctx.fill();
    start += angle;
  });
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(cx, cy, rInner, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}
function renderLegend(labels, values, colors) {
  const legend = document.getElementById('donut-legend');
  legend.innerHTML = labels.map((l, i) => {
    if (values[i] <= 0) return '';
    return `<div class="dl-item"><span class="dl-dot" style="background:${colors[i]}"></span>${l}</div>`;
  }).join('');
}

/* ===== SMS: ВКЛ/ВЫКЛ И СЧЁТЧИК ===== */
function applySmsLock() {
  const enabled = document.getElementById('smsEnabled').value === 'yes';
  const conversionInput = document.getElementById('conversion');
  const conversionWrap = conversionInput.closest('.num-wrap');
  const smsOut = document.getElementById('smsCountOut');
  conversionInput.disabled = !enabled;
  conversionWrap.classList.toggle('locked', !enabled);
  smsOut.classList.toggle('disabled', !enabled);
}
document.getElementById('smsEnabled').addEventListener('change', () => { applySmsLock(); updateSmsCount(); });

function updateSmsCount() {
  const enabled = document.getElementById('smsEnabled').value === 'yes';
  if (!enabled) {
    document.getElementById('smsCountOut').textContent = '0';
    return 0;
  }
  const inn = parseFloat(document.getElementById('inn').value) || 0;
  const conversion = parseFloat(document.getElementById('conversion').value) || 0;
  const smsCount = Math.round(inn * (conversion / 100));
  document.getElementById('smsCountOut').textContent = smsCount;
  return smsCount;
}
document.getElementById('inn').addEventListener('input', updateSmsCount);
document.getElementById('conversion').addEventListener('input', updateSmsCount);

/* ===== КАСТОМНЫЕ СПИННЕРЫ ===== */
document.querySelectorAll('.num-spin button').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    if (input.disabled) return;
    const step = parseFloat(input.step) || 1;
    const min = input.min !== '' ? parseFloat(input.min) : -Infinity;
    const max = input.max !== '' ? parseFloat(input.max) : Infinity;
    let val = parseFloat(input.value) || 0;
    val = btn.classList.contains('num-up') ? val + step : val - step;
    val = Math.min(max, Math.max(min, val));
    input.value = Math.round(val * 1000) / 1000;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
});

/* ===== ВАЛИДАЦИЯ ===== */
function validateProjectName() {
  const input = document.getElementById('projectName');
  const error = document.getElementById('projectName-error');
  const ok = input.value.trim().length > 0;
  input.classList.toggle('invalid', !ok);
  error.classList.toggle('show', !ok);
  return ok;
}
document.getElementById('projectName').addEventListener('input', () => {
  if (document.getElementById('projectName').value.trim().length > 0) validateProjectName();
});

/* ===== ГЛАВНЫЙ РАСЧЁТ ===== */
function calc() {
  if (!validateProjectName()) {
    document.getElementById('projectName').focus();
    return;
  }

  const projectName = document.getElementById('projectName').value.trim();
  const inn = parseFloat(document.getElementById('inn').value) || 0;
  const phones = parseFloat(document.getElementById('phones').value) || 0;
  const attempts = parseFloat(document.getElementById('attempts').value) || 0;
  const length = parseFloat(document.getElementById('length').value) || 0;
  const directionKey = document.getElementById('direction').value;
  const arinaRate = TARIFFS.tarifArina[directionKey];
  const scenarioKey = document.getElementById('scenario').value;
  const scenarioCost = TARIFFS.scenario[scenarioKey];
  const smsEnabled = document.getElementById('smsEnabled').value;
  const conversion = parseFloat(document.getElementById('conversion').value) || 0;

  const kolZvonkov = inn * phones * attempts;
  const kolDozvonov = kolZvonkov * TARIFFS.dozvonPct;
  const minuty = kolDozvonov * length;
  const smsCount = updateSmsCount();
  const smsCost = smsCount * TARIFFS.tarifSms;

  const stoimostTelefonii = minuty * TARIFFS.tarifTarifikacia + kolDozvonov * TARIFFS.tarifMab;
  const stoimostAriny = kolDozvonov * arinaRate;
  const itogo = stoimostTelefonii + stoimostAriny + scenarioCost + smsCost;

  document.getElementById('breakdown-qty').innerHTML = `
    Звонков всего: <b>${kolZvonkov.toFixed(0)}</b><br>
    Дозвонов (85%): <b>${kolDozvonov.toFixed(0)}</b><br>
    Минут разговора: <b>${minuty.toFixed(1)}</b><br>
    Кол-во SMS: <b>${smsCount}</b>
  `;
  document.getElementById('breakdown-cost').innerHTML = `
    Телефония: <b>${fmt(stoimostTelefonii)}</b><br>
    Арина: <b>${fmt(stoimostAriny)}</b><br>
    Сценарий: <b>${fmt(scenarioCost)}</b><br>
    СМС: <b>${fmt(smsCost)}</b>
  `;
  document.getElementById('total').innerText = fmt(itogo);
  document.getElementById('result').classList.add('active');

  const rootStyles = getComputedStyle(document.documentElement);
  const accent1 = rootStyles.getPropertyValue('--accent1').trim() || '#35c2e0';
  const accent2 = rootStyles.getPropertyValue('--accent2').trim() || '#4ee0a8';
  const colors = [accent1, accent2, '#f0a94e', '#e05a8a'];
  const values = [stoimostTelefonii, stoimostAriny, scenarioCost, smsCost];
  const labels = ['Телефония', 'Арина', 'Сценарий', 'СМС'];
  drawDonut(values, colors);
  renderLegend(labels, values, colors);

  const historyEntry = {
    id: editingId || (Date.now().toString(36) + Math.random().toString(36).slice(2, 7)),
    projectName, date: new Date().toLocaleString('ru-RU'),
    inn, phones, attempts, length, direction: directionKey, scenario: scenarioKey,
    smsEnabled, conversion,
    kolZvonkov: kolZvonkov.toFixed(0), kolDozvonov: kolDozvonov.toFixed(0), minuty: minuty.toFixed(1),
    smsCount, stoimostTelefoniiFmt: fmt(stoimostTelefonii), stoimostArinyFmt: fmt(stoimostAriny),
    scenarioCostFmt: fmt(scenarioCost), smsCostFmt: fmt(smsCost), itogoFmt: fmt(itogo)
  };

  let list = loadHistory();
  if (editingId) {
    list = list.map(x => x.id === editingId ? historyEntry : x);
    editingId = null;
  } else {
    list.push(historyEntry);
    if (list.length > 50) list.shift();
  }
  saveHistory(list);
  renderHistory();
  pulseBoost = 1;
}

document.getElementById('calcBtn').addEventListener('click', calc);

applySmsLock();
renderHistory();
updateSmsCount();

/* ===== ФОНОВАЯ АНИМАЦИЯ "ПРОВОДА / СВЯЗИ" ===== */
let pulseBoost = 0;
(function () {
  const canvas = document.getElementById('wires-bg');
  const ctx = canvas.getContext('2d');
  let w, h, nodes, dpr;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initNodes();
  }

  function initNodes() {
    const count = Math.max(22, Math.round((w * h) / 42000));
    nodes = [];
    for (let i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.14,
        vy: (Math.random() - 0.5) * 0.14,
        r: 1 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  function getColor() {
    const style = getComputedStyle(document.documentElement);
    const c = style.getPropertyValue('--wire-color').trim();
    return c || '53,194,224';
  }

  const MAX_DIST = 170;
  let t = 0;

  function step() {
    t += 0.016;
    ctx.clearRect(0, 0, w, h);
    const color = getColor();
    if (pulseBoost > 0) pulseBoost *= 0.96;

    for (const n of nodes) {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < -20) n.x = w + 20;
      if (n.x > w + 20) n.x = -20;
      if (n.y < -20) n.y = h + 20;
      if (n.y > h + 20) n.y = -20;
    }

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MAX_DIST) {
          const baseAlpha = (1 - dist / MAX_DIST) * 0.22;
          const flicker = 0.5 + 0.5 * Math.sin(t * 1.3 + a.phase + b.phase);
          const alpha = Math.min(0.6, baseAlpha * (0.6 + 0.4 * flicker) + pulseBoost * 0.3);
          ctx.strokeStyle = `rgba(${color},${alpha.toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    for (const n of nodes) {
      const glow = 0.4 + 0.3 * Math.sin(t * 1.5 + n.phase);
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${color},${(glow + pulseBoost * 0.35).toFixed(3)})`;
      ctx.fill();
    }

    requestAnimationFrame(step);
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(step);
})();
