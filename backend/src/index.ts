import dotenv from 'dotenv';
import { App } from './app'; // Removed .js extension as TypeScript will handle it

// Load environment variables
dotenv.config();

// Create and start the application
const PORT = 8000; // Changed to port 8000
console.log(`🔄 Starting application with port: ${PORT}`);
new App(PORT);
