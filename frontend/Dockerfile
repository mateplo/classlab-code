## Build — Angular 7 / Ionic 4 (2019) : node-sass 4.12 + webpack 4 -> nécessite Node 12.
## Les images ionic récentes (Node 22) cassent (OpenSSL 3, node-sass sans binaire natif).
## On builde via `ng build` (npm run build, @angular/cli local) : pas besoin du CLI ionic
## global, dont les versions récentes exigent Node >=16. Sortie dans ./www (cf. angular.json).
FROM node:12 AS ionic
WORKDIR /usr/src/app
# Copie package.json + package-lock.json pour installer les deps (cache Docker).
COPY package*.json ./
RUN npm ci
# Code source puis build de production dans ./www.
COPY . .
RUN npm run build

## Run — sert le SPA compilé avec nginx.
FROM nginx:alpine
COPY --from=ionic /usr/src/app/www /usr/share/nginx/html
