// Génère des données FICTIVES pour prévisualiser le site sans clé API.
// Usage : node scripts/demo.mjs
import { writeFile, mkdir } from 'node:fs/promises';
import { construireStats } from './stats.mjs';

let graine = 42;
const alea = () => ((graine = (graine * 16807) % 2147483647) / 2147483647);
const choix = (a) => a[Math.floor(alea() * a.length)];
const entre = (a, b) => Math.floor(a + alea() * (b - a + 1));

const now = Date.now();
const cfg = {
  nom: 'SoloQ Challenge Team Ultra 2', debut: new Date(now - 16 * 864e5).toISOString(), semaines: 4,
  gamesMaxParSemaine: 15, gamesMinTotal: 60, duoInterditPremieresGames: 5, gamesHorsQuota: 'exclure', preSaisonGames: 20,
  sanctions: [{ joueur: 'j4', raison: 'Relance après le plafond hebdomadaire', malusWinrate: 3, date: new Date(now - 5 * 864e5).toISOString() }],
};
const roles = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'];
const champsParRole = {
  TOP: ['Garen', 'Darius', 'Sett', 'Ornn', 'Camille', 'Fiora'], JUNGLE: ['LeeSin', 'Vi', 'Kayn', 'Viego', 'Amumu', 'Graves'],
  MIDDLE: ['Ahri', 'Yasuo', 'Syndra', 'Orianna', 'Sylas', 'Veigar'], BOTTOM: ['Jinx', 'Caitlyn', 'Kaisa', 'Ezreal', 'Jhin', 'MissFortune'],
  UTILITY: ['Thresh', 'Lulu', 'Nautilus', 'Leona', 'Nami', 'Pyke'],
};
const tiers = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD'];
const divs = ['IV', 'III', 'II', 'I'];
const noms = ['Kazuto', 'Mélo', 'Nyx', 'Torvald', 'Lunae', 'Brakk', 'Sora', 'Isha', 'Volt', 'Miro'];

const joueurs = noms.map((nom, i) => ({
  id: `j${i + 1}`, nom, riotId: `${nom}#ULTRA`, role: roles[i % 5], puuid: `puuid-${i}`, icone: entre(1, 28), niveau: entre(80, 600),
  rang: { tier: choix(tiers), division: choix(divs), lp: entre(0, 99), wins: entre(10, 60), losses: entre(10, 60) }, matches: [],
}));
for (const j of joueurs) {
  const niveau = 0.4 + alea() * 0.25;
  const debut = Date.parse(cfg.debut);
  for (let jour = 0; jour < 16; jour++) {
    const nb = j.id === 'j4' && jour === 9 ? 18 : entre(0, 4);
    for (let n = 0; n < nb; n++) {
      const autres = joueurs.filter((o) => o !== j);
      const k = entre(0, 14), d = entre(0, 10), a = entre(0, 18), duree = entre(1200, 2200);
      j.matches.push({
        id: `EUW1_${j.id}_${jour}_${n}`, t: debut + jour * 864e5 + n * 3 * 3600e3 + 36e5, duree, remake: alea() < 0.02,
        win: alea() < niveau, champ: choix(champsParRole[j.role]), pos: j.role, k, d, a, cs: Math.round((duree / 60) * entre(4, 9)),
        dmg: entre(9000, 38000), gold: entre(7000, 16000), vision: entre(8, 70), kp: 0.3 + alea() * 0.4,
        allies: alea() < 0.06 ? [choix(autres).puuid] : [], ennemis: alea() < 0.08 ? [choix(autres).puuid] : [],
      });
    }
  }
}
const stats = construireStats({ cfg, joueurs, now, version: '14.23.1', demo: true });
await mkdir(new URL('../site/data/', import.meta.url), { recursive: true });
await writeFile(new URL('../site/data/stats.json', import.meta.url), JSON.stringify(stats));
console.log('Données de démonstration générées dans site/data/stats.json');
