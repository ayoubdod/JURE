FROM oven/bun:1.2-alpine AS build
WORKDIR /app

# bun.lockb in this repo is stale (missing express/axios/zustand/...), so a
# frozen install fails. Resolve from package.json instead.
COPY package.json ./
RUN bun install

COPY . .

# Vite inlines these at build time — Railway service variables arrive as build args.
ARG VITE_API_URL=https://jure-production-a298.up.railway.app
ENV VITE_API_URL=$VITE_API_URL
ARG VITE_JURIA_ENABLED=true
ENV VITE_JURIA_ENABLED=$VITE_JURIA_ENABLED

RUN bun run build

FROM oven/bun:1.2-alpine
WORKDIR /app
ENV NODE_ENV=production

# The SPA is fully bundled into dist/; express is the only runtime dependency.
RUN bun add express@^5.1.0

COPY server.mjs ./
COPY --from=build /app/dist ./dist

# Railway reads EXPOSE to pick the domain's target port. Keep it aligned with
# the PORT default so the edge proxy and the listener never disagree.
ENV PORT=3000
EXPOSE 3000

CMD ["bun", "server.mjs"]
