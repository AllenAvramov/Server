// server.js (Express backend)

const express = require('express');
const cors = require('cors');
const app = express();
const port = 4000;

// Allow Cross-Origin requests
app.use(cors());

// Sample data for portfolio6
const sampleData = [
  {
    id: 1,
    title: 'Portfolio App',
    description: 'full-stack e-commerce platform built with React and Node.js, Express',
    technologies: ['React.js', "CSS", 'Node.js', 'Postgres', 'Express'],
    github: 'https://github.com/AllenAvramov/portfolio',
    live: 'https://rombarefoot.com',
    image: 'https://via.placeholder.com/300x200'
  },
  {
    id: 2,
    title: 'Task Management App',
    description: 'A task management application with real-time updates',
    technologies: ['React', 'Firebase', 'Material-UI'],
    github: 'https://github.com/yourusername/task-manager',
    live: 'https://task-manager-demo.com',
    image: 'https://via.placeholder.com/300x200'
  },
  {
    id: 3,
    title: 'Task Management App',
    description: 'A task management application with real-time updates',
    technologies: ['React', 'Firebase', 'Material-UI'],
    github: 'https://github.com/yourusername/task-manager',
    live: 'https://task-manager-demo.com',
    image: 'https://via.placeholder.com/300x200'
  },
  {
    id: 4,
    title: 'Task Management App',
    description: 'A task management application with real-time updates',
    technologies: ['React', 'Firebase', 'Material-UI'],
    github: 'https://github.com/yourusername/task-manager',
    live: 'https://task-manager-demo.com',
    image: 'https://via.placeholder.com/300x200'
  },
  {
    id: 5,
    title: 'Task Management App',
    description: 'A task management application with real-time updates',
    technologies: ['React', 'Firebase', 'Material-UI'],
    github: 'https://github.com/yourusername/task-manager',
    live: 'https://task-manager-demo.com',
    image: 'https://via.placeholder.com/300x200'
  },
  {
    id: 6,
    title: 'Task Management App',
    description: 'A task management application with real-time updates',
    technologies: ['React', 'Firebase', 'Material-UI'],
    github: 'https://github.com/yourusername/task-manager',
    live: 'https://task-manager-demo.com',
    image: 'https://via.placeholder.com/300x200'
  }
];

// Route to fetch sample portfolio data
app.get('/api/projects', (req, res) => {
  res.json(sampleData);
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
