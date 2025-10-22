# Hospital Staff Skill Assessment

This is a web application for managing and evaluating the skills of hospital staff.

## Running the Application

This project is built with Vite and React, and can be served using a simple Node.js server.

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18 or higher recommended)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)

### 1. Installation

First, install the project dependencies:

```bash
npm install
```

### 2. Development Mode

To run the application in development mode with hot-reloading:

```bash
npm run dev
```

This will start the Vite development server, typically at `http://localhost:5173`.

### 3. Production Mode (with Node.js server)

To run the application in production mode:

**Step A: Build the application**

This command bundles the React app into static files in the `dist/` directory.

```bash
npm run build
```

**Step B: Start the Node.js server**

This command starts a simple Express server that serves the built files.

```bash
npm start
```

The application will be available at `http://localhost:3000`.
