import { demarrer, bandeauStatut, avatar, rangHtml, roleFr, imgChamp, esc, fmtPct, fmtNb, getMoi, TIERS_FR } from './app.js';

const d = await demarrer('matchup');
if (d) {
  const main = document.querySelector('main');
  const params = new URLSearchParams(location.search);
  const js = d.joueurs;
  let a = js.find((x) => x.id === params.get('a')) || js.find((x) => x.id === getMoi()) || js[0];
  let b = js.find((x) => x.id === params.get('b')) || js.find((x) => x !== a);

  const options = (sel) => js.map((x) => `<option value="${esc(x.id)}" ${x === sel ? 'selected' : ''}>${esc(x.nom)}</option>`).join('');
  const rangTxt = (r) => (r ? `${TIERS_FR[r.tier]} ${['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(r.tier) ? '' : r.division} · ${r.lp} LP` : 'Non classé');

  function rendre() {
    if (!a || !b) { main.innerHTML = '<div class="vide">Il faut au moins deux joueurs pour comparer.</div>'; return; }
    history.replaceState(null, '', `?a=${encodeURIComponent(a.id)}&b=${encodeURIComponent(b.id)}`);
    // [libellé, valeur A, valeur B, affichage, plus grand = mieux ?]
    const lignes = [
      ['Position', a.position, b.position, (v) => `${v}<sup>${v === 1 ? 'er' : 'e'}</sup>`, false],
      ['Winrate', a.winrateAjuste, b.winrateAjuste, fmtPct, true],
      ['Rang', a.scoreRang, b.scoreRang, (v, j) => rangTxt(j.rang), true],
      ['Victoires', a.victoires, b.victoires, String, true],
      ['Games jouées', a.games, b.games, String, null],
      ['KDA', a.moyennes.kda, b.moyennes.kda, String, true],
      ['Kills / game', a.moyennes.k, b.moyennes.k, String, true],
      ['Morts / game', a.moyennes.d, b.moyennes.d, String, false],
      ['Assists / game', a.moyennes.a, b.moyennes.a, String, true],
      ['CS / min', a.moyennes.csMin, b.moyennes.csMin, String, true],
      ['Dégâts moyens', a.moyennes.degats, b.moyennes.degats, fmtNb, true],
      ['Participation kills', a.moyennes.kp, b.moyennes.kp, (v) => `${v} %`, true],
      ['Vision', a.moyennes.vision, b.moyennes.vision, String, true],
      ['Durée moy. (min)', a.moyennes.dureeMin, b.moyennes.dureeMin, String, null],
    ];
    let scoreA = 0, scoreB = 0;
    const html = lignes.map(([lib, va, vb, f, plus]) => {
      let ma = false, mb = false;
      if (plus !== null && va !== vb) { ma = plus ? va > vb : va < vb; mb = !ma; ma ? scoreA++ : scoreB++; }
      return `<div class="comp-ligne"><div class="g"><span class="val num ${ma ? 'mieux' : ''}">${f(va, a)}</span></div>
        <div class="lib">${lib}</div><div class="dr"><span class="val num ${mb ? 'mieux' : ''}">${f(vb, b)}</span></div></div>`;
    }).join('');

    const duel = a.confrontations[b.id];
    const duo = a.ensemble[b.id];
    const champsCommuns = a.champions.filter((c) => b.champions.some((x) => x.nom === c.nom)).map((c) => c.nom);

    main.innerHTML = `${bandeauStatut(d)}<h1 style="text-align:center">1V1 · Matchup</h1>
      <section class="versus">
        <div class="cote"><select id="sel-a" aria-label="Joueur 1">${options(a)}</select>${avatar(a, 'grand')}
          <div><div style="font-weight:700;color:var(--or-clair);font-size:1.1rem">${esc(a.nom)}</div><div class="muted">${roleFr(a.role)}</div></div>${rangHtml(a.rang)}</div>
        <div class="vs">VS</div>
        <div class="cote"><select id="sel-b" aria-label="Joueur 2">${options(b)}</select>${avatar(b, 'grand')}
          <div><div style="font-weight:700;color:var(--or-clair);font-size:1.1rem">${esc(b.nom)}</div><div class="muted">${roleFr(b.role)}</div></div>${rangHtml(b.rang)}</div>
      </section>
      <div class="score-duel">${scoreA} <span class="muted">—</span> ${scoreB}<div class="muted" style="font-size:.75rem;font-family:Inter,sans-serif;letter-spacing:.1em">STATS REMPORTÉES</div></div>
      <div class="comparaison">${html}</div>
      <h2>Face à face</h2>
      <div class="grille tuiles">
        <div class="tuile"><div class="lib">Parties l'un contre l'autre</div><div class="val num">${duel ? `${duel.victoires} – ${duel.games - duel.victoires}` : '—'}</div>
          <div class="sous">${duel ? `${duel.games} game(s), victoires de ${esc(a.nom)} – ${esc(b.nom)}` : 'Jamais affrontés en Solo/Duo'}</div></div>
        <div class="tuile"><div class="lib">Dans la même équipe</div><div class="val num">${duo ? `${duo.victoires}V ${duo.games - duo.victoires}D` : '—'}</div>
          <div class="sous">${duo ? `${duo.games} game(s) ensemble` : 'Jamais dans la même équipe'}</div></div>
        <div class="tuile"><div class="lib">Champions en commun</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${champsCommuns.length ? champsCommuns.map((c) => imgChamp(c, 'avatar')).join('') : '<span class="muted">Aucun</span>'}</div></div>
      </div>`;
    main.querySelector('#sel-a').addEventListener('change', (e) => { a = js.find((x) => x.id === e.target.value); rendre(); });
    main.querySelector('#sel-b').addEventListener('change', (e) => { b = js.find((x) => x.id === e.target.value); rendre(); });
  }
  rendre();
}
