let todos = [];
let todoIdCounter = 1;

function addTodo() {
    const input = document.getElementById('todoInput');
    const text = input.value.trim();
    
    if (text === '') {
        alert('Please enter a todo item!');
        return;
    }
    
    const todo = {
        id: todoIdCounter++,
        text: text,
        completed: false,
        createdAt: new Date()
    };
    
    todos.push(todo);
    input.value = '';
    renderTodos();
    updateStats();
}

function renderTodos() {
    const todoList = document.getElementById('todoList');
    todoList.innerHTML = '';
    
    todos.forEach(todo => {
        const li = document.createElement('li');
        li.className = 'todo-item' + (todo.completed ? ' completed' : '');
        li.innerHTML = `<span>${todo.text}</span>`;
        todoList.appendChild(li);
    });
}

function updateStats() {
    const total = todos.length;
    const completed = todos.filter(t => t.completed).length;
    
    document.getElementById('totalTodos').textContent = `${total} todos`;
    document.getElementById('completedTodos').textContent = `${completed} completed`;
}

document.getElementById('todoInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        addTodo();
    }
});

updateStats();