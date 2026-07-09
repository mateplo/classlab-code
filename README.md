# classlab-code

Code source de l'application **Udagram** (Node.js / TypeScript), utilisée comme app métier
de référence de la plateforme. Le déploiement vit dans `classlab-k8s` ; ici on a le code, les
Dockerfiles et les workflows qui buildent les images.

Dérivé du projet Udagram (Udacity Cloud Developer Nanodegree), réadapté pour tourner en
GitOps sur k3s au lieu d'AWS/Travis.

## Composants

- `frontend` — SPA Angular/Ionic servie par nginx.
- `backend/restapi-user` — service utilisateurs (auth JWT, Postgres).
- `backend/restapi-feed` — service de flux (Postgres, médias S3).
- `backend/restapi-image-filter` — traitement d'images (médias S3).

Chaque backend expose `/metrics` (prom-client). Le reverseproxy et Postgres sont fournis
côté `classlab-k8s`, pas ici.

> Base Node 12 (dépendances anciennes). Les installs utilisent `--ignore-scripts` pour éviter
> les compilations natives (bcrypt/node-sass) qui cassent sur les runners récents.

## Développement

Par service (dans son dossier) :

```bash
npm install --ignore-scripts
npm run lint          # frontend
npx tslint -p tsconfig.json 'src/**/*.ts'   # backends
```

## CI/CD

Workflows dans `.github/workflows/` (`lint`, `build`, `security`). Sur push, chaque service
est buildé et poussé sur GHCR (`ghcr.io/mateplo/udagram-*`) en deux tags `<branche>` et
`<branche>-<sha>`. Argo CD Image Updater propage ensuite le tag dans `classlab-k8s`.

Envs : `dev` → dev, `staging` → staging, `master`/`main` → prod.

Comme pour toute app du workspace : rendre les packages GHCR **publics** (pas d'imagePullSecret),
et fournir le secret Actions `GHCR_CLEANUP_TOKEN` (PAT `delete:packages`) dans ce repo.
