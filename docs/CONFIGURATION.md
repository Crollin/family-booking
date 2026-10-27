# Référence de configuration

Toute la configuration passe par le fichier `.env`, à la racine du dépôt. Copiez
`.env.example` pour le créer. Après chaque modification, appliquez les changements :

```bash
docker compose up -d
```

Les valeurs livrées dans `.env.example` donnent une instance fonctionnelle en local.
Seules les variables des deux premières sections sont indispensables ; toutes les
autres sont facultatives et désactivent simplement la fonction concernée quand elles
sont vides.

---

## Adresse publique

### `PUBLIC_URL`

Adresse de l'**interface** (ce que vous tapez dans le navigateur). Elle sert aussi aux
liens des e-mails et doit être déclarée comme Site URL dans Supabase Auth.

En **pile complète**, le proxy nginx expose app + Supabase sous cette même origine : le
navigateur joint donc Supabase via `PUBLIC_URL`.

En **mode app seule**, `PUBLIC_URL` est uniquement l'app ; l'API Supabase se configure
avec `SUPABASE_URL` (ci-dessous).

Elle doit correspondre **exactement** à l'URL du navigateur, protocole et port compris.
Une divergence provoque des échecs de connexion (cookies de session rejetés).

```bash
PUBLIC_URL=http://localhost:3000            # en local
PUBLIC_URL=https://reservations.exemple.fr  # en production
```

### `SUPABASE_URL`

URL publique de l'API Supabase (`https://….supabase.co` ou votre instance).

- **Pile complète** : laissez vide — l'app réutilise `PUBLIC_URL` (origine unique).
- **App seule** (`docker-compose.app.yml`) : **obligatoire**.

### `SUPABASE_INTERNAL_URL`

URL utilisée **par le serveur** Next pour joindre Supabase. Utile si le conteneur n'a
pas accès à `SUPABASE_URL` / `PUBLIC_URL` (réseau Docker privé, VPC). En pile complète,
la valeur est fixée à `http://proxy`. En mode app seule, laissez vide sauf besoin
particulier : le serveur utilisera alors `SUPABASE_URL`.

### `APP_PORT`

Le port publié sur la machine hôte, `3000` par défaut. Changez-le si ce port est déjà
occupé, et reportez le changement dans `PUBLIC_URL` (pile complète) ou dans la conf de
votre reverse proxy (mode app seule).

### `APP_UPSTREAM`

Ce que le proxy interne (pile complète) doit contacter pour joindre l'application. La
valeur par défaut, `app:3000`, convient à toute installation normale.

Elle ne sert qu'en développement, pour viser un serveur `npm run dev` lancé sur la
machine hôte : `APP_UPSTREAM=host.docker.internal:3001`. Voir le README, section
« Développer ».

---

## Identité du site

Facultatif. Les valeurs par défaut conviennent pour un essai ; adaptez-les à votre logement.

| Variable | Défaut | Rôle |
| -------- | ------ | ---- |
| `SITE_NAME` | `Family Lodge` | Nom du site : interface, onglet du navigateur, e-mails |
| `SITE_TAGLINE` | `Réservations familiales partagées` | Sous-titre du site (en-tête des e-mails, interface) |
| `PROPERTY_LAT` | `45.0` | Latitude du logement |
| `PROPERTY_LNG` | `6.0` | Longitude du logement |

Les logos ne passent pas par `.env` : remplacez `public/logo-light.svg`,
`public/logo-dark.svg` et `public/logo-light.png` (logo des e-mails), puis reconstruisez
l'image avec `docker compose up -d --build app`.

---

## Secrets

Ces cinq valeurs protègent la base et les sessions. Celles de `.env.example` sont
publiques : elles figurent dans ce dépôt, et conviennent uniquement à un essai local.

Avant toute mise en ligne, régénérez-les puis repartez d'une base vierge :

```bash
./scripts/generate-secrets.sh
docker compose down -v
docker compose up -d
```

| Variable | Rôle |
| -------- | ---- |
| `POSTGRES_PASSWORD` | Mot de passe des comptes PostgreSQL utilisés par les services |
| `JWT_SECRET` | Clé de signature des jetons de session (32 caractères minimum) |
| `ANON_KEY` | Jeton du rôle public, signé avec `JWT_SECRET` |
| `SERVICE_ROLE_KEY` | Jeton du rôle privilégié, signé avec `JWT_SECRET` |
| `SECRET_KEY_BASE` | Clé interne du service `realtime` |

`JWT_SECRET`, `ANON_KEY` et `SERVICE_ROLE_KEY` forment un tout : les deux jetons sont
signés avec le secret. Modifier l'un sans les autres rend l'API inaccessible. Le script
les régénère toujours ensemble.

### `CRON_SECRET`

Protège les routes de tâches planifiées (`/api/cron/*`), qui envoient les rappels de
séjour. Sans appel externe à ces routes, cette valeur n'a pas d'usage, mais elle doit
rester renseignée.

Pour déclencher les rappels quotidiens depuis la machine hôte :

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://votre-domaine/api/cron/reminders
```

---

## Envoi d'e-mails

Facultatif. Sans configuration, l'application fonctionne normalement : les invitations
et les notifications ne sont simplement pas envoyées, et le lien d'invitation reste
copiable depuis l'interface d'administration.

Renseignez **soit** un serveur SMTP, **soit** une clé Resend.

### SMTP

| Variable | Exemple | Rôle |
| -------- | ------- | ---- |
| `SMTP_HOST` | `smtp.gmail.com` | Serveur d'envoi |
| `SMTP_PORT` | `587` | Port ; `465` avec `SMTP_SECURE=true` |
| `SMTP_USER` | `vous@exemple.fr` | Identifiant |
| `SMTP_PASSWORD` | — | Mot de passe |
| `SMTP_SECURE` | `false` | `true` pour une connexion TLS directe (port 465) |
| `SMTP_FROM` | `Family Lodge <vous@exemple.fr>` | Expéditeur affiché |

Avec Gmail, `SMTP_PASSWORD` doit être un « mot de passe d'application », créé depuis les
paramètres de sécurité du compte Google ; le mot de passe habituel est refusé.

### Resend

| Variable | Rôle |
| -------- | ---- |
| `RESEND_API_KEY` | Clé d'API obtenue sur [resend.com](https://resend.com) |
| `RESEND_FROM` | Expéditeur, sur un domaine vérifié chez Resend |

### `EMAIL_PROVIDER`

Choisit le moyen d'envoi : `auto` (défaut, SMTP en premier et Resend en secours),
`smtp` ou `resend`.

### `PLATFORM_OWNER_EMAILS`

Restreint le bouton « e-mail de test » de l'administration à certaines adresses,
séparées par des virgules. Vide, tous les administrateurs y ont accès.

---

## Météo

La page `/meteo` interroge [Open-Meteo](https://open-meteo.com), gratuit, sans clé
ni inscription. Coordonnées du logement requises.

| Variable | Défaut | Rôle |
| -------- | ------ | ---- |
| `WEATHER_LOCATION` | vide | Nom du lieu affiché (ex. `Exemple, FR`) |
| `WEATHER_LATITUDE` | vide (requis) | Latitude du logement |
| `WEATHER_LONGITUDE` | vide (requis) | Longitude du logement |
| `WEATHER_ELEVATION` | vide | Altitude en mètres, affine les prévisions |
| `WEATHER_API_KEY` | vide | Clé [OpenWeatherMap](https://openweathermap.org/api), **uniquement pour les e-mails de rappel** (avec `WEATHER_LOCATION`) ; la page `/meteo` ne l'utilise pas |

Pensez à adapter les coordonnées à votre logement. Sans `WEATHER_API_KEY`, les e-mails
de rappel sont simplement envoyés sans bloc météo.

---

## Protections supplémentaires

### CAPTCHA Cloudflare Turnstile

Facultatif. Protège les formulaires de connexion et de création de compte contre les
robots. Les deux clés vont ensemble : si l'une manque, le CAPTCHA reste désactivé.

| Variable | Rôle |
| -------- | ---- |
| `TURNSTILE_SITE_KEY` | Clé publique, insérée dans la page |
| `TURNSTILE_SECRET_KEY` | Clé privée, vérifiée côté serveur |

Les deux se créent sur le [tableau de bord Cloudflare](https://dash.cloudflare.com/),
rubrique Turnstile, en déclarant votre domaine.

### Mot de passe d'accès au site

Facultatif. Place une demande d'identifiants HTTP devant l'ensemble du site, avant même
la page de connexion. Utile pendant une phase de recette.

| Variable | Rôle |
| -------- | ---- |
| `BASIC_AUTH_ENABLED` | `true` pour activer |
| `BASIC_AUTH_USER` | Identifiant |
| `BASIC_AUTH_PASSWORD` | Mot de passe |

Cette protection ne transite en clair que si le site est en HTTP : ne l'utilisez qu'avec
HTTPS.

### `COOKIE_DOMAIN`

Facultatif, à laisser vide dans la quasi-totalité des cas. Ne servez-vous-en que pour
partager la session entre plusieurs sous-domaines, en indiquant le domaine parent
précédé d'un point : `.exemple.fr`.

---

## Variables internes

Ces variables sont fixées dans `docker-compose.yml` et n'ont pas à figurer dans `.env`.
Elles sont documentées ici parce qu'elles apparaissent dans les journaux.

| Variable | Valeur | Rôle |
| -------- | ------ | ---- |
| `SUPABASE_INTERNAL_URL` | `http://proxy` | Adresse utilisée par l'application pour joindre Supabase depuis le réseau Docker, où `PUBLIC_URL` n'est pas résolvable |
| `NODE_ENV` | `production` | Mode d'exécution de l'application |

La configuration destinée au navigateur est transmise à l'affichage de chaque page, et
non figée dans l'image. Changer `PUBLIC_URL` puis relancer la pile suffit donc : il n'y
a pas de reconstruction à prévoir.

C'est aussi la raison pour laquelle aucune variable ne porte le préfixe `NEXT_PUBLIC_`.
Next.js remplace ces noms-là par leur valeur au moment de la construction : une image
bâtie une fois resterait figée sur la configuration de ce jour-là. Les noms sans préfixe
sont lus à chaque démarrage du conteneur.
