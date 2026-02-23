# Build
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

# Prisma client
RUN npx prisma generate

# Build TS -> dist
RUN npm run build


# Runtime
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/dist ./dist

# Importante: Dokploy vai mapear o domínio pra essa porta do container
EXPOSE 8080

# Aplica migrations e inicia
CMD sh -c "npx prisma migrate deploy && node dist/app.js"