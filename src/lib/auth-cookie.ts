/**
 * Nom du cookie de session, partagé par tous les clients Supabase.
 *
 * Sans nom explicite, supabase-js le dérive de l'URL qu'on lui donne
 * (`sb-<premier segment de l'hôte>-auth-token`). Or le navigateur passe par
 * l'adresse publique tandis que le serveur emprunte le proxy interne : les deux
 * chercheraient alors deux cookies différents, et aucune session ne serait
 * jamais reconnue côté serveur. Un nom fixe supprime cette dépendance, et rend
 * au passage la session insensible à un changement de domaine.
 */
export const AUTH_COOKIE_NAME = 'family-booking-auth'
