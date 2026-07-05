const express = require('express');
const { Pool } = require('pg'); 
const qrcode = require('qrcode');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const createTableQuery = `
    CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        product_name VARCHAR(255) NOT NULL,
        expiry_date DATE NOT NULL,
        qr_code_id VARCHAR(255) UNIQUE NOT NULL
    );
`;

pool.query(createTableQuery)
    .then(() => console.log("Products table verified/created successfully!"))
    .catch(err => console.error("Error creating table:", err));

// 1. API: QR Code Generate
app.get('/api/generate-qr', async (req, res) => {
    const text = req.query.text;
    if (!text) return res.status(400).json({ error: 'Text query is required' });
    try {
        const qrImage = await qrcode.toDataURL(text);
        res.json({ qrImage });
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate QR Code' });
    }
});

// 2. API: Add Product to Database 
app.post('/api/add-product', async (req, res) => {
    const { product_name, expiry_date, qr_code_id } = req.body;
    if (!product_name || !expiry_date || !qr_code_id) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    const sql = 'INSERT INTO products (product_name, expiry_date, qr_code_id) VALUES ($1, $2, $3) ON CONFLICT (qr_code_id) DO UPDATE SET product_name = $1, expiry_date = $2';
    try {
        await pool.query(sql, [product_name, expiry_date, qr_code_id]);
        res.json({ success: true }); 
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 3. API: Verify Expiry (🟢 / 🔴)
app.get('/api/verify-expiry/:qrCodeId', async (req, res) => {
    const { qrCodeId } = req.params;
    const sql = 'SELECT product_name, expiry_date FROM products WHERE qr_code_id = $1';
    try {
        const results = await pool.query(sql, [qrCodeId]);
        if (results.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const product = results.rows[0];
        const rawDate = new Date(product.expiry_date);
        const expiryDate = new Date(rawDate.getFullYear(), rawDate.getMonth(), rawDate.getDate(), 0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const timeDiff = expiryDate.getTime() - today.getTime();
        const daysLeft = Math.round(timeDiff / (1000 * 60 * 60 * 24));

        let isExpired = daysLeft < 0; 
        const formattedDate = expiryDate.toLocaleDateString('en-GB');

        res.json({
            product_name: product.product_name,
            expiry_date_formatted: formattedDate,
            isExpired: isExpired,
            daysLeft: daysLeft
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
