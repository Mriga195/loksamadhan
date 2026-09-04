const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const signToken = (user) =>
  jwt.sign({ sub: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

// ── POST /api/auth/register ──
// Citizens self-register. Officers/admins are seeded or promoted manually.
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: 'citizen',
    });

    res.status(201).json({ token: signToken(user), user: user.toPublic() });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/login ──
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({ token: signToken(user), user: user.toPublic() });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/auth/me ──
router.get('/me', auth(), async (req, res) => {
  res.json({ user: req.user.toProfile() });
});

// ── PATCH /api/auth/me ──
// Self details edit: name, email, and optional password change
router.patch('/me', auth(true), async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { name, email, currentPassword, newPassword } = req.body;

    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (trimmedName.length < 2 || trimmedName.length > 100) {
        return res.status(400).json({ error: 'Name must be 2–100 characters' });
      }
      user.name = trimmedName;
    }

    if (email !== undefined) {
      const trimmedEmail = String(email).trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        return res.status(400).json({ error: 'Please enter a valid email address' });
      }
      if (trimmedEmail !== user.email) {
        const exists = await User.findOne({ email: trimmedEmail, _id: { $ne: user._id } });
        if (exists) {
          return res.status(409).json({ error: 'Email already registered to another account' });
        }
        user.email = trimmedEmail;
      }
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to set a new password' });
      }
      const valid = await user.comparePassword(currentPassword);
      if (!valid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
      }
      user.passwordHash = await User.hashPassword(newPassword);
    }

    await user.save();
    res.json({ user: user.toProfile(), message: 'Profile updated successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
