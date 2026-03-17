# ---------- Build ----------
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
COPY tsconfig.json ./
COPY src ./src

# 👇 DATABASE_URL fake só pro build (não usada de verdade)
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"

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

ARG RESEND_API_KEY
ENV RESEND_API_KEY=$RESEND_API_KEY

# 👇 Aqui usa a DATABASE_URL REAL do Dokploy
CMD sh -c "sleep 5 && npx prisma migrate deploy --config ./prisma.config.ts && node dist/app.js"