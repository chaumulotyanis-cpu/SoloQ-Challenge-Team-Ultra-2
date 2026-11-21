// Espace admin : le mot de passe déchiffre un jeton GitHub (stocké chiffré dans admin.json)
// qui permet de modifier config.json directement dans le dépôt. Sans le mot de passe, aucune
// modification n'est possible.
import { enTete, esc } from './app.js';

const enc = new TextEncoder();
const dec = new TextDecoder();
const ITERATIONS = 600000;
const ROLES = [['', '—'], ['TOP', 'Top'], ['JUNGLE', 'Jungle'], ['MIDDLE', 'Mid'], ['BOTTOM', 'ADC'], ['UTILITY', 'Support']];
const CLE_SESSION = 'soloq-ultra2-admin';

const versB64 = (octets) => { let s = ''; for (const o of new Uint8Array(octets)) s += String.fromCharCode(o); return btoa(s); };
const depuisB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function cleDepuisMdp(mdp, sel, iterations) {
  const base = await crypto.subtle.importKey('raw', enc.encode(mdp), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: sel, iterations, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function chiffrer(texte, mdp) {
  const sel = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cle = await cleDepuisMdp(mdp, sel, ITERATIONS);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cle, enc.encode(texte));
  return { iterations: ITERATIONS, sel: versB64(sel), iv: versB64(iv), chiffre: versB64(ct) };
}
async function dechiffrer(bloc, mdp) {
  const cle = await cleDepuisMdp(mdp, depuisB64(bloc.sel), bloc.iterations);
  const clair = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: depuisB64(bloc.iv) }, cle, depuisB64(bloc.chiffre));
  return dec.decode(clair);
}

// ---------- API GitHub
let depot, jeton;
async function gh(chemin, options = {}) {
  const res = await fetch(`https://api.github.com/repos/${depot}/${chemin}`, {
    ...options,
    headers: { Authorization: `Bearer ${jeton}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
  });
  if (res.status === 404 && options.autorise404) return null;
  if (!res.ok) {
    const msg = (await res.json().catch(() => ({}))).message || '';
    throw new Error(res.status === 401 ? 'Jeton GitHub invalide ou expiré.' : res.status === 403 || res.status === 404 ? `Le jeton n'a pas le droit d'écrire dans ${depot}.` : `GitHub ${res.status} ${msg}`);
  }
  return res.json();
}
async function lireFichier(chemin) {
  const f = await gh(`contents/${chemin}?ref=main&t=${Date.now()}`, { autorise404: true });
  return f ? { sha: f.sha, texte: dec.decode(depuisB64(f.content.replace(/\n/g, ''))) } : null;
}
const ecrireFichier = (chemin, texte, sha, message) =>
  gh(`contents/${chemin}`, { method: 'PUT', body: JSON.stringify({ message, content: versB64(enc.encode(texte)), sha, branch: 'main' }) });

// ---------- Interface
enTete('admin');
const main = document.querySelector('main');
const session = { get: () => { try { return JSON.parse(sessionStorage.getItem(CLE_SESSION)); } catch { return null; } },
  set: (v) => { try { v ? sessionStorage.setItem(CLE_SESSION, JSON.stringify(v)) : sessionStorage.removeItem(CLE_SESSION); } catch {} } };
const message = (txt, type = '') => { const m = main.querySelector('#message'); if (m) { m.className = `bandeau ${type}`; m.innerHTML = txt; m.hidden = !txt; } };

let adminJson = null;
try { const r = await fetch(`admin.json?t=${Date.now()}`); if (r.ok) adminJson = await r.json(); } catch {}

const s = session.get();
if (s) { depot = s.depot; jeton = s.jeton; await panneau(); }
else if (adminJson) ecranConnexion();
else ecranInstallation();

function ecranConnexion() {
  main.innerHTML = `<div class="admin-boite carte"><h1>🔒 Espace admin</h1>
    <form id="f"><label>Mot de passe<input type="password" id="mdp" autocomplete="current-password" required autofocus></label>
    <button class="bouton bouton-or">Se connecter</button></form><div id="message" hidden></div>
    <p class="muted petit"><a href="#" id="reinit">Mot de passe oublié / changer de jeton GitHub</a></p></div>`;
  main.querySelector('#f').addEventListener('submit', async (e) => {
    e.preventDefault();
    message('Vérification…');
    try {
      jeton = await dechiffrer(adminJson, main.querySelector('#mdp').value);
      depot = adminJson.depot;
      session.set({ depot, jeton });
      await panneau();
    } catch { message('Mot de passe incorrect.', 'erreur'); }
  });
  main.querySelector('#reinit').addEventListener('click', (e) => { e.preventDefault(); ecranInstallation(); });
}

function ecranInstallation() {
  main.innerHTML = `<div class="admin-boite carte"><h1>🔒 Créer le compte admin</h1>
    <p class="muted">Le mot de passe sert à chiffrer un <strong>jeton GitHub</strong> qui donne le droit de modifier le dépôt.
    Seul ce jeton permet de modifier le site : sans le mot de passe, personne ne peut s'en servir.</p>
    <form id="f">
      <label>Dépôt GitHub<input id="depot" value="${esc(adminJson?.depot || 'chaumulotyanis-cpu/SoloQ-Challenge-Team-Ultra-2')}" required></label>
      <label><span>Jeton GitHub (fine-grained, accès « Contents : Read and write » sur ce dépôt uniquement)</span><input type="password" id="jeton" required autocomplete="off"></label>
      <label>Mot de passe admin (12 caractères minimum)<input type="password" id="mdp" minlength="12" required autocomplete="new-password"></label>
      <label>Confirmer le mot de passe<input type="password" id="mdp2" minlength="12" required autocomplete="new-password"></label>
      <button class="bouton bouton-or">Créer le compte admin</button>
    </form><div id="message" hidden></div>
    ${adminJson ? '<p class="muted petit"><a href="admin.html">← Retour à la connexion</a></p>' : ''}</div>`;
  main.querySelector('#f').addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = (id) => main.querySelector(`#${id}`).value.trim();
    if (v('mdp') !== v('mdp2')) return message('Les deux mots de passe ne sont pas identiques.', 'erreur');
    depot = v('depot'); jeton = v('jeton');
    try {
      message('Vérification du jeton et chiffrement… (quelques secondes)');
      const existant = await lireFichier('site/admin.json');
      const bloc = { depot, ...(await chiffrer(jeton, v('mdp'))) };
      await ecrireFichier('site/admin.json', JSON.stringify(bloc, null, 2) + '\n', existant?.sha, 'Admin : mise à jour du compte admin');
      session.set({ depot, jeton });
      await panneau('✅ Compte admin créé. Il sera actif sur le site après le prochain déploiement (~2 min).');
    } catch (err) { message(esc(err.message), 'erreur'); }
  });
}

// ---------- Panneau d'administration
async function panneau(info = '') {
  main.innerHTML = '<div class="chargement">Chargement de la configuration…</div>';
  let fichier;
  try { fichier = await lireFichier('config.json'); } catch (err) {
    session.set(null);
    main.innerHTML = `<div class="bandeau erreur">${esc(err.message)}</div><p><a href="admin.html">Réessayer</a></p>`;
    return;
  }
  const cfg = JSON.parse(fichier.texte);
  cfg.sanctions ||= [];
  const versLocal = (iso) => { if (!iso) return ''; const d = new Date(iso); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
  const optionsJoueurs = () => cfg.joueurs.map((j) => `<option value="${esc(j.id)}">${esc(j.nom)}</option>`).join('');
  const nomDe = (id) => cfg.joueurs.find((j) => j.id === id)?.nom ?? id;

  function rendre() {
    main.innerHTML = `<div class="admin-tete"><h1>🔒 Admin</h1><button class="bouton" id="deco">Se déconnecter</button></div>
      <div id="message" ${info ? '' : 'hidden'} class="bandeau">${info}</div>

      <h2>Challenge</h2>
      <div class="carte admin-grille">
        <label>Date de début<input type="datetime-local" id="debut" value="${versLocal(cfg.debut)}"></label>
        <label>Durée (semaines)<input type="number" id="semaines" min="1" value="${cfg.semaines}"></label>
        <label>Games max / semaine<input type="number" id="max" min="1" value="${cfg.gamesMaxParSemaine}"></label>
        <label>Games minimum au total<input type="number" id="min" min="0" value="${cfg.gamesMinTotal}"></label>
        <label>Games au-delà du plafond<select id="hq"><option value="exclure" ${cfg.gamesHorsQuota === 'exclure' ? 'selected' : ''}>Exclues du winrate</option><option value="compter" ${cfg.gamesHorsQuota !== 'exclure' ? 'selected' : ''}>Comptées</option></select></label>
      </div>

      <h2>Joueurs</h2>
      <div class="tableau-wrap"><table class="admin-table"><thead><tr><th>Nom affiché</th><th>Riot ID</th><th>Rôle</th><th></th></tr></thead><tbody>
        ${cfg.joueurs.map((j, i) => `<tr>
          <td><input data-j="${i}" data-champ="nom" value="${esc(j.nom)}"></td>
          <td><input data-j="${i}" data-champ="riotId" value="${esc(j.riotId)}"></td>
          <td><select data-j="${i}" data-champ="role">${ROLES.map(([v, l]) => `<option value="${v}" ${(j.role || '') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></td>
          <td><button class="bouton" data-suppr-joueur="${i}" title="Retirer">✕</button></td></tr>`).join('')}
        <tr><td><input id="nj-nom" placeholder="Nom affiché"></td><td><input id="nj-rid" placeholder="Pseudo#TAG"></td>
          <td><select id="nj-role">${ROLES.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></td>
          <td><button class="bouton bouton-or" id="ajout-joueur">Ajouter</button></td></tr>
      </tbody></table></div>

      <h2>Sanctions <span class="carton"></span></h2>
      <div class="tableau-wrap"><table class="admin-table"><thead><tr><th>Joueur</th><th>Raison</th><th>Malus</th><th>Date</th><th></th></tr></thead><tbody>
        ${cfg.sanctions.map((s, i) => `<tr><td>${esc(nomDe(s.joueur))}</td><td>${esc(s.raison)}</td><td><span class="carton">−${s.malusWinrate}</span></td>
          <td>${s.date ? new Date(s.date).toLocaleDateString('fr-FR') : ''}</td><td><button class="bouton" data-suppr-sanction="${i}" title="Retirer">✕</button></td></tr>`).join('')}
        <tr><td><select id="ns-joueur">${optionsJoueurs()}</select></td><td><input id="ns-raison" placeholder="Ex. relance après le plafond"></td>
          <td><input type="number" id="ns-malus" min="0" step="0.5" value="3" style="width:80px"></td>
          <td><input type="date" id="ns-date" value="${new Date().toISOString().slice(0, 10)}"></td>
          <td><button class="bouton bouton-or" id="ajout-sanction">Ajouter</button></td></tr>
      </tbody></table></div>

      <div class="admin-actions"><button class="bouton bouton-or gros-bouton" id="publier">💾 Enregistrer et publier</button>
        <span class="muted">Le site est mis à jour environ 2 minutes après l'enregistrement.</span></div>`;

    const q = (s) => main.querySelector(s);
    q('#deco').onclick = () => { session.set(null); location.reload(); };
    const lireChallenge = () => {
      cfg.debut = q('#debut').value ? new Date(q('#debut').value).toISOString() : null;
      cfg.semaines = Number(q('#semaines').value);
      cfg.gamesMaxParSemaine = Number(q('#max').value);
      cfg.gamesMinTotal = Number(q('#min').value);
      cfg.gamesHorsQuota = q('#hq').value;
    };
    main.querySelectorAll('[data-j]').forEach((el) => el.addEventListener('change', () => { cfg.joueurs[el.dataset.j][el.dataset.champ] = el.value.trim(); }));
    main.querySelectorAll('[data-suppr-joueur]').forEach((b) => (b.onclick = () => {
      const j = cfg.joueurs[b.dataset.supprJoueur];
      if (confirm(`Retirer ${j.nom} du challenge ?`)) { lireChallenge(); cfg.joueurs.splice(b.dataset.supprJoueur, 1); info = ''; rendre(); }
    }));
    main.querySelectorAll('[data-suppr-sanction]').forEach((b) => (b.onclick = () => { lireChallenge(); cfg.sanctions.splice(b.dataset.supprSanction, 1); info = ''; rendre(); }));
    q('#ajout-joueur').onclick = () => {
      const nom = q('#nj-nom').value.trim(), riotId = q('#nj-rid').value.trim();
      if (!nom || !/^.+#.+$/.test(riotId)) return message('Indique un nom et un Riot ID au format Pseudo#TAG.', 'erreur');
      let id = nom.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'joueur';
      while (cfg.joueurs.some((j) => j.id === id)) id += '-2';
      lireChallenge(); cfg.joueurs.push({ id, nom, riotId, role: q('#nj-role').value }); info = ''; rendre();
    };
    q('#ajout-sanction').onclick = () => {
      const raison = q('#ns-raison').value.trim(), malus = Number(q('#ns-malus').value);
      if (!raison || !(malus > 0)) return message('Indique une raison et un malus supérieur à 0.', 'erreur');
      lireChallenge(); cfg.sanctions.push({ joueur: q('#ns-joueur').value, raison, malusWinrate: malus, date: q('#ns-date').value }); info = ''; rendre();
    };
    q('#publier').onclick = async () => {
      lireChallenge();
      q('#publier').disabled = true;
      message('Enregistrement…');
      try {
        const res = await ecrireFichier('config.json', JSON.stringify(cfg, null, 2) + '\n', fichier.sha, 'Admin : mise à jour de la configuration');
        fichier.sha = res.content.sha;
        message('✅ Enregistré ! Le site sera à jour dans environ 2 minutes.');
      } catch (err) {
        message(`${esc(err.message)}${/409|does not match/.test(err.message) ? ' La configuration a changé entre-temps : recharge la page.' : ''}`, 'erreur');
      }
      q('#publier').disabled = false;
    };
  }
  rendre();
}
