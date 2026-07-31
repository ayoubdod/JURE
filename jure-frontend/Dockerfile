FROM oven/bun:1.2-alpine AS build
WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

COPY . .

# Vite bakes this at build time — set VITE_API_URL on the Railway service.
ARG VITE_API_URL=https://jure-production-a298.up.railway.app
ENV VITE_API_URL=$VITE_API_URL

RUN bun run build

FROM oven/bun:1.2-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

COPY server.mjs ./
COPY --from=build /app/dist ./dist

# Railway injects PORT; server.mjs reads process.env.PORT
CMD ["bun", "server.mjs"]
