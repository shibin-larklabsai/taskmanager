import express from 'express';
const router = express.Router();

// Basic health check
router.get('/health', (_, res) => {
  console.log('Health check endpoint called');
  res.status(200).json({ status: 'ok' });
});

export default router;
