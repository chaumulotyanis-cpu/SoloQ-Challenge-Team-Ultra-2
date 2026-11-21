# SoloQ Challenge Team Ultra 2

Site du SoloQ Challenge entre amis sur League of Legends : classement au winrate, profils joueurs,
quotas hebdomadaires, comparateur 1V1 et règles. Les stats sont récupérées automatiquement via l'API Riot.

## Fonctionnement

- `site/` : le site statique (HTML/CSS/JS), publié sur GitHub Pages.
- `scripts/update.mjs` : interroge l'API Riot et génère `site/data/stats.json`.
- `.github/workflows/maj-et-deploiement.yml` : lance la mise à jour **toutes les 30 min** puis redéploie le site.
- `data/cache.json` : parties déjà téléchargées (évite de tout redemander à Riot).

La clé API n'est jamais dans le site : elle reste dans les secrets GitHub et n'est utilisée que par le workflow.

## Mise en route

1. **Clé API Riot** : sur <https://developer.riotgames.com>, demander une clé *Personal API Key*
   (la clé de développement expire toutes les 24 h).
2. Dans le dépôt GitHub : **Settings → Secrets and variables → Actions → New repository secret**,
   nom `RIOT_API_KEY`, valeur = la clé.
3. **Settings → Pages → Source : GitHub Actions**.
4. Remplir `config.json` (joueurs, dates…) et pousser. Le site se met à jour tout seul.
   On peut aussi lancer une mise à jour à la main dans l'onglet **Actions → Run workflow**.

## `config.json`

| Champ | Rôle |
|---|---|
| `plateforme` / `routage` | Serveur Riot (`euw1` / `europe` pour EUW). |
| `debut` | Date de début, ex. `"2027-01-08T00:00:00+01:00"`. `null` = pré-saison (classement au winrate de la saison). |
| `semaines` | Durée du challenge (4). |
| `gamesMaxParSemaine` | Plafond de games par semaine. Les semaines comptent à partir de `debut`. |
| `gamesMinTotal` | Nombre de games minimum pour pouvoir gagner. |
| `duoInterditPremieresGames` | Nombre de parties de placement sans duo (5). |
| `gamesHorsQuota` | `"exclure"` : les games au-delà du plafond ne comptent pas dans le winrate. `"compter"` : elles comptent quand même. |
| `preSaisonGames` | Nombre de parties récentes affichées avant le début du challenge. |
| `joueurs` | `{ "id", "nom", "riotId": "Pseudo#TAG", "role": "TOP/JUNGLE/MIDDLE/BOTTOM/UTILITY" }` |
| `sanctions` | `{ "joueur": "id", "raison": "...", "malusWinrate": 3, "date": "2027-01-15" }` : retire des points de winrate. |

## En local

```bash
node scripts/demo.mjs                        # données fictives pour tester l'affichage
RIOT_API_KEY=RGAPI-xxx node scripts/update.mjs  # vraies données
python3 -m http.server -d site 8080          # puis ouvrir http://localhost:8080
```

## Limites connues

- L'API Riot n'indique pas si une partie a été jouée en duo : le site signale seulement quand deux
  participants étaient **dans la même équipe** pendant les placements, à vérifier à la main.
- GitHub peut retarder les tâches planifiées de quelques minutes.
