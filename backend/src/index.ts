import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import channelRoutes from './routes/channel.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from backend!' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

app.use('/api', channelRoutes);

export default app;