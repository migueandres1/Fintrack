import express      from 'express';
import cors         from 'cors';
import helmet       from 'helmet';
import rateLimit    from 'express-rate-limit';
import dotenv       from 'dotenv';
import routes       from './routes/index.js';

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 4000;

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', routes);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

// 404
app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

app.listen(PORT, () => console.log(`🚀 FinTrack API corriendo en http://localhost:${PORT}`));
