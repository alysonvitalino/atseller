require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const usersRoutes = require('./routes/users');
const whatsappRoutes = require('./routes/whatsapp');
const webhookRoutes = require('./routes/webhooks');
const agentsRoutes = require('./routes/agents');
const flowsRoutes = require('./routes/flows');
const conversationsRoutes = require('./routes/conversations');
const leadsRoutes = require('./routes/leads');
const metricsRoutes = require('./routes/metrics');
const { startEngine } = require('./engine');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/agents', agentsRoutes);
app.use('/api/flows', flowsRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/webhooks', webhookRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

app.listen(PORT, () => {
  console.log(`🚀 ATSeller backend rodando na porta ${PORT}`);
  startEngine();
});
