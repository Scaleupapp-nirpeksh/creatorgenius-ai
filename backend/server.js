// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const contentRoutes = require('./routes/content');
const ideaRoutes = require('./routes/ideas');
const calendarRoutes = require('./routes/calendar');
const userRoutes  = require('./routes/users');
const trendsRoutes = require('./routes/trends');
const insightRoutes = require('./routes/insights'); 
const seoRoutes = require('./routes/seo'); 
const scriptRoutes = require('./routes/scripts');
const feedbackRoutes = require('./routes/feedback');
const paymentRoutes = require('./routes/payments');


// Connect to Database
connectDB();

const app = express();

// Updated CORS configuration in server.js
const allowedOrigins = [
  // Development origins
  'http://localhost:3000',
  'http://localhost:19006',
  'http://10.0.2.2:5001',
  
  // Production origins
  'https://api.creatorgenius.app',
  'https://creatorgenius.app',
  'https://www.creatorgenius.app',
  '.creatorgenius.app', // Allow all subdomains
  
  // Mobile app origins
  'capacitor://localhost',
  'ionic://localhost'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests, etc.)
    if (!origin || allowedOrigins.some(allowed => {
      if (allowed.startsWith('.') && origin.endsWith(allowed.substring(1))) {
        return true;
      }
      return origin === allowed;
    })) {
      callback(null, true);
    } else {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      callback(new Error(msg), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// Middleware
app.use(express.json());

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


// Basic route
app.get('/', (req, res) => {
  res.send('CreatorGenius AI API Running!');
});

// Server Listener
const PORT = process.env.PORT || 8080; 
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));

// Optional: Add basic error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});