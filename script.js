// ========================
// ÉTAT GLOBAL
// ========================
const S = {
  mode: 'tournoi',
  gameMode: 21,
  teams: [],
  fields: [],
  matches: [],
  nextMatchIdx: 0,
  standings: [],
  results: [],
  currentMatch: null,
  currentFieldId: null,
  scoreA: 0,
  scoreB: 0,
  throwLog: [],
  roundHistory: [],
  totalMatchesPlayed: 0,
  totalPoints: 0,
};

// ========================
// RÈGLES
// ========================
function getRules() {
  return `Planche : 1 pt &nbsp;|&nbsp; Trou : 3 pts<br>
Cancellation (on soustrait les points adverses)<br>
Premier à ${S.gameMode} points gagne la manche<br>
Meilleur 2 manches sur 3 remporte le match`;
}

function renderRules() {
  document.getElementById('rulesList').innerHTML = getRules();
}

// ========================
// NOMS D'ÉQUIPES
// ========================
function buildTeamNames(count) {
  const c = document.getElementById('teamNamesContainer');
  c.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'grid2';
  for (let i = 1; i <= count; i++) {
    const wrap = document.createElement('div');
    wrap.className = 'form-row';
    wrap.innerHTML = `<label>Équipe ${i}</label><input type="text" id="tname${i}" value="Équipe ${i}">`;
    grid.appendChild(wrap);
  }
  c.appendChild(grid);
}

// ========================
// ROUND ROBIN
// ========================
function generateRoundRobin(teams) {
  const t = [...teams];
  if (t.length % 2 !== 0) t.push('BYE');
  const n = t.length;
  const arr = [...t];
  const allMatches = [];
  for (let r = 0; r < n - 1; r++) {
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i], b = arr[n - 1 - i];
      if (a !== 'BYE' && b !== 'BYE') {
        allMatches.push({ teamA: a, teamB: b, done: false, scoreA: 0, scoreB: 0, winsA: 0, winsB: 0 });
      }
    }
    arr.splice(1, 0, arr.pop());
  }
  return allMatches;
}

// ========================
// CLASSEMENT
// ========================
function initStandings(teams) {
  return teams.map(t => ({ team: t, played: 0, wins: 0, losses: 0, pf: 0, pa: 0, diff: 0 }));
}

function updateStandings(match) {
  const a = S.standings.find(s => s.team === match.teamA);
  const b = S.standings.find(s => s.team === match.teamB);
  if (!a || !b) return;
  a.played++; b.played++;
  a.pf += match.winsA; a.pa += match.winsB;
  b.pf += match.winsB; b.pa += match.winsA;
  a.diff = a.pf - a.pa;
  b.diff = b.pf - b.pa;
  if (match.winsA > match.winsB) { a.wins++; b.losses++; }
  else if (match.winsB > match.winsA) { b.wins++; a.losses++; }
  S.standings.sort((x, y) => y.wins - x.wins || y.diff - x.diff || y.pf - x.pf);
}

// ========================
// DÉMARRER TOURNOI
// ========================
function startTournoi() {
  const count = parseInt(document.getElementById('teamCount').value);
  const fc = parseInt(document.getElementById('fieldCount').value);
  const names = [];
  for (let i = 1; i <= count; i++) {
    const v = (document.getElementById('tname' + i)?.value || '').trim();
    names.push(v || 'Équipe ' + i);
  }
  S.teams = names;
  S.mode = 'tournoi';
  S.matches = generateRoundRobin(names);
  S.nextMatchIdx = 0;
  S.standings = initStandings(names);
  S.fields = Array.from({ length: fc }, (_, i) => ({ id: i + 1, match: null }));
  S.results = [];
  S.totalMatchesPlayed = 0;
  S.totalPoints = 0;
  S.roundHistory = [];
  S.currentMatch = null;
  assignMatches();
  renderAll();
  switchTab('terrain');
  document.getElementById('appTitle').textContent = 'Tournoi';
}

// ========================
// DÉMARRER SOLO
// ========================
function startSolo() {
  const n1 = document.getElementById('soloName1').value.trim() || 'Équipe A';
  const n2 = document.getElementById('soloName2').value.trim() || 'Équipe B';
  S.mode = 'solo';
  S.teams = [n1, n2];
  S.standings = initStandings([n1, n2]);
  S.matches = [{ teamA: n1, teamB: n2, done: false, scoreA: 0, scoreB: 0, winsA: 0, winsB: 0 }];
  S.fields = [{ id: 1, match: S.matches[0] }];
  S.results = [];
  S.totalMatchesPlayed = 0;
  S.totalPoints = 0;
  S.roundHistory = [];
  S.currentMatch = null;
  renderAll();
  openMatch(1);
  switchTab('match');
  document.getElementById('appTitle').textContent = '1v1';
}

// ========================
// ASSIGNER LES MATCHS AUX TERRAINS
// ========================
function assignMatches() {
  S.fields.forEach(f => {
    if (!f.match) {
      while (S.nextMatchIdx < S.matches.length && S.matches[S.nextMatchIdx].done) {
        S.nextMatchIdx++;
      }
      if (S.nextMatchIdx < S.matches.length) {
        f.match = S.matches[S.nextMatchIdx];
        S.nextMatchIdx++;
      }
    }
  });
}

// ========================
// OUVRIR UN MATCH
// ========================
function openMatch(fieldId) {
  const field = S.fields.find(f => f.id === fieldId);
  if (!field || !field.match) return;
  S.currentFieldId = fieldId;
  S.currentMatch = field.match;
  S.scoreA = 0;
  S.scoreB = 0;
  S.throwLog = [];
  S.roundHistory = [];
  renderMatchUI();
  switchTab('match');
}

function renderMatchUI() {
  const m = S.currentMatch;
  if (!m) return;
  document.getElementById('matchBanner').textContent = m.teamA + ' vs ' + m.teamB;
  document.getElementById('nameA').textContent = m.teamA;
  document.getElementById('nameB').textContent = m.teamB;
  document.getElementById('labelBtnA').textContent = m.teamA;
  document.getElementById('labelBtnB').textContent = m.teamB;
  document.getElementById('undoLog').textContent = '';
  updateScoreDisplay();
  renderRoundHistory();
}

// ========================
// SCORE
// ========================
function updateScoreDisplay() {
  document.getElementById('scoreA').textContent = Math.max(0, S.scoreA);
  document.getElementById('scoreB').textContent = Math.max(0, S.scoreB);
}

function addPoints(team, rawPts) {
  if (!S.currentMatch) {
    document.getElementById('undoLog').textContent = 'Sélectionne un match d\'abord.';
    return;
  }
  const prev = { scoreA: S.scoreA, scoreB: S.scoreB };
  if (team === 'A') S.scoreA += rawPts;
  else S.scoreB += rawPts;
  S.throwLog.push({ team, pts: rawPts, prev });

  const name = team === 'A' ? S.currentMatch.teamA : S.currentMatch.teamB;
  document.getElementById('undoLog').textContent = name + ' +' + rawPts + ' pts';
  updateScoreDisplay();
  checkRoundWin();
}

function checkRoundWin() {
  const limit = S.gameMode;
  if (S.scoreA < limit && S.scoreB < limit) return;

  const winnerIsA = S.scoreA > S.scoreB;
  const winner = winnerIsA ? S.currentMatch.teamA : S.currentMatch.teamB;
  const loser  = winnerIsA ? S.currentMatch.teamB : S.currentMatch.teamA;

  setTimeout(() => {
    S.roundHistory.push({
      winner,
      loser,
      sA: S.scoreA,
      sB: S.scoreB
    });
    renderRoundHistory();
    S.scoreA = 0;
    S.scoreB = 0;
    S.throwLog = [];
    updateScoreDisplay();
    document.getElementById('undoLog').textContent = winner + ' remporte la manche!';
  }, 400);
}

function renderRoundHistory() {
  const el = document.getElementById('roundHistory');
  if (!S.roundHistory || S.roundHistory.length === 0) {
    el.textContent = 'Aucune manche jouée.';
    return;
  }
  el.innerHTML = S.roundHistory.map((r, i) =>
    `<div style="padding:4px 0;border-bottom:1px solid #E5E7EB">
      Manche ${i + 1}: <strong>${r.winner}</strong> ${r.sA}–${r.sB} ${r.loser}
    </div>`
  ).join('');
}

// ========================
// ANNULER / RESET
// ========================
function undoLast() {
  if (!S.throwLog || S.throwLog.length === 0) {
    document.getElementById('undoLog').textContent = 'Rien à annuler.';
    return;
  }
  const last = S.throwLog.pop();
  S.scoreA = last.prev.scoreA;
  S.scoreB = last.prev.scoreB;
  document.getElementById('undoLog').textContent = 'Dernier lancer annulé.';
  updateScoreDisplay();
}

function resetRound() {
  S.scoreA = 0;
  S.scoreB = 0;
  S.throwLog = [];
  document.getElementById('undoLog').textContent = 'Manche remise à zéro.';
  updateScoreDisplay();
}

// ========================
// TERMINER LE MATCH
// ========================
function endMatch() {
  if (!S.currentMatch) return;

  const rh = S.roundHistory || [];
  const winsA = rh.filter(r => r.winner === S.currentMatch.teamA).length;
  const winsB = rh.filter(r => r.winner === S.currentMatch.teamB).length;

  if (winsA < 2 && winsB < 2) {
    if (!confirm('Aucun vainqueur au meilleur 2 sur 3. Terminer quand même?')) return;
  }

  const totalPtsA = rh.reduce((s, r) => s + r.sA, 0) + S.scoreA;
  const totalPtsB = rh.reduce((s, r) => s + r.sB, 0) + S.scoreB;

  S.currentMatch.winsA = winsA;
  S.currentMatch.winsB = winsB;
  S.currentMatch.scoreA = totalPtsA;
  S.currentMatch.scoreB = totalPtsB;
  S.currentMatch.done = true;

  S.results.push({
    teamA: S.currentMatch.teamA,
    teamB: S.currentMatch.teamB,
    winsA,
    winsB
  });

  updateStandings(S.currentMatch);

  S.totalMatchesPlayed++;
  S.totalPoints += totalPtsA + totalPtsB;

  const field = S.fields.find(f => f.id === S.currentFieldId);
  if (field) field.match = null;

  S.currentMatch = null;
  S.currentFieldId = null;
  S.scoreA = 0;
  S.scoreB = 0;
  S.throwLog = [];
  S.roundHistory = [];

  if (S.mode === 'tournoi') assignMatches();

  renderAll();
  switchTab('classement');
}

// ========================
// RENDER TERRAINS
// ========================
function renderFields() {
  const g = document.getElementById('fieldsGrid');
  g.innerHTML = '';

  S.fields.forEach(f => {
    const card = document.createElement('div');
    card.className = 'field-card';

    const hdr = document.createElement('div');
    hdr.className = 'field-header';
    hdr.textContent = 'Terrain ' + f.id;

    const body = document.createElement('div');
    body.className = 'field-body';

    if (f.match) {
      body.innerHTML = `
        <div class="match-vs">${f.match.teamA}<br>vs<br>${f.match.teamB}</div>
        <span class="badge badge-blue">En cours</span>
      `;
      const btn = document.createElement('button');
      btn.className = 'btn btn-primary';
      btn.style.fontSize = '12px';
      btn.textContent = 'Entrer les points';
      btn.addEventListener('click', () => openMatch(f.id));
      body.appendChild(btn);
    } else {
      const remaining = S.matches.filter(m => !m.done).length;
      body.innerHTML = `
        <div class="muted">${remaining > 0 ? 'En attente...' : 'Tournoi terminé'}</div>
        <span class="badge badge-gray">${remaining} match(s) restant(s)</span>
      `;
    }

    card.appendChild(hdr);
    card.appendChild(body);
    g.appendChild(card);
  });

  const sched = document.getElementById('scheduleList');
  const upcoming = S.matches.filter(m => !m.done).slice(0, 8);
  if (upcoming.length > 0) {
    sched.innerHTML = upcoming.map((m, i) =>
      `<div style="padding:3px 0;border-bottom:1px solid #E5E7EB">${i + 1}. ${m.teamA} vs ${m.teamB}</div>`
    ).join('');
  } else {
    sched.innerHTML = '<span style="color:#9CA3AF">Tous les matchs sont terminés.</span>';
  }
}

// ========================
// RENDER CLASSEMENT
// ========================
function renderStandings() {
  const body = document.getElementById('standingsBody');
  body.innerHTML = '';
  S.standings.forEach((t, i) => {
    const tr = document.createElement('tr');
    if (i === 0 && t.played > 0) tr.className = 'leader';
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${t.team}</td>
      <td>${t.played}</td>
      <td>${t.wins}</td>
      <td>${t.losses}</td>
      <td>${t.pf}</td>
      <td>${t.pa}</td>
      <td>${t.diff > 0 ? '+' : ''}${t.diff}</td>
    `;
    body.appendChild(tr);
  });

  document.getElementById('statM').textContent = S.totalMatchesPlayed;
  document.getElementById('statP').textContent = S.totalPoints;
  document.getElementById('statA').textContent = S.totalMatchesPlayed
    ? (S.totalPoints / S.totalMatchesPlayed).toFixed(1)
    : '—';

  const rc = document.getElementById('resultsCard');
  const rl = document.getElementById('resultsList');
  if (S.results.length > 0) {
    rc.style.display = '';
    rl.innerHTML = S.results.map(r => {
      const winner = r.winsA >= r.winsB ? r.teamA : r.teamB;
      const loser  = r.winsA >= r.winsB ? r.teamB : r.teamA;
      const score  = r.winsA >= r.winsB ? `${r.winsA}–${r.winsB}` : `${r.winsB}–${r.winsA}`;
      return `<div style="padding:4px 0;border-bottom:1px solid #E5E7EB">
        <strong>${winner}</strong> bat ${loser} (${score} manches)
      </div>`;
    }).join('');
  }
}

// ========================
// RENDER ALL
// ========================
function renderAll() {
  renderFields();
  renderStandings();
  updateScoreDisplay();
  renderRoundHistory();
}

// ========================
// NAVIGATION
// ========================
function switchTab(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-tab[data-tab]').forEach(t => t.classList.remove('active'));
  const screen = document.getElementById('tab-' + name);
  if (screen) screen.classList.add('active');
  const tab = document.querySelector(`.nav-tab[data-tab="${name}"]`);
  if (tab) tab.classList.add('active');
}

// ========================
// ÉVÉNEMENTS
// ========================
document.querySelectorAll('.nav-tab[data-tab]').forEach(t => {
  t.addEventListener('click', () => switchTab(t.dataset.tab));
});

document.querySelectorAll('.nav-tab[data-mode]').forEach(t => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab[data-mode]').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    S.mode = t.dataset.mode;
    document.getElementById('setupTournoi').style.display = t.dataset.mode === 'tournoi' ? '' : 'none';
    document.getElementById('setupSolo').style.display    = t.dataset.mode === 'solo'    ? '' : 'none';
  });
});

document.getElementById('teamCount').addEventListener('change', e => {
  buildTeamNames(parseInt(e.target.value));
});

document.getElementById('startTournoi').addEventListener('click', startTournoi);
document.getElementById('startSolo').addEventListener('click', startSolo);

document.querySelectorAll('.score-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    addPoints(btn.dataset.team, parseInt(btn.dataset.pts));
  });
});

document.getElementById('undoBtn').addEventListener('click', undoLast);
document.getElementById('resetRoundBtn').addEventListener('click', resetRound);
document.getElementById('endMatchBtn').addEventListener('click', endMatch);

document.getElementById('modeSelect').addEventListener('change', e => {
  S.gameMode = parseInt(e.target.value);
  renderRules();
});

// ========================
// INIT
// ========================
buildTeamNames(6);
renderRules();
