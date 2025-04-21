// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const contentRoutes = require('./routes/content');
const ideaRoutes = require('./routes/ideas');
const calendarRoutes = require('./routes/calendar');
const userRoutes = require('./routes/users');
const trendsRoutes = require('./routes/trends');
const insightRoutes = require('./routes/insights'); 
const seoRoutes = require('./routes/seo'); 
const scriptRoutes = require('./routes/scripts');
const feedbackRoutes = require('./routes/feedback');
const paymentRoutes = require('./routes/payments');

// Connect to Database
connectDB();

const app = express();

// CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:19006',
  'http://10.0.2.2:5001',
  'https://creator-genius-env-2.eba-8xmj6etz.ap-south-1.elasticbeanstalk.com',
  'capacitor://localhost',
  'ionic://localhost',
  '*' // Allow all origins for mobile app - remove in production for security
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  // Log request details
  console.log(`--> ${req.method} ${req.originalUrl} [${new Date().toISOString()}]`);
  
  // For debugging specific endpoints
  if (req.originalUrl.includes('/api/auth/register') || req.originalUrl.includes('/api/auth/login')) {
    console.log('Auth request body:', { 
      ...req.body, 
      password: req.body.password ? '[REDACTED]' : undefined 
    });
  }
  
  // Log response time and status on completion
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`<-- ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms [${new Date().toISOString()}]`);
  });
  
  next();
});

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/ideas', ideaRoutes);
app.use('/api/calendar', calendarRoutes); 
app.use('/api/users', userRoutes); 
app.use('/api/trends', trendsRoutes);
app.use('/api/insights', insightRoutes); 
app.use('/api/seo', seoRoutes);
app.use('/api/scripts', scriptRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/payments', paymentRoutes);

// Health check route
app.get('/', (req, res) => {
  res.send('CreatorGenius AI API Running!');
});

// Health check route for AWS load balancer
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  
  // Specific handling for known errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: err.errors
    });
  }
  
  if (err.name === 'MongoServerError' && err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate key error',
      field: Object.keys(err.keyValue)[0]
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
});

// Start the server
const PORT = process.env.PORT || 8080;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Start time: ${new Date().toISOString()}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

