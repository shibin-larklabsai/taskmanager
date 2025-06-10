import bcrypt from 'bcryptjs';
import User from '../models/user.model.js';
import Role from '../models/role.model.js';
import UserRole from '../models/user-role.model.js';
import { generateToken, verifyToken } from '../utils/jwt.js';
import redis from '../config/redis.js';
import { IRegisterInput, ILoginInput, IAuthResponse, IUserResponse, IRole } from '../types/auth.types.js';

const TOKEN_EXPIRY = 60 * 60 * 24; // 24 hours in seconds

/**
 * Register a new user
 */
export const register = async (userData: IRegisterInput): Promise<IAuthResponse> => {
  try {
    console.log('Starting user registration for:', userData.email);
    
    // Validate input
    if (!userData.email || !userData.password || !userData.name) {
      console.error('Missing required fields:', { 
        email: !!userData.email,
        password: !!userData.password,
        name: !!userData.name 
      });
      throw new Error('All fields are required');
    }

    // Check if user already exists
    console.log('Checking for existing user with email:', userData.email);
    const existingUser = await User.findOne({ where: { email: userData.email } });
    if (existingUser) {
      console.error('Registration failed: User already exists with email:', userData.email);
      throw new Error('User already exists with this email');
    }

    // Log registration attempt
    console.log('\n🔑 User Registration:');
    console.log('Name:', userData.name);
    console.log('Email:', userData.email);
    console.log('Password length:', userData.password.length);
    
    // Create user - the model's beforeCreate hook will handle password hashing
    console.log('\nCreating user with data:', {
      name: userData.name,
      email: userData.email,
      password: '[will be hashed by model hook]'
    });
    
    const user = await User.create({
      name: userData.name,
      email: userData.email,
      password: userData.password // Model hook will hash this
    });
    
    console.log('User created with ID:', user.id);

    // Assign default role 'user' if it exists, or create it
    let defaultRole = await Role.findOne({ where: { name: 'user' } });
    
    if (!defaultRole) {
      // Create the default 'user' role if it doesn't exist
      defaultRole = await Role.create({
        name: 'user',
        description: 'Regular user with standard permissions'
      });
    }
    
    // Associate the user with the role
    await UserRole.create({
      userId: user.id,
      roleId: defaultRole.id
    });

    // Generate JWT token
    const token = generateToken(user.id);

    // Store token in Redis with expiry
    await redis.setex(`user:${user.id}:token`, TOKEN_EXPIRY, token);

    // Create a safe user object without the password
    const { password, ...userWithoutPassword } = user.get({ plain: true });
    
    const userResponse: IUserResponse = {
      ...userWithoutPassword,
      roles: (user as any).roles?.map((role: any) => ({
        id: role.id,
        name: role.name
      })) || []
    };

    return {
      user: userResponse,
      token,
      expiresIn: TOKEN_EXPIRY,
    };
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

/**
 * Login user
 */
export const login = async (credentials: ILoginInput): Promise<IAuthResponse> => {
  try {
    console.log('\n=== Login Attempt ===');
    console.log('Email:', credentials.email);
    
    // Input validation
    if (!credentials.email || !credentials.password) {
      console.error('❌ Missing email or password');
      throw new Error('Email and password are required');
    }

    // Trim email and password
    const email = credentials.email.trim().toLowerCase();
    const password = credentials.password.trim();

    // Find user with password included
    console.log('\n🔍 Looking up user in database...');
    const user = await User.scope('withPassword').findOne({ 
      where: { email },
      include: [{
        model: Role,
        as: 'roles',
        through: { attributes: [] },
        required: false
      }]
    });

    if (!user) {
      console.error('❌ User not found');
      throw new Error('Invalid email or password');
    }

    // Type assertion for user with roles
    const userWithRoles = user as User & { roles?: IRole[] };
    
    // Log user details (excluding full password hash for security)
    console.log('\n👤 User found:', {
      id: user.id,
      email: user.email,
      name: user.name,
      hasPassword: !!user.password,
      passwordLength: user.password?.length || 0,
      passwordStartsWith: user.password ? `${user.password.substring(0, 5)}...` : 'N/A',
      roles: userWithRoles.roles?.map((r: IRole) => r.name) || []
    });

    // Check if user has a password
    if (!user.password) {
      console.error('❌ User has no password set');
      throw new Error('Invalid email or password');
    }

    // Debug: Log the first few characters of the stored hash
    console.log('\n🔑 Password Verification:');
    console.log('Stored hash length:', user.password.length);
    console.log('Stored hash starts with:', user.password.substring(0, 10) + '...');
    
    // Check if the stored hash is a valid bcrypt hash
    const isBcryptHash = user.password.startsWith('$2a$') || 
                        user.password.startsWith('$2b$') || 
                        user.password.startsWith('$2y$');
    
    console.log('Is valid bcrypt hash:', isBcryptHash);

    // If it's not a valid bcrypt hash, we need to rehash it
    if (!isBcryptHash) {
      console.log('⚠️  Password is not hashed with bcrypt. Rehashing...');
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
      await user.save();
      console.log('✅ Password has been rehashed and updated in the database');
    }

    // Compare passwords with detailed logging
    console.log('\n🔍 Starting password verification...');
    console.log('Input password length:', password.length);
    console.log('Stored hash length:', user.password.length);
    
    // Check if the stored password looks like a bcrypt hash
    const isBcryptHashFormat = user.password.startsWith('$2a$') || 
                             user.password.startsWith('$2b$') || 
                             user.password.startsWith('$2y$');
    
    console.log('Stored password is bcrypt hash:', isBcryptHashFormat);
    
    if (!isBcryptHashFormat) {
      console.error('❌ Stored password is not a valid bcrypt hash');
      throw new Error('Invalid password format in database');
    }
    
    // Try direct comparison first
    console.log('\n🔄 Comparing passwords...');
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Direct comparison result:', isMatch);

    if (!isMatch) {
      console.error('❌ Password comparison failed');
      
      // Additional debug information
      console.log('\n🔍 Debug information:');
      console.log('Input password:', JSON.stringify(password));
      console.log('Password length:', password.length);
      console.log('Password contains non-printable chars:', 
        [...password].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) > 126));
      
      // Try with different variations of the password
      const variations = [
        { name: 'original', value: password },
        { name: 'trimmed', value: password.trim() },
        { name: 'lowercase', value: password.toLowerCase() },
        { name: 'uppercase', value: password.toUpperCase() }
      ];

      // Try each password variation
      for (const variation of variations) {
        if (variation.value !== password) {
          const match = await bcrypt.compare(variation.value, user.password);
          console.log(`Tried ${variation.name} variation:`, match);
          if (match) {
            console.log(`⚠️  Password matched with ${variation.name} variation`);
            break;
          }
        }
      }
      
      throw new Error('Invalid email or password');
    }

    // Generate JWT token
    const token = generateToken(user.id);

    // Store token in Redis with expiry
    await redis.setex(`user:${user.id}:token`, TOKEN_EXPIRY, token);

    // Remove password from user object
    const userJson = user.toJSON() as any;
    delete userJson.password;

    return {
      user: userJson,
      token,
      expiresIn: TOKEN_EXPIRY,
    };
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

/**
 * Logout user
 */
export const logout = async (token: string): Promise<void> => {
  try {
    // Verify token and get expiry
    const decoded = await verifyToken(token);
    const expiry = decoded.exp - Math.floor(Date.now() / 1000);
    
    if (expiry > 0) {
      await redis.setex(`blacklist_${token}`, expiry, '1');
      await redis.del(`user:${decoded.id}:token`);
    }
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
};

/**
 * Get current user
 */
export const getCurrentUser = async (userId: number): Promise<IUserResponse | null> => {
  try {
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Role,
          as: 'roles',
          through: { attributes: [] }, // Exclude the join table attributes
          attributes: ['id', 'name', 'description'],
        },
      ],
    });

    if (!user) {
      return null;
    }

    // Get user data and roles
    const userData = user.get({ plain: true }) as any;
    
    // Extract user fields and roles
    const { id, email, name, createdAt, updatedAt, deletedAt } = userData;
    
    // Safely extract and map roles
    const roles = (userData && (userData as any).roles
      ? (userData as any).roles.map((role: any) => ({
          id: role.id,
          name: role.name,
          description: role.description || null
        }))
      : []) as Array<{ id: number; name: string; description: string | null }>;
    
    return {
      id,
      email,
      name,
      roles,
      createdAt,
      updatedAt,
      deletedAt
    };
  } catch (error) {
    console.error('Error fetching current user:', error);
    throw error;
  }
};
