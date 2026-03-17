# ---------- Build ----------
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
COPY tsconfig.json ./
COPY src ./src

# NÃO definir DATABASE_URL aqui (deixa vir do ambiente)
# Evita problemas com host incorreto (localhost vs db)

RUN npx prisma generate --config ./prisma.config.ts

RUN npm run build


# ---------- Runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/dist ./dist

EXPOSE 8080

# Aguarda o banco subir + roda migrations + inicia app
CMD sh -c "sleep 5 && npx prisma migrate deploy --config ./prisma.config.ts && node dist/app.js"