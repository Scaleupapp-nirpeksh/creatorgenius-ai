// backend/server.js
const express = require('express');
require('dotenv').config();
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth'); 
connectDB();
const app = express();


app.use(express.json()); // Middleware to parse JSON bodies

// Basic route (keep or remove)
app.get('/', (req, res) => {
  res.send('CreatorGenius AI API Running!');
});



app.use('/api/auth', authRoutes); 

// --- We will mount our auth routes here later ---

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));