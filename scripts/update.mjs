// Récupère les données de l'API Riot pour chaque joueur de config.json,
// met à jour le cache (data/cache.json) et génère site/data/stats.json.
// Usage : RIOT_API_KEY=RGAPI-xxx node scripts/update.mjs

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { construireStats, phaseChallenge } from './stats.mjs';

const racine = new URL('../', import.meta.url);
const lireJson = async (chemin, defaut) => {
  try { return JSON.parse(await readFile(new URL(chemin, racine), 'utf8')); } catch { return defaut; }
};

const cfg = await lireJson('config.json');
const CLE = process.env.RIOT_API_KEY;
if (!CLE) { console.error('❌ Variable RIOT_API_KEY manquante.'); process.exit(1); }

const QUEUE_SOLO = 420;
const DELAI = 1250; // ~96 requêtes / 2 min : sous la limite d'une clé "personal" (100 / 2 min)
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
let derniere = 0;

async function riot(hote, chemin, { autorise404 = false } = {}) {
  for (let essai = 0; essai < 5; essai++) {
    const attente = derniere + DELAI - Date.now();
    if (attente > 0) await pause(attente);
    derniere = Date.now();
    const res = await fetch(`https://${hote}.api.riotgames.com${chemin}`, { headers: { 'X-Riot-Token': CLE } });
    if (res.status === 429) { await pause((Number(res.headers.get('retry-after')) || 10) * 1000); continue; }
    if (res.status >= 500) { await pause(2000 * (essai + 1)); continue; }
    if (res.status === 404 && autorise404) return null;
    if (res.status === 401 || res.status === 403) throw new Error('Clé API Riot invalide ou expirée (401/403). Mets à jour le secret RIOT_API_KEY.');
    if (!res.ok) throw new Error(`${res.status} sur ${chemin} : ${await res.text()}`);
    return res.json();
  }
  throw new Error(`Échecs répétés sur ${chemin}`);
}

function compacter(match, puuid) {
  const info = match.info;
  const moi = info.participants.find((p) => p.puuid === puuid);
  if (!moi) return null;
  const equipe = info.participants.filter((p) => p.teamId === moi.teamId);
  const killsEquipe = equipe.reduce((s, p) => s + p.kills, 0);
  return {
    id: match.metadata.matchId,
    t: info.gameStartTimestamp,
    duree: info.gameDuration,
    remake: Boolean(moi.gameEndedInEarlySurrender) || info.gameDuration < 300,
    win: moi.win,
    champ: moi.championName,
    pos: moi.teamPosition || moi.individualPosition || '',
    k: moi.kills, d: moi.deaths, a: moi.assists,
    cs: moi.totalMinionsKilled + moi.neutralMinionsKilled,
    dmg: moi.totalDamageDealtToChampions,
    gold: moi.goldEarned,
    vision: moi.visionScore,
    kp: killsEquipe ? (moi.kills + moi.assists) / killsEquipe : 0,
    allies: equipe.filter((p) => p.puuid !== puuid).map((p) => p.puuid),
    ennemis: info.participants.filter((p) => p.teamId !== moi.teamId).map((p) => p.puuid),
  };
}

const cache = await lireJson('data/cache.json', { joueurs: {} });
const now = Date.now();
const { debut, fin, phase } = phaseChallenge(cfg, now);
const { plateforme, routage } = cfg;

let version = 'latest';
try { version = (await (await fetch('https://ddragon.leagueoflegends.com/api/versions.json')).json())[0]; } catch {}

const joueurs = [];
for (const j of cfg.joueurs) {
  const c = (cache.joueurs[j.riotId] ||= { matches: {} });
  try {
    if (!c.puuid) {
      const [nom, tag] = j.riotId.split('#');
      const compte = await riot(routage, `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(nom)}/${encodeURIComponent(tag)}`);
      c.puuid = compte.puuid;
    }
    const inv = await riot(plateforme, `/lol/summoner/v4/summoners/by-puuid/${c.puuid}`);
    c.icone = inv.profileIconId; c.niveau = inv.summonerLevel;
    const ligues = await riot(plateforme, `/lol/league/v4/entries/by-puuid/${c.puuid}`);
    const solo = ligues.find((l) => l.queueType === 'RANKED_SOLO_5x5');
    c.rang = solo ? { tier: solo.tier, division: solo.rank, lp: solo.leaguePoints, wins: solo.wins, losses: solo.losses } : null;

    // Liste des parties à récupérer
    let ids = [];
    if (phase === 'en-cours' || phase === 'termine') {
      const params = `queue=${QUEUE_SOLO}&startTime=${Math.floor(debut / 1000)}&endTime=${Math.floor(Math.min(now, fin) / 1000)}`;
      for (let start = 0; ; start += 100) {
        const page = await riot(routage, `/lol/match/v5/matches/by-puuid/${c.puuid}/ids?${params}&start=${start}&count=100`);
        ids.push(...page);
        if (page.length < 100) break;
      }
    } else {
      ids = await riot(routage, `/lol/match/v5/matches/by-puuid/${c.puuid}/ids?queue=${QUEUE_SOLO}&count=${cfg.preSaisonGames}`);
    }
    for (const id of ids) {
      if (c.matches[id]) continue;
      const m = await riot(routage, `/lol/match/v5/matches/${id}`, { autorise404: true });
      const compact = m && compacter(m, c.puuid);
      if (compact) c.matches[id] = compact;
    }
    // On ne garde que les parties utiles
    const garder = new Set(ids);
    for (const id of Object.keys(c.matches)) if (!garder.has(id)) delete c.matches[id];
    delete c.erreur;
    console.log(`✅ ${j.riotId} : ${c.rang ? `${c.rang.tier} ${c.rang.division} ${c.rang.lp} LP` : 'non classé'}, ${ids.length} partie(s)`);
  } catch (e) {
    if (/401\/403/.test(e.message)) { console.error(`❌ ${e.message}`); process.exit(1); }
    c.erreur = e.message;
    console.error(`⚠️  ${j.riotId} : ${e.message}`);
  }
  joueurs.push({ ...j, puuid: c.puuid, icone: c.icone, niveau: c.niveau, rang: c.rang, erreur: c.erreur, matches: Object.values(c.matches) });
}

// Nettoyage des joueurs retirés de la config
const actifs = new Set(cfg.joueurs.map((j) => j.riotId));
for (const k of Object.keys(cache.joueurs)) if (!actifs.has(k)) delete cache.joueurs[k];

const stats = construireStats({ cfg, joueurs, now, version });
await mkdir(new URL('site/data/', racine), { recursive: true });
await mkdir(new URL('data/', racine), { recursive: true });
await writeFile(new URL('data/cache.json', racine), JSON.stringify(cache));
await writeFile(new URL('site/data/stats.json', racine), JSON.stringify(stats));
console.log(`📊 stats.json généré (${phase}).`);
