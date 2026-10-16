FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/protocol/package.json packages/protocol/package.json
COPY packages/db/package.json packages/db/package.json
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci
COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/server ./apps/server
COPY scripts/runner.js ./scripts/runner.js
RUN npm run build:server
ENV NODE_ENV=production
USER node
CMD ["node", "apps/server/dist/cloud-worker.js"]
