// ========================
// ÉTAT GLOBAL
// ========================
const S = {
  mode: 'tournoi',
  gameMode: 21,
  bestOf: 3,
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
  allPlayers: {},
  players: { A: ['J1','J2'], B: ['J1','J2'] },
  tourIndex: 0,
};

let voleeEnCours = { A: 0, B: 0 };

// ========================
// POINTAGE
// ========================
function getScoringTable() {
  return S.gameMode === 21
    ? { outside: 1, box: 3, cylinder: 5 }
    : { outside: 1, box: 2, cylinder: 3 };
}

function getRules() {
  const pts = getScoringTable();
  const format = S.bestOf === 1
    ? 'Match simple — premier à ' + S.gameMode + ' pts gagne'
    : 'Meilleur 2 manches sur 3 — premier à ' + S.gameMode + ' pts par manche';
  return `<strong>Pointage (Game de ${S.gameMode})</strong><br>
    Extérieur (à 1 washer) : ${pts.outside} pt<br>
    Dans la boîte : ${pts.box} pts<br>
    Dans le cylindre : ${pts.cylinder} pts<br><br>
    <strong>Cancellation</strong> — seul le gagnant de la volée marque la différence.<br>
    <strong>Bust</strong> — dépasser la limite = reculer du surplus.<br><br>
    <strong>Format</strong> : ${format}`;
}

function renderRules() {
  document.getElementById('rulesList').innerHTML = getRules();
}

// ========================
// NOMS D'ÉQUIPES + JOUEURS
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

  const pc = document.getElementById('teamPlayersContainer');
  pc.innerHTML = '';
  for (let i = 1; i <= count; i++) {
    const block = document.createElement('div');
    block.style.cssText = 'background:var(--bg);border-radius:8px;padding:10px;margin-bottom:8px';
    block.innerHTML = `
      <div style="font-size:12px;font-weight:700;color:var(--blue);margin-bottom:6px" id="playerLabel${i}">Équipe ${i}</div>
      <div class="grid2">
        <div class="form-row"><label>Joueur 1</label><input type="text" id="tp${i}_1" placeholder="Prénom joueur 1"></div>
        <div class="form-row"><label>Joueur 2</label><input type="text" id="tp${i}_2" placeholder="Prénom joueur 2"></div>
      </div>`;
    pc.appendChild(block);
  }

  // Sync label équipe → bloc joueurs
  for (let i = 1; i <= count; i++) {
    const ni = document.getElementById('tname' + i);
    if (ni) ni.addEventListener('input', (e) => {
      const lbl = document.getElementById('playerLabel' + i);
      if (lbl) lbl.textContent = e.target.value || 'Équipe ' + i;
    });
  }
}

// ========================
// ROUND ROBIN
// ========================
function generateRoundRobin(teams) {
  const t = [...teams];
  if (t.length % 2 !== 0) t.push('BYE');
  const n = t.length;
  const arr = [...t];
  const all = [];
  for (let r = 0; r < n - 1; r++) {
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i], b = arr[n - 1 - i];
      if (a !== 'BYE' && b !== 'BYE')
        all.push({ teamA: a, teamB: b, done: false, scoreA: 0, scoreB: 0, winsA: 0, winsB: 0 });
    }
    arr.splice(1, 0, arr.pop());
  }
  return all;
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
  a.diff = a.pf - a.pa; b.diff = b.pf - b.pa;
  if (match.winsA > match.winsB) { a.wins++; b.losses++; }
  else if (match.winsB > match.winsA) { b.wins++; a.losses++; }
  S.standings.sort((x, y) => y.wins - x.wins || y.diff - x.diff || y.pf - x.pf);
}

// ========================
// DÉMARRER TOURNOI
// ========================
function startTournoi() {
  const count = parseInt(document.getElementById('teamCount').value);
  const fc    = parseInt(document.getElementById('fieldCount').value);
  S.gameMode  = parseInt(document.getElementById('gameModeSelect').value);
  S.bestOf    = parseInt(document.getElementById('bestOfSelect').value);

  const names = [];
  for (let i = 1; i <= count; i++) {
    const v = (document.getElementById('tname' + i)?.value || '').trim();
    names.push(v || 'Équipe ' + i);
  }

  const players = {};
  for (let i = 1; i <= count; i++) {
    const p1 = (document.getElementById('tp' + i + '_1')?.value || '').trim() || 'J1';
    const p2 = (document.getElementById('tp' + i + '_2')?.value || '').trim() || 'J2';
    players[names[i - 1]] = [p1, p2];
  }

  Object.assign(S, {
    teams: names, allPlayers: players, mode: 'tournoi',
    matches: generateRoundRobin(names), nextMatchIdx: 0,
    standings: initStandings(names),
    fields: Array.from({ length: fc }, (_, i) => ({ id: i + 1, match: null })),
    results: [], totalMatchesPlayed: 0, totalPoints: 0,
    roundHistory: [], currentMatch: null, scoreA: 0, scoreB: 0,
  });
  voleeEnCours = { A: 0, B: 0 };

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
  S.gameMode = parseInt(document.getElementById('gameModeSelectSolo').value);
  S.bestOf   = parseInt(document.getElementById('bestOfSelectSolo').value);

  const sp1A = (document.getElementById('soloP1A')?.value || '').trim() || 'J1';
  const sp2A = (document.getElementById('soloP2A')?.value || '').trim() || 'J2';
  const sp1B = (document.getElementById('soloP1B')?.value || '').trim() || 'J1';
  const sp2B = (document.getElementById('soloP2B')?.value || '').trim() || 'J2';

  Object.assign(S, {
    allPlayers: { [n1]: [sp1A, sp2A], [n2]: [sp1B, sp2B] },
    mode: 'solo', teams: [n1, n2],
    standings: initStandings([n1, n2]),
    matches: [{ teamA: n1, teamB: n2, done: false, scoreA: 0, scoreB: 0, winsA: 0, winsB: 0 }],
    fields: [{ id: 1, match: null }],
    results: [], totalMatchesPlayed: 0, totalPoints: 0,
    roundHistory: [], currentMatch: null, scoreA: 0, scoreB: 0,
  });
  S.fields[0].match = S.matches[0];
  voleeEnCours = { A: 0, B: 0 };

  renderAll();
  openMatch(1);
  switchTab('match');
  document.getElementById('appTitle').textContent = '1v1';
}

// ========================
// ASSIGNER LES MATCHS
// ========================
function assignMatches() {
  S.fields.forEach(f => {
    if (!f.match) {
      while (S.nextMatchIdx < S.matches.length && S.matches[S.nextMatchIdx].done)
        S.nextMatchIdx++;
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
  S.currentMatch   = field.match;
  S.scoreA = 0; S.scoreB = 0;
  S.throwLog = []; S.roundHistory = [];
  S.tourIndex = 0;
  voleeEnCours = { A: 0, B: 0 };

  const pA = (S.allPlayers || {})[field.match.teamA] || ['J1', 'J2'];
  const pB = (S.allPlayers || {})[field.match.teamB] || ['J1', 'J2'];
  S.players = { A: pA, B: pB };

  renderMatchUI();
  switchTab('match');
}

// ========================
// RENDER MATCH UI
// ========================
function renderMatchUI() {
  const m = S.currentMatch;
  if (!m) return;
  const pts = getScoringTable();

  document.getElementById('matchBanner').textContent = m.teamA + ' vs ' + m.teamB;
  document.getElementById('nameA').textContent = m.teamA;
  document.getElementById('nameB').textContent = m.teamB;
  document.getElementById('labelBtnA').textContent = m.teamA;
  document.getElementById('labelBtnB').textContent = m.teamB;
  document.getElementById('btnAout').textContent = '+' + pts.outside  + ' Extérieur';
  document.getElementById('btnAbox').textContent = '+' + pts.box      + ' Boîte';
  document.getElementById('btnAcyl').textContent = '+' + pts.cylinder + ' Cylindre';
  document.getElementById('btnBout').textContent = '+' + pts.outside  + ' Extérieur';
  document.getElementById('btnBbox').textContent = '+' + pts.box      + ' Boîte';
  document.getElementById('btnBcyl').textContent = '+' + pts.cylinder + ' Cylindre';

  document.getElementById('matchFormat').textContent =
    S.bestOf === 1 ? 'Match simple — à ' + S.gameMode + ' pts'
                   : 'Meilleur 2/3 — à ' + S.gameMode + ' pts';
  document.getElementById('undoLog').textContent = '';

  updateScoreDisplay();
  renderRoundHistory();
  renderTour();
}

// ========================
// TOUR DU JOUEUR
// ========================
const TOUR_ORDRE = [
  { equipe: 'A', joueurIdx: 0 },
  { equipe: 'B', joueurIdx: 0 },
  { equipe: 'A', joueurIdx: 1 },
  { equipe: 'B', joueurIdx: 1 },
];

function renderTour() {
  const bandeau = document.getElementById('tourBandeau');
  if (!S.currentMatch) { bandeau.style.display = 'none'; return; }
  const tour   = TOUR_ORDRE[S.tourIndex % 4];
  const joueur = S.players[tour.equipe][tour.joueurIdx];
  const equipe = tour.equipe === 'A' ? S.currentMatch.teamA : S.currentMatch.teamB;
  bandeau.style.display = '';
  document.getElementById('tourJoueur').textContent = '🎯 ' + joueur;
  document.getElementById('tourEquipe').textContent = '— ' + equipe;
  document.getElementById('scoreA').classList.toggle('score-active', tour.equipe === 'A');
  document.getElementById('scoreB').classList.toggle('score-active', tour.equipe === 'B');
}

function avancerTour() {
  S.tourIndex = (S.tourIndex + 1) % 4;
  renderTour();
}

// ========================
// SCORE + CANCELLATION + BUST
// ========================
function updateScoreDisplay() {
  document.getElementById('scoreA').textContent = S.scoreA;
  document.getElementById('scoreB').textContent = S.scoreB;
  if (S.bestOf === 3 && S.currentMatch) {
    const wA = (S.roundHistory || []).filter(r => r.winner === S.currentMatch.teamA).length;
    const wB = (S.roundHistory || []).filter(r => r.winner === S.currentMatch.teamB).length;
    document.getElementById('mancheScore').textContent = 'Manches : ' + wA + ' — ' + wB;
  } else {
    document.getElementById('mancheScore').textContent = '';
  }
}

function applyVolee(brutA, brutB) {
  if (!S.currentMatch) return;
  const limit = S.gameMode;
  const prev  = { scoreA: S.scoreA, scoreB: S.scoreB };
  const diff  = brutA - brutB;
  const gainA = diff > 0 ? diff : 0;
  const gainB = diff < 0 ? -diff : 0;
  let newA = S.scoreA + gainA;
  let newB = S.scoreB + gainB;
  let bustMsg = '';
  if (newA > limit) {
    const s = newA - limit; newA = Math.max(0, S.scoreA - s);
    bustMsg += ' 💥 Bust ' + S.currentMatch.teamA + ' (-' + s + ')';
  }
  if (newB > limit) {
    const s = newB - limit; newB = Math.max(0, S.scoreB - s);
    bustMsg += ' 💥 Bust ' + S.currentMatch.teamB + ' (-' + s + ')';
  }
  S.scoreA = newA; S.scoreB = newB;
  S.throwLog.push({ brutA, brutB, prev });
  let msg = diff === 0 ? 'Volée nulle — cancellation!'
    : gainA > 0 ? S.currentMatch.teamA + ' +' + gainA + ' pt net'
    : S.currentMatch.teamB + ' +' + gainB + ' pt net';
  document.getElementById('undoLog').textContent = msg + bustMsg;
  updateScoreDisplay();
  checkRoundWin();
}

function addPoints(team, rawPts) {
  if (!S.currentMatch) {
    document.getElementById('undoLog').textContent = 'Démarre un match d\'abord.';
    return;
  }
  if (team === 'A') voleeEnCours.A += rawPts;
  else              voleeEnCours.B += rawPts;

  // Aperçu en temps réel
  const limit = S.gameMode;
  const diff  = voleeEnCours.A - voleeEnCours.B;
  const gainA = diff > 0 ? diff : 0;
  const gainB = diff < 0 ? -diff : 0;
  let preA = S.scoreA + gainA;
  let preB = S.scoreB + gainB;
  if (preA > limit) preA = Math.max(0, S.scoreA - (preA - limit));
  if (preB > limit) preB = Math.max(0, S.scoreB - (preB - limit));
  document.getElementById('scoreA').textContent = preA;
  document.getElementById('scoreB').textContent = preB;
  document.getElementById('undoLog').textContent =
    'Volée — ' + S.currentMatch.teamA + ': ' + voleeEnCours.A +
    ' / ' + S.currentMatch.teamB + ': ' + voleeEnCours.B + '  →  Confirme pour valider';
  avancerTour();
}

function confirmerVolee() {
  if (!S.currentMatch) return;
  if (voleeEnCours.A === 0 && voleeEnCours.B === 0) {
    document.getElementById('undoLog').textContent = 'Entre au moins un score.';
    return;
  }
  applyVolee(voleeEnCours.A, voleeEnCours.B);
  voleeEnCours = { A: 0, B: 0 };
}

function checkRoundWin() {
  const limit = S.gameMode;
  if (S.scoreA < limit && S.scoreB < limit) return;
  const winnerIsA = S.scoreA >= limit;
  const winner = winnerIsA ? S.currentMatch.teamA : S.currentMatch.teamB;
  const loser  = winnerIsA ? S.currentMatch.teamB : S.currentMatch.teamA;
  const sA = S.scoreA, sB = S.scoreB;
  setTimeout(() => {
    S.roundHistory.push({ winner, loser, sA, sB });
    renderRoundHistory();
    S.scoreA = 0; S.scoreB = 0;
    S.throwLog = []; voleeEnCours = { A: 0, B: 0 };
    S.tourIndex = 0;
    updateScoreDisplay(); renderTour();
    document.getElementById('undoLog').textContent = '🎉 ' + winner + ' remporte la manche!';
    if (S.bestOf === 1) setTimeout(() => endMatch(true), 800);
  }, 400);
}

function renderRoundHistory() {
  const el = document.getElementById('roundHistory');
  if (!S.roundHistory || S.roundHistory.length === 0) {
    el.textContent = 'Aucune manche jouée.'; return;
  }
  el.innerHTML = S.roundHistory.map((r, i) =>
    `<div style="padding:5px 0;border-bottom:1px solid #E5E7EB">
      Manche ${i+1} : <strong>${r.winner}</strong> ${r.sA}–${r.sB} ${r.loser}
    </div>`).join('');
}

// ========================
// ANNULER / RESET
// ========================
function undoLast() {
  if (!S.throwLog || S.throwLog.length === 0) {
    document.getElementById('undoLog').textContent = 'Rien à annuler.'; return;
  }
  const last = S.throwLog.pop();
  S.scoreA = last.prev.scoreA; S.scoreB = last.prev.scoreB;
  document.getElementById('undoLog').textContent = 'Dernière volée annulée.';
  updateScoreDisplay();
}

function resetRound() {
  S.scoreA = 0; S.scoreB = 0; S.throwLog = [];
  voleeEnCours = { A: 0, B: 0 };
  document.getElementById('undoLog').textContent = 'Manche remise à zéro.';
  updateScoreDisplay();
}

// ========================
// TERMINER LE MATCH
// ========================
function endMatch(auto) {
  if (!S.currentMatch) return;
  const rh = S.roundHistory || [];
  const winsA = rh.filter(r => r.winner === S.currentMatch.teamA).length;
  const winsB = rh.filter(r => r.winner === S.currentMatch.teamB).length;
  const needed = S.bestOf === 1 ? 1 : 2;
  if (!auto && winsA < needed && winsB < needed) {
    if (!confirm('Aucun vainqueur encore. Terminer quand même?')) return;
  }
  const totalA = rh.reduce((s, r) => s + r.sA, 0) + S.scoreA;
  const totalB = rh.reduce((s, r) => s + r.sB, 0) + S.scoreB;
  S.currentMatch.winsA = winsA; S.currentMatch.winsB = winsB;
  S.currentMatch.scoreA = totalA; S.currentMatch.scoreB = totalB;
  S.currentMatch.done = true;
  S.results.push({ teamA: S.currentMatch.teamA, teamB: S.currentMatch.teamB, winsA, winsB, format: S.bestOf });
  updateStandings(S.currentMatch);
  S.totalMatchesPlayed++; S.totalPoints += totalA + totalB;
  const field = S.fields.find(f => f.id === S.currentFieldId);
  if (field) field.match = null;
  S.currentMatch = null; S.currentFieldId = null;
  S.scoreA = 0; S.scoreB = 0; S.throwLog = []; S.roundHistory = [];
  voleeEnCours = { A: 0, B: 0 };
  if (S.mode === 'tournoi') assignMatches();
  renderAll(); switchTab('classement');
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
      const pA = (S.allPlayers || {})[f.match.teamA] || ['J1','J2'];
      const pB = (S.allPlayers || {})[f.match.teamB] || ['J1','J2'];
      body.innerHTML = `
        <div class="match-vs">
          <div class="match-team"><strong>${f.match.teamA}</strong><span class="match-players">${pA[0]} &amp; ${pA[1]}</span></div>
          <div class="match-vs-sep">vs</div>
          <div class="match-team"><strong>${f.match.teamB}</strong><span class="match-players">${pB[0]} &amp; ${pB[1]}</span></div>
        </div>
        <span class="badge badge-blue">En attente du match</span>`;
      const btn = document.createElement('button');
      btn.className = 'btn btn-primary';
      btn.style.marginTop = '6px';
      btn.textContent = '▶ Démarrer le match';
      btn.addEventListener('click', () => openMatch(f.id));
      body.appendChild(btn);
    } else {
      const remaining = S.matches.filter(m => !m.done).length;
      body.innerHTML = `<div class="muted">${remaining > 0 ? 'En attente...' : 'Terminé'}</div>
        <span class="badge badge-gray">${remaining} match(s) restant(s)</span>`;
    }
    card.appendChild(hdr); card.appendChild(body); g.appendChild(card);
  });

  const sched = document.getElementById('scheduleList');
  const upcoming = S.matches.filter(m => !m.done).slice(0, 8);
  sched.innerHTML = upcoming.length
    ? upcoming.map((m, i) => {
        const pA = (S.allPlayers || {})[m.teamA] || [];
        const pB = (S.allPlayers || {})[m.teamB] || [];
        const jA = pA.length ? ` <span style="color:#6B7280;font-size:11px">(${pA.join(' & ')})</span>` : '';
        const jB = pB.length ? ` <span style="color:#6B7280;font-size:11px">(${pB.join(' & ')})</span>` : '';
        return `<div style="padding:6px 0;border-bottom:1px solid #E5E7EB;font-size:13px">
          ${i+1}. <strong>${m.teamA}</strong>${jA} vs <strong>${m.teamB}</strong>${jB}</div>`;
      }).join('')
    : '<span style="color:#9CA3AF">Tous les matchs sont terminés.</span>';
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
    tr.innerHTML = `<td>${i+1}</td><td>${t.team}</td><td>${t.played}</td><td>${t.wins}</td><td>${t.losses}</td><td>${t.pf}</td><td>${t.pa}</td><td>${t.diff > 0 ? '+' : ''}${t.diff}</td>`;
    body.appendChild(tr);
  });
  document.getElementById('statM').textContent = S.totalMatchesPlayed;
  document.getElementById('statP').textContent = S.totalPoints;
  document.getElementById('statA').textContent = S.totalMatchesPlayed
    ? (S.totalPoints / S.totalMatchesPlayed).toFixed(1) : '—';
  const rc = document.getElementById('resultsCard');
  const rl = document.getElementById('resultsList');
  if (S.results.length > 0) {
    rc.style.display = '';
    rl.innerHTML = S.results.map(r => {
      const w = r.winsA >= r.winsB ? r.teamA : r.teamB;
      const l = r.winsA >= r.winsB ? r.teamB : r.teamA;
      const sc = r.winsA >= r.winsB ? `${r.winsA}–${r.winsB}` : `${r.winsB}–${r.winsA}`;
      return `<div style="padding:4px 0;border-bottom:1px solid #E5E7EB"><strong>${w}</strong> bat ${l} (${sc} manches)</div>`;
    }).join('');
  }
}

// ========================
// RENDER ALL
// ========================
function renderAll() {
  renderFields(); renderStandings(); updateScoreDisplay(); renderRoundHistory();
  if (S.currentMatch) renderTour();
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
// PAVÉ NUMÉRIQUE
// ========================
let padInputA = '', padInputB = '';
let padConfirmed = { A: 0, B: 0, hasA: false, hasB: false };

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
    document.getElementById('setupTournoi').style.display = t.dataset.mode === 'tournoi' ? '' : 'none';
    document.getElementById('setupSolo').style.display    = t.dataset.mode === 'solo'    ? '' : 'none';
  });
});

document.getElementById('teamCount').addEventListener('change', e => buildTeamNames(parseInt(e.target.value)));
document.getElementById('startTournoi').addEventListener('click', startTournoi);
document.getElementById('startSolo').addEventListener('click', startSolo);

document.querySelectorAll('[data-type]').forEach(btn => {
  btn.addEventListener('click', () => addPoints(btn.dataset.team, getScoringTable()[btn.dataset.type]));
});

document.getElementById('confirmerVoleeBtn').addEventListener('click', confirmerVolee);
document.getElementById('undoBtn').addEventListener('click', undoLast);
document.getElementById('resetRoundBtn').addEventListener('click', resetRound);
document.getElementById('endMatchBtn').addEventListener('click', () => endMatch(false));

document.getElementById('gameModeSelect').addEventListener('change', e => {
  S.gameMode = parseInt(e.target.value);
  document.getElementById('gameModeSelectSolo').value = e.target.value;
  renderRules();
});
document.getElementById('gameModeSelectSolo').addEventListener('change', e => {
  S.gameMode = parseInt(e.target.value);
  document.getElementById('gameModeSelect').value = e.target.value;
  renderRules();
});
document.getElementById('bestOfSelect').addEventListener('change', e => {
  S.bestOf = parseInt(e.target.value);
  document.getElementById('bestOfSelectSolo').value = e.target.value;
  renderRules();
});
document.getElementById('bestOfSelectSolo').addEventListener('change', e => {
  S.bestOf = parseInt(e.target.value);
  document.getElementById('bestOfSelect').value = e.target.value;
  renderRules();
});

document.getElementById('toggleBtns').addEventListener('click', () => {
  document.getElementById('toggleBtns').classList.add('active');
  document.getElementById('togglePad').classList.remove('active');
  document.getElementById('modeBtns').style.display = '';
  document.getElementById('modePad').style.display = 'none';
});

document.getElementById('togglePad').addEventListener('click', () => {
  document.getElementById('togglePad').classList.add('active');
  document.getElementById('toggleBtns').classList.remove('active');
  document.getElementById('modeBtns').style.display = 'none';
  document.getElementById('modePad').style.display = '';
  if (S.currentMatch) {
    document.getElementById('padLabelA').textContent = S.currentMatch.teamA;
    document.getElementById('padLabelB').textContent = S.currentMatch.teamB;
  }
  padInputA = ''; padInputB = '';
  padConfirmed = { A: 0, B: 0, hasA: false, hasB: false };
  document.getElementById('padDisplayA').textContent = '0';
  document.getElementById('padDisplayB').textContent = '0';
});

document.querySelectorAll('.pad-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const pad = btn.dataset.pad, val = btn.dataset.val, isA = pad === 'A';
    let cur = isA ? padInputA : padInputB;
    if (val === 'C') {
      cur = '';
    } else if (val === 'OK') {
      const pts = parseInt(cur) || 0;
      if (isA) { padConfirmed.A = pts; padConfirmed.hasA = true; }
      else      { padConfirmed.B = pts; padConfirmed.hasB = true; }
      cur = '';
      if (padConfirmed.hasA && padConfirmed.hasB) {
        applyVolee(padConfirmed.A, padConfirmed.B);
        padConfirmed = { A: 0, B: 0, hasA: false, hasB: false };
        padInputA = ''; padInputB = '';
        document.getElementById('padDisplayA').textContent = '0';
        document.getElementById('padDisplayB').textContent = '0';
        return;
      }
    } else {
      if (cur.length < 2) cur += val;
    }
    if (isA) padInputA = cur; else padInputB = cur;
    document.getElementById(isA ? 'padDisplayA' : 'padDisplayB').textContent = cur || '0';
  });
});

// ========================
// BOUTON QUITTER
// ========================
document.getElementById('logoutBtn').addEventListener('click', () => {
  if (S.currentMatch || S.totalMatchesPlayed > 0) {
    if (!confirm('Retourner à l\'accueil? La partie sera perdue.')) return;
  }
  Object.assign(S, {
    mode: 'tournoi', teams: [], fields: [], matches: [], nextMatchIdx: 0,
    standings: [], results: [], currentMatch: null, currentFieldId: null,
    scoreA: 0, scoreB: 0, throwLog: [], roundHistory: [],
    totalMatchesPlayed: 0, totalPoints: 0,
    allPlayers: {}, players: { A: ['J1','J2'], B: ['J1','J2'] }, tourIndex: 0,
  });
  voleeEnCours = { A: 0, B: 0 };
  buildTeamNames(6); renderRules(); switchTab('setup');
  const splash = document.getElementById('splashScreen');
  const app    = document.getElementById('appContent');
  app.style.display = 'none';
  splash.style.transition = 'none';
  splash.style.opacity = '0';
  splash.style.display = 'flex';
  setTimeout(() => { splash.style.transition = 'opacity 0.4s'; splash.style.opacity = '1'; }, 30);
  if (window._sliderReset) window._sliderReset();
});

// ========================
// SPLASH SCREEN SLIDER
// ========================
(function() {
  const splash = document.getElementById('splashScreen');
  const app    = document.getElementById('appContent');
  const thumb  = document.getElementById('sliderThumb');
  const track  = document.querySelector('.slider-track');
  const label  = document.querySelector('.slider-label');
  if (!splash || !thumb || !track) return;

  let dragging    = false;
  let touchStartX = 0;
  let thumbStartX = 0;
  let currentX    = 0;

  function getMax() { return track.offsetWidth - thumb.offsetWidth - 10; }

  function enter() {
    splash.style.transition = 'opacity 0.45s ease';
    splash.style.opacity = '0';
    setTimeout(() => {
      splash.style.display = 'none';
      app.style.display = 'flex';
      app.style.flexDirection = 'column';
    }, 450);
  }

  function reset() {
    currentX = 0; thumbStartX = 0;
    thumb.style.transition = 'transform 0.25s ease';
    thumb.style.transform = 'translateX(0px)';
    if (label) label.style.opacity = '1';
  }
  window._sliderReset = reset;

  function onStart(e) {
    e.preventDefault();
    dragging    = true;
    touchStartX = e.touches ? e.touches[0].clientX : e.clientX;
    thumbStartX = currentX;
    thumb.style.transition = 'none';
  }

  function onMove(e) {
    if (!dragging) return;
    e.preventDefault();
    const cx    = e.touches ? e.touches[0].clientX : e.clientX;
    const max   = getMax();
    const x     = Math.max(0, Math.min(thumbStartX + (cx - touchStartX), max));
    currentX    = x;
    thumb.style.transform = 'translateX(' + x + 'px)';
    if (label && max > 0) label.style.opacity = String(1 - x / max);
  }

  function onEnd() {
    if (!dragging) return;
    dragging = false;
    const max = getMax();
    if (max > 0 && currentX >= max * 0.68) {
      thumb.style.transition = 'transform 0.15s ease';
      thumb.style.transform = 'translateX(' + max + 'px)';
      setTimeout(enter, 180);
    } else {
      reset();
    }
  }

  thumb.addEventListener('touchstart', onStart, { passive: false });
  thumb.addEventListener('mousedown',  onStart);
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('mousemove', onMove);
  document.addEventListener('touchend',  onEnd);
  document.addEventListener('mouseup',   onEnd);
})();

// ========================
// INIT
// ========================
buildTeamNames(6);
renderRules();
