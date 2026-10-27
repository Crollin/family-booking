# =============================================================================
# family-booking — image applicative
# =============================================================================
# Aucun secret ni URL n'est figé ici : toute la configuration est lue au
# démarrage du conteneur, si bien que la même image se déploie sur n'importe
# quel domaine sans reconstruction.
# =============================================================================

# Étape 1 — dépendances
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
# Les devDependencies sont nécessaires à la compilation.
ENV NODE_ENV=development
RUN npm ci --legacy-peer-deps --prefer-offline --no-audit


# Étape 2 — compilation
FROM node:22-alpine AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ne jamais embarquer un .env laissé sur la machine de compilation.
RUN rm -f .env .env.* || true

ENV NODE_ENV=production
RUN npm run build


# Étape 3 — exécution
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# sharp est un module natif, que la sortie standalone de Next.js n'embarque pas.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/sharp ./node_modules/sharp
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@img ./node_modules/@img

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
