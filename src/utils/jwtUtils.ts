import jwt, { JwtPayload, SignOptions, Secret } from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const JWT_SECRET: Secret = process.env.JWT_SECRET || '';

// Function to generate a JWT
export const generateToken = (payload: object, expiresIn: string | number = '1h'): string => {
  const options: SignOptions = { expiresIn: expiresIn as SignOptions['expiresIn'] };
  console.log('Generating token with payload:', payload);
  return jwt.sign(payload, JWT_SECRET, options);
};

// Function to verify a JWT
export const verifyToken = (token: string): JwtPayload | string => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    console.error('Token verification failed:', err);
    throw new Error('Invalid token');
  }
};