import { Pool, QueryResult } from 'pg';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Create a new PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test the database connection
pool.query('SELECT NOW()', (err: Error | null, res: QueryResult) => {
  if (err) {
    console.error('Error connecting to the database:', err);
  } else {
    console.log('Database connection successful:', res.rows[0]);
  }
});

export default pool;