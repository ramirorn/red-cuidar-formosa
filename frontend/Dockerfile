# Imagen de desarrollo del frontend (Vite con recarga en caliente).
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html tsconfig.json vite.config.ts ./
COPY public ./public
COPY src ./src

RUN chown -R node:node /app
USER node

EXPOSE 5173

# --host: escucha fuera del contenedor. El proxy de Vite reenvía /api a la API (URL_API).
CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "5173", "--strictPort"]
