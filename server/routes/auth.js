const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const Otp = require('../models/Otp');
const { auth } = require('../middleware/auth');
const { sendOtpEmail } = require('../lib/mailer');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const signToken = (user) =>
  jwt.sign({ sub: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

async function verifyGoogleToken(credential) {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  // 1. Try local verification via google-auth-library
  try {
    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });
    return ticket.getPayload();
  } catch (libErr) {
    console.warn('google-auth-library verification failed, trying tokeninfo fallback:', libErr.message);
  }

  // 2. Fallback to Google's official tokeninfo API (handles clock skew, certs, etc.)
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error_description || data.error || 'Token verification failed');
  }

  const payload = await res.json();
  if (payload.aud !== clientId) {
    throw new Error(`Token audience mismatch: token aud (${payload.aud}) does not match server GOOGLE_CLIENT_ID (${clientId})`);
  }
  return payload;
}

// ── POST /api/auth/google ──
// Google OAuth verification.
// Citizens can sign up or log in with a Google credential ID token.
router.post('/google', async (req, res, next) => {
  try {
    const { credential, accessToken } = req.body;
    if (!credential && !accessToken) {
      return res.status(400).json({ error: 'Google credential or accessToken is required' });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({
        error: 'Google OAuth is not configured on the server (GOOGLE_CLIENT_ID missing)',
      });
    }

    let payload;
    try {
      if (accessToken) {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!userInfoRes.ok) {
          const errData = await userInfoRes.json().catch(() => ({}));
          throw new Error(errData.error_description || errData.error || 'Failed to fetch Google profile');
        }
        payload = await userInfoRes.json();
      } else {
        payload = await verifyGoogleToken(credential);
      }
    } catch (verifyErr) {
      console.error('Google OAuth verification error:', verifyErr);
      return res.status(401).json({
        error: `Google verification failed: ${verifyErr.message || 'Invalid or expired Google token'}`,
      });
    }

    if (!payload || !payload.email) {
      return res.status(400).json({ error: 'Google token does not contain a valid email' });
    }

    const email = payload.email.toLowerCase();
    const googleId = payload.sub;
    const name = payload.name || payload.given_name || email.split('@')[0];
    const avatar = payload.picture || null;

    // Check if user already exists with this googleId OR this email
    let user = await User.findOne({
      $or: [{ googleId }, { email }],
    });

    if (user) {
      // If user exists by email but doesn't have googleId linked, link it
      let modified = false;
      if (!user.googleId) {
        user.googleId = googleId;
        modified = true;
      }
      if (!user.avatar && avatar) {
        user.avatar = avatar;
        modified = true;
      }
      if (modified) {
        await user.save();
      }
    } else {
      // Create new citizen user
      user = await User.create({
        name,
        email,
        googleId,
        authProvider: 'google',
        avatar,
        role: 'citizen',
      });
    }

    res.json({ token: signToken(user), user: user.toPublic() });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/register ──
// Citizens self-register after verifying their email via 6-digit OTP.
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, otp } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const cleanEmail = email.toLowerCase().trim();

    const exists = await User.findOne({ email: cleanEmail });
    if (exists) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Verify 6-digit OTP for signup
    if (!otp) {
      return res.status(400).json({ error: '6-digit email verification code (OTP) is required' });
    }

    const cleanOtp = String(otp).trim();
    const validOtp = await Otp.findOne({
      email: cleanEmail,
      otp: cleanOtp,
      purpose: 'signup',
    });

    if (!validOtp) {
      return res.status(400).json({ error: 'Invalid or expired verification code. Please request a new code.' });
    }

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      role: 'citizen',
    });

    // Delete used signup OTP
    await Otp.deleteMany({ email: cleanEmail, purpose: 'signup' });

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
      if (user.passwordHash) {
        if (!currentPassword) {
          return res.status(400).json({ error: 'Current password is required to set a new password' });
        }
        const valid = await user.comparePassword(currentPassword);
        if (!valid) {
          return res.status(400).json({ error: 'Current password is incorrect' });
        }
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

// ── POST /api/auth/forgot-password ──
// Citizen or staff requests a 6-digit OTP to reset forgotten password
router.post('/forgot-password', async (req, res, next) => {
  try {
    const email = String(req.body.email ?? '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Return 404 so user knows if the account doesn't exist
      return res.status(404).json({ error: 'No account found with this email address' });
    }

    // Generate secure random 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Clear any previous forgot-password OTP for this email
    await Otp.deleteMany({ email, purpose: 'forgot-password' });

    // Store new OTP with 10-minute auto-expiry
    await Otp.create({
      email,
      otp,
      purpose: 'forgot-password',
    });

    // Send styled civic email via Nodemailer
    await sendOtpEmail({
      to: user.email,
      name: user.name || 'Citizen',
      otp,
      purpose: 'forgot-password',
    });

    res.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${user.email}. It is valid for 10 minutes.`,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/reset-password ──
// Citizen or staff verifies the 6-digit OTP and provides a new password
router.post('/reset-password', async (req, res, next) => {
  try {
    const email = String(req.body.email ?? '').trim().toLowerCase();
    const otp = String(req.body.otp ?? '').trim();
    const newPassword = String(req.body.newPassword ?? '');

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Verify OTP record
    const otpRecord = await Otp.findOne({
      email,
      otp,
      purpose: 'forgot-password',
    });

    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid or expired verification code. Please request a new one.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Hash and update password
    user.passwordHash = await User.hashPassword(newPassword);
    await user.save();

    // Delete used OTP
    await Otp.deleteMany({ email, purpose: 'forgot-password' });

    res.json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.',
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/send-otp ──
// General OTP generator (e.g. for signup email verification)
router.post('/send-otp', async (req, res, next) => {
  try {
    const email = String(req.body.email ?? '').trim().toLowerCase();
    const purpose = req.body.purpose === 'signup' ? 'signup' : 'forgot-password';

    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    if (purpose === 'signup') {
      const exists = await User.findOne({ email });
      if (exists) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await Otp.deleteMany({ email, purpose });
    await Otp.create({ email, otp, purpose });

    await sendOtpEmail({
      to: email,
      name: req.body.name || 'Citizen',
      otp,
      purpose,
    });

    res.json({
      success: true,
      message: `Verification code sent to ${email}`,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/verify-otp ──
// Validates whether an OTP is correct for a given email & purpose
router.post('/verify-otp', async (req, res, next) => {
  try {
    const email = String(req.body.email ?? '').trim().toLowerCase();
    const otp = String(req.body.otp ?? '').trim();
    const purpose = req.body.purpose || 'forgot-password';

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const valid = await Otp.findOne({ email, otp, purpose });
    if (!valid) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    res.json({ success: true, message: 'Code verified successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
