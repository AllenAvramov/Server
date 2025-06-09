// server.js (Express backend)

const express = require('express');
const cors = require('cors');
const createDBConnection = require('./db');
const app = express();
const port = process.env.PORT || 4000;

// Create database connection pool
const pool = createDBConnection();

// Middleware
app.use(cors());
app.use(express.json());

// GET all projects
app.get('/api/projects', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.*, 
        COALESCE(json_agg(t.name) FILTER (WHERE t.name IS NOT NULL), '[]') AS technologies
      FROM projects p
      LEFT JOIN technologies t ON p.id = t.project_id
      GROUP BY p.id
      ORDER BY p.id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching projects:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET single project
app.get('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching project:', err);
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
    const result = await pool.query('SELECT * FROM about_skills ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching about skills:', err);
    res.status(500).json({ error: 'Failed to fetch about skills' });
  }
});


// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
