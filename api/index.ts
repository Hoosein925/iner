import express from 'express';
import { createApiRouter } from '../server/apiRouter';

const app = express();

app.use(express.json({ limit: '10mb' }));

// Mount API router for both /api prefix and root to handle any rewrite scheme on Vercel
const apiRouter = createApiRouter();
app.use('/api', apiRouter);
app.use('/', apiRouter);

export default app;
