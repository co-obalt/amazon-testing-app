import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import rateLimit from 'express-rate-limit';
import { initializeWebSocket } from './services/wsService.js';

// Import routers using NodeNext resolution (.js suffix is required for moduleResolution: NodeNext)
import authRouter from './routes/auth.js';
import transactionsRouter from './routes/transactions.js';
import reviewsRouter from './routes/reviews.js';
import chatRouter from './routes/chat.js';
import adminRouter from './routes/admin.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Rate limiting middleware to prevent brute-force attacks and optimize throughput
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, rate limit exceeded.' }
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/api', apiLimiter);

// Serve static admin files and uploads folder statically
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/admin', express.static(path.join(__dirname, '../public/admin')));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Global API Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Amazon Vine Review Evaluation Backend' });
});

// Router mounts
app.use('/api/auth', authRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/admin', adminRouter);

// Wrap app inside HTTP Server to attach WebSocket listener on the same port
const server = http.createServer(app);
initializeWebSocket(server);

server.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
export default app;
