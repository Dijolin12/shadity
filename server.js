import express from 'express';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.resolve('todos.json');

app.use(express.json());

// Load and persist todos
const loadTodos = () => {
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return [];
  }
};

const saveTodos = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

// 1. GET all todos
app.get('/api/todos', (req, res) => {
  res.json({ success: true, data: loadTodos() });
});

// 2. POST create / save todo
app.post('/api/todos', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const todos = loadTodos();
  const newTodo = {
    id: Date.now().toString(),
    title: title.trim(),
    completed: false,
    createdAt: new Date().toISOString()
  };
  todos.unshift(newTodo);
  saveTodos(todos);
  res.status(201).json({ success: true, data: newTodo });
});

// 3. DELETE remove todo
app.delete('/api/todos/:id', (req, res) => {
  const { id } = req.params;
  let todos = loadTodos();
  const initialLength = todos.length;
  todos = todos.filter(t => t.id !== id);

  if (todos.length === initialLength) {
    return res.status(404).json({ error: 'Todo not found' });
  }

  saveTodos(todos);
  res.json({ success: true, message: 'Todo deleted successfully' });
});

app.listen(PORT, () => {
  console.log(`[Todo Server] Running on http://localhost:${PORT}`);
});

export default app;
