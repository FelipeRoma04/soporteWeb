import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import authRoutes from './routes/auth.routes.js';
import ticketRoutes from './routes/tickets.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import knowledgeRoutes from './routes/knowledge.routes.js';
import aiRoutes from './routes/ai.routes.js';
import userRoutes from './routes/users.routes.js';
import categoryRoutes from './routes/categories.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'soporte-web-api' }));
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use(errorHandler);

app.listen(process.env.PORT || 4000, () => console.log(`API listening on port ${process.env.PORT || 4000}`));
