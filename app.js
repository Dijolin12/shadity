// Antigravity Frontend Controller (Communicates with REST API)
const API_BASE = 'http://localhost:3000/api/todos';

const form = document.getElementById('todo-form');
const input = document.getElementById('todo-input');
const list = document.getElementById('todo-list');
const count = document.getElementById('task-count');

// Fetch and render todos
async function loadTodos() {
  try {
    const res = await fetch(API_BASE);
    const data = await res.json();
    renderTodos(data.data || []);
  } catch (err) {
    console.error('Failed to connect to backend server:', err);
  }
}

function renderTodos(todos) {
  list.innerHTML = '';
  count.textContent = `${todos.length} task${todos.length === 1 ? '' : 's'}`;

  if (todos.length === 0) {
    list.innerHTML = '<li style="text-align:center; color:#8b949e; padding:20px;">No tasks yet. Add one above!</li>';
    return;
  }

  todos.forEach(todo => {
    const li = document.createElement('li');
    li.className = 'todo-item';

    const span = document.createElement('span');
    span.textContent = todo.title;

    const delBtn = document.createElement('button');
    delBtn.className = 'del-btn';
    delBtn.innerHTML = '✕';
    delBtn.title = 'Delete task';
    delBtn.onclick = () => deleteTodo(todo.id);

    li.appendChild(span);
    li.appendChild(delBtn);
    list.appendChild(li);
  });
}

// Save Todo
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = input.value.trim();
  if (!title) return;

  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });

    if (res.ok) {
      input.value = '';
      loadTodos();
    }
  } catch (err) {
    console.error('Error saving todo:', err);
  }
});

// Delete Todo
async function deleteTodo(id) {
  try {
    const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
    if (res.ok) {
      loadTodos();
    }
  } catch (err) {
    console.error('Error deleting todo:', err);
  }
}

// Initial load
loadTodos();
