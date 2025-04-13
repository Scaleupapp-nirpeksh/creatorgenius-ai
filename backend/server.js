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


// Connect to Database
connectDB();

const app = express();

// Configure CORS
const allowedOrigins = [
  'http://localhost:3000',  // Frontend web
  'http://localhost:19006', // Expo web
  'http://10.0.2.2:5001',   // Android emulator 
  // Add any other origins you need
];
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true // Optional: If you need to send cookies or authorization headers
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

// Basic route
app.get('/', (req, res) => {
  res.send('CreatorGenius AI API Running!');
});

// Server Listener
const PORT = process.env.PORT || 5001;
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