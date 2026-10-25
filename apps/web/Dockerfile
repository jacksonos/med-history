FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY packages/contracts ./packages/contracts
COPY apps/web ./apps/web
COPY apps/api/package.json ./apps/api/package.json
RUN npm ci
RUN npm run build --workspace=@mmh/contracts && npm run build --workspace=@mmh/web
FROM nginx:1.28-alpine
COPY infra/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
