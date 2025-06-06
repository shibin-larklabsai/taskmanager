import { Router, Request, Response, RequestHandler } from 'express';
import { CommentController } from '../controllers/comment.controller.js';
import { auth } from '../middleware/auth.middleware.js';
import Joi from 'joi';

// Extend the Express Request type to include the user property
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string | number;
      roles?: Array<{ name: string }>;
    };
  }
}

const router = Router();

// Apply auth middleware to all routes
router.use(auth);

// Validation schemas
const createCommentSchema = Joi.object({
  content: Joi.string().required().min(1).max(2000).label('Comment'),
  projectId: Joi.number().required().label('Project ID'),
});

const updateCommentSchema = Joi.object({
  content: Joi.string().required().min(1).max(2000).label('Comment'),
});

// Validation middleware
const validateCommentCreate: RequestHandler = (req, res, next) => {
  const { error } = createCommentSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      error: error.details[0].message,
    });
  }
  next();
};

const validateCommentUpdate: RequestHandler = (req, res, next) => {
  const { error } = updateCommentSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      error: error.details[0].message,
    });
  }
  next();
};

// Routes
router.post('/', validateCommentCreate, async (req: Request, res: Response) => {
  try {
    await CommentController.createComment(req, res);
  } catch (error) {
    console.error('Error in create comment route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

router.get('/project/:projectId', async (req: Request, res: Response) => {
  try {
    await CommentController.getProjectComments(req, res);
  } catch (error) {
    console.error('Error in get project comments route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Get comments for multiple projects
router.get('/projects', async (req: Request, res: Response) => {
  try {
    await CommentController.getProjectsComments(req, res);
  } catch (error) {
    console.error('Error in get projects comments route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Delete a comment
router.delete('/:commentId', async (req: Request, res: Response) => {
  try {
    await CommentController.deleteComment(req, res);
  } catch (error) {
    console.error('Error in delete comment route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Update a comment
router.put('/:commentId', validateCommentUpdate, async (req: Request, res: Response) => {
  try {
    await CommentController.updateComment(req, res);
  } catch (error) {
    console.error('Error in update comment route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

export default router;
