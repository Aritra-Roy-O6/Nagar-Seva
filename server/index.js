// server/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;
const admin = require('firebase-admin');
const rateLimit = require('express-rate-limit');

// --- Service Initialization ---
// Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Firebase
const serviceAccount = require('./firebase-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const app = express();
const PORT = process.env.PORT || 3001;


// ## 1. Core Middleware
app.use(cors());
app.use(express.json());

// ## 2. Security Middleware (Rate Limiting)
const reportLimiter = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hour
	max: 10, // Limit each IP to 10 reports per windowMs
	message: 'Too many reports created from this IP, please try again after an hour',
    standardHeaders: true,
    legacyHeaders: false,
});

// ## 3. JWT & Authorization Middleware
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

const adminAuth = (req, res, next) => {
    // Mentor Fix: Added null check for req.user
    if (!req.user || (req.user.role !== 'department_admin' && req.user.role !== 'super_admin')) {
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    next();
};


// ## 4. API Routes
// ### ================= AUTHENTICATION ROUTES =================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, email, password, role, secret } = req.body;

    if (role === 'department_admin') {
      if (secret !== process.env.ADMIN_SECRET_KEY) {
        return res.status(403).json({ message: 'Invalid Admin Secret Key. Access denied.' });
      }
    }

    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userRole = role === 'department_admin' ? 'department_admin' : 'citizen';

    const newUserResult = await pool.query(
        'INSERT INTO users (full_name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, role',
        [fullName, email, passwordHash, userRole]
    );
    const newUser = newUserResult.rows[0];
    
    // Mentor Fix: Return token on register for better UX
    const payload = { user: { id: newUser.id, role: newUser.role } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.status(201).json({ user: newUser, token });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

app.post('/api/auth/login', async (req, res) => {
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
        const payload = { user: { id: user.id, role: user.role } };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, user: { id: user.id, fullName: user.full_name, email: user.email, role: user.role } });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});


// ### ================= CITIZEN ROUTES =================
app.post('/api/users/fcm-token', auth, async (req, res) => {
    const { token } = req.body;
    try {
        await pool.query('UPDATE users SET fcm_token = $1 WHERE id = $2', [token, req.user.id]);
        res.status(200).send('FCM token updated');
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

app.get('/api/upload-signature', auth, (req, res) => {
    const timestamp = Math.round((new Date).getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request({
        timestamp,
        source: 'uw',
        folder: 'NagarSeva-Reports'
    }, process.env.CLOUDINARY_API_SECRET);
    res.json({ signature, timestamp, api_key: process.env.CLOUDINARY_API_KEY });
});

app.post('/api/reports', auth, reportLimiter, async (req, res) => {
    const { problem_type, description, image_url, latitude, longitude } = req.body;
    const userId = req.user.id;
    const slaDays = 3;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + slaDays);
    const query = `
        INSERT INTO reports (user_id, problem_type, description, image_url, location, sla_due_at)
        VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326), $7)
        RETURNING *;
    `;
    try {
        const newReport = await pool.query(query, [userId, problem_type, description, image_url, longitude, latitude, dueDate]);
        res.status(201).json(newReport.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

app.get('/api/reports/my-reports', auth, async (req, res) => {
    try {
        const reports = await pool.query('SELECT * FROM reports WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
        res.json(reports.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

app.get('/api/reports/:id', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM reports WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Report not found' });
        }
        const report = result.rows[0];
        // Mentor Fix: Security hole patched. Only owner or admin can view.
        const isAdmin = req.user.role === 'department_admin' || req.user.role === 'super_admin';
        if (report.user_id !== req.user.id && !isAdmin) {
            return res.status(403).json({ message: 'Access denied.' });
        }
        res.json(report);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

app.get('/api/leaderboard', auth, async (req, res) => {
    try {
        const leaderboard = await pool.query('SELECT full_name, points FROM users ORDER BY points DESC LIMIT 10');
        res.json(leaderboard.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// ### ================= ADMIN ROUTES =================
app.get('/api/admin/reports', auth, adminAuth, async (req, res) => {
    try {
        const { status, department_id, start_date, end_date } = req.query;
        let query = 'SELECT * FROM reports';
        const conditions = [];
        const values = [];
        let paramIndex = 1;
        if (status) { conditions.push(`status = $${paramIndex++}`); values.push(status); }
        if (department_id) { conditions.push(`department_id = $${paramIndex++}`); values.push(department_id); }
        if (start_date) { conditions.push(`created_at >= $${paramIndex++}`); values.push(start_date); }
        if (end_date) { conditions.push(`created_at <= $${paramIndex++}`); values.push(end_date); }
        if (conditions.length > 0) { query += ' WHERE ' + conditions.join(' AND '); }
        query += ' ORDER BY created_at DESC';
        const reports = await pool.query(query, values);
        res.json(reports.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

app.put('/api/admin/reports/:id', auth, adminAuth, async (req, res) => {
    const { status, department_id } = req.body;
    if (!status) return res.status(400).json({ message: 'Status is required.' });

    // Mentor Fix: Use a transaction for atomicity.
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const updatedReportResult = await client.query(
            'UPDATE reports SET status = $1, department_id = COALESCE($2, department_id), updated_at = now() WHERE id = $3 RETURNING *',
            [status, department_id, req.params.id]
        );
        if (updatedReportResult.rows.length === 0) {
            await client.query('ROLLBACK'); // Rollback if not found
            return res.status(404).json({ message: 'Report not found' });
        }
        const updatedReport = updatedReportResult.rows[0];
        if (status === 'resolved') {
            await client.query('UPDATE users SET points = points + $1 WHERE id = $2', [10, updatedReport.user_id]);
        }
        await client.query('COMMIT');
        
        // Notification logic is outside transaction for better performance
        const userResult = await pool.query('SELECT fcm_token FROM users WHERE id = $1', [updatedReport.user_id]);
        if (userResult.rows.length > 0 && userResult.rows[0].fcm_token) {
            const message = {
                notification: {
                    title: 'Your Report Status Updated!',
                    body: `Report for "${updatedReport.problem_type}" is now: ${status.toUpperCase()}`
                },
                token: userResult.rows[0].fcm_token
            };
            admin.messaging().send(message)
                .then(response => console.log('Successfully sent message:', response))
                .catch(error => console.error('Error sending message:', error));
        }
        res.json(updatedReport);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
});

app.get('/api/admin/reports/nearby', auth, adminAuth, async (req, res) => {
    const { lat, lon, radius } = req.query;
    if (!lat || !lon || !radius) return res.status(400).json({ message: 'Latitude, longitude, and radius are required.' });
    try {
        const query = `
            SELECT id, problem_type, status, location FROM reports
            WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3);
        `;
        const nearbyReports = await pool.query(query, [lon, lat, radius]);
        res.json(nearbyReports.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

app.get('/api/admin/analytics/overview', auth, adminAuth, async (req, res) => {
    try {
        const totalPromise = pool.query("SELECT COUNT(*) FROM reports");
        const overduePromise = pool.query("SELECT COUNT(*) FROM reports WHERE sla_due_at < NOW() AND status != 'resolved'");
        const resolvedPromise = pool.query("SELECT COUNT(*) FROM reports WHERE status = 'resolved'");
        const [totalRes, overdueRes, resolvedRes] = await Promise.all([totalPromise, overduePromise, resolvedPromise]);
        res.json({
            total_reports: parseInt(totalRes.rows[0].count),
            overdue_reports: parseInt(overdueRes.rows[0].count),
            resolved_reports: parseInt(resolvedRes.rows[0].count)
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// ## 5. Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});

