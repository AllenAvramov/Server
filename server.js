// server.js (Express backend)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const createDBConnection = require('./db');
const authRoutes = require('./routes/auth');
const app = express();
const port = process.env.PORT || 4000;


// Create database connection pool
const pool = createDBConnection();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api', authRoutes);

// GET all projects
// COALESCE(json_agg(s.name) FILTER (WHERE s.name IS NOT NULL), '[]') AS technologies:
// This builds your technologies array per project:
// json_agg(s.name) → collects all skill names (s.name) as JSON array for each project.
// FILTER (WHERE s.name IS NOT NULL) → ignores any null names (safe guard).
// COALESCE(..., '[]') → if no technologies found, returns an empty array instead of null.
app.get('/api/projects', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.*, 
        COALESCE(json_agg(s.name) FILTER (WHERE s.name IS NOT NULL), '[]') AS technologies
      FROM projects p
      LEFT JOIN technologies t ON p.id = t.project_id
      LEFT JOIN skills s ON t.skill_id = s.id
      GROUP BY p.id
      ORDER BY p.id;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching projects:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// POST - Save contact form message
app.post('/api/messages', async (req, res) => {
  const { sender_name, sender_email, message } = req.body;

  if (!sender_name || !sender_email || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    await pool.query(
      'INSERT INTO messages (sender_name, sender_email, message) VALUES ($1, $2, $3)',
      [sender_name, sender_email, message]
    );
    res.status(200).json({ message: 'Message sent successfully!' });
  } catch (err) {
    console.error('Error saving message:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET for the skills page
app.get('/api/skills', async (req, res) => {
  try {
    const result = await pool.query('SELECT name, category FROM skills ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching skills:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET all about page
app.get('/api/about-skills', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        a.id, 
        a.type, 
        a.skill_id, 
        s.name
      FROM about_skills a
      JOIN skills s ON a.skill_id = s.id
      ORDER BY a.id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching about skills:', err);
    res.status(500).json({ error: 'Failed to fetch about skills' });
  }
});

const verifyToken = require('./middleware/authMiddleware');
app.get('/api/secure-data', verifyToken, (req, res) => {
  res.json({ message: `Welcome ${req.user.username}, this is data just for ADMIN!` });
});

app.get('/api/admin/messages', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, sender_name, sender_email, message, sent_at
      FROM messages
      ORDER BY sent_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//delete all the messages in the setting admin
app.delete('/api/admin/messages', verifyToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM messages');
    res.json({ message: 'All messages deleted' });
  } catch (err) {
    console.error('Error deleting messages:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
