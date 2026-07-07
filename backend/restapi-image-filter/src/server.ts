import express from 'express';
import bodyParser from 'body-parser';
import { IndexRouter } from './controllers/v0/index.router';
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

  // Init the Express application
  const app = express();

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

  // Set the network port
  const port = process.env.PORT || 8080;

  
  // Use the body parser middleware for post requests
  app.use(bodyParser.json());

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