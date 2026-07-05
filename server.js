const express = require('express');
const { Pool } = require('pg'); // MySQL-க்கு பதிலா PostgreSQL (pg) பயன்படுத்துகிறோம்
const qrcode = require('qrcode');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup
app.use(express.json());
app.use(express.static('public'));

// PostgreSQL Database Connection configuration
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Cloud deployment-க்கு இது முக்கியம்
    }
});

// சர்வர் ஸ்டார்ட் ஆகும்போது டேபிள் தானாக உருவாகும் லாஜிக்
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

// 1. API: QR Code URL/Image Generate Seidhal
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

// 2. API: Expiry Date-ai Verify Seidhal (PostgreSQL version 🔴/🟡/🟢)
app.get('/api/verify-expiry/:qrCodeId', async (req, res) => {
    const { qrCodeId } = req.params;
    const sql = 'SELECT product_name, expiry_date FROM products WHERE qr_code_id = $1';

    try {
        const results = await pool.query(sql, [qrCodeId]);
        
        if (results.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const product = results.rows[0];
        const expiryDate = new Date(product.expiry_date);
        const today = new Date();

        today.setHours(0,0,0,0);
        expiryDate.setHours(0,0,0,0);

        const timeDiff = expiryDate.getTime() - today.getTime();
        const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

        let isExpired = false;
        let isNearExpiry = false;

        if (daysLeft < 0) {
            isExpired = true;
        } else if (daysLeft <= 30) {
            isNearExpiry = true;
        }

        const formattedDate = expiryDate.toLocaleDateString('en-GB');

        res.json({
            product_name: product.product_name,
            expiry_date_formatted: formattedDate,
            isExpired: isExpired,
            isNearExpiry: isNearExpiry,
            daysLeft: daysLeft
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});