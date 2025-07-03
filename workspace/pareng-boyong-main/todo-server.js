const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 8082;

// Serve static files
app.use(express.static(__dirname));

// Serve the todo app index.html at root
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('<h1>Todo App Not Found</h1><p>The index.html file is missing.</p>');
  }
});

app.listen(PORT, () => {
  console.log(`🇵🇭 Pareng Boyong Todo App running at http://localhost:${PORT}/`);
  console.log('✅ Node.js server started successfully!');
});