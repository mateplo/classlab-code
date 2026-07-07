## Build
FROM beevelop/ionic AS ionic
# Create app directory
WORKDIR /usr/src/app
# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./
RUN npm ci
# Bundle app source
COPY . .
# beevelop/ionic:latest embarque désormais Node >=17 (OpenSSL 3) alors que ce projet
# utilise webpack 4 (hash MD4) -> ERR_OSSL_EVP_UNSUPPORTED. On réactive le provider legacy.
ENV NODE_OPTIONS=--openssl-legacy-provider
RUN ionic build

## Run 
FROM nginx:alpine
#COPY www /usr/share/nginx/html
COPY --from=ionic  /usr/src/app/www /usr/share/nginx/html

