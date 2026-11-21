import { demarrer, bandeauStatut, carton, avatar, rangHtml, roleHtml, imgChamp, esc, fmtPct, fmtNb, fmtDate, depuis, getMoi, setMoi } from './app.js';

const d = await demarrer('');
if (d) {
  const main = document.querySelector('main');
  const id = new URLSearchParams(location.search).get('id') || getMoi();
  const j = d.joueurs.find((x) => x.id === id);
  const c = d.challenge;
  const actif = c.phase === 'en-cours' || c.phase === 'termine';
  const nomDe = (pid) => d.joueurs.find((x) => x.id === pid)?.nom ?? pid;

  if (!j) {
    main.innerHTML = `<div class="vide"><h2>Choisis un joueur</h2><p>${d.joueurs.map((x) => `<a href="?id=${encodeURIComponent(x.id)}">${esc(x.nom)}</a>`).join(' · ')}</p></div>`;
  } else {
    document.title = `${j.nom} · SoloQ Challenge Team Ultra 2`;
    const m = j.moyennes;
    const tuile = (lib, val, sous = '') => `<div class="tuile"><div class="lib">${lib}</div><div class="val num">${val}</div>${sous ? `<div class="sous">${sous}</div>` : ''}</div>`;

    const semaines = actif ? `<h2>Quota de games par semaine</h2><div class="semaines">${j.semaines.map((s) => {
      const plein = s.comptees >= c.gamesMaxParSemaine;
      return `<div class="carte semaine ${s.n === c.semaine && c.phase === 'en-cours' ? 'courante' : ''}">
        <h3>Semaine ${s.n}${s.n === c.semaine && c.phase === 'en-cours' ? ' <span class="tag">en cours</span>' : ''}</h3>
        <div class="piste"><div class="remplie ${plein ? 'plein' : ''}" style="width:${(s.comptees / c.gamesMaxParSemaine) * 100}%"></div></div>
        <div class="num">${s.comptees} / ${c.gamesMaxParSemaine} games · ${s.victoires}V ${s.comptees - s.victoires}D</div>
        ${s.horsQuota ? `<div class="quota plein">+${s.horsQuota} hors quota</div>` : ''}</div>`;
    }).join('')}</div>` : '';

    const infractions = [...j.sanctions.map((s) => `<li class="sanction">${carton(s.malusWinrate) || '<span class="carton"></span>'} ${esc(s.raison)}${s.date ? ` · ${fmtDate(s.date)}` : ''}</li>`),
      ...j.alertes.map((a) => `<li>🚩 ${esc(a)}</li>`)];

    const champions = j.champions.length ? `<div class="tableau-wrap"><table><thead><tr><th>Champion</th><th>Games</th><th>Winrate</th><th>KDA</th></tr></thead><tbody>
      ${j.champions.slice(0, 8).map((ch) => `<tr style="cursor:default"><td><div class="champ-ligne">${imgChamp(ch.nom)}${esc(ch.nom)}</div></td><td class="num">${ch.games}</td><td class="num">${fmtPct(ch.winrate)}</td><td class="num">${ch.kda}</td></tr>`).join('')}
      </tbody></table></div>` : '<div class="carte vide">Aucune partie pour le moment.</div>';

    const parties = j.historique.length ? j.historique.map((g) => `
      <div class="partie ${g.win ? 'v' : 'd'}"><div class="liseret"></div>${imgChamp(g.champ, 'champ')}
        <div><div class="res">${g.win ? 'Victoire' : 'Défaite'}${g.horsQuota ? '<span class="tag hq">hors quota</span>' : ''}</div>
          <div class="muted" style="font-size:.8rem">${esc(g.champ)} · ${Math.round(g.duree / 60)} min · ${depuis(g.t)}
          ${g.avec.length ? ` · avec ${g.avec.map(nomDe).map(esc).join(', ')}` : ''}${g.contre.length ? ` · contre ${g.contre.map(nomDe).map(esc).join(', ')}` : ''}</div></div>
        <div class="num" style="font-weight:600">${g.k} / <span style="color:var(--defaite)">${g.d}</span> / ${g.a}</div>
        <div class="num muted cache-mobile">${g.cs} CS</div></div>`).join('') : '<div class="carte vide">Aucune partie pour le moment.</div>';

    const estMoi = getMoi() === j.id;
    main.innerHTML = `${bandeauStatut(d)}
      <section class="profil-tete">${avatar(j, 'grand')}
        <div class="infos"><h1>${esc(j.nom)}</h1><div class="muted">${esc(j.riotId)}${j.niveau ? ` · niveau ${j.niveau}` : ''}</div>
          <div style="display:flex;gap:20px;align-items:center;margin-top:10px;flex-wrap:wrap">${roleHtml(j.role)}${rangHtml(j.rang)}
          <button class="bouton ${estMoi ? '' : 'bouton-or'}" id="btn-moi">${estMoi ? 'Se déconnecter' : "C'est moi"}</button></div></div>
        <div class="position">${j.position}<small>sur ${d.joueurs.length}</small></div>
      </section>
      ${j.erreur ? `<div class="bandeau erreur">Dernière mise à jour en échec : ${esc(j.erreur)}</div>` : ''}
      <div class="grille tuiles">
        ${tuile('Winrate', fmtPct(j.winrateAjuste), j.malus ? `${fmtPct(j.winrate)} ${carton(j.malus)}` : actif ? 'challenge' : 'saison en cours')}
        ${tuile('Victoires / Défaites', `<span style="color:var(--victoire)">${j.victoires}</span> / <span style="color:var(--defaite)">${j.defaites}</span>`, `${j.games} games`)}
        ${c.phase === 'en-cours' ? tuile('Restant cette semaine', j.restantSemaine, j.restantSemaine === 0 ? '⛔ ne plus relancer' : `sur ${c.gamesMaxParSemaine}`) : ''}
        ${actif ? tuile('Quota minimum', `${j.games} / ${c.gamesMinTotal}`, j.eligible ? '✅ atteint' : `encore ${c.gamesMinTotal - j.games} games`) : ''}
        ${tuile('KDA', m.kda, `${m.k} / ${m.d} / ${m.a}`)}
        ${tuile('CS / min', m.csMin)}
        ${tuile('Dégâts moyens', fmtNb(m.degats))}
        ${tuile('Participation kills', `${m.kp} %`)}
        ${tuile('Score de vision', m.vision)}
      </div>
      ${infractions.length ? `<h2>Sanctions & infractions</h2><ul class="liste-alertes">${infractions.join('')}</ul>` : ''}
      ${semaines}
      ${j.progression.length > 1 ? `<h2>Évolution du winrate</h2><div class="carte graphique">${graphique(j.progression)}</div>` : ''}
      <h2>Champions${actif ? '' : ` <span class="muted" style="font-size:.8rem">(${c.preSaisonGames} dernières games)</span>`}</h2>${champions}
      <h2>Dernières parties</h2>${parties}`;

    document.getElementById('btn-moi').addEventListener('click', () => { setMoi(estMoi ? null : j.id); location.reload(); });
  }
}

function graphique(points) {
  const L = 800, H = 220, mg = { g: 40, d: 12, h: 12, b: 24 };
  const w = L - mg.g - mg.d, h = H - mg.h - mg.b;
  const x = (i) => mg.g + (i / (points.length - 1)) * w;
  const y = (v) => mg.h + (1 - v / 100) * h;
  const chemin = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.wr).toFixed(1)}`).join('');
  const grille = [0, 25, 50, 75, 100].map((v) => `<line x1="${mg.g}" x2="${L - mg.d}" y1="${y(v)}" y2="${y(v)}" stroke="${v === 50 ? '#785a28' : '#1e2d3d'}" ${v === 50 ? 'stroke-dasharray="4 4"' : ''}/>
    <text x="${mg.g - 8}" y="${y(v) + 4}" text-anchor="end" fill="#8b97a6" font-size="11">${v}%</text>`).join('');
  const dernier = points[points.length - 1];
  return `<svg viewBox="0 0 ${L} ${H}" role="img" aria-label="Évolution du winrate, actuellement ${dernier.wr} %">
    ${grille}
    <path d="${chemin}L${x(points.length - 1)},${y(0)}L${x(0)},${y(0)}Z" fill="#0ac8b9" opacity=".08"/>
    <path d="${chemin}" fill="none" stroke="#0ac8b9" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="${x(points.length - 1)}" cy="${y(dernier.wr)}" r="4" fill="#0ac8b9"/>
    <text x="${mg.g}" y="${H - 6}" fill="#8b97a6" font-size="11">Game 1</text>
    <text x="${L - mg.d}" y="${H - 6}" fill="#8b97a6" font-size="11" text-anchor="end">Game ${points.length}</text>
  </svg>`;
}
