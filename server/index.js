require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const path      = require('path');
const rateLimit = require('express-rate-limit');
const routes    = require('./routes/index');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api/auth', rateLimit({ windowMs: 15*60*1000, max: 30 }));
app.use('/api',      rateLimit({ windowMs: 60*1000,    max: 200 }));
app.use('/uploads',  express.static(path.join(__dirname, 'uploads'), { maxAge: '7d', etag: true }));
app.use('/api', routes);
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));
app.use((_req, res) => res.status(404).json({ message: 'Not found' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.code === 'ECONNREFUSED' ? 503 : (err.status || 500);
  const message = err.code === 'ECONNREFUSED' ? 'Database unavailable' : (err.message || 'Server error');
  res.status(status).json({ message });
});
process.on('unhandledRejection', (r) => console.error('Unhandled rejection:', r));

app.listen(PORT, () => console.log(`👕  Jboss Clothing API running on port ${PORT}`));
