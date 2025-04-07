// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors'); // <-- Require cors
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const contentRoutes = require('./routes/content');

// Connect to Database
connectDB();

const app = express();

// --- Configure CORS ---
const allowedOrigins = ['http://localhost:3000']; // Add your deployed frontend URL later
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
app.use(cors(corsOptions)); // <-- Use cors middleware with options

// --- Other Middleware ---
app.use(express.json()); // Middleware to parse JSON bodies

// --- Mount API Routes ---
app.use('/api/auth', authRoutes); 
app.use('/api/content', contentRoutes);

// Basic route (optional)
app.get('/', (req, res) => {
  res.send('CreatorGenius AI API Running!');
});

// --- Server Listener ---
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Optional: Add basic error handling middleware later