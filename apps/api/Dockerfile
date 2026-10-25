FROM node:24.11.0-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm ci --ignore-scripts
COPY apps/api apps/api
COPY packages/contracts packages/contracts
COPY data data
RUN npm run build --workspace @mmh/contracts && npm run build --workspace @mmh/api

FROM node:24.11.0-bookworm-slim AS runtime
ENV NODE_ENV=production STORAGE_DIR=/var/lib/mmh/originals
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/contracts ./packages/contracts
COPY --from=build /app/apps/api ./apps/api
COPY --from=build /app/data ./data
RUN mkdir -p /var/lib/mmh/originals && chown -R node:node /var/lib/mmh /app/data/demo && chmod 700 /var/lib/mmh/originals
USER node
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
