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

// ADDED: Import http and Socket.IO
const http = require('http');
const { Server } = require("socket.io");

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

// ADDED: Create HTTP server and initialize Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000", // Your frontend URL
        methods: ["GET", "POST"]
    }
});

// ADDED: Socket.IO Authentication Middleware
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication error: No token provided'));
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded.user; // Attach user info to the socket
        next();
    } catch (err) {
        next(new Error('Authentication error: Token is not valid'));
    }
});

// ADDED: Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`Admin connected: ${socket.user.name} (${socket.id})`);

    // Join a room specific to the admin's district
    if (socket.user && socket.user.district_name) {
        socket.join(socket.user.district_name);
        console.log(`Socket ${socket.id} joined room: ${socket.user.district_name}`);
    }

    socket.on('disconnect', () => {
        console.log(`Admin disconnected: ${socket.user.name} (${socket.id})`);
    });
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
    console.error('JWT Error:', err.message);
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
//                      HELPER FUNCTIONS
// =================================================================

// ADDED: A helper function to get full report details by ID
const getFullReportDetailsById = async (reportId) => {
    const query = `
        SELECT 
            mr.*, 
            d.name as department_name, 
            w.lat as latitude, 
            w.long as longitude,
            selected_report.image_url,
            selected_report.description as selected_description,
            selected_report.created_at as image_created_at,
            dt.id as district_id
        FROM merged_reports mr 
        JOIN districts dt ON mr.district = dt.name
        LEFT JOIN wards w ON mr.ward = w.ward_no AND w.district_id = dt.id
        LEFT JOIN departments d ON mr.department_id = d.id 
        LEFT JOIN LATERAL (
            SELECT ar.image_url, ar.description, ar.created_at
            FROM all_reports ar 
            WHERE LOWER(TRIM(ar.problem)) = LOWER(TRIM(mr.problem))
            AND LOWER(TRIM(ar.district)) = LOWER(TRIM(mr.district))
            AND TRIM(ar.ward) = TRIM(mr.ward)
            AND ar.image_url IS NOT NULL AND TRIM(ar.image_url) != ''
            ORDER BY ar.created_at DESC
            LIMIT 1
        ) selected_report ON true
        WHERE mr.id = $1
    `;
    const result = await pool.query(query, [reportId]);
    if (result.rows.length === 0) return null;

    // Structure the data to match the dashboard's expectation
    const report = result.rows[0];
    return {
        ...report,
        location: (report.longitude && report.latitude) ? { coordinates: [report.longitude, report.latitude] } : null,
        problem_type: report.problem,
        description: report.selected_description || report.description,
    };
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

app.get('/api/public/departments', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name FROM departments ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        console.error('Failed to fetch departments:', err.message);
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

// =================================================================
//                      CITIZEN-FACING ROUTES
// =================================================================

const getDistrictAndWard = async (lat, lng) => {
    try {
        const query = `
            SELECT w.ward_no, d.name as district_name FROM wards w
            JOIN districts d ON w.district_id = d.id
            ORDER BY ST_Distance(ST_SetSRID(ST_MakePoint(w.long, w.lat), 4326), ST_SetSRID(ST_MakePoint($1, $2), 4326))
            LIMIT 1;
        `;
        const result = await pool.query(query, [lng, lat]);
        if (result.rows.length > 0) return result.rows[0];
        throw new Error('No wards found to match against.');
    } catch (error) {
        console.error('Geo-lookup error:', error);
        return { district_name: 'Unknown District', ward_no: 'Unknown Ward' };
    }
};

// MODIFIED: This route now emits a socket event after successful submission
app.post('/api/reports', auth, reportLimiter, async (req, res) => {
    const { problem, description, image_url, latitude, longitude, department } = req.body;
    const { uid: citizen_uid } = req.user;
    
    if (!problem || !latitude || !longitude || !department) {
        return res.status(400).json({ message: 'Problem, location, and department are required' });
    }
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { district_name, ward_no } = await getDistrictAndWard(latitude, longitude);

        const deptResult = await client.query('SELECT id FROM departments WHERE name = $1', [department]);
        if (deptResult.rows.length === 0) {
            throw new Error(`Department "${department}" not found in the database.`);
        }
        const department_id = deptResult.rows[0].id;

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
                'INSERT INTO merged_reports (problem, district, ward, department_id) VALUES ($1, $2, $3, $4) RETURNING id',
                [problem, district_name, ward_no, department_id]
            );
            mergedReportId = newMergedReportResult.rows[0].id;
        }
        
        await client.query(
            'INSERT INTO all_reports (uid, problem, description, image_url, district, ward) VALUES ($1, $2, $3, $4, $5, $6)',
            [citizen_uid, problem, description, image_url, district_name, ward_no]
        );
        
        await client.query('COMMIT');
        
        // ADDED: Fetch the full report details and emit to the relevant district room
        const fullReportDetails = await getFullReportDetailsById(mergedReportId);
        if (fullReportDetails) {
            io.to(district_name).emit('new_or_updated_report', fullReportDetails);
            console.log(`Emitted 'new_or_updated_report' to room: ${district_name}`);
        }
        
        res.status(201).json({ 
            message: 'Report submitted successfully.', 
            merged_report_id: mergedReportId, 
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Report submission error:', err.message);
        res.status(500).json({ error: 'Failed to submit report', message: err.message });
    } finally {
        client.release();
    }
});

app.get('/api/citizen/my-reports', auth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT ar.problem, ar.description, ar.image_url, ar.district, ar.ward, mr.status, ar.created_at
            FROM all_reports ar
            JOIN merged_reports mr ON ar.problem = mr.problem AND ar.district = mr.district AND ar.ward = mr.ward
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
        
        const IMAGE_PREFERENCE = 'latest'; // Change to 'latest' to show the most recent image
        
        // Determine sort order based on preference
        const sortOrder = IMAGE_PREFERENCE === 'latest' ? 'DESC' : 'ASC';
        
        const result = await pool.query(`
            SELECT 
                mr.*, 
                d.name as department_name, 
                w.lat as latitude, 
                w.long as longitude,
                selected_report.image_url,
                selected_report.description as selected_description,
                selected_report.created_at as image_created_at
            FROM merged_reports mr 
            JOIN districts dt ON mr.district = dt.name
            LEFT JOIN wards w ON mr.ward = w.ward_no AND w.district_id = dt.id
            LEFT JOIN departments d ON mr.department_id = d.id 
            LEFT JOIN LATERAL (
                SELECT ar.image_url, ar.description, ar.created_at
                FROM all_reports ar 
                WHERE LOWER(TRIM(ar.problem)) = LOWER(TRIM(mr.problem))
                AND LOWER(TRIM(ar.district)) = LOWER(TRIM(mr.district))
                AND TRIM(ar.ward) = TRIM(mr.ward)
                AND ar.image_url IS NOT NULL 
                AND TRIM(ar.image_url) != ''
                ORDER BY ar.created_at ${sortOrder}
                LIMIT 1
            ) selected_report ON true
            WHERE mr.district = $1
            ORDER BY mr.updated_at DESC
        `, [district_name]);
        
        const reportsForMap = result.rows.map(report => {
            // Debug logging to help identify the issue
            if (!report.image_url) {
                console.log(`No image found for merged report: ${report.problem} in ${report.district}, Ward ${report.ward}`);
            }
            
            return {
                ...report,
                location: (report.longitude && report.latitude) ? { coordinates: [report.longitude, report.latitude] } : null,
                problem_type: report.problem,
                image_url: report.image_url,
                description: report.selected_description || report.description,
                image_created_at: report.image_created_at
            };
        });
        
        res.json(reportsForMap);
    } catch (err) {
        console.error('Error fetching admin reports:', err.message);
        res.status(500).send('Server Error');
    }
});

// MODIFIED: This route now emits a socket event after a successful update
app.put('/api/admin/reports/:id', auth, adminAuth, async (req, res) => {
    const { id } = req.params;
    const { status, department_id } = req.body;
    const { district_name } = req.user;

    try {
        const reportCheck = await pool.query('SELECT district FROM merged_reports WHERE id = $1', [id]);
        if (reportCheck.rows.length === 0) return res.status(404).json({ message: 'Report not found' });
        if (reportCheck.rows[0].district !== district_name) return res.status(403).json({ message: 'Access denied.' });

        const result = await pool.query(
            'UPDATE merged_reports SET status = $1, department_id = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
            [status, department_id, id]
        );
        
        // ADDED: Fetch full details and emit an update event to the district room
        const updatedReportDetails = await getFullReportDetailsById(id);
        if (updatedReportDetails) {
            io.to(district_name).emit('report_updated', updatedReportDetails);
            console.log(`Emitted 'report_updated' to room: ${district_name}`);
        }

        res.json(result.rows[0]); // Still return the simple response to the admin who made the change
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// NEW: Endpoint for State Admin to get escalated reports
app.get('/api/state-admin/escalated-reports', auth, stateAdminAuth, async (req, res) => {
    try {
        const fourMonthsAgo = new Date();
        fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);

        const result = await pool.query(`
            SELECT 
                mr.id,
                mr.problem,
                mr.district,
                mr.ward,
                mr.nos,
                mr.status,
                mr.created_at,
                d.name AS department_name
            FROM 
                merged_reports mr
            LEFT JOIN 
                departments d ON mr.department_id = d.id
            WHERE 
                mr.nos > 100
                AND mr.status != 'resolved'
                AND mr.created_at < $1
            ORDER BY 
                mr.created_at ASC;
        `, [fourMonthsAgo]);
        
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching escalated reports:', err.message);
        res.status(500).send('Server Error');
    }
});

// NEW: Endpoint for State Admin analytics data
app.get('/api/state-admin/analytics', auth, stateAdminAuth, async (req, res) => {
    const { districtId } = req.query; // Expecting districtId=... in the query string

    if (!districtId) {
        return res.status(400).json({ message: 'A district ID is required.' });
    }

    try {
        const client = await pool.connect();
        
        // Query for Pie Chart data (status breakdown)
        const statusQuery = `
            SELECT status, COUNT(*) as count
            FROM merged_reports mr
            JOIN districts d ON mr.district = d.name
            WHERE d.id = $1
            GROUP BY status;
        `;
        const statusResult = await client.query(statusQuery, [districtId]);

        // Query for Line Chart data (report frequency over time)
        const frequencyQuery = `
            SELECT 
                DATE_TRUNC('week', created_at)::DATE as week,
                COUNT(*) as count
            FROM merged_reports mr
            JOIN districts d ON mr.district = d.name
            WHERE d.id = $1
            GROUP BY week
            ORDER BY week;
        `;
        const frequencyResult = await client.query(frequencyQuery, [districtId]);

        client.release();

        // Format data for the frontend charts
        const statusData = {
            submitted: 0,
            in_progress: 0,
            resolved: 0,
            rejected: 0
        };
        statusResult.rows.forEach(row => {
            if (statusData.hasOwnProperty(row.status)) {
                statusData[row.status] = parseInt(row.count, 10);
            }
        });

        const frequencyData = {
            labels: frequencyResult.rows.map(row => new Date(row.week).toLocaleDateString()),
            data: frequencyResult.rows.map(row => parseInt(row.count, 10))
        };

        res.json({
            statusData,
            frequencyData
        });

    } catch (err) {
        console.error('Error fetching analytics data:', err.message);
        res.status(500).send('Server Error');
    }
});


// =================================================================
//                      START SERVER
// =================================================================
// MODIFIED: Use the http server to listen, not the express app
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});