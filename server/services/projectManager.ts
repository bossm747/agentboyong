import fs from 'fs/promises';
import path from 'path';
import { storage } from '../storage';
import { FileSystemService } from './fileSystem';

export interface ProjectTemplate {
  name: string;
  description: string;
  files: { [filename: string]: string };
  dependencies?: string[];
  startCommand?: string;
  port?: number;
  framework?: string;
  language?: string;
}

export class ProjectManager {
  private sessionId: string;
  private workspaceRoot: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.workspaceRoot = `./workspace/${sessionId}`;
  }

  async createProject(projectName: string, template: ProjectTemplate): Promise<string> {
    const timestamp = Date.now();
    const projectId = `${projectName}-${timestamp}`;
    const projectPath = path.join(this.workspaceRoot, projectId);

    // Create project directory
    await fs.mkdir(projectPath, { recursive: true });
    console.log(`📁 Created project directory: ${projectPath}`);

    // Create all project files
    for (const [filename, content] of Object.entries(template.files)) {
      const filePath = path.join(projectPath, filename);
      const fileDir = path.dirname(filePath);
      
      // Ensure subdirectories exist
      if (fileDir !== projectPath) {
        await fs.mkdir(fileDir, { recursive: true });
      }
      
      await fs.writeFile(filePath, content, 'utf-8');
      console.log(`📄 Created file: ${filename}`);
    }

    // Register application in database
    await storage.createApplication({
      sessionId: this.sessionId,
      name: template.name,
      description: template.description,
      port: template.port || 3000,
      url: `/app-proxy/${this.sessionId}/${projectId}`,
      status: 'running',
      startCommand: template.startCommand || 'static',
      framework: template.framework || 'static',
      language: template.language || 'html',
      directory: projectPath
    });

    console.log(`✅ Project "${projectName}" registered successfully`);
    return projectId;
  }

  getCalculatorTemplate(): ProjectTemplate {
    return {
      name: 'Calculator App',
      description: 'Modern calculator with responsive design',
      framework: 'vanilla',
      language: 'javascript',
      port: 8081,
      startCommand: 'python3 -m http.server 8081',
      files: {
        'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Calculator - Pareng Boyong</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="calculator">
        <div class="header">
            <h2>🇵🇭 Calculator</h2>
            <p>by Pareng Boyong</p>
        </div>
        <div class="display" id="display">0</div>
        <div class="buttons">
            <button class="btn clear" onclick="clearDisplay()">C</button>
            <button class="btn" onclick="deleteLast()">⌫</button>
            <button class="btn operator" onclick="appendToDisplay('/')" >÷</button>
            <button class="btn operator" onclick="appendToDisplay('*')">×</button>
            
            <button class="btn" onclick="appendToDisplay('7')">7</button>
            <button class="btn" onclick="appendToDisplay('8')">8</button>
            <button class="btn" onclick="appendToDisplay('9')">9</button>
            <button class="btn operator" onclick="appendToDisplay('-')">-</button>
            
            <button class="btn" onclick="appendToDisplay('4')">4</button>
            <button class="btn" onclick="appendToDisplay('5')">5</button>
            <button class="btn" onclick="appendToDisplay('6')">6</button>
            <button class="btn operator" onclick="appendToDisplay('+')">+</button>
            
            <button class="btn" onclick="appendToDisplay('1')">1</button>
            <button class="btn" onclick="appendToDisplay('2')">2</button>
            <button class="btn" onclick="appendToDisplay('3')">3</button>
            <button class="btn equals" onclick="calculate()" rowspan="2">=</button>
            
            <button class="btn" onclick="appendToDisplay('0')" style="grid-column: span 2;">0</button>
            <button class="btn" onclick="appendToDisplay('.')">.</button>
        </div>
    </div>
    <script src="script.js"></script>
</body>
</html>`,
        'styles.css': `* { 
    margin: 0; 
    padding: 0; 
    box-sizing: border-box; 
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh; 
    display: flex; 
    align-items: center; 
    justify-content: center;
}

.calculator {
    background: #2d3748; 
    border-radius: 20px; 
    padding: 30px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.3); 
    width: 300px;
}

.header { 
    text-align: center; 
    margin-bottom: 20px; 
    color: #4facfe; 
}

.display {
    background: #1a202c; 
    border-radius: 10px; 
    padding: 20px;
    margin-bottom: 20px; 
    text-align: right; 
    color: white;
    font-size: 2rem; 
    min-height: 60px; 
    display: flex;
    align-items: center; 
    justify-content: flex-end;
}

.buttons {
    display: grid; 
    grid-template-columns: repeat(4, 1fr);
    gap: 15px;
}

.btn {
    background: #4a5568; 
    color: white; 
    border: none;
    border-radius: 10px; 
    padding: 20px; 
    font-size: 1.2rem;
    cursor: pointer; 
    transition: all 0.3s;
}

.btn:hover { 
    background: #718096; 
    transform: translateY(-2px); 
}

.btn.operator { 
    background: #4facfe; 
}

.btn.operator:hover { 
    background: #2b6cb0; 
}

.btn.equals { 
    background: #48bb78; 
    grid-column: span 2; 
}

.btn.equals:hover { 
    background: #38a169; 
}

.btn.clear { 
    background: #f56565; 
}

.btn.clear:hover { 
    background: #e53e3e; 
}`,
        'script.js': `let display = document.getElementById('display');
let currentInput = '0';
let shouldResetDisplay = false;

function updateDisplay() {
    display.textContent = currentInput;
}

function clearDisplay() {
    currentInput = '0';
    shouldResetDisplay = false;
    updateDisplay();
}

function deleteLast() {
    if (currentInput.length > 1) {
        currentInput = currentInput.slice(0, -1);
    } else {
        currentInput = '0';
    }
    updateDisplay();
}

function appendToDisplay(value) {
    if (shouldResetDisplay) {
        currentInput = '';
        shouldResetDisplay = false;
    }
    
    if (currentInput === '0' && value !== '.') {
        currentInput = value;
    } else {
        currentInput += value;
    }
    updateDisplay();
}

function calculate() {
    try {
        let result = eval(currentInput.replace('×', '*').replace('÷', '/'));
        currentInput = result.toString();
        shouldResetDisplay = true;
        updateDisplay();
    } catch (error) {
        currentInput = 'Error';
        shouldResetDisplay = true;
        updateDisplay();
    }
}`,
        'package.json': JSON.stringify({
          "name": "calculator-app",
          "version": "1.0.0",
          "description": "Calculator App by Pareng Boyong",
          "main": "index.html",
          "scripts": {
            "start": "python3 -m http.server 8081"
          }
        }, null, 2)
      }
    };
  }

  getTodoTemplate(): ProjectTemplate {
    return {
      name: 'Todo App',
      description: 'Modern todo application with dark theme and neon effects',
      framework: 'vanilla',
      language: 'javascript',
      port: 8082,
      startCommand: 'python3 -m http.server 8082',
      files: {
        'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TodoMaster - Dark Theme</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>🇵🇭 TodoMaster</h1>
            <p>Your Filipino Todo App with Neon Effects</p>
        </header>
        
        <div class="todo-form">
            <input type="text" id="todoInput" placeholder="Add new todo..." />
            <button onclick="addTodo()">Add Todo</button>
        </div>
        
        <div class="todo-list">
            <ul id="todoList"></ul>
        </div>
        
        <div class="stats">
            <span id="totalTodos">0 todos</span>
            <span id="completedTodos">0 completed</span>
        </div>
    </div>
    
    <script src="script.js"></script>
</body>
</html>`,
        'styles.css': `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: #0a0a0a;
    color: #e0e0e0;
    min-height: 100vh;
    background-image: 
        radial-gradient(circle at 20% 50%, #00f5ff22 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, #ff006622 0%, transparent 50%),
        radial-gradient(circle at 40% 80%, #00ff8822 0%, transparent 50%);
}

.container {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
}

header {
    text-align: center;
    margin-bottom: 30px;
}

header h1 {
    font-size: 2.5rem;
    margin-bottom: 10px;
    text-shadow: 
        0 0 5px #00f5ff,
        0 0 10px #00f5ff,
        0 0 15px #00f5ff;
    color: #00f5ff;
    animation: neonGlow 2s ease-in-out infinite alternate;
}

@keyframes neonGlow {
    from { text-shadow: 0 0 5px #00f5ff, 0 0 10px #00f5ff, 0 0 15px #00f5ff; }
    to { text-shadow: 0 0 8px #00f5ff, 0 0 15px #00f5ff, 0 0 25px #00f5ff; }
}

header p {
    opacity: 0.8;
    font-size: 1.1rem;
}

.todo-form {
    display: flex;
    gap: 10px;
    margin-bottom: 30px;
}

#todoInput {
    flex: 1;
    padding: 15px;
    border: 2px solid #333;
    border-radius: 10px;
    font-size: 1rem;
    background: rgba(20, 20, 20, 0.8);
    color: #e0e0e0;
    transition: all 0.3s;
}

#todoInput:focus {
    outline: none;
    border-color: #00f5ff;
    box-shadow: 0 0 15px rgba(0, 245, 255, 0.3);
}

button {
    padding: 15px 25px;
    border: none;
    border-radius: 10px;
    background: linear-gradient(45deg, #00f5ff, #0066ff);
    color: white;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.3s;
    box-shadow: 0 0 10px rgba(0, 245, 255, 0.3);
}

button:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 20px rgba(0, 245, 255, 0.5);
}

.todo-list {
    background: rgba(20, 20, 20, 0.8);
    border: 1px solid #333;
    border-radius: 15px;
    padding: 20px;
    margin-bottom: 20px;
    backdrop-filter: blur(10px);
}

#todoList {
    list-style: none;
}

.todo-item {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 15px 0;
    border-bottom: 1px solid #333;
    transition: all 0.3s;
}

.todo-item:hover {
    background: rgba(0, 245, 255, 0.05);
    border-radius: 8px;
}

.todo-item:last-child {
    border-bottom: none;
}

.todo-item.completed .todo-text {
    text-decoration: line-through;
    opacity: 0.6;
}

.todo-checkbox {
    width: 20px;
    height: 20px;
    accent-color: #00f5ff;
}

.todo-text {
    flex: 1;
    font-size: 1.1rem;
}

.delete-btn {
    background: linear-gradient(45deg, #ff0066, #ff3366);
    padding: 8px 15px;
    font-size: 0.9rem;
    box-shadow: 0 0 10px rgba(255, 0, 102, 0.3);
}

.delete-btn:hover {
    box-shadow: 0 5px 20px rgba(255, 0, 102, 0.5);
}

.stats {
    display: flex;
    justify-content: space-between;
    background: rgba(20, 20, 20, 0.8);
    padding: 15px 25px;
    border-radius: 10px;
    font-weight: 500;
    border: 1px solid #333;
    backdrop-filter: blur(10px);
}

.stats span {
    color: #00f5ff;
    text-shadow: 0 0 5px #00f5ff;
}`,
        'script.js': `let todos = [];
let todoIdCounter = 1;

function addTodo() {
    const input = document.getElementById('todoInput');
    const text = input.value.trim();
    
    if (text === '') {
        alert('Please enter a todo!');
        return;
    }
    
    const todo = {
        id: todoIdCounter++,
        text: text,
        completed: false
    };
    
    todos.push(todo);
    input.value = '';
    renderTodos();
    updateStats();
}

function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        renderTodos();
        updateStats();
    }
}

function deleteTodo(id) {
    todos = todos.filter(t => t.id !== id);
    renderTodos();
    updateStats();
}

function renderTodos() {
    const todoList = document.getElementById('todoList');
    todoList.innerHTML = '';
    
    todos.forEach(todo => {
        const li = document.createElement('li');
        li.className = 'todo-item' + (todo.completed ? ' completed' : '');
        
        li.innerHTML = \`
            <input type="checkbox" class="todo-checkbox" \${todo.completed ? 'checked' : ''} 
                   onchange="toggleTodo(\${todo.id})">
            <span class="todo-text">\${todo.text}</span>
            <button class="delete-btn" onclick="deleteTodo(\${todo.id})">Delete</button>
        \`;
        
        todoList.appendChild(li);
    });
}

function updateStats() {
    const totalTodos = todos.length;
    const completedTodos = todos.filter(t => t.completed).length;
    
    document.getElementById('totalTodos').textContent = \`\${totalTodos} todos\`;
    document.getElementById('completedTodos').textContent = \`\${completedTodos} completed\`;
}

// Allow adding todos with Enter key
document.getElementById('todoInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        addTodo();
    }
});`,
        'package.json': JSON.stringify({
          "name": "todo-app",
          "version": "1.0.0",
          "description": "Todo App with Dark Theme and Neon Effects",
          "main": "index.html",
          "scripts": {
            "start": "python3 -m http.server 8082"
          }
        }, null, 2)
      }
    };
  }

  getWebsiteTemplate(projectName: string): ProjectTemplate {
    return {
      name: `${projectName} Website`,
      description: 'Modern landing page with neon effects',
      framework: 'static',
      language: 'html',
      port: 8080,
      startCommand: 'python3 -m http.server 8080',
      files: {
        'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectName} - Next Generation Solutions</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header class="header">
        <nav class="nav">
            <div class="logo">${projectName}</div>
            <a href="#" class="cta-btn">Get Started</a>
        </nav>
    </header>
    
    <section class="hero">
        <div class="container">
            <h1>Next Generation<br>Solutions</h1>
            <p>Revolutionize your business with cutting-edge technology. Join thousands of companies already using ${projectName}.</p>
            <a href="#" class="cta-btn">Start Free Trial</a>
            <a href="#" class="cta-btn secondary">Watch Demo</a>
        </div>
    </section>
    
    <section class="features">
        <div class="container">
            <h2>Why Choose ${projectName}?</h2>
            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon">⚡</div>
                    <h3>Lightning Fast</h3>
                    <p>Built for speed and performance with cutting-edge technology.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🛡️</div>
                    <h3>Secure & Reliable</h3>
                    <p>Enterprise-grade security with 99.9% uptime guarantee.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🚀</div>
                    <h3>Easy to Use</h3>
                    <p>Intuitive interface designed for maximum productivity.</p>
                </div>
            </div>
        </div>
    </section>
    
    <footer class="footer">
        <div class="container">
            <p>&copy; 2025 ${projectName}. All rights reserved. | Built with 🇵🇭 by Pareng Boyong</p>
        </div>
    </footer>
</body>
</html>`,
        'styles.css': `* { 
    margin: 0; 
    padding: 0; 
    box-sizing: border-box; 
}

body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #0a0a0a;
    color: #fff;
    overflow-x: hidden;
}

.header {
    position: fixed;
    top: 0;
    width: 100%;
    background: rgba(10, 10, 10, 0.95);
    backdrop-filter: blur(10px);
    z-index: 1000;
    padding: 20px 0;
    border-bottom: 1px solid #1a1a1a;
}

.nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

.logo {
    font-size: 28px;
    font-weight: 700;
    background: linear-gradient(135deg, #00f5ff 0%, #0066ff 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    text-shadow: 0 0 20px rgba(0, 245, 255, 0.3);
    animation: neonGlow 2s ease-in-out infinite alternate;
}

@keyframes neonGlow {
    from { filter: drop-shadow(0 0 5px #00f5ff); }
    to { filter: drop-shadow(0 0 15px #00f5ff); }
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

.hero {
    min-height: 100vh;
    display: flex;
    align-items: center;
    background: radial-gradient(circle at 30% 50%, #00f5ff11 0%, transparent 50%),
                radial-gradient(circle at 70% 20%, #ff006611 0%, transparent 50%);
}

.hero h1 {
    font-size: 4rem;
    font-weight: 800;
    margin-bottom: 20px;
    background: linear-gradient(135deg, #fff 0%, #00f5ff 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.hero p {
    font-size: 1.3rem;
    color: #a0a0a0;
    margin-bottom: 40px;
    max-width: 600px;
}

.cta-btn {
    display: inline-block;
    padding: 15px 30px;
    margin: 10px 10px 10px 0;
    background: linear-gradient(135deg, #00f5ff 0%, #0066ff 100%);
    color: white;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    transition: all 0.3s;
    box-shadow: 0 4px 15px rgba(0, 245, 255, 0.3);
}

.cta-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 245, 255, 0.5);
}

.cta-btn.secondary {
    background: transparent;
    border: 2px solid #00f5ff;
}

.features {
    padding: 100px 0;
    background: #111;
}

.features h2 {
    text-align: center;
    font-size: 3rem;
    margin-bottom: 60px;
    color: #00f5ff;
}

.features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 40px;
}

.feature-card {
    background: rgba(255, 255, 255, 0.05);
    padding: 40px;
    border-radius: 15px;
    text-align: center;
    border: 1px solid #333;
    transition: all 0.3s;
}

.feature-card:hover {
    transform: translateY(-10px);
    box-shadow: 0 20px 40px rgba(0, 245, 255, 0.1);
    border-color: #00f5ff;
}

.feature-icon {
    font-size: 3rem;
    margin-bottom: 20px;
}

.feature-card h3 {
    font-size: 1.5rem;
    margin-bottom: 15px;
    color: #00f5ff;
}

.footer {
    background: #000;
    padding: 50px 20px;
    text-align: center;
    border-top: 1px solid #333;
    color: #a0a0a0;
}

@media (max-width: 768px) {
    .hero h1 { font-size: 2.5rem; }
    .features h2 { font-size: 2rem; }
}`
      }
    };
  }
}