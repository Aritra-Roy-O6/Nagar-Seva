// server/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;

// ## 1. Database Connection Setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ## 2. Middleware
app.use(cors());
app.use(express.json());

// ## 3. JWT Gatekeeper Middleware
const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Admin-only Gatekeeper
const adminAuth = (req, res, next) => {
    // This assumes the `auth` middleware has already run
    if (req.user.role !== 'department_admin' && req.user.role !== 'super_admin') {
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    next();
};


// ## 4. API Routes

// ### Auth Routes
app.post('/api/auth/register', async (req, res) => {
    // ... your existing registration logic ...
    try {
        const { fullName, email, password } = req.body;
        const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ message: 'User with this email already exists.' });
        }
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        const newUser = await pool.query(
            'INSERT INTO users (full_name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, email, full_name, role',
            [fullName, email, passwordHash]
        );
        res.status(201).json(newUser.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});
app.post('/api/auth/login', async (req, res) => {
    // ... your existing login logic ...
    try {
        const { email, password } = req.body;
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const user = userResult.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const payload = {
            user: { id: user.id, role: user.role }
        };
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1d' },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// ### Citizen Report Routes (Protected)
// Submit a new report
app.post('/api/reports', auth, async (req, res) => {
    const { problem_type, description, image_url, latitude, longitude } = req.body;
    const userId = req.user.id;

    const query = `
        INSERT INTO reports (user_id, problem_type, description, image_url, location)
        VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326))
        RETURNING *;
    `;
    
    try {
        const newReport = await pool.query(query, [userId, problem_type, description, image_url, longitude, latitude]);
        res.status(201).json(newReport.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Get all reports for the logged-in user
app.get('/api/reports/my-reports', auth, async (req, res) => {
    try {
        const reports = await pool.query('SELECT * FROM reports WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
        res.json(reports.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Get a single report by ID
app.get('/api/reports/:id', auth, async (req, res) => {
    try {
        const report = await pool.query('SELECT * FROM reports WHERE id = $1', [req.params.id]);
        if (report.rows.length === 0) {
            return res.status(404).json({ message: 'Report not found' });
        }
        // Optional: Add logic to ensure only the owner or an admin can see it
        res.json(report.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// ### Admin Report Routes (Admin Protected)
// Get all reports (for admins)
app.get('/api/admin/reports', auth, adminAuth, async (req, res) => {
    try {
        const reports = await pool.query('SELECT * FROM reports ORDER BY created_at DESC');
        res.json(reports.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Update a report's status or department (for admins)
app.put('/api/admin/reports/:id', auth, adminAuth, async (req, res) => {
    const { status, department_id } = req.body;
    
    // For now, we'll build a simple update. We can make this more robust later.
    if (!status) {
        return res.status(400).json({ message: 'Status is required.' });
    }

    try {
        const updatedReport = await pool.query(
            'UPDATE reports SET status = $1, department_id = COALESCE($2, department_id), updated_at = now() WHERE id = $3 RETURNING *',
            [status, department_id, req.params.id]
        );

        if (updatedReport.rows.length === 0) {
            return res.status(404).json({ message: 'Report not found' });
        }
        res.json(updatedReport.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// ## 5. Start the Server
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});