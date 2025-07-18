import express from 'express';
import pool from '../utils/db';

const router = express.Router();

// Define the /data route
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