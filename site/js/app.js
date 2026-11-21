// Fonctions partagées par toutes les pages.

export const TIERS_FR = {
  IRON: 'Fer', BRONZE: 'Bronze', SILVER: 'Argent', GOLD: 'Or', PLATINUM: 'Platine', EMERALD: 'Émeraude',
  DIAMOND: 'Diamant', MASTER: 'Maître', GRANDMASTER: 'Grand Maître', CHALLENGER: 'Challenger',
};
const ROLES = {
  TOP: { fr: 'Top', icone: 'top' }, JUNGLE: { fr: 'Jungle', icone: 'jungle' },
  MIDDLE: { fr: 'Mid', icone: 'middle' }, MID: { fr: 'Mid', icone: 'middle' },
  BOTTOM: { fr: 'ADC', icone: 'bottom' }, ADC: { fr: 'ADC', icone: 'bottom' },
  UTILITY: { fr: 'Support', icone: 'utility' }, SUPPORT: { fr: 'Support', icone: 'utility' },
};
const PHASES = { 'pre-saison': 'Pré-saison', 'a-venir': 'Bientôt', 'en-cours': 'En cours', termine: 'Terminé' };

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const fmtPct = (x) => `${Number(x).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
export const fmtNb = (x) => Number(x).toLocaleString('fr-FR');
export const fmtDate = (iso, opts = { day: 'numeric', month: 'long' }) => new Date(iso).toLocaleDateString('fr-FR', opts);
export const depuis = (t) => {
  const min = Math.round((Date.now() - new Date(t)) / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.round(h / 24)} j`;
};

let donnees;
export const urlChamp = (c) => `https://ddragon.leagueoflegends.com/cdn/${donnees.ddragon}/img/champion/${c}.png`;
export const urlIcone = (id) => `https://ddragon.leagueoflegends.com/cdn/${donnees.ddragon}/img/profileicon/${id ?? 29}.png`;
const urlEmbleme = (t) => `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-mini-crests/${t.toLowerCase()}.svg`;
const urlRole = (r) => `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-${r}.png`;
const cacherSiErreur = `onerror="this.style.visibility='hidden'"`;

export const avatar = (j, cls = '') => `<img class="avatar ${cls}" src="${urlIcone(j.icone)}" alt="" loading="lazy" ${cacherSiErreur}>`;
export const imgChamp = (c, cls = '') => `<img class="${cls}" src="${urlChamp(c)}" alt="${esc(c)}" title="${esc(c)}" loading="lazy" ${cacherSiErreur}>`;

export function rangHtml(r) {
  if (!r) return `<div class="rang"><div><div class="tier t-UNRANKED">Non classé</div></div></div>`;
  const apex = ['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(r.tier);
  return `<div class="rang"><img src="${urlEmbleme(r.tier)}" alt="" ${cacherSiErreur}>
    <div><div class="tier t-${r.tier}">${TIERS_FR[r.tier] ?? r.tier}${apex ? '' : ' ' + r.division}</div><div class="lp num">${r.lp} LP</div></div></div>`;
}
export function roleHtml(role) {
  const r = ROLES[(role || '').toUpperCase()];
  if (!r) return '<span class="role">—</span>';
  return `<span class="role"><img src="${urlRole(r.icone)}" alt="" ${cacherSiErreur}>${r.fr}</span>`;
}
export const roleFr = (role) => ROLES[(role || '').toUpperCase()]?.fr ?? '—';
export const barreWr = (wr) => `<div class="barre-wr"><div class="piste"><div class="remplie" style="width:${Math.max(0, Math.min(100, wr))}%"></div></div><span class="val num">${fmtPct(wr)}</span></div>`;
export const lienJoueur = (id) => `joueur.html?id=${encodeURIComponent(id)}`;

// ---------- Profil "connecté" (mémorisé dans le navigateur)
const CLE_MOI = 'soloq-ultra2-moi';
export const getMoi = () => { try { return localStorage.getItem(CLE_MOI); } catch { return null; } };
export const setMoi = (id) => { try { id ? localStorage.setItem(CLE_MOI, id) : localStorage.removeItem(CLE_MOI); } catch {} };

// ---------- Mise en page commune
export function enTete(actif) {
  const liens = [['index.html', 'Classement', 'classement'], ['matchup.html', '1V1 · Matchup', 'matchup'], ['regles.html', 'Règles', 'regles']];
  document.body.insertAdjacentHTML('afterbegin', `
    <header class="entete"><div class="entete-int">
      <a class="logo" href="index.html"><span class="losange"></span>SoloQ Challenge <span>Ultra 2</span></a>
      <nav>${liens.map(([h, l, k]) => `<a href="${h}" class="${k === actif ? 'actif' : ''}">${l}</a>`).join('')}</nav>
      <div class="profil-zone" id="profil-zone"></div>
    </div></header>`);
  document.body.insertAdjacentHTML('beforeend', `
    <footer>
      <p>SoloQ Challenge Team Ultra 2 — site entre amis, mis à jour automatiquement.</p>
      <p>SoloQ Challenge Team Ultra 2 isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.</p>
    </footer>`);
}

function zoneProfil(d) {
  const zone = document.getElementById('profil-zone');
  const moi = getMoi();
  const options = d.joueurs.slice().sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
    .map((j) => `<option value="${esc(j.id)}" ${j.id === moi ? 'selected' : ''}>${esc(j.nom)}</option>`).join('');
  zone.innerHTML = `<label for="choix-moi" class="muted">Mon profil</label>
    <select id="choix-moi"><option value="">— Se connecter —</option>${options}</select>`;
  zone.querySelector('select').addEventListener('change', (e) => { setMoi(e.target.value); location.reload(); });
}

export function bandeauStatut(d) {
  const c = d.challenge;
  let texte = '';
  if (c.phase === 'pre-saison') texte = `Dates du challenge pas encore fixées : classement basé sur le winrate de la saison en cours.`;
  else if (c.phase === 'a-venir') texte = `Début le <strong>${fmtDate(c.debut, { weekday: 'long', day: 'numeric', month: 'long' })}</strong>.`;
  else if (c.phase === 'en-cours') texte = `Semaine <strong>${c.semaine}/${c.semaines}</strong> · fin le ${fmtDate(c.fin)}`;
  else texte = `Challenge terminé le ${fmtDate(c.fin)}.`;
  return `${d.demo ? `<div class="bandeau demo">⚠️ Données de démonstration : ajoute la clé API Riot et les vrais joueurs pour afficher le vrai classement.</div>` : ''}
    <div class="bandeau"><span class="pastille ${c.phase}">${PHASES[c.phase]}</span><span>${texte}</span>
    <span class="muted" style="margin-left:auto">Mis à jour ${depuis(d.majLe)}</span></div>`;
}

export async function demarrer(actif) {
  enTete(actif);
  const main = document.querySelector('main');
  main.innerHTML = '<div class="chargement">Chargement…</div>';
  try {
    const res = await fetch(`data/stats.json?t=${Date.now()}`);
    if (!res.ok) throw new Error(res.status);
    donnees = await res.json();
  } catch {
    main.innerHTML = `<div class="bandeau erreur">Impossible de charger les statistiques (data/stats.json). Elles seront disponibles après la première mise à jour automatique.</div>`;
    return null;
  }
  zoneProfil(donnees);
  return donnees;
}
