import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// These are needed for ES modules to get __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Serve the static files from the Vite build output directory
app.use(express.static(path.join(__dirname, 'dist')));

// For any other request, send the index.html file so client-side routing can take over
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log('To use this server, you must first build the project with "npm run build"');
});
