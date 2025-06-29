// server.js (Express backend)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const createDBConnection = require('./db');
const verifyToken = require('./middleware/authMiddleware'); // every time i navigate between the links in admon page it will check the token
const app = express();
const port = process.env.PORT || 4000;


// Create database connection pool
const pool = createDBConnection();

// Middleware
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Server is running!');
});

const authRoutes = require('./routes/auth');
app.use('/api', authRoutes); // creating route /api/login . /login from auth.js

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

// GET single project by id  
app.get('/api/projects/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `
      SELECT  p.*,
              COALESCE(json_agg(json_build_object('id', s.id,'name', s.name))
                       FILTER (WHERE s.id IS NOT NULL), '[]') AS technologies
      FROM projects p
      LEFT JOIN technologies t ON p.id = t.project_id
      LEFT JOIN skills s       ON t.skill_id = s.id
      GROUP BY p.id
      HAVING p.id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching project:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// PUT (update) single project 
app.put('/api/projects/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { title, description, image_url, live_url, github_url, technologies } = req.body;

  try {
    // update main fields
    await pool.query(
      `UPDATE projects
       SET title=$1, description=$2, image_url=$3, live_url=$4, github_url=$5
       WHERE id=$6`,
      [title, description, image_url, live_url, github_url, id]
    );

    // reset technologies for that project
    await pool.query('DELETE FROM technologies WHERE project_id = $1', [id]);

    // re-insert (if any)
    if (Array.isArray(technologies) && technologies.length) {
      const insertPromises = technologies.map(skillId =>
        pool.query(
          'INSERT INTO technologies (project_id, skill_id) VALUES ($1,$2)',
          [id, skillId]
        )
      );
      await Promise.all(insertPromises);
    }

    res.json({ message: 'Project updated successfully' });
  } catch (err) {
    console.error('Error updating project:', err);
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

//delete project
app.delete('/api/projects/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM projects WHERE id = $1', [id]);
    res.json({ message: 'Project deleted' });
  } catch (err) {
    console.error('Error deleting project:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST - Add new project
app.post('/api/projects', verifyToken, async (req, res) => {
  const { title, description, image_url, live_url, github_url, technologies } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Insert the new project
    const result = await pool.query(
      `INSERT INTO projects (title, description, image_url, live_url, github_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [title, description, image_url || null, live_url || null, github_url || null]
    );

    const newProjectId = result.rows[0].id;

    // Insert technologies if provided
    if (Array.isArray(technologies) && technologies.length) {
      const insertPromises = technologies.map(skillId =>
        pool.query(
          'INSERT INTO technologies (project_id, skill_id) VALUES ($1, $2)',
          [newProjectId, skillId]
        )
      );
      await Promise.all(insertPromises);
    }

    res.status(201).json({ message: 'Project created successfully', id: newProjectId });
  } catch (err) {
    console.error('Error adding project:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
