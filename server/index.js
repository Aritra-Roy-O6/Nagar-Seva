// server/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const cloudinary = require('cloudinary').v2;
const admin = require('firebase-admin');
 
// --- Service Initialization ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
}); 

const app = express();
const PORT = process.env.PORT || 3001;

// --- Core Middleware & Security ---
app.use(cors());
app.use(express.json());

const reportLimiter = rateLimit({
	windowMs: 24 * 60 * 60 * 1000,
	max: 15,
	message: 'Too many reports created from this IP, please try again after 24 hours',
    standardHeaders: true,
    legacyHeaders: false,
});

// =================================================================
//                      AUTHENTICATION & MIDDLEWARE
// =================================================================

const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const adminAuth = (req, res, next) => {
  if (!req.user || !['general', 'department'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  next();
};

const stateAdminAuth = (req, res, next) => {
    if (!req.user || req.user.role !== 'state_admin') {
      return res.status(403).json({ message: 'State Admin access required.' });
    }
    next();
};

// =================================================================
//                      PUBLIC & SHARED ROUTES
// =================================================================

app.get('/api/districts', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name FROM districts ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        console.error('Failed to fetch districts:', err.message);
        res.status(500).send('Server Error');
    }
});

app.get('/api/districts/:districtId/wards', async (req, res) => {
    const { districtId } = req.params;
    try {
        const result = await pool.query(
            'SELECT id, ward_no FROM wards WHERE district_id = $1 ORDER BY CAST(ward_no AS INTEGER) ASC',
            [districtId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Failed to fetch wards:', err.message);
        res.status(500).send('Server Error');
    }
});

app.get('/api/departments', auth, adminAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name FROM departments ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        console.error('Failed to fetch departments:', err.message);
        res.status(500).send('Server Error');
    }
});

// =================================================================
//                      REGISTRATION & LOGIN
// =================================================================

app.post('/api/auth/citizen/register', async (req, res) => {
    const { name, phone_no, password } = req.body;
    if (!name || !phone_no || !password) return res.status(400).json({ message: 'All fields are required' });
    
    try {
        const existingUser = await pool.query('SELECT uid FROM citizens WHERE phone_no = $1', [phone_no]);
        if (existingUser.rows.length > 0) return res.status(400).json({ message: 'Phone number already registered' });
        
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        const newUser = await pool.query(
            'INSERT INTO citizens (name, phone_no, password_hash) VALUES ($1, $2, $3) RETURNING uid, name, phone_no',
            [name, phone_no, passwordHash]
        );
        res.status(201).json(newUser.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

app.post('/api/auth/admin/register', async (req, res) => {
    const { name, email, password, districtId, secretKey, role } = req.body;
    if (!name || !email || !password || !districtId || !secretKey || !role) return res.status(400).json({ message: 'All fields are required' });
    if (!['general', 'department'].includes(role)) return res.status(400).json({ message: 'Invalid role specified' });
    
    try {
        const districtResult = await pool.query('SELECT secret_key FROM districts WHERE id = $1', [districtId]);
        if (districtResult.rows.length === 0 || districtResult.rows[0].secret_key !== secretKey) {
            return res.status(403).json({ message: 'Invalid District or Secret Key.' });
        }
        
        const existingAdmin = await pool.query('SELECT uid FROM admins WHERE email = $1', [email]);
        if (existingAdmin.rows.length > 0) return res.status(400).json({ message: 'Email already registered' });
        
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        const newAdmin = await pool.query(
            'INSERT INTO admins (name, email, password_hash, role, district_id) VALUES ($1, $2, $3, $4, $5) RETURNING uid, name, email, role',
            [name, email, passwordHash, role, districtId]
        );
        res.status(201).json(newAdmin.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { identifier, password, userType } = req.body;
    if (!identifier || !password || !userType) return res.status(400).json({ message: 'All fields are required' });
    
    let userQuery;
    if (userType === 'citizen') {
        userQuery = { text: 'SELECT *, \'citizen\' as role FROM citizens WHERE phone_no = $1', values: [identifier] };
    } else if (userType === 'admin') {
        userQuery = { 
            text: `SELECT a.*, d.name as district_name FROM admins a LEFT JOIN districts d ON a.district_id = d.id WHERE a.email = $1`, 
            values: [identifier] 
        };
    } else if (userType === 'state_admin') {
        userQuery = { text: 'SELECT *, \'state_admin\' as role FROM state_admins WHERE email = $1', values: [identifier] };
    } else {
        return res.status(400).json({ message: 'Invalid user type specified.' });
    }

    try {
        const userResult = await pool.query(userQuery);
        if (userResult.rows.length === 0) return res.status(400).json({ message: 'Invalid credentials' });
        
        const user = userResult.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const payload = { 
            user: { 
                uid: user.uid, 
                name: user.name, 
                role: user.role,
                district_id: user.district_id,
                district_name: user.district_name
            } 
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.json({ token, user: payload.user });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// NEW: State Admin Registration
app.post('/api/auth/state-admin/register', async (req, res) => {
    const { name, email, password, secretKey } = req.body;
    if (secretKey !== process.env.STATE_ADMIN_SECRET_KEY) {
        return res.status(403).json({ message: 'Invalid State Secret Key.' });
    }
    try {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        const newStateAdmin = await pool.query(
            'INSERT INTO state_admins (name, email, password_hash) VALUES ($1, $2, $3) RETURNING uid, name, email',
            [name, email, passwordHash]
        );
        res.status(201).json(newStateAdmin.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// =================================================================
//                      CITIZEN-FACING ROUTES
// =================================================================

// The new, simplified, and robust geo-lookup function
const getDistrictAndWard = async (lat, lng) => {
    try {
        // This PostGIS query finds the single closest ward and its parent district
        const query = `
            SELECT
                w.ward_no,
                d.name as district_name
            FROM wards w
            JOIN districts d ON w.district_id = d.id
            ORDER BY
                ST_Distance(
                    ST_SetSRID(ST_MakePoint(w.long, w.lat), 4326),
                    ST_SetSRID(ST_MakePoint($1, $2), 4326)
                )
            LIMIT 1;
        `;
        const result = await pool.query(query, [lng, lat]); // PostGIS uses (longitude, latitude)

        if (result.rows.length > 0) {
            return result.rows[0]; // Returns { district_name: 'Dhanbad', ward_no: '25' }
        } else {
            throw new Error('No wards found in the database to match against.');
        }
    } catch (error) {
        console.error('Geo-lookup error:', error);
        return { district_name: 'Unknown District', ward_no: 'Unknown Ward' };
    }
};

app.post('/api/reports', auth, reportLimiter, async (req, res) => {
    const { problem, description, image_url, latitude, longitude } = req.body;
    const { uid: citizen_uid } = req.user;
    if (!problem || !latitude || !longitude) return res.status(400).json({ message: 'Problem, latitude, and longitude are required' });
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { district_name, ward_no } = await getDistrictAndWard(latitude, longitude);

        const existingReportResult = await client.query(
            `SELECT id FROM merged_reports WHERE problem = $1 AND district = $2 AND ward = $3 AND status IN ('submitted', 'in_progress')`,
            [problem, district_name, ward_no]
        );
        let mergedReportId;
        if (existingReportResult.rows.length > 0) {
            mergedReportId = existingReportResult.rows[0].id;
            await client.query('UPDATE merged_reports SET nos = nos + 1, updated_at = NOW() WHERE id = $1', [mergedReportId]);
        } else {
            const newMergedReportResult = await client.query(
                'INSERT INTO merged_reports (problem, district, ward) VALUES ($1, $2, $3) RETURNING id',
                [problem, district_name, ward_no]
            );
            mergedReportId = newMergedReportResult.rows[0].id;
        }
        await client.query(
            'INSERT INTO all_reports (uid, problem, description, image_url, district, ward) VALUES ($1, $2, $3, $4, $5, $6)',
            [citizen_uid, problem, description, image_url, district_name, ward_no]
        );
        await client.query('COMMIT');
        res.status(201).json({ message: 'Report submitted successfully.', merged_report_id: mergedReportId, location: { district: district_name, ward: ward_no } });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
});

app.get('/api/citizen/my-reports', auth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT ar.problem, ar.description, ar.image_url, ar.district, ar.ward, ar.status, ar.created_at
            FROM all_reports ar
            WHERE ar.uid = $1 ORDER BY ar.created_at DESC
        `, [req.user.uid]);
        res.json(result.rows);
    } catch(err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// =================================================================
//                      ADMIN & STATE ADMIN ROUTES
// =================================================================

app.get('/api/admin/reports', auth, adminAuth, async (req, res) => {
    const { district_name } = req.user;
    if (!district_name) return res.status(403).json({ message: 'Admin is not associated with a district.' });
    
    try {
        // THIS IS THE CORRECTED QUERY
        const result = await pool.query(`
            SELECT 
                mr.*, 
                d.name as department_name, 
                w.lat as latitude, 
                w.long as longitude
            FROM 
                merged_reports mr 
            -- First, join to districts to get the district_id for filtering
            JOIN 
                districts dt ON mr.district = dt.name
            -- Now, LEFT JOIN to wards using both ward_no and the correct district_id
            LEFT JOIN 
                wards w ON mr.ward = w.ward_no AND w.district_id = dt.id
            -- Finally, LEFT JOIN to departments
            LEFT JOIN 
                departments d ON mr.department_id = d.id 
            WHERE 
                mr.district = $1
            ORDER BY 
                mr.updated_at DESC
        `, [district_name]);
        
        const reportsForMap = result.rows.map(report => ({
            ...report,
            location: (report.longitude && report.latitude) ? { coordinates: [report.longitude, report.latitude] } : null,
            problem_type: report.problem,
        }));
        
        res.json(reportsForMap);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

app.put('/api/admin/reports/:id', auth, adminAuth, async (req, res) => {
    const { id } = req.params;
    const { status, department_id } = req.body;
    const { district_name } = req.user;

    try {
        const reportCheck = await pool.query('SELECT district FROM merged_reports WHERE id = $1', [id]);
        if (reportCheck.rows.length === 0) return res.status(404).json({ message: 'Report not found' });
        if (reportCheck.rows[0].district !== district_name) return res.status(403).json({ message: 'Access denied. Report is not in your district.' });

        if (status === 'resolved') {
            await pool.query('DELETE FROM merged_reports WHERE id = $1', [id]);
            res.status(200).json({ id, status: 'resolved', message: 'Report resolved and removed.' });
        } else {
            const result = await pool.query(
                'UPDATE merged_reports SET status = $1, department_id = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
                [status, department_id, id]
            );
            res.json(result.rows[0]);
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

app.get('/api/state-admin/escalated-reports', auth, stateAdminAuth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                mr.id, mr.problem, mr.district, mr.ward, mr.nos, mr.created_at,
                d.name as department_name
            FROM merged_reports mr 
            LEFT JOIN departments d ON mr.department_id = d.id
            WHERE mr.nos > 100 
            AND mr.created_at < NOW() - INTERVAL '4 months' 
            AND mr.status != 'resolved'
            ORDER BY mr.nos DESC, mr.created_at ASC
        `);
        // Map district and ward names for the frontend
        const reportsWithNames = await Promise.all(result.rows.map(async (report) => {
            // This is a simplified lookup; a real app might optimize this
            const districtRes = await pool.query('SELECT name FROM districts WHERE name = $1', [report.district]);
            const wardRes = await pool.query('SELECT ward_no FROM wards WHERE ward_no = $1 AND district_id = (SELECT id FROM districts WHERE name = $2)', [report.ward, report.district]);
            return {
                ...report,
                district_name: districtRes.rows[0]?.name || report.district,
                ward_no: wardRes.rows[0]?.ward_no || report.ward,
            };
        }));
        res.json(reportsWithNames);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});


//debug
app.get('/api/debug', async (req, res) => {
  try {
    // Test basic database connection
    const result = await pool.query('SELECT NOW() as current_time');
    res.json({ 
      status: 'Database connected', 
      time: result.rows[0].current_time,
      database_url_exists: !!process.env.DATABASE_URL
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'Database connection failed', 
      error: err.message,
      database_url_exists: !!process.env.DATABASE_URL
    });
  }
});
// =================================================================
//                      START SERVER
// =================================================================
app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});

