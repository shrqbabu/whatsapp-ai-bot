import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import apiRouter from './api/routes.js';

export function createApp(): express.Application {
  const app = express();

  // Security Headers (allow inline styles for status landing page)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS Configuration
  app.use(
    cors({
      origin: config.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
    })
  );

  // Request Body Size & JSON Parser
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  // Root Landing & Status Page (GET /)
  app.get('/', (req, res) => {
    const isHtml = req.accepts('html', 'json') === 'html';
    if (isHtml) {
      res.status(200).send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WhatsApp AI Backend</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { background: #0b141a; color: #e9edef; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
    .card { background: #111b21; border: 1px solid #222e35; border-radius: 16px; padding: 32px; max-width: 600px; width: 100%; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(0, 168, 132, 0.15); color: #25d366; padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 13px; margin-bottom: 16px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #25d366; animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; color: #ffffff; }
    p { color: #8696a0; font-size: 14px; line-height: 1.5; margin-bottom: 24px; }
    .section-title { font-size: 14px; font-weight: 600; color: #00a884; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
    .endpoints { background: #202c33; border-radius: 10px; overflow: hidden; margin-bottom: 24px; }
    .endpoint-row { display: flex; align-items: center; padding: 12px 16px; border-bottom: 1px solid #2a3942; font-size: 13px; }
    .endpoint-row:last-child { border-bottom: none; }
    .method { font-weight: 700; width: 60px; font-size: 11px; }
    .method.get { color: #25d366; }
    .method.post { color: #3b82f6; }
    .method.ws { color: #a855f7; }
    .path { font-family: monospace; color: #d1d7db; flex: 1; }
    .desc { color: #8696a0; font-size: 12px; }
    .footer { text-align: center; font-size: 12px; color: #667781; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge"><div class="dot"></div> Server Online & Ready</div>
    <h1>WhatsApp AI Multi-Tenant Backend</h1>
    <p>The backend API server and real-time WebSocket service are running and ready to serve your Android control panel app.</p>

    <div class="section-title">Available Endpoints</div>
    <div class="endpoints">
      <div class="endpoint-row"><span class="method get">GET</span><span class="path">/health</span><span class="desc">Health Check</span></div>
      <div class="endpoint-row"><span class="method post">POST</span><span class="path">/api/auth/register</span><span class="desc">User Sign Up</span></div>
      <div class="endpoint-row"><span class="method post">POST</span><span class="path">/api/auth/login</span><span class="desc">User Sign In</span></div>
      <div class="endpoint-row"><span class="method get">GET</span><span class="path">/api/whatsapp/status</span><span class="desc">Session Status</span></div>
      <div class="endpoint-row"><span class="method post">POST</span><span class="path">/api/whatsapp/connect</span><span class="desc">Pair WhatsApp</span></div>
      <div class="endpoint-row"><span class="method ws">WS</span><span class="path">/ws?token=&lt;jwt&gt;</span><span class="desc">Real-time Stream</span></div>
    </div>

    <div class="footer">
      Environment: <strong>${config.NODE_ENV}</strong> &bull; Port: <strong>${config.PORT}</strong>
    </div>
  </div>
</body>
</html>
      `);
    } else {
      res.status(200).json({
        status: 'ok',
        service: 'WhatsApp AI Multi-Tenant Backend',
        environment: config.NODE_ENV,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Health check
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', time: new Date().toISOString() });
  });

  // Global API Rate Limiter
  app.use('/api', apiRateLimiter);

  // API Routes
  app.use('/api', apiRouter);

  // Central Error Handler Middleware
  app.use(errorHandler);

  return app;
}
