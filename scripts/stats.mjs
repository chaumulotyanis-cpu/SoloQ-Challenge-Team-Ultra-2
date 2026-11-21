// Calcul de toutes les statistiques du challenge à partir des données brutes.
// Utilisé par update.mjs (vraies données Riot) et demo.mjs (données fictives).

const SEMAINE = 7 * 24 * 3600 * 1000;
const TIERS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];
const DIVS = { IV: 0, III: 1, II: 2, I: 3 };

export function scoreRang(r) {
  if (!r) return -1;
  const t = TIERS.indexOf(r.tier);
  const apex = t >= 7;
  return t * 400 + (apex ? 0 : DIVS[r.division] * 100) + r.lp;
}

const pct = (w, n) => (n ? Math.round((w / n) * 1000) / 10 : 0);
const moy = (arr, f) => (arr.length ? arr.reduce((s, x) => s + f(x), 0) / arr.length : 0);
const arr1 = (x) => Math.round(x * 10) / 10;

export function phaseChallenge(cfg, now) {
  const debut = cfg.debut ? Date.parse(cfg.debut) : null;
  const fin = debut ? debut + cfg.semaines * SEMAINE : null;
  let phase = 'pre-saison';
  if (debut) phase = now < debut ? 'a-venir' : now < fin ? 'en-cours' : 'termine';
  const semaine = phase === 'en-cours' ? Math.floor((now - debut) / SEMAINE) + 1 : phase === 'termine' ? cfg.semaines : 0;
  return { debut, fin, phase, semaine };
}

/**
 * @param cfg      contenu de config.json
 * @param joueurs  [{ ...entréeConfig, puuid, icone, niveau, rang, matches: [matchCompact] }]
 */
export function construireStats({ cfg, joueurs, now = Date.now(), version, demo = false }) {
  const { debut, fin, phase, semaine } = phaseChallenge(cfg, now);
  const challengeActif = phase === 'en-cours' || phase === 'termine';
  const idParPuuid = new Map(joueurs.filter((j) => j.puuid).map((j) => [j.puuid, j.id]));

  const resultat = joueurs.map((j) => {
    const toutes = (j.matches || []).filter((m) => !m.remake).sort((a, b) => a.t - b.t);
    const games = challengeActif ? toutes.filter((m) => m.t >= debut && m.t < fin) : toutes.slice(-cfg.preSaisonGames);

    // --- Quotas hebdomadaires
    const semaines = Array.from({ length: cfg.semaines }, (_, i) => ({ n: i + 1, jouees: 0, comptees: 0, victoires: 0, horsQuota: 0 }));
    for (const g of games) {
      g.horsQuota = false;
      if (!challengeActif) continue;
      const s = semaines[Math.min(cfg.semaines - 1, Math.floor((g.t - debut) / SEMAINE))];
      s.jouees++;
      if (s.comptees >= cfg.gamesMaxParSemaine) { g.horsQuota = true; s.horsQuota++; }
      else { s.comptees++; if (g.win) s.victoires++; }
    }
    const comptees = cfg.gamesHorsQuota === 'exclure' ? games.filter((g) => !g.horsQuota) : games;

    // --- Winrate
    let victoires, defaites;
    if (challengeActif) { victoires = comptees.filter((g) => g.win).length; defaites = comptees.length - victoires; }
    else { victoires = j.rang?.wins ?? 0; defaites = j.rang?.losses ?? 0; }
    const total = victoires + defaites;
    const winrate = pct(victoires, total);
    const sanctions = (cfg.sanctions || []).filter((s) => s.joueur === j.id);
    const malus = sanctions.reduce((s, x) => s + (Number(x.malusWinrate) || 0), 0);
    const winrateAjuste = arr1(winrate - malus);

    // --- Alertes automatiques
    const alertes = [];
    for (const s of semaines) if (s.horsQuota) alertes.push(`Semaine ${s.n} : ${s.horsQuota} game(s) au-delà du plafond de ${cfg.gamesMaxParSemaine}`);

    // --- Champions
    const champs = new Map();
    for (const g of comptees) {
      const c = champs.get(g.champ) || { nom: g.champ, games: 0, victoires: 0, k: 0, d: 0, a: 0 };
      c.games++; c.victoires += g.win ? 1 : 0; c.k += g.k; c.d += g.d; c.a += g.a;
      champs.set(g.champ, c);
    }
    const champions = [...champs.values()]
      .map((c) => ({ nom: c.nom, games: c.games, victoires: c.victoires, winrate: pct(c.victoires, c.games), kda: arr1((c.k + c.a) / Math.max(1, c.d)) }))
      .sort((a, b) => b.games - a.games || b.winrate - a.winrate);

    // --- Confrontations avec les autres participants
    const confrontations = {}, ensemble = {};
    for (const g of comptees) {
      for (const p of g.ennemis || []) { const o = idParPuuid.get(p); if (o) { (confrontations[o] ||= { games: 0, victoires: 0 }).games++; if (g.win) confrontations[o].victoires++; } }
      for (const p of g.allies || []) { const o = idParPuuid.get(p); if (o) { (ensemble[o] ||= { games: 0, victoires: 0 }).games++; if (g.win) ensemble[o].victoires++; } }
    }

    // --- Progression (winrate cumulé)
    let w = 0;
    const progression = comptees.map((g, i) => { w += g.win ? 1 : 0; return { t: g.t, wr: pct(w, i + 1) }; });

    const minutes = moy(comptees, (g) => g.duree / 60);
    const sCourante = semaine ? semaines[semaine - 1] : null;

    return {
      id: j.id, nom: j.nom, riotId: j.riotId, role: j.role,
      icone: j.icone ?? null, niveau: j.niveau ?? null, rang: j.rang ?? null, scoreRang: scoreRang(j.rang),
      erreur: j.erreur ?? null,
      victoires, defaites, games: total, winrate, malus, winrateAjuste,
      semaines,
      gamesSemaine: sCourante ? sCourante.comptees : null,
      restantSemaine: phase === 'en-cours' ? Math.max(0, cfg.gamesMaxParSemaine - sCourante.comptees) : null,
      eligible: challengeActif ? comptees.length >= cfg.gamesMinTotal : null,
      sanctions, alertes,
      moyennes: {
        kda: arr1(moy(comptees, (g) => g.k + g.a) / Math.max(0.1, moy(comptees, (g) => g.d))),
        k: arr1(moy(comptees, (g) => g.k)), d: arr1(moy(comptees, (g) => g.d)), a: arr1(moy(comptees, (g) => g.a)),
        csMin: arr1(moy(comptees, (g) => g.cs / (g.duree / 60))),
        degats: Math.round(moy(comptees, (g) => g.dmg)),
        vision: arr1(moy(comptees, (g) => g.vision)),
        kp: Math.round(moy(comptees, (g) => g.kp) * 100),
        dureeMin: arr1(minutes),
      },
      champions, confrontations, ensemble, progression,
      historique: games.slice(-20).reverse().map((g) => ({
        id: g.id, t: g.t, win: g.win, champ: g.champ, pos: g.pos, k: g.k, d: g.d, a: g.a, cs: g.cs, duree: g.duree, horsQuota: g.horsQuota,
        avec: (g.allies || []).map((p) => idParPuuid.get(p)).filter(Boolean),
        contre: (g.ennemis || []).map((p) => idParPuuid.get(p)).filter(Boolean),
      })),
    };
  });

  // --- Classement
  resultat.sort((a, b) => {
    if (phase === 'termine' && a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    if ((a.games > 0) !== (b.games > 0)) return a.games > 0 ? -1 : 1;
    return b.winrateAjuste - a.winrateAjuste || b.victoires - a.victoires || b.scoreRang - a.scoreRang;
  });
  resultat.forEach((r, i) => (r.position = i + 1));

  return {
    demo,
    majLe: new Date(now).toISOString(),
    ddragon: version,
    challenge: {
      nom: cfg.nom, phase, semaine, debut: debut ? new Date(debut).toISOString() : null, fin: fin ? new Date(fin).toISOString() : null,
      semaines: cfg.semaines, gamesMaxParSemaine: cfg.gamesMaxParSemaine, gamesMinTotal: cfg.gamesMinTotal,
      duoInterditPremieresGames: cfg.duoInterditPremieresGames, gamesHorsQuota: cfg.gamesHorsQuota, preSaisonGames: cfg.preSaisonGames,
    },
    joueurs: resultat,
  };
}
