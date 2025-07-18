import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import exampleRoutes from './routes/exampleRoutes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5234;

// Middleware
app.use(cors());
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.send('Welcome to the backend!');
});

// Use the exampleRoutes
app.use('/api', exampleRoutes);

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});