import { demarrer, bandeauStatut, avatar, rangHtml, roleHtml, barreWr, lienJoueur, getMoi, esc, fmtPct } from './app.js';

const d = await demarrer('classement');
if (d) {
  const c = d.challenge;
  const actif = c.phase === 'en-cours' || c.phase === 'termine';
  const moi = d.joueurs.find((j) => j.id === getMoi());
  const main = document.querySelector('main');

  const hero = `<section class="hero"><div class="sous-titre">League of Legends · Solo/Duo</div>
    <h1>${esc(c.nom)}</h1><p>${actif ? 'Le meilleur winrate sur ' + c.semaines + ' semaines remporte le challenge.' : 'En attendant le début du challenge.'}</p></section>`;

  let blocMoi = '';
  if (moi) {
    const detail = c.phase === 'en-cours'
      ? `<div><div class="muted">Cette semaine</div><div class="gros num">${moi.gamesSemaine} / ${c.gamesMaxParSemaine} games</div>
         <div class="${moi.restantSemaine === 0 ? 'quota plein' : 'muted'}">${moi.restantSemaine === 0 ? '⛔ Plafond atteint : interdiction de relancer sur ce compte cette semaine' : `Il te reste <strong>${moi.restantSemaine}</strong> game(s) cette semaine`}</div></div>`
      : `<div><div class="muted">Winrate${actif ? '' : ' de la saison'}</div><div class="gros num">${fmtPct(moi.winrateAjuste)}</div></div>`;
    blocMoi = `<a class="moi" href="${lienJoueur(moi.id)}">${avatar(moi)}${detail}
      <div style="text-align:right"><div class="muted">Position</div><div class="gros">${moi.position}<sup>${moi.position === 1 ? 'er' : 'e'}</sup></div></div></a>`;
  }

  const top = d.joueurs.filter((j) => j.games > 0).slice(0, 3);
  const podium = top.length === 3 ? `<section class="podium">${[top[1], top[0], top[2]].map((j) => `
      <a class="marche p${j.position}" href="${lienJoueur(j.id)}"><div class="place">${j.position}</div>${avatar(j)}
        <div class="nom">${esc(j.nom)}</div><div class="wr num">${fmtPct(j.winrateAjuste)}</div>
        <div class="muted num">${j.victoires}V · ${j.defaites}D</div></a>`).join('')}</section>` : '';

  const lignes = d.joueurs.map((j) => {
    let statut = '';
    if (j.erreur) statut = `<span title="${esc(j.erreur)}">⚠️</span>`;
    else if (j.sanctions.length || j.alertes.length) statut = `<span title="${esc([...j.sanctions.map((s) => s.raison), ...j.alertes].join('\n'))}">🚩</span>`;
    if (c.phase === 'termine') statut += j.eligible ? ' ✅' : ' <span title="Quota minimum non atteint">❌</span>';
    const quota = c.phase === 'en-cours'
      ? `<td class="quota num ${j.restantSemaine === 0 ? 'plein' : ''}">${j.gamesSemaine}/${c.gamesMaxParSemaine}</td>` : '';
    const total = actif ? `<td class="num col-opt ${j.eligible ? '' : 'muted'}">${j.games}/${c.gamesMinTotal}</td>` : '';
    return `<tr data-id="${esc(j.id)}" class="${j.id === moi?.id ? 'c-moi' : ''}">
      <td class="pos">${j.position}</td>
      <td><div class="joueur">${avatar(j)}<div><div class="nom">${esc(j.nom)}</div><div class="rid">${esc(j.riotId)}</div></div></div></td>
      <td class="col-opt">${roleHtml(j.role)}</td>
      <td>${rangHtml(j.rang)}</td>
      <td>${barreWr(j.winrateAjuste)}${j.malus ? `<div class="malus">dont −${j.malus} pts de malus</div>` : ''}</td>
      <td class="wl num"><span class="v">${j.victoires}V</span> · <span class="d">${j.defaites}D</span></td>
      ${quota}${total}<td class="statut">${statut}</td></tr>`;
  }).join('');

  main.innerHTML = `${hero}${bandeauStatut(d)}${blocMoi}${podium}
    <h2>Classement</h2>
    <div class="tableau-wrap"><table>
      <thead><tr><th>#</th><th>Joueur</th><th class="col-opt">Rôle</th><th>Rang</th><th>Winrate</th><th>V / D</th>
        ${c.phase === 'en-cours' ? '<th>Semaine</th>' : ''}${actif ? '<th class="col-opt">Total</th>' : ''}<th></th></tr></thead>
      <tbody>${lignes || '<tr><td colspan="9" class="vide">Aucun joueur inscrit pour le moment.</td></tr>'}</tbody>
    </table></div>
    <p class="muted" style="font-size:.8rem;margin-top:10px">${actif
      ? `Winrate calculé uniquement sur les parties Solo/Duo du challenge${c.gamesHorsQuota === 'exclure' ? ', hors parties au-delà du plafond hebdomadaire' : ''}. 🚩 = infraction ou point à vérifier.`
      : 'Winrate de la saison Solo/Duo en cours. Le vrai classement démarrera avec le challenge.'}</p>`;

  main.querySelectorAll('tbody tr[data-id]').forEach((tr) => tr.addEventListener('click', () => (location.href = lienJoueur(tr.dataset.id))));
}
