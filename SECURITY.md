# Guide de sécurité — Family Lodge

> **Les secrets de `.env.example` sont publics.** Ils permettent de démarrer en une
> commande, rien de plus. Avant toute mise en ligne, exécutez `./scripts/generate-secrets.sh`
> pour les remplacer. Ne commitez jamais votre `.env`.

Ce document décrit les mesures de sécurité mises en place pour protéger l'application familiale et empêcher son indexation par les moteurs de recherche.

## Mesures de Non-Indexation

### 1. Fichier robots.txt
Un fichier `robots.txt` a été créé dans le dossier `public/` pour bloquer tous les crawlers :
```
User-agent: *
Disallow: /
```

### 2. Meta Tags Robots
Les meta tags `noindex, nofollow, noarchive, nosnippet` ont été ajoutés dans le layout principal (`src/app/layout.tsx`) pour empêcher l'indexation.

### 3. Headers HTTP
Les headers suivants sont automatiquement ajoutés à toutes les réponses :
- `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`

## Protection Basic Auth

### Configuration

Pour activer la protection Basic Auth, renseignez les variables suivantes dans votre fichier `.env`, puis relancez l'application (`docker compose up -d`) :

```bash
# Activer Basic Auth (true/false)
BASIC_AUTH_ENABLED=true

# Identifiants Basic Auth
BASIC_AUTH_USER=votre_nom_utilisateur
BASIC_AUTH_PASSWORD=votre_mot_de_passe_securise
```

### Fonctionnement

- La protection Basic Auth s'applique **AVANT** toute autre authentification (Supabase)
- Si `BASIC_AUTH_ENABLED` n'est pas défini ou vaut `false`, la protection est désactivée
- Si les credentials ne sont pas configurés, l'accès est autorisé (mode développement)
- En cas d'échec d'authentification, une réponse 401 est retournée avec le header `WWW-Authenticate`

### Recommandations

1. **Mot de passe fort** : Utilisez un mot de passe complexe et unique pour `BASIC_AUTH_PASSWORD`
2. **HTTPS obligatoire** : En production, utilisez toujours HTTPS pour protéger les credentials Basic Auth
3. **Variables d'environnement** : Ne commitez jamais le fichier `.env` dans Git
4. **Rotation** : Changez régulièrement le mot de passe Basic Auth

## Headers de Sécurité

Les headers de sécurité suivants sont configurés dans `next.config.js` et `middleware.ts` :

- **X-Robots-Tag** : Empêche l'indexation par les moteurs de recherche
- **X-Frame-Options: DENY** : Empêche l'inclusion de la page dans une iframe (protection contre clickjacking)
- **X-Content-Type-Options: nosniff** : Empêche le navigateur de deviner le type MIME
- **Referrer-Policy: no-referrer** : Ne transmet pas d'informations de référent
- **Permissions-Policy** : Désactive les fonctionnalités sensibles (caméra, microphone, géolocalisation)

## Configuration Serveur (Nginx)

Si vous utilisez Nginx en reverse proxy, vous pouvez également configurer Basic Auth au niveau Nginx pour de meilleures performances :

```nginx
location / {
    auth_basic "Accès privé";
    auth_basic_user_file /etc/nginx/.htpasswd;
    
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Pour créer le fichier `.htpasswd` :
```bash
htpasswd -c /etc/nginx/.htpasswd votre_nom_utilisateur
```

**Note** : Si Basic Auth est configuré au niveau Nginx, vous pouvez désactiver `BASIC_AUTH_ENABLED` dans l'application pour éviter une double authentification.

## Vérification

Pour vérifier que les mesures fonctionnent correctement :

1. **Robots.txt** : Accédez à `https://votre-domaine.com/robots.txt` et vérifiez qu'il contient `Disallow: /`
2. **Headers** : Utilisez les outils de développement du navigateur (Onglet Network) pour vérifier que les headers de sécurité sont présents
3. **Basic Auth** : Essayez d'accéder à l'application sans credentials - vous devriez voir une popup d'authentification
4. **Meta tags** : Vérifiez le code source de la page - les meta tags robots doivent être présents

## Notes Importantes

- Ces mesures empêchent l'indexation mais ne garantissent pas que l'application ne sera jamais trouvée
- Pour une sécurité maximale, combinez ces mesures avec :
  - Un nom de domaine non évident
  - Pas de liens externes vers l'application
  - Accès restreint par IP si possible (via firewall ou Nginx)
- L'application utilise déjà Supabase pour l'authentification des utilisateurs - Basic Auth est une couche supplémentaire

## Protection contre le Brute Force

### Rate Limiting côté Application

L'application implémente un système de rate limiting en mémoire pour protéger contre les attaques par force brute :

- **Par IP** : 5 tentatives par 15 minutes
- **Par email** : 3 tentatives par 15 minutes (inscription), 2 tentatives par 15 minutes (premier utilisateur)
- **Nettoyage automatique** : Les entrées expirées sont supprimées automatiquement

Le rate limiting est implémenté dans :
- `src/app/api/auth/register/route.ts`
- `src/app/api/auth/first-user/route.ts`

### Cloudflare Turnstile CAPTCHA

L'application utilise Cloudflare Turnstile pour protéger contre les bots et les scripts automatisés.

#### Configuration

1. **Créer un compte Cloudflare** : [https://dash.cloudflare.com/](https://dash.cloudflare.com/)
2. **Aller dans Turnstile** (menu de gauche)
3. **Créer un nouveau site** :
   - **Site name** : Family Lodge (ou la valeur de `SITE_NAME`)
   - **Domain** : Votre domaine (ou `localhost` pour développement)
   - **Widget mode** : Managed (recommandé)
4. **Copier les clés** :
   - **Site Key** (publique)
   - **Secret Key** (privée)

#### Variables d'environnement

Ajouter dans `.env` :

```bash
# Cloudflare Turnstile
TURNSTILE_SITE_KEY=votre_site_key_ici
TURNSTILE_SECRET_KEY=votre_secret_key_ici
```

#### Test en local

Pour tester Turnstile en local, ajouter `localhost` dans la liste des domaines autorisés dans Cloudflare Turnstile.

#### Fonctionnement

- Le CAPTCHA apparaît automatiquement dans les formulaires de connexion et d'inscription
- Le token est validé côté serveur avant toute création de compte ou connexion
- Si Turnstile n'est pas configuré, l'application fonctionne normalement (mode développement)

### Validation des Mots de Passe

Les mots de passe doivent respecter les critères suivants :

- **Longueur minimale** : 12 caractères
- **Au moins une majuscule** (A-Z)
- **Au moins une minuscule** (a-z)
- **Au moins un chiffre** (0-9)
- **Au moins un symbole** (!@#$%^&*()_+-=[]{};':"|<>?,./`~)

La validation est effectuée :
- **Côté client** : Feedback visuel en temps réel dans le formulaire
- **Côté serveur** : Validation avant création de compte

## Configuration GoTrue (service `auth`)

L'authentification est assurée par GoTrue, déclaré comme le service `auth` dans
`docker-compose.yml`. Il se règle entièrement par variables d'environnement, à ajouter
dans le bloc `auth:` → `environment:`.

### Renforcer les exigences de mot de passe

```yaml
GOTRUE_PASSWORD_MIN_LENGTH: 12
GOTRUE_PASSWORD_REQUIRE_UPPERCASE: "true"
GOTRUE_PASSWORD_REQUIRE_LOWERCASE: "true"
GOTRUE_PASSWORD_REQUIRE_NUMBERS: "true"
GOTRUE_PASSWORD_REQUIRE_SYMBOLS: "true"
```

### Limiter la cadence des requêtes (par heure)

```yaml
GOTRUE_RATE_LIMIT_EMAIL_SENT: 30
GOTRUE_RATE_LIMIT_TOKEN_REFRESH: 1800
GOTRUE_RATE_LIMIT_VERIFY: 360
```

### Application des modifications

```bash
docker compose up -d auth
```

### Documentation GoTrue

- [Repository GoTrue](https://github.com/supabase/auth)
- [Documentation Supabase Self-hosting](https://supabase.com/docs/guides/self-hosting/docker)

## Tracking des Tentatives Échouées

Les tentatives de connexion échouées sont enregistrées en base. Le nécessaire fait
partie du schéma appliqué au premier démarrage (`docker/db/init/02-schema.sql`) : il n'y
a rien à installer.

### Fonctionnalités

- **Table `failed_login_attempts`** : Stocke les tentatives échouées avec IP, email, timestamp
- **Fonctions PostgreSQL** :
  - `record_failed_login_attempt()` : Enregistrer une tentative
  - `count_recent_failed_attempts_by_ip()` : Compter les tentatives par IP
  - `count_recent_failed_attempts_by_email()` : Compter les tentatives par email
  - `cleanup_old_failed_login_attempts()` : Nettoyer les tentatives de plus de 24h
- **RLS activé** : Seuls les admins peuvent voir les tentatives

### Consulter les tentatives récentes

```bash
docker compose exec db psql -U postgres -d postgres \
  -c "select ip_address, email, attempted_at from failed_login_attempts order by attempted_at desc limit 20;"
```

## Résumé des Protections

1. ✅ **Basic Auth** : Protection au niveau middleware
2. ✅ **Rate Limiting** : Protection contre le brute force (IP + email)
3. ✅ **Cloudflare Turnstile** : Protection contre les bots
4. ✅ **Validation mot de passe** : Exigences de complexité
5. ✅ **Headers de sécurité** : Protection contre diverses attaques
6. ✅ **Non-indexation** : robots.txt + meta tags + headers
7. ✅ **Tracking tentatives** : Détection des attaques (optionnel)

## Support

Pour toute question concernant la sécurité, contactez l'administrateur de l'application.

