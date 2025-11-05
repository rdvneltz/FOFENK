const mongoose = require('mongoose');
const User = require('../models/User');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function createSuperadmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Check if superadmin already exists
    const existing = await User.findOne({ username: 'admin' });
    if (existing) {
      console.log('Superadmin already exists');
      process.exit(0);
    }

    // Create superadmin
    const superadmin = new User({
      username: 'admin',
      password: 'omgrmhot',
      fullName: 'System Administrator',
      role: 'superadmin',
      email: 'admin@fofenk.com',
      permissions: {
        canManageStudents: true,
        canManageCourses: true,
        canManagePayments: true,
        canManageExpenses: true,
        canManageInstructors: true,
        canViewReports: true,
        canManageSettings: true,
        canManageUsers: true,
        canManageInstitutions: true
      },
      institutions: [], // Superadmin has access to all
      isActive: true
    });

    await superadmin.save();
    console.log('Superadmin created successfully');
    console.log('Username: admin');
    console.log('Password: omgrmhot');
    process.exit(0);
  } catch (error) {
    console.error('Error creating superadmin:', error);
    process.exit(1);
  }
}

createSuperadmin();
