

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-bookworm-slim AS base
WORKDIR /app


# ---- server ----

FROM base AS server-build
RUN echo '{"private":true,"workspaces":["server"]}' > package.json
COPY yarn.lock ./
COPY server/package.json server/
RUN yarn install --frozen-lockfile
COPY server server

RUN yarn --cwd server build

FROM base AS server-deps
RUN echo '{"private":true,"workspaces":["server"]}' > package.json
COPY yarn.lock ./
COPY server/package.json server/
RUN yarn install --frozen-lockfile --production && yarn cache clean

FROM base AS server
ENV NODE_ENV=production \
    PORT=4000 \
    DB_PATH=/data/directory.db

COPY --from=server-deps /app/node_modules ./node_modules

COPY server/package.json ./server/package.json
COPY --from=server-build /app/server/dist ./server/dist
COPY docker/server-entrypoint.sh ./docker-entrypoint.sh

RUN mkdir -p /data && chown node:node /data
VOLUME /data

USER node
WORKDIR /app/server
EXPOSE 4000

HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]


# ---- client ----

FROM base AS client-build
RUN echo '{"private":true,"workspaces":["client"]}' > package.json
COPY yarn.lock ./
COPY client/package.json client/
RUN yarn install --frozen-lockfile
COPY client client
RUN yarn --cwd client build

FROM nginx:1.27-alpine AS client
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=client-build /app/client/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
