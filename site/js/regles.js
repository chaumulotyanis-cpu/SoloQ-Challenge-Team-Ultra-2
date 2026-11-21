import { demarrer, bandeauStatut, fmtDate } from './app.js';

const d = await demarrer('regles');
if (d) {
  const c = d.challenge;
  const regle = (titre, texte) => `<div class="regle"><h3>${titre}</h3><p>${texte}</p></div>`;
  document.querySelector('main').innerHTML = `${bandeauStatut(d)}<h1>Règles du challenge</h1>
    <div class="regles">
      ${regle('🗓️ Durée', `${c.semaines} semaines${c.debut ? `, du ${fmtDate(c.debut)} au ${fmtDate(c.fin)}` : ' — dates annoncées après le reset de la saison'}.`)}
      ${regle('🎯 Objectif', `Chaque joueur joue sur <strong>son compte habituel</strong>. Comme les rangs de départ sont différents, le gagnant est celui qui a <strong>le meilleur winrate</strong> à la fin du challenge.`)}
      ${regle('🎮 File', `Seules les parties <strong>classées Solo/Duo</strong> comptent. Les remakes ne sont pas comptés.`)}
      ${regle('🧭 Rôle', `Chaque joueur a un rôle défini à l'avance. Il est indiqué sur le classement mais n'a aucun impact sur le résultat.`)}
      ${regle('🚫 Pas de duo en placement', `Interdiction de jouer en duo pendant les <strong>${c.duoInterditPremieresGames} premières parties</strong>. Si deux participants sont dans la même équipe pendant ces parties, le site le signale pour vérification.`)}
      ${regle('⏱️ Plafond hebdomadaire', `<strong>${c.gamesMaxParSemaine} games maximum par semaine</strong>. Une fois le plafond atteint, il est interdit de relancer sur ce compte jusqu'à la semaine suivante, sous peine de malus.${c.gamesHorsQuota === 'exclure' ? ' Les parties au-delà du plafond ne comptent pas dans le winrate.' : ''}`)}
      ${regle('📉 Quota minimum', `Il faut avoir joué au moins <strong>${c.gamesMinTotal} games</strong> sur l'ensemble du challenge pour pouvoir le gagner.`)}
      ${regle('⚖️ Sanctions', `Toute règle enfreinte peut entraîner un malus, appliqué au winrate et affiché sur le profil du joueur.`)}
    </div>`;
}
