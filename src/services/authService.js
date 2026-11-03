const User = require('../models/User');

class AuthService {
  /**
   * Authenticate user with username and password
   * @param {string} username
   * @param {string} password
   * @returns {Promise<{ user: Object }>}
   */
  async login(username, password) {
    if (!username || !password) {
      throw new Error('Please enter both username and password.');
    }

    const cleanUsername = username.trim().toLowerCase();
    const user = await User.findOne({ username: cleanUsername }).populate('roles');

    if (!user) {
      throw new Error('Invalid username or password.');
    }

    if (!user.isActive) {
      throw new Error('This account has been deactivated. Please contact your administrator.');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new Error('Invalid username or password.');
    }

    // Update last login timestamp
    user.lastLogin = new Date();
    await user.save();

    // Prepare session-safe user object
    const sessionUser = {
      id: user._id.toString(),
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      avatar: user.avatar,
      roles: user.roles.map((r) => ({
        id: r._id.toString(),
        name: r.name,
      })),
      roleNames: user.roles.map((r) => r.name),
      isAdmin: user.roles.some((r) => r.name.toLowerCase() === 'administrator'),
    };

    return { user: sessionUser };
  }

  /**
   * Get user by ID with populated roles
   * @param {string} userId
   * @returns {Promise<Object|null>}
   */
  async getUserById(userId) {
    const user = await User.findById(userId).populate('roles').select('-passwordHash');
    return user;
  }
}

module.exports = new AuthService();

