# Imagen de desarrollo de la API (recarga en caliente con tsx watch).
FROM node:22-alpine

# OpenSSL lo necesita el motor de consultas de Prisma.
RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json tsconfig.build.json vitest.config.ts openapi.yaml ./
COPY src ./src

# Se ejecuta sin privilegios de root; el volumen de evidencias hereda este dueño.
RUN mkdir -p /datos/evidencias && chown -R node:node /datos /app
USER node

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
    CMD node -e "fetch('http://localhost:3000/api/salud').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Aplica las migraciones pendientes y levanta el servidor.
CMD ["sh", "-c", "npx prisma migrate deploy && npm run dev"]
