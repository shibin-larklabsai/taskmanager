import { Router } from 'express';
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

// Routes
router.post(
  '/',
  (req, res, next) => {
    const { error } = createCommentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.details[0].message,
      });
    }
    next();
  },
  CommentController.createComment
);

router.get(
  '/project/:projectId',
  CommentController.getProjectComments
);

router.delete(
  '/:commentId',
  CommentController.deleteComment
);

export default router;
