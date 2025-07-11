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
        COALESCE(json_agg(s.name) FILTER (WHERE s.name IS NOT NULL), '[]') AS technologies,
        COUNT(r.id) AS rating_count,
        COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) AS average_rating
      FROM projects p
      LEFT JOIN technologies t ON p.id = t.project_id
      LEFT JOIN skills s ON t.skill_id = s.id
      LEFT JOIN project_ratings r ON r.project_id = p.id
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
  const {
    title,
    description,
    full_description,
    academic_track,
    students,
    mentor,
    youtube_url,
    image,
    live,
    github,
    technologies
  } = req.body;

  try {
   // all the feilds
    await pool.query(
      `UPDATE projects
       SET title=$1,
           description=$2,
           full_description=$3,
           academic_track=$4,
           students=$5,
           mentor=$6,
           youtube_url=$7,
           image=$8,
           live=$9,
           github=$10
       WHERE id=$11`,
      [title, description, full_description, academic_track, students, mentor, youtube_url, image || null, live || null, github || null, id]
    );

    // delete what we dont neeed, the old
    await pool.query('DELETE FROM technologies WHERE project_id = $1', [id]);

    // add new
    if (Array.isArray(technologies) && technologies.length) {
      const insertPromises = technologies.map(skillId =>
        pool.query(
          'INSERT INTO technologies (project_id, skill_id) VALUES ($1, $2)',
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
  const {
    title,
    description,
    full_description,
    academic_track,
    students,
    mentor,
    youtube_url,
    image,
    live,
    github,
    technologies
  } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO projects (
        title,
        description,
        full_description,
        academic_track,
        students,
        mentor,
        youtube_url,
        image,
        live,
        github
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING id`,
      [title, description, full_description, academic_track, students, mentor, youtube_url, image || null, live || null, github || null]
    );

    const newProjectId = result.rows[0].id;

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

//to sopport adding technologies when we add a new project
app.post('/api/skills', async (req, res) => {
  const { name, category = 'other' } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Missing skill name' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO skills (name, category) VALUES ($1, $2) RETURNING id',
      [name, category]
    );
    res.status(201).json({ id: result.rows[0].id, name, category });
  } catch (err) {
    console.error('Error inserting skill:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//to rank the projects
app.post('/api/ratings', async (req, res) => {
  const { project_id, rating } = req.body;

  if (!project_id || ![1, 2, 3, 4, 5].includes(rating)) {
    return res.status(400).json({ error: 'Invalid project ID or rating value' });
  }

  try {
    await pool.query(
      'INSERT INTO project_ratings (project_id, rating) VALUES ($1, $2)',
      [project_id, rating]
    );
    res.status(201).json({ message: 'Rating added successfully' });
  } catch (err) {
    console.error('Error adding rating:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/ratings/:projectId', async (req, res) => {
  const { projectId } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT 
        COUNT(*) AS count,
        ROUND(AVG(rating)::numeric, 1) AS average
      FROM project_ratings
      WHERE project_id = $1
      `,
      [projectId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching rating:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
