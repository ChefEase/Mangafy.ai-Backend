import express from 'express';
import { generateToken } from '../utils/jwtUtils';
import pool from '../utils/db';

const router = express.Router();

// Example login route
router.post('/login', (req, res) => {
  
  const { username, password } = req.body;

  // Validate username and password (e.g., check against database)
  if (username === 'admin' && password === 'password') {
    // Generate a JWT
    const token = generateToken({ username });
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

router.get('/data', async (req, res) => {
  try {
    // Example: Fetch data from the database
    const result = await pool.query('SELECT * FROM your_table_name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching data:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
export default router;