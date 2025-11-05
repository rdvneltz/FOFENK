const User = require('../models/User');

/**
 * Middleware to check if user has access to the requested institution
 * Superadmins have access to all institutions
 * Regular users only have access to institutions in their institutions[] array
 */
const checkInstitutionAccess = async (req, res, next) => {
  try {
    // Skip check for routes that don't require institution access
    if (req.path === '/me' || req.path.includes('/auth/')) {
      return next();
    }

    const user = req.user;

    // Superadmin has access to everything
    if (user.role === 'superadmin') {
      return next();
    }

    // Get institution ID from request (query, body, or params)
    const institutionId =
      req.query.institution ||
      req.query.institutionId ||
      req.body.institution ||
      req.body.institutionId ||
      req.params.institutionId;

    // If no institution specified, check if user has institution field (backward compatibility)
    if (!institutionId && user.institution) {
      return next();
    }

    if (!institutionId) {
      return res.status(400).json({
        message: 'Institution ID is required'
      });
    }

    // Check if user has access to this institution
    const userInstitutions = user.institutions || [];

    // Support backward compatibility with single institution field
    if (user.institution && user.institution.toString() === institutionId.toString()) {
      return next();
    }

    // Check if institutionId is in user's institutions array
    const hasAccess = userInstitutions.some(
      inst => inst.toString() === institutionId.toString()
    );

    if (!hasAccess) {
      return res.status(403).json({
        message: 'You do not have access to this institution'
      });
    }

    next();
  } catch (error) {
    console.error('Institution access check error:', error);
    res.status(500).json({ message: 'Server error during access check' });
  }
};

module.exports = checkInstitutionAccess;
