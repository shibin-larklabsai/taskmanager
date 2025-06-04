import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { CommentController } from '../controllers/comment.controller';
import { auth } from '../middleware/auth.middleware';
import Joi from 'joi';

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

// Routes
const validateCommentCreate: RequestHandler = (req, res, next) => {
  const { error } = createCommentSchema.validate(req.body);
  if (error) {
    res.status(400).json({
      success: false,
      message: 'Validation error',
      error: error.details[0].message,
    });
    return;
  }
  next();
};

router.post(
  '/',
  validateCommentCreate,
  (req: Request, res: Response) => CommentController.createComment(req, res)
);

router.get(
  '/project/:projectId',
  (req: Request, res: Response) => CommentController.getProjectComments(req, res)
);

router.delete(
  '/:commentId',
  (req: Request, res: Response) => CommentController.deleteComment(req, res)
);

const validateCommentUpdate: RequestHandler = (req, res, next) => {
  const { error } = updateCommentSchema.validate(req.body);
  if (error) {
    res.status(400).json({
      success: false,
      message: 'Validation error',
      error: error.details[0].message,
    });
    return;
  }
  next();
};

router.put(
  '/:commentId',
  validateCommentUpdate,
  (req: Request, res: Response) => CommentController.updateComment(req, res)
);

export default router;
