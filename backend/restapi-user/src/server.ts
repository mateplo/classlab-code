import express from 'express';
import { sequelize } from './sequelize';

import { IndexRouter } from './controllers/v0/index.router';

import bodyParser from 'body-parser';

import { V0MODELS } from './controllers/v0/model.index';
import { config } from './config/config';
import client from 'prom-client';

// Métriques Prometheus (niveau process), partagées par toutes les requêtes.
client.collectDefaultMetrics();
const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Durée des requêtes HTTP par méthode/route/statut',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});

(async () => {
  await sequelize.addModels(V0MODELS);

  // Attente active de la base au démarrage : le DNS du service Postgres ou la base
  // elle-même peuvent ne pas être prêts quand le pod boote (getaddrinfo EAI_AGAIN,
  // ECONNREFUSED). Sans ce retry, sync() rejette une seule fois, l'IIFE async rejette,
  // et app.listen() n'est jamais atteint : le process reste vivant mais n'écoute pas
  // (port fermé -> 502 renvoyé par le reverseproxy). En dernier recours process.exit(1)
  // laisse Kubernetes redémarrer le pod.
  const maxRetries = 30;
  for (let attempt = 1; ; attempt++) {
    try {
      await sequelize.sync();
      break;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (attempt >= maxRetries) {
        console.error(`Base indisponible après ${attempt} tentatives, arrêt du process.`, message);
        process.exit(1);
      }
      const delay = Math.min(1000 * attempt, 10000);
      console.warn(`Connexion à la base échouée (tentative ${attempt}/${maxRetries}) : ${message}. Nouvel essai dans ${delay}ms.`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  const app = express();
  const port = process.env.PORT || 8080; // default port to listen

  // Chronomètre chaque requête + expose /metrics (scrapé par Prometheus, hors /api/v0).
  app.use((req, res, next) => {
    const done = httpDuration.startTimer();
    res.on('finish', () => {
      const route = req.path.replace(/\/[0-9]+/g, '/:id');
      done({ method: req.method, route, status: String(res.statusCode) });
    });
    next();
  });
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  });
  
  app.use(bodyParser.json());

  //CORS Should be restricted
  app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", config.ALLOW_ORIGIN_ACCESS.URL);
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    next();
  });

  app.use('/api/v0/', IndexRouter)

  // Root URI call
  app.get( "/", async ( req, res ) => {
    res.send( "/api/v0/" );
  } );
  

  // Start the Server
  app.listen( port, () => {
      console.log( `server running http://localhost:${ port }` );
      console.log( `press CTRL+C to stop server` );
  } );
})();