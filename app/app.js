// Leonida Ledger — an offline GTA VI trophy guide & tracker.
// One module, no dependencies: it loads data/trophies.json from beside itself,
// renders the tracker / roadmap / about views, and keeps the checklist in
// localStorage. Views and filters are hash-routed, so a view can be linked,
// bookmarked and screenshotted: #/ (tracker), #/roadmap, #/about,
// #/trophy/<id>, and tracker filters as #/?grade=gold&kind=story&state=unearned&missable=1&spoilers=1&q=heist.
// A shareable progress link (?earned=3,8,15 in the query string) seeds the
// checklist the first time it is opened, so a player can send their progress
// to another device and import it there.

const STORAGE_KEY = 'leonida-ledger-progress-v1';
const POINTS = { platinum: 300, gold: 90, silver: 30, bronze: 15 };
const GRADE_TOTAL = { platinum: 1, gold: 2, silver: 6, bronze: 46 };
const KIND_LABEL = {
  story: 'Story', collectible: 'Collectibles', activities: 'Activities',
  combat: 'Combat', exploration: 'Exploration', completion: 'Completion',
  misc: 'Misc', platinum: 'Platinum',
};
const KIND_ORDER = ['story', 'collectible', 'activities', 'combat', 'exploration', 'completion', 'misc', 'platinum'];

const ROADMAP = [
  {
    title: 'Run the story — chapters, named missions, finale',
    ids: [2, 3, 8, 4, 9, 10, 5, 11, 12, 6, 13, 7],
    note: 'The campaign in the official list\'s own structure: the opening mission, Chapters 1–4, the named set-pieces (Breakfast Run, The Cartel Heist, Child\'s Play, Headliners, VCIA Takedown, Operation Savage Glory) and the final mission. Two of the four missable moments live in this stretch — Catch Me If You Can belongs with the VCIA storyline, so read its guide before Hi-Jacked; Capital Offense can hide in any mission that passes a showroom. Keep a manual save at each chapter start.',
  },
  {
    title: 'Finish every character strand',
    ids: [22, 23, 24, 26, 27, 25],
    note: 'Five strands end in their own trophies — Andy, Kenton, Billy, Randy and Tyrone — and eight completed strands earn the Strangers & Freaks silver, so three shorter stranger chains are needed as well. Strands unlock in stages as chapters advance; if a strand goes quiet, push the story and check back.',
  },
  {
    title: 'Sweep the open world — collectibles, places, moments',
    ids: [44, 28, 42, 35, 31, 30, 29, 20, 21, 46, 16, 50, 55],
    note: 'Leonida itself: the 52 areas, 100 discovered vehicles, 18 meditation spots, 3 card sets and 100 WAiNK locations all reward the same habit — sweep area by area and tick everything that area holds. Master of None (try each of the 9 activity types once) belongs here too: it is the cheapest bronze on the list and a tour of everything the grind stages will ask for. The Truth Is Out There hides in the lonely places after dark.',
  },
  {
    title: 'Master the counted challenges',
    ids: [17, 15, 18, 19, 32, 36, 39, 40, 41, 43, 33, 34, 51],
    note: 'The skill and score trophies: gold in all 42 Shooting Range challenges, 250 stunts, drone-race wins at 14 locations, 20 different race wins, 50 challenges, the partner wanted-level pair, the robbery set (jewelry store undetected, 5 bank vaults, an armoured truck, one illegal operation from each of the 9 gangs) and 5 takedowns in one Combat Focus. None of these is missable; they are a practice schedule, not a route.',
  },
  {
    title: 'Close the counters, the economy — and the platinum',
    ids: [47, 49, 37, 45, 52, 53, 54, 48, 38, 14, 1],
    note: 'Whatever is left: the partnership story beat, the two remaining missable moments if they are still open (a second-attempt success, the VCIA departure, the showroom exit), the money counters ($250,000 laundered, $100,000 spent, all 8 garages), the 500 tracked choices, a Rhino encounter — and finally A Long Road, the 100% completion gold, which unlocks Vice Got a Price! the moment it lands.',
  },
];

// ---------- state ----------

const params = new URLSearchParams(location.search);
let earned = loadEarned();
let data = null;
let selectedId = null;

function loadEarned() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch { /* storage unavailable: run in-memory */ }
  const seed = params.get('earned');
  if (seed) {
    return new Set(seed.split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n >= 1 && n <= 55));
  }
  return new Set();
}

function saveEarned() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
  } catch { /* storage unavailable */ }
}

function toggleEarned(id, on) {
  if (on) earned.add(id); else earned.delete(id);
  saveEarned();
  renderProgress();
  renderList();
  renderDetail();
  renderRoadmap();
}

// ---------- routing ----------

function parseRoute() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const [path, query = ''] = hash.split('?');
  const q = new URLSearchParams(query);
  const trophyMatch = path.match(/^\/trophy\/(\d+)$/);
  return {
    view: path === '/roadmap' ? 'roadmap' : path === '/about' ? 'about' : 'tracker',
    trophyId: trophyMatch ? Number(trophyMatch[1]) : null,
    grade: q.get('grade') || 'all',
    kind: q.get('kind') || 'all',
    state: q.get('state') || 'all',
    missable: q.get('missable') === '1',
    spoilers: q.get('spoilers') === '1',
    search: q.get('q') || '',
  };
}

function trackerHash(overrides = {}) {
  const r = { ...parseRoute(), ...overrides };
  const q = new URLSearchParams();
  if (r.grade !== 'all') q.set('grade', r.grade);
  if (r.kind !== 'all') q.set('kind', r.kind);
  if (r.state !== 'all') q.set('state', r.state);
  if (r.missable) q.set('missable', '1');
  if (r.spoilers) q.set('spoilers', '1');
  if (r.search) q.set('q', r.search);
  const s = q.toString();
  return s ? `#/?${s}` : '#/';
}

function navigate(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

// ---------- data ----------

async function boot() {
  const res = await fetch('data/trophies.json');
  data = await res.json();
  buildKindChips();
  wireControls();
  render();
  // A deep link to one trophy (#/trophy/<id>) should land on its guide, not
  // above it: bring the detail panel into view once, on arrival only.
  if (parseRoute().trophyId) {
    requestAnimationFrame(() => {
      document.getElementById('detailPanel').scrollIntoView({ block: 'start' });
    });
  }
}

function trophyById(id) {
  return data.trophies.find((t) => t.id === id);
}

function isSpoilerHidden(t, route) {
  return route.spoilers && t.kind === 'story' && !earned.has(t.id);
}

// ---------- rendering: progress ----------

function renderProgress() {
  const counts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  let points = 0;
  for (const t of data.trophies) {
    if (earned.has(t.id)) { counts[t.grade] += 1; points += POINTS[t.grade]; }
  }
  const totalPoints = data.trophies.reduce((sum, t) => sum + POINTS[t.grade], 0);
  document.getElementById('earnedCount').textContent = String(earned.size);
  document.getElementById('countPlatinum').textContent = `${counts.platinum}/${GRADE_TOTAL.platinum}`;
  document.getElementById('countGold').textContent = `${counts.gold}/${GRADE_TOTAL.gold}`;
  document.getElementById('countSilver').textContent = `${counts.silver}/${GRADE_TOTAL.silver}`;
  document.getElementById('countBronze').textContent = `${counts.bronze}/${GRADE_TOTAL.bronze}`;
  document.getElementById('pointsEarned').textContent = points.toLocaleString('en-US');
  const pct = Math.round((earned.size / data.trophies.length) * 100);
  document.getElementById('progressPct').textContent = `${pct}%`;
  const circumference = 2 * Math.PI * 36;
  document.getElementById('ringFill').style.strokeDashoffset = String(circumference * (1 - earned.size / data.trophies.length));
}

// ---------- rendering: tracker ----------

function matchesFilters(t, r) {
  if (r.grade !== 'all' && t.grade !== r.grade) return false;
  if (r.kind !== 'all' && t.kind !== r.kind) return false;
  if (r.state === 'earned' && !earned.has(t.id)) return false;
  if (r.state === 'unearned' && earned.has(t.id)) return false;
  if (r.missable && !t.missable) return false;
  if (r.search) {
    const hay = `${t.name} ${t.description} ${t.kind} ${t.phase} ${t.guide}`.toLowerCase();
    if (!hay.includes(r.search.toLowerCase())) return false;
  }
  return true;
}

function pill(text, cls) {
  const span = document.createElement('span');
  span.className = `pill ${cls || ''}`.trim();
  span.textContent = text;
  return span;
}

function renderList() {
  const r = parseRoute();
  const list = document.getElementById('trophyList');
  list.replaceChildren();
  const shown = data.trophies.filter((t) => matchesFilters(t, r));
  for (const t of shown) {
    const li = document.createElement('li');
    const row = document.createElement('div');
    row.className = `trophy-row grade-${t.grade}`
      + (earned.has(t.id) ? ' is-earned' : '')
      + (selectedId === t.id ? ' is-selected' : '');
    row.setAttribute('role', 'button');
    row.setAttribute('tabindex', '0');
    row.setAttribute('aria-label', `Show guide for ${t.name}`);

    const boxWrap = document.createElement('label');
    boxWrap.className = 'earn-box';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.id);
    box.setAttribute('aria-label', `Mark ${t.name} as earned`);
    box.addEventListener('click', (e) => e.stopPropagation());
    box.addEventListener('change', () => toggleEarned(t.id, box.checked));
    boxWrap.append(box);

    const main = document.createElement('div');
    const hidden = isSpoilerHidden(t, r);
    const name = document.createElement('span');
    name.className = 'trophy-name' + (hidden ? ' spoiler-name' : '');
    name.textContent = hidden ? 'Hidden trophy — spoiler shield on' : t.name;
    const desc = document.createElement('span');
    desc.className = 'trophy-desc';
    desc.textContent = hidden ? 'A story trophy. Earn it in the campaign, or turn the spoiler shield off to peek.' : t.description;
    const meta = document.createElement('div');
    meta.className = 'trophy-meta';
    meta.append(pill(t.grade, `pill-grade-${t.grade}`), pill(KIND_LABEL[t.kind] || t.kind));
    if (t.phase !== (KIND_LABEL[t.kind] || t.kind)) meta.append(pill(t.phase));
    if (t.missable) meta.append(pill('⚑ Missable', 'pill-warn'));
    if (t.hidden) meta.append(pill('Hidden on PSN', 'pill-hidden'));
    if (t.target) meta.append(pill(`Target: ${t.target.toLocaleString('en-US')} ${t.unit || ''}`.trim(), ''));
    main.append(name, desc, meta);

    row.append(boxWrap, main);
    if (t.target) {
      const chip = document.createElement('span');
      chip.className = 'progress-chip';
      chip.textContent = `0 / ${t.target.toLocaleString('en-US')}`;
      chip.title = 'The game tracks this count; the tracker records the trophy itself once earned.';
      row.append(chip);
    }
    row.addEventListener('click', () => { selectedId = t.id; navigate(`#/trophy/${t.id}`); });
    row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectedId = t.id; navigate(`#/trophy/${t.id}`); } });
    li.append(row);
    list.append(li);
  }
  document.getElementById('resultLine').textContent =
    `Showing ${shown.length} of ${data.trophies.length} trophies · ${earned.size} earned overall. Click a trophy to read its guide.`;
}

function renderDetail() {
  const panel = document.getElementById('detailPanel');
  panel.replaceChildren();
  const r = parseRoute();
  const t = selectedId ? trophyById(selectedId) : null;
  if (!t) {
    const p = document.createElement('p');
    p.className = 'placeholder';
    p.textContent = 'Pick any trophy from the list and its full guide appears here — what to do, where and when, whether it can be missed, and the sources the guide is built from. The roadmap tab lays the whole list out as a five-stage route to the platinum.';
    panel.append(p);
    return;
  }
  const hidden = isSpoilerHidden(t, r);
  const title = document.createElement('h2');
  title.textContent = hidden ? 'Hidden trophy' : t.name;
  const desc = document.createElement('p');
  desc.className = 'official-desc';
  desc.textContent = hidden ? 'Name and description hidden by the spoiler shield until earned.' : `“${t.description}” — official description`;
  const meta = document.createElement('div');
  meta.className = 'trophy-meta';
  meta.append(pill(t.grade, `pill-grade-${t.grade}`), pill(KIND_LABEL[t.kind] || t.kind));
  if (t.phase !== (KIND_LABEL[t.kind] || t.kind)) meta.append(pill(t.phase));
  if (t.missable) meta.append(pill('⚑ Missable — flagged by this guide', 'pill-warn'));
  if (t.hidden) meta.append(pill('Hidden on PSN until earned', 'pill-hidden'));
  if (t.target) meta.append(pill(`Target: ${t.target.toLocaleString('en-US')} ${t.unit || ''}`.trim(), ''));

  const earnLabel = document.createElement('label');
  earnLabel.className = 'detail-earn';
  const earnBox = document.createElement('input');
  earnBox.type = 'checkbox';
  earnBox.checked = earned.has(t.id);
  earnBox.addEventListener('change', () => toggleEarned(t.id, earnBox.checked));
  earnLabel.append(earnBox, document.createTextNode(earned.has(t.id) ? 'Earned — nice one.' : 'Mark as earned'));

  const guideHead = document.createElement('h3');
  guideHead.textContent = 'Guide — in our own words';
  const guide = document.createElement('p');
  guide.textContent = t.guide;
  const srcHead = document.createElement('h3');
  srcHead.textContent = 'Sources';
  const sources = document.createElement('p');
  sources.className = 'sources';
  sources.textContent = t.sources;
  panel.append(title, desc, meta, earnLabel, guideHead, guide, srcHead, sources);
}

// ---------- rendering: roadmap ----------

function renderRoadmap() {
  const missableList = document.getElementById('missableList');
  missableList.replaceChildren();
  for (const t of data.trophies.filter((x) => x.missable)) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `#/trophy/${t.id}`;
    a.textContent = t.name;
    li.append(a, document.createTextNode(` — ${t.description}`));
    missableList.append(li);
  }
  const wrap = document.getElementById('roadmapStages');
  wrap.replaceChildren();
  ROADMAP.forEach((stage, i) => {
    const section = document.createElement('section');
    section.className = 'stage';
    const done = stage.ids.filter((id) => earned.has(id)).length;
    const head = document.createElement('div');
    head.className = 'stage-head';
    const num = document.createElement('span');
    num.className = 'stage-num';
    num.textContent = `Stage ${i + 1}`;
    const h = document.createElement('h3');
    h.textContent = stage.title;
    const count = document.createElement('span');
    count.className = 'stage-count';
    count.textContent = `${done}/${stage.ids.length} earned`;
    head.append(num, h, count);
    const note = document.createElement('p');
    note.textContent = stage.note;
    const ul = document.createElement('ul');
    for (const id of stage.ids) {
      const t = trophyById(id);
      const li = document.createElement('li');
      if (earned.has(id)) li.className = 'done';
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = earned.has(id);
      box.setAttribute('aria-label', `Mark ${t.name} as earned`);
      box.addEventListener('change', () => toggleEarned(id, box.checked));
      const link = document.createElement('a');
      link.href = `#/trophy/${id}`;
      link.className = 's-name';
      link.textContent = t.name;
      const grade = document.createElement('span');
      grade.className = 's-grade';
      grade.textContent = t.grade + (t.missable ? ' · ⚑ missable' : '');
      li.append(box, link, grade);
      ul.append(li);
    }
    section.append(head, note, ul);
    wrap.append(section);
  });
}

// ---------- controls ----------

function buildKindChips() {
  const wrap = document.getElementById('kindChips');
  const kinds = KIND_ORDER.filter((k) => data.trophies.some((t) => t.kind === k));
  for (const kind of ['all', ...kinds]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (kind === 'all' ? ' is-on' : '');
    b.dataset.kind = kind;
    b.textContent = kind === 'all' ? 'All kinds' : KIND_LABEL[kind];
    b.addEventListener('click', () => navigate(trackerHash({ kind })));
    wrap.append(b);
  }
}

function syncControls() {
  const r = parseRoute();
  document.querySelectorAll('#gradeChips .chip').forEach((c) => c.classList.toggle('is-on', c.dataset.grade === r.grade));
  document.querySelectorAll('#kindChips .chip').forEach((c) => c.classList.toggle('is-on', c.dataset.kind === r.kind));
  document.getElementById('stateAll').classList.toggle('is-on', r.state === 'all' && !r.missable);
  document.getElementById('stateUnearned').classList.toggle('is-on', r.state === 'unearned');
  document.getElementById('stateEarned').classList.toggle('is-on', r.state === 'earned');
  document.getElementById('stateMissable').classList.toggle('is-on', r.missable);
  document.getElementById('spoilerToggle').checked = r.spoilers;
  const search = document.getElementById('searchInput');
  if (search.value !== r.search) search.value = r.search;
}

function wireControls() {
  document.querySelectorAll('#gradeChips .chip').forEach((c) => {
    c.addEventListener('click', () => navigate(trackerHash({ grade: c.dataset.grade })));
  });
  document.getElementById('stateAll').addEventListener('click', () => navigate(trackerHash({ state: 'all', missable: false })));
  document.getElementById('stateUnearned').addEventListener('click', () => navigate(trackerHash({ state: 'unearned' })));
  document.getElementById('stateEarned').addEventListener('click', () => navigate(trackerHash({ state: 'earned' })));
  document.getElementById('stateMissable').addEventListener('click', () => {
    const r = parseRoute();
    navigate(trackerHash({ missable: !r.missable }));
  });
  document.getElementById('spoilerToggle').addEventListener('change', (e) => {
    navigate(trackerHash({ spoilers: e.target.checked }));
  });
  let searchTimer = null;
  document.getElementById('searchInput').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    const value = e.target.value;
    searchTimer = setTimeout(() => navigate(trackerHash({ search: value })), 250);
  });
  document.getElementById('exportBtn').addEventListener('click', () => {
    const payload = JSON.stringify({ app: 'leonida-ledger', version: 1, earned: [...earned].sort((a, b) => a - b) }, null, 2);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    a.download = 'leonida-ledger-progress.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  document.getElementById('importInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const ids = Array.isArray(parsed) ? parsed : parsed.earned;
      if (!Array.isArray(ids)) throw new Error('no earned list');
      earned = new Set(ids.map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 55));
      saveEarned();
      render();
    } catch {
      document.getElementById('resultLine').textContent = 'That file could not be read as a Leonida Ledger progress export.';
    }
    e.target.value = '';
  });
  document.getElementById('resetBtn').addEventListener('click', () => {
    earned = new Set();
    saveEarned();
    render();
  });
  window.addEventListener('hashchange', render);
}

// ---------- view switching ----------

function render() {
  if (!data) return;
  const r = parseRoute();
  if (r.trophyId && trophyById(r.trophyId)) selectedId = r.trophyId;
  document.getElementById('viewTracker').hidden = r.view !== 'tracker';
  document.getElementById('viewRoadmap').hidden = r.view !== 'roadmap';
  document.getElementById('viewAbout').hidden = r.view !== 'about';
  document.getElementById('tabTracker').classList.toggle('is-active', r.view === 'tracker');
  document.getElementById('tabRoadmap').classList.toggle('is-active', r.view === 'roadmap');
  document.getElementById('tabAbout').classList.toggle('is-active', r.view === 'about');
  renderProgress();
  syncControls();
  renderList();
  renderDetail();
  if (r.view === 'roadmap') renderRoadmap();
}

boot();
