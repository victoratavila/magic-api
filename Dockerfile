# Build
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
COPY tsconfig.json ./
COPY src ./src

# Define DATABASE_URL fake apenas para build
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db?schema=public"

# Gera Prisma Client
RUN npx prisma generate --config ./prisma.config.ts

# Build TS
RUN npm run build


# Runtime
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/dist ./dist

EXPOSE 8080

CMD sh -c "npx prisma migrate deploy --config ./prisma.config.ts && node dist/app.js"