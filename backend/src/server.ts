import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import authRouter from './routes/auth';
import tracksRouter from './routes/tracks';
import notificationsRouter from './routes/notifications';
import dashboardRouter from './routes/dashboard';
import teamsRouter from './routes/teams';
import registrationRouter from './routes/registration';
import judgesRouter from './routes/judges';
import reviewsRouter from './routes/reviews';
import criteriaRouter from './routes/criteria';
import questionsRouter from './routes/questions';
import announcementsRouter from './routes/announcements';
import reportsRouter from './routes/reports';
import feedbackRouter from './routes/feedback';
import submissionsRouter from './routes/submissions';
import timerRouter from './routes/timer';
import { backfillTeams } from './utils/qr';
import { authenticateToken } from './middleware/auth';
import { createRateLimiter } from './middleware/rateLimiter';

dotenv.config();

const app = express();

// Trust reverse proxy (1 hop) for SSL termination & header forwarding
app.set('trust proxy', 1);

// Backfill QR codes and Team IDs for existing teams
backfillTeams();
const PORT = process.env.PORT || 5000;

// Production Security Headers Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (process.env.NODE_ENV === 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Enable CORS for frontend application
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Disposition']
}));

app.use(express.json());

// Rate Limiting Middlewares for Security-Sensitive Operations
const generalApiLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // 300 requests per minute
  message: 'API rate limit exceeded. Please slow down your requests.',
});

// Apply general API rate limiting
app.use('/api', generalApiLimiter);


// Base health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Register Routers
app.use('/api/auth', authRouter);
app.use('/api/tracks', tracksRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/registration', registrationRouter);
app.use('/api/judges', judgesRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/criteria', criteriaRouter);
app.use('/api/questions', questionsRouter);
app.use('/api/announcements', announcementsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/submissions', submissionsRouter);
app.use('/api/timer', timerRouter);

// Global Error Handler - Hide Stack Traces in Production Responses
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Error:', err);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || 'An internal server error occurred',
  });
});

app.listen(PORT, () => {
  console.log(`SmartHorizon server running on port ${PORT}`);
});
