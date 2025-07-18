import express from 'express';
import { supabase } from '../utils/supabaseClient';

const router = express.Router();

// User registration
router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    res.status(201).json({ message: 'User registered successfully', user: data.user });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// User login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    res.status(200).json({ message: 'Login successful', user: data.user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Password reset
router.post('/reset-password', async (req, res) => {
  const { email } = req.body;

  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) throw error;

    res.status(200).json({ message: 'Password reset email sent' });
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

// Google login
router.get('/login/google', async (req, res) => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });

    if (error) throw error;

    res.redirect(data.url); // Redirect to Google OAuth page
  } catch (err) {
    console.error('Google login error:', err);
    res.status(500).json({ error: 'Google login failed' });
  }
});
export default router;