import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import Joi from 'joi';
import { AuthController } from '../controllers/auth.controller';

const router = express.Router();

// Simple async handler
const asyncHandler = (fn: RequestHandler) => 
  (req: Request, res: Response, next: NextFunction) => 
    Promise.resolve(fn(req, res, next)).catch(next);

// Validation middleware
const validateRequest = (schema: Joi.ObjectSchema) => 
  (req: Request, res: Response, next: NextFunction) => {
    schema.validateAsync(req.body, { abortEarly: false })
      .then(() => next())
      .catch((error: Joi.ValidationError) => {
        res.status(400).json({
          error: 'Validation Error',
          details: error.details.map(d => d.message)
        });
      });
  };

// Register a new user
router.post(
  '/register',
  validateRequest(Joi.object({
    name: Joi.string().required().messages({
      'string.empty': 'Name is required',
      'any.required': 'Name is required',
      'string.base': 'Name must be a string',
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot be longer than 100 characters'
    }),
    email: Joi.string().email().required().messages({
      'string.email': 'Please enter a valid email address',
      'string.empty': 'Email is required',
      'any.required': 'Email is required',
      'string.base': 'Email must be a string'
    }),
    password: Joi.string().min(8).required().messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.empty': 'Password is required',
      'any.required': 'Password is required',
      'string.base': 'Password must be a string'
    }),
  })),
  asyncHandler(async (req, res, next) => {
    try {
      await AuthController.register(req, res, next);
    } catch (error) {
      console.error('Registration error in route handler:', error);
      next(error);
    }
  })
);

// Login user
router.post(
  '/login',
  validateRequest(Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please enter a valid email address',
      'string.empty': 'Email is required',
      'any.required': 'Email is required'
    }),
    password: Joi.string().required().messages({
      'string.empty': 'Password is required',
      'any.required': 'Password is required'
    }),
  })),
  asyncHandler(async (req, res, next) => {
    try {
      await AuthController.login(req, res);
    } catch (error) {
      next(error);
    }
  })
);

// Logout user
router.post('/logout', asyncHandler(async (req, res) => {
  await AuthController.logout(req, res);
}));

// Get current user
router.get('/me', 
  AuthController.requireAuth,
  asyncHandler(async (req, res, next) => {
    try {
      await AuthController.getMe(req, res);
    } catch (error) {
      next(error);
    }
  })
);

// Helper function to handle the test hash logic
const handleTestHash = (password: string): Promise<any> => {
  return bcrypt.genSalt(10)
    .then(salt => {
      console.log('Generated salt:', salt);
      return Promise.all([
        bcrypt.hash(password, salt),
        salt
      ]);
    })
    .then(([hash, salt]) => {
      console.log('Generated hash:', hash.substring(0, 20) + '...');
      
      // Verify the hash
      return Promise.all([
        bcrypt.compare(password, hash),
        hash,
        salt,
        // Generate a different hash with a new salt
        bcrypt.genSalt(10).then(differentSalt => 
          bcrypt.hash(password, differentSalt).then(differentHash => ({
            differentSalt,
            differentHash
          }))
        )
      ]);
    })
    .then(([isMatch, hash, salt, { differentSalt, differentHash }]) => {
      console.log('Password match:', isMatch);
      
      // Verify the different hash
      return Promise.all([
        bcrypt.compare(password, differentHash),
        hash,
        salt,
        differentHash,
        differentSalt
      ]);
    })
    .then(([differentMatch, hash, salt, differentHash, differentSalt]) => {
      // Prepare the response data
      return {
        test: 'Password Hashing Test',
        originalPassword: password,
        hash: {
          value: hash,
          startsWith: hash.substring(0, 10) + '...',
          length: hash.length,
          salt: salt
        },
        differentHash: {
          value: differentHash,
          startsWith: differentHash.substring(0, 10) + '...',
          length: differentHash.length,
          salt: differentSalt
        },
        verification: {
          sameSaltMatch: hash === bcrypt.hashSync(password, salt),
          differentSaltMatch: differentHash === bcrypt.hashSync(password, differentSalt)
        },
        notes: [
          'sameSaltMatch: Should be true when using the same salt',
          'differentSaltMatch: Should be true even with different salts (bcrypt handles this)'
        ]
      };
    });
};

// Test endpoint for password hashing verification
const testHashHandler: RequestHandler = (req, res, next) => {
  const { password } = req.body;
  
  if (!password || typeof password !== 'string') {
    res.status(400).json({ error: 'Password is required and must be a string' });
    return next();
  }

  console.log('\n🔍 Test Hash Request:', { password });
  
  handleTestHash(password)
    .then(result => {
      res.json(result);
      next();
    })
    .catch(error => {
      console.error('Test hash error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      next(error);
    });
};

// Register the test-hash endpoint
router.post('/test-hash', testHashHandler);

export default router;
