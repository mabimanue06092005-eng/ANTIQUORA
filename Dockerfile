# Single-service production image: Express API serves the built React storefront.
FROM node:22-slim AS build
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/api/prisma apps/api/prisma
RUN npm ci --ignore-scripts && npm run postinstall --workspace apps/api
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
COPY --from=build /app /app
RUN npm prune --omit=dev --workspaces --include-workspace-root=false || true
WORKDIR /app/apps/api
EXPOSE 4000
# Apply migrations, then start. Seed separately (it wipes demo data): `npm run seed` inside the container.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
