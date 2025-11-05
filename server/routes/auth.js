const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Institution = require('../models/Institution');
const Season = require('../models/Season');
const ActivityLog = require('../models/ActivityLog');
const { requireAuth } = require('../middleware/auth');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-here-change-in-production';
const JWT_EXPIRES_IN = '7d'; // 7 days

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Check if system needs setup
router.get('/check-setup', async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const needsSetup = userCount === 0;
    res.json({ needsSetup });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// First-time setup - Create admin user and institution
router.post('/setup', async (req, res) => {
  try {
    const { username, password, confirmPassword, fullName, institution, season } = req.body;

    // Check if system is already set up
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      return res.status(400).json({ message: 'System is already set up.' });
    }

    // Validate input
    if (!username || !password || !fullName || !institution || !season) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    // Validate password
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    // Create institution
    const newInstitution = new Institution({
      name: institution.name,
      address: institution.address || '',
      phone: institution.phone || '',
      email: institution.email || '',
      website: institution.website || '',
      logo: institution.logo || '',
      settings: {
        currency: 'TRY',
        dateFormat: 'DD/MM/YYYY',
        language: 'tr'
      }
    });
    await newInstitution.save();

    // Create admin user with all permissions
    const newUser = new User({
      username,
      password,
      fullName,
      email: institution.email || '',
      phone: institution.phone || '',
      role: 'admin',
      permissions: {
        canManageStudents: true,
        canManageCourses: true,
        canManagePayments: true,
        canManageExpenses: true,
        canManageInstructors: true,
        canViewReports: true,
        canManageSettings: true,
        canManageUsers: true
      },
      institution: newInstitution._id,
      isActive: true
    });
    await newUser.save();

    // Create first season
    const newSeason = new Season({
      name: season.name,
      startDate: season.startDate,
      endDate: season.endDate,
      institution: newInstitution._id,
      isActive: true
    });
    await newSeason.save();

    // Create activity log
    await ActivityLog.create({
      user: username,
      action: 'setup',
      entity: 'System',
      entityId: newUser._id,
      description: 'System setup completed - Admin user and institution created',
      institution: newInstitution._id
    });

    // Generate token
    const token = generateToken(newUser._id);

    // Return user without password
    const userResponse = {
      _id: newUser._id,
      username: newUser.username,
      fullName: newUser.fullName,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role,
      permissions: newUser.permissions,
      institution: newInstitution,
      isActive: newUser.isActive,
      avatarColor: newUser.avatarColor
    };

    res.status(201).json({
      message: 'Setup completed successfully',
      token,
      user: userResponse,
      institution: newInstitution,
      season: newSeason
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    // Find user with password field
    const user = await User.findOne({ username }).select('+password').populate('institution');

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Your account is inactive. Please contact admin.' });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Generate token
    const token = generateToken(user._id);

    // Create activity log
    await ActivityLog.create({
      user: username,
      action: 'login',
      entity: 'User',
      entityId: user._id,
      description: `User logged in: ${user.fullName}`,
      institution: user.institution
    });

    // Return user without password
    const userResponse = {
      _id: user._id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      permissions: user.permissions,
      institution: user.institution,
      isActive: user.isActive,
      avatarColor: user.avatarColor
    };

    res.json({
      message: 'Login successful',
      token,
      user: userResponse
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Verify token and get current user
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('institution');

    const userResponse = {
      _id: user._id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      permissions: user.permissions,
      institution: user.institution,
      isActive: user.isActive,
      avatarColor: user.avatarColor
    };

    res.json({ user: userResponse });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Logout (client-side handles token removal)
router.post('/logout', requireAuth, async (req, res) => {
  try {
    // Create activity log
    await ActivityLog.create({
      user: req.user.username,
      action: 'logout',
      entity: 'User',
      entityId: req.user._id,
      description: `User logged out: ${req.user.fullName}`,
      institution: req.user.institution
    });

    res.json({ message: 'Logout successful' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
