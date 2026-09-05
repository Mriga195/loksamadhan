const router = require('express').Router();
const User = require('../models/User');
const Issue = require('../models/Issue');
const { auth, requireRole } = require('../middleware/auth');
const { DEPARTMENTS } = require('../constants');

// All endpoints require JWT auth and admin role
router.use(auth(true), requireRole('admin'));

// ── GET /api/admin/users — View all office users with work ratio metrics ──
router.get('/users', async (req, res, next) => {
  try {
    // Fetch all staff/office users (officers and admins)
    const users = await User.find({ role: { $in: ['officer', 'admin'] } }).sort({ createdAt: -1 });
    const allIssues = await Issue.find({}, 'department status statusHistory').lean();

    const result = users.map(user => {
      const uObj = user.toProfile();
      const userIdStr = String(user._id);

      let actionedCount = 0;
      let resolvedByCount = 0;
      let inProgressCount = 0;

      // Department issue stats
      const deptIssues = user.department ? allIssues.filter(i => i.department === user.department) : [];
      const deptTotal = deptIssues.length;
      const deptResolved = deptIssues.filter(i => i.status === 'Resolved').length;

      // Admin users have full system access and do not have assigned departmental queues or workload ratios
      if (user.role === 'admin') {
        return {
          ...uObj,
          workStats: null,
        };
      }

      // Calculate officer action metrics
      allIssues.forEach(issue => {
        const historyEntries = issue.statusHistory || [];
        const touchedByUser = historyEntries.some(h => String(h.by) === userIdStr);

        if (touchedByUser) {
          actionedCount++;
          const resolvedEntryByUser = historyEntries.find(
            h => String(h.by) === userIdStr && h.status === 'Resolved'
          );
          if (
            resolvedEntryByUser ||
            (issue.status === 'Resolved' &&
              historyEntries[historyEntries.length - 1]?.by &&
              String(historyEntries[historyEntries.length - 1].by) === userIdStr)
          ) {
            resolvedByCount++;
          } else if (issue.status === 'In Progress' || issue.status === 'Acknowledged') {
            inProgressCount++;
          }
        }
      });

      // Calculate work ratio percentage
      let workRatio = 0;
      if (actionedCount > 0) {
        workRatio = Math.round((resolvedByCount / actionedCount) * 100);
      } else if (deptTotal > 0) {
        workRatio = Math.round((deptResolved / deptTotal) * 100);
      }

      return {
        ...uObj,
        workStats: {
          actionedCount,
          resolvedByCount,
          inProgressCount,
          deptTotal,
          deptResolved,
          workRatio,
        },
      };
    });

    res.json({ users: result });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/users — Create new office user ──
router.post('/users', async (req, res, next) => {
  try {
    const { name, email, password, role, department, region } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (!['officer', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Role must be officer or admin' });
    }

    if (role === 'officer' && department && !DEPARTMENTS.includes(department)) {
      return res.status(400).json({ error: 'Invalid department selected' });
    }

    const trimmedEmail = String(email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    const exists = await User.findOne({ email: trimmedEmail });
    if (exists) {
      return res.status(409).json({ error: 'Email is already registered' });
    }

    const passwordHash = await User.hashPassword(password);
    const newUser = await User.create({
      name: String(name).trim(),
      email: trimmedEmail,
      passwordHash,
      role,
      department: role === 'officer' ? (department || null) : (department || 'General Administration'),
      region: role === 'officer' ? (String(region || '').trim() || null) : null,
    });

    res.status(201).json({
      user: {
        ...newUser.toProfile(),
        workStats: {
          actionedCount: 0,
          resolvedByCount: 0,
          inProgressCount: 0,
          deptTotal: 0,
          deptResolved: 0,
          workRatio: 0,
        },
      },
      message: 'Office user created successfully',
    });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/admin/users/:id — Edit office user ──
router.patch('/users/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { name, email, password, role, department, region } = req.body;

    // ── Admin user: ONLY name and password can be updated ──
    if (user.role === 'admin') {
      if (name !== undefined) {
        const trimmedName = String(name).trim();
        if (trimmedName.length < 2) {
          return res.status(400).json({ error: 'Name must be at least 2 characters' });
        }
        user.name = trimmedName;
      }

      if (password && String(password).trim()) {
        const pwd = String(password).trim();
        if (pwd.length < 6) {
          return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        user.passwordHash = await User.hashPassword(pwd);
      }

      user.department = null;
      user.region = null;

      await user.save();
      return res.json({ user: user.toProfile(), message: 'Admin details updated successfully' });
    }

    // ── Officer user updates ──
    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (trimmedName.length < 2) {
        return res.status(400).json({ error: 'Name must be at least 2 characters' });
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
        if (exists) return res.status(409).json({ error: 'Email already registered to another account' });
        user.email = trimmedEmail;
      }
    }

    if (role !== undefined) {
      if (!['officer', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Role must be officer or admin' });
      }
      user.role = role;
    }

    if (department !== undefined) {
      if (department && !DEPARTMENTS.includes(department)) {
        return res.status(400).json({ error: 'Invalid department selected' });
      }
      user.department = department || null;
    }

    if (region !== undefined) {
      user.region = String(region || '').trim() || null;
    }

    if (password && String(password).trim()) {
      const pwd = String(password).trim();
      if (pwd.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      user.passwordHash = await User.hashPassword(pwd);
    }

    await user.save();
    res.json({ user: user.toProfile(), message: 'Office user updated successfully' });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/admin/users/:id — Delete office user ──
router.delete('/users/:id', async (req, res, next) => {
  try {
    if (String(req.params.id) === String(req.user._id)) {
      return res.status(400).json({ error: 'You cannot delete your own admin account' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully', _id: req.params.id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
