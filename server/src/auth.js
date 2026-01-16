import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERS_FILE = path.join(__dirname, '../data/users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Ensure users file exists
async function ensureUsersFile() {
  const dataDir = path.dirname(USERS_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  if (!fs.existsSync(USERS_FILE)) {
    // Create default admin user (password: admin123)
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const defaultUsers = {
      users: [
        {
          username: 'admin',
          password: hashedPassword,
          role: 'admin',
          createdAt: new Date().toISOString()
        }
      ]
    };
    fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2));
    console.log('✓ Created default admin user (username: admin, password: admin123)');
    console.log('⚠ IMPORTANT: Change the default password immediately!');
  }
}

// Load users from file
function loadUsers() {
  ensureUsersFile();
  const data = fs.readFileSync(USERS_FILE, 'utf8');
  return JSON.parse(data);
}

// Save users to file
function saveUsers(usersData) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(usersData, null, 2));
}

// Generate JWT token
export function generateToken(username, role = 'user') {
  return jwt.sign(
    { username, role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Verify JWT token
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Authentication middleware
export function authenticate(req, res, next) {
  // Skip auth for login endpoint
  if (req.path === '/api/auth/login') {
    return next();
  }

  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please provide a valid token in Authorization header'
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ 
      error: 'Invalid or expired token',
      message: 'Please login again'
    });
  }

  // Attach user info to request
  req.user = decoded;
  next();
}

// Admin-only middleware
export function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Admin access required',
      message: 'You do not have permission to perform this action'
    });
  }
  next();
}

// User management functions
export async function createUser(username, password, role = 'user') {
  const usersData = loadUsers();
  
  // Check if user already exists
  if (usersData.users.find(u => u.username === username)) {
    return { success: false, error: 'Username already exists' };
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Add user
  usersData.users.push({
    username,
    password: hashedPassword,
    role,
    createdAt: new Date().toISOString()
  });

  saveUsers(usersData);
  return { success: true };
}

export async function authenticateUser(username, password) {
  const usersData = loadUsers();
  const user = usersData.users.find(u => u.username === username);

  if (!user) {
    return { success: false, error: 'Invalid username or password' };
  }

  // Compare password
  const isValid = await bcrypt.compare(password, user.password);

  if (!isValid) {
    return { success: false, error: 'Invalid username or password' };
  }

  // Generate token
  const token = generateToken(user.username, user.role);

  return {
    success: true,
    token,
    user: {
      username: user.username,
      role: user.role
    }
  };
}

export async function changePassword(username, oldPassword, newPassword) {
  const usersData = loadUsers();
  const user = usersData.users.find(u => u.username === username);

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  // Verify old password
  const isValid = await bcrypt.compare(oldPassword, user.password);

  if (!isValid) {
    return { success: false, error: 'Current password is incorrect' };
  }

  // Hash new password
  user.password = await bcrypt.hash(newPassword, 10);
  user.passwordChangedAt = new Date().toISOString();

  saveUsers(usersData);
  return { success: true };
}

export function listUsers() {
  const usersData = loadUsers();
  return usersData.users.map(u => ({
    username: u.username,
    role: u.role,
    createdAt: u.createdAt
  }));
}

export async function deleteUser(username) {
  const usersData = loadUsers();
  const index = usersData.users.findIndex(u => u.username === username);

  if (index === -1) {
    return { success: false, error: 'User not found' };
  }

  // Prevent deleting the last admin
  const admins = usersData.users.filter(u => u.role === 'admin');
  if (admins.length === 1 && usersData.users[index].role === 'admin') {
    return { success: false, error: 'Cannot delete the last admin user' };
  }

  usersData.users.splice(index, 1);
  saveUsers(usersData);
  return { success: true };
}

// Initialize on module load
ensureUsersFile();
console.log('✓ Authentication module initialized');
