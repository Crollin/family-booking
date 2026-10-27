# Family Lodge — plateforme de réservation familiale

Une application web pour gérer les réservations d'un logement partagé en famille :
calendrier, demandes de séjour, validation par un administrateur, livre d'or, guide
local et météo du logement.

Le nom du site, le logo et les coordonnées du logement se personnalisent dans `.env`
(voir [Personnaliser](#personnaliser-nom-logos-coordonnées)).

Deux modes de déploiement :

1. **Pile complète** (`docker-compose.yml`) — app + Supabase + proxy : rien à
   provisionner ailleurs.
2. **App seule** (`docker-compose.app.yml`) — si vous avez déjà un projet Supabase
   (et éventuellement un reverse proxy).

---

## Démarrage (pile complète)

Prérequis : [Docker](https://docs.docker.com/get-docker/) avec le plugin Compose
(`docker compose version` doit répondre).

```bash
git clone <votre-dépôt> family-booking
cd family-booking
cp .env.example .env
docker compose up -d
```

Le premier démarrage construit l'image et initialise la base ; comptez quelques
minutes. Ensuite, ouvrez **<http://localhost:3000>**.

La base étant vide, la page de connexion propose de créer le premier compte
administrateur. Renseignez nom, e-mail et mot de passe : vous arrivez sur le tableau
de bord. Les membres suivants sont ajoutés depuis l'interface, par invitation.

Pour suivre le démarrage ou vérifier que tout va bien :

```bash
docker compose ps       # état des services
docker compose logs -f  # journaux en direct
```

---

## Déjà un Supabase (ou un proxy) ? — mode app seule

Utilisez `docker-compose.app.yml` : un seul conteneur, le vôtre pour le reste.

1. **Schéma** — dans le SQL Editor de votre projet (ou `psql`), exécutez dans l’ordre :
   - `docker/db/init/02-schema.sql`
   - `docker/db/init/04-storage.sql` (buckets photos)
   - optionnel : `docker/db/init/03-seed-guide-local.sql`
2. **Auth** — dans Supabase → Authentication → URL Configuration :
   - Site URL = votre `PUBLIC_URL`
   - Redirect URLs = `PUBLIC_URL/**` (ex. `https://reservations.exemple.fr/**`)
3. **`.env`** — au minimum :

```bash
PUBLIC_URL=https://reservations.exemple.fr   # URL de l'interface
SUPABASE_URL=https://xxxxxxxx.supabase.co    # URL API du projet
ANON_KEY=…                                   # Project Settings → API
SERVICE_ROLE_KEY=…                           # idem (secret serveur)
CRON_SECRET=…                                # chaîne aléatoire
```

`SUPABASE_INTERNAL_URL` n’est utile que si le conteneur doit joindre Supabase via
une adresse privée différente de `SUPABASE_URL`.

4. **Lancer**

```bash
docker compose -f docker-compose.app.yml up -d --build
```

L’app écoute sur `APP_PORT` (3000 par défaut). Placez votre reverse proxy (Traefik,
Caddy, nginx, Coolify…) devant ce port et terminez le HTTPS chez lui. Ne démarrez
**pas** `docker-compose.yml` en parallèle : vous auriez deux piles concurrentes.

---

## Ce que contient la pile complète

Sept conteneurs, un seul port publié sur votre machine. Le service `proxy` est le point
d'entrée : il reçoit toutes les requêtes et les distribue, ce qui permet à l'application
et à ses services de partager la même adresse.

| Service        | Rôle |
| -------------- | ---- |
| `proxy`        | Point d'entrée unique (nginx), répartit vers l'application et les services Supabase |
| `app`          | L'application Next.js |
| `db`           | PostgreSQL — applique le schéma au tout premier démarrage |
| `auth`         | Comptes, sessions, mots de passe (Supabase Auth) |
| `rest`         | API de données, soumise au Row Level Security (PostgREST) |
| `realtime`     | Mise à jour du calendrier sans rechargement |
| `storage`      | Photos du livre d'or et du guide local |
| `storage-init` | Tâche ponctuelle : crée les buckets et leurs règles d'accès |

Les données vivent dans trois volumes Docker (`db-data`, `db-config`, `storage-data`).
Elles survivent à `docker compose down` et aux mises à jour de l'image.

---

## Fonctionnalités

- **Calendrier partagé** : les séjours de chacun, avec un code couleur par statut
- **Demandes de réservation** : création, modification, annulation, avec détection des
  chevauchements en base
- **Validation par un administrateur**, ou approbation automatique si l'admin l'active
- **Invitations** : seuls les administrateurs ajoutent de nouveaux membres (lien valable 7 jours)
- **Infos pratiques** : checklists d'arrivée et de départ, adresse, WiFi, contacts,
  sortie des poubelles, règles du logement
- **Livre d'or** : messages et photos des séjours passés
- **Guide local** : restaurants, activités et commerces, filtrés par saison
- **Météo** : prévisions à 7 jours et conditions du logement (Open-Meteo, sans clé)
- **Notifications par e-mail** : confirmations, refus et rappels (facultatif)
- **Thème clair / sombre**, interface utilisable sur mobile comme sur ordinateur

---

## Configuration

Tout se règle dans le fichier `.env`. Après modification, appliquez avec
`docker compose up -d`.

Le fichier livré fonctionne tel quel en local. Trois réglages méritent votre attention :

```bash
# L'adresse par laquelle on joint l'application. En production, votre domaine complet.
PUBLIC_URL=http://localhost:3000

# Le port publié sur la machine. Changez-le si 3000 est déjà pris.
APP_PORT=3000
```

Le reste (e-mails, météo, CAPTCHA, mot de passe d'accès au site) est facultatif :
sans configuration, ces fonctions sont simplement inactives. La liste complète des
variables, avec leur effet, est dans **[docs/CONFIGURATION.md](docs/CONFIGURATION.md)**.

### Personnaliser : nom, logos, coordonnées

Le branding se règle dans `.env`, sans toucher au code :

```bash
SITE_NAME=Family Lodge                         # nom affiché dans l'interface, les e-mails et l'onglet
SITE_TAGLINE=Réservations familiales partagées # sous-titre
PROPERTY_LAT=45.0                              # latitude du logement
PROPERTY_LNG=6.0                               # longitude du logement
```

Les coordonnées `PROPERTY_LAT` / `PROPERTY_LNG` servent à situer le logement ; la météo
a ses propres variables `WEATHER_*` (voir [docs/CONFIGURATION.md](docs/CONFIGURATION.md)).

Les logos sont de simples fichiers du dossier `public/`, à remplacer par les vôtres
(mêmes noms) avant de reconstruire l'image avec `docker compose up -d --build app` :

| Fichier | Usage |
| ------- | ----- |
| `public/logo-light.svg` | Logo du thème clair |
| `public/logo-dark.svg` | Logo du thème sombre |
| `public/logo-light.png` | Logo des e-mails (le PNG est plus compatible que le SVG) |

### Avant une mise en ligne

Les secrets de `.env.example` sont publics — ils sont dans ce dépôt. Remplacez-les :

```bash
./scripts/generate-secrets.sh
docker compose down -v      # efface les données créées avec les anciens secrets
docker compose up -d
```

Renseignez ensuite `PUBLIC_URL` avec votre domaine, et placez la pile derrière un
reverse proxy qui termine le HTTPS (Traefik, Caddy, nginx…) en lui faisant suivre
l'en-tête `X-Forwarded-Proto`. Les recommandations complémentaires sont dans
[SECURITY.md](SECURITY.md).

---

## Exploitation

```bash
docker compose up -d              # démarrer ou appliquer un changement de .env
docker compose down               # arrêter, en conservant les données
docker compose down -v            # arrêter et TOUT effacer, base comprise
docker compose logs -f app        # journaux d'un service
docker compose up -d --build app  # reconstruire après modification du code
```

### Sauvegarder et restaurer

```bash
# Sauvegarde
docker compose exec -T db pg_dump -U postgres postgres > sauvegarde.sql

# Restauration sur une pile vierge
docker compose exec -T db psql -U postgres postgres < sauvegarde.sql
```

Les photos sont dans le volume `storage-data`, à sauvegarder séparément si vous y
tenez.

### Mettre à jour

```bash
git pull
docker compose up -d --build
```

Le schéma de la base n'est appliqué qu'à la création du volume. Une mise à jour ne
touche donc pas à vos données.

---

## Structure du dépôt

```
family-booking/
├── docker-compose.yml      # pile complète (app + Supabase + proxy)
├── docker-compose.app.yml  # app seule (Supabase déjà fourni)
├── Dockerfile              # construction de l'image applicative
├── .env.example            # configuration à copier en .env
├── docker/
│   ├── db/init/            # schéma SQL (init pile complète, ou SQL Editor)
│   └── proxy/              # nginx du point d'entrée (pile complète)
├── scripts/
│   └── generate-secrets.sh
├── src/
│   ├── app/                # pages et routes d'API (Next.js App Router)
│   ├── components/         # composants React
│   ├── lib/                # accès aux données, e-mails, météo
│   └── types/              # types TypeScript
└── docs/CONFIGURATION.md   # référence des variables d'environnement
```

---

## Développer

Le développement se fait en local avec Node.js 22, en s'appuyant sur la pile Docker
pour la base de données et les services Supabase. Le principe : remplacer le seul
conteneur `app` par un serveur de développement, et laisser le proxy le desservir.

```bash
npm install --legacy-peer-deps

docker compose up -d          # la pile complète
docker compose stop app       # on libère la place pour le serveur de développement

# Le proxy vise désormais la machine hôte sur le port 3001
APP_UPSTREAM=host.docker.internal:3001 docker compose up -d --no-deps proxy

npm run dev -- --port 3001
```

L'application reste à joindre sur **<http://localhost:3000>**, via le proxy — et non sur
le port 3001, sinon les services Supabase ne sont pas accessibles depuis le navigateur.
Le port 3000 est occupé par le proxy, d'où le serveur de développement sur 3001.

Pour revenir à la pile normale : `docker compose up -d`.

Scripts disponibles :

| Commande | Effet |
| -------- | ----- |
| `npm run dev` | Serveur de développement avec rechargement à chaud |
| `npm run lint` | Analyse statique (ESLint) |
| `npm test` | Tests unitaires (Vitest) |
| `npm run test:e2e` | Tests de bout en bout (Playwright) |
| `npm run build` | Construction de production |

### Modifier le schéma de la base

Le schéma tient dans `docker/db/init/02-schema.sql`, appliqué une seule fois à la
création du volume de données. Pour le faire évoluer en développement :

```bash
docker compose down -v && docker compose up -d
```

Sur une instance qui contient déjà des données, appliquez votre changement à la main
avec `docker compose exec db psql -U postgres -d postgres`, puis reportez-le dans le
fichier de schéma pour les futures installations.

---

## Dépannage

**Le port 3000 est déjà utilisé.** Changez `APP_PORT` dans `.env` (par exemple `8080`),
ajustez `PUBLIC_URL` en conséquence, puis relancez `docker compose up -d`.

**Un service reste en `unhealthy`.** Regardez ses journaux :
`docker compose logs <service>`. Si `db` n'a pas démarré, les autres attendent : c'est
normal.

**La page de connexion signale un problème de configuration.** `PUBLIC_URL` doit
correspondre exactement à l'adresse que vous tapez dans le navigateur, protocole et port
compris.

**Les invitations ne partent pas.** L'envoi d'e-mails est facultatif et inactif par
défaut. Renseignez un serveur SMTP ou une clé Resend — voir
[docs/CONFIGURATION.md](docs/CONFIGURATION.md).

**Repartir d'une base propre.** `docker compose down -v && docker compose up -d`.
Attention, cette commande efface définitivement les données.

---

## Crédits

Projet créé par [Crollin](https://github.com/Crollin) — [creactiveweb.com](https://creactiveweb.com).

Détails : [CREDITS.md](CREDITS.md).

---

## Licence

Projet destiné à un usage familial. Ajoutez le fichier de licence de votre choix
si vous le publiez.
