const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const apiRoutes = require('./routes');
const { errorHandler } = require('./middlewares/errorHandler');
const { errorResponse } = require('./utils/response');

const app = express();

// Middleware Global
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Root endpoint info
app.get('/', (req, res) => {
  res.json({
    name: 'PT. Bhimasena Adhirajasa Radhika Backend API',
    version: '1.0.0',
    documentation: 'sot/04-API-SPEC.md',
    base_url: '/api/v1',
    status: 'online'
  });
});

// Mount API v1
app.use('/api/v1', apiRoutes);

// 404 Route Not Found
app.use((req, res) => {
  return errorResponse(res, `Endpoint '${req.method} ${req.originalUrl}' tidak ditemukan.`, null, 404);
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
