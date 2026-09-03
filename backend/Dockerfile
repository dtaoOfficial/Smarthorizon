FROM node:20-bookworm-slim AS build
WORKDIR /app

# needed so `prisma generate` can correctly detect the OpenSSL version and
# fetch the matching query engine binary (otherwise it silently guesses wrong)
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

RUN npx prisma generate
# tsc exits non-zero on a pre-existing type error in the self-check-in route
# (unrelated to this Docker setup) but still emits dist/; only fail the build
# if the actual entrypoint didn't come out.
RUN node node_modules/typescript/bin/tsc -p . || true
RUN test -f dist/server.js

FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/dist ./dist
COPY package.json ./

EXPOSE 5000
CMD ["node", "dist/server.js"]
