const express = require('express');
const { Pool } = require('pg'); // PostgreSQL (pg) பயன்படுத்தி விபரங்களைச் சேமிக்கிறோம்
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
        rejectUnauthorized: false // Cloud (Render)-ல் ரன் ஆக இது மிக முக்கியம்
    }
});

// சர்வர் ஸ்டார்ட் ஆகும்போது டேட்டாபேஸில் டேபிள் தானாக உருவாகும் லாஜிக்
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

// 2. API: புது பொருளை டேட்டாபேஸில் சேமிக்க (Add Product to Database)
app.post('/api/add-product', async (req, res) => {
    const { product_name, expiry_date, qr_code_id } = req.body;

    if (!product_name || !expiry_date || !qr_code_id) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // ஏற்கனவே அதே QR ID இருந்தால் அப்டேட் செய்யும், இல்லை என்றால் புதியதாகச் சேமிக்கும் லாஜிக்
    const sql = 'INSERT INTO products (product_name, expiry_date, qr_code_id) VALUES ($1, $2, $3) ON CONFLICT (qr_code_id) DO UPDATE SET product_name = $1, expiry_date = $2';
    
    try {
        await pool.query(sql, [product_name, expiry_date, qr_code_id]);
        res.json({ success: true, message: 'Product saved to database successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. API: Expiry Date-ai Verify Seidhal (PostgreSQL Timezone Error Fixed 🔴/🟡/🟢)
app.get('/api/verify-expiry/:qrCodeId', async (req, res) => {
    const { qrCodeId } = req.params;
    const sql = 'SELECT product_name, expiry_date FROM products WHERE qr_code_id = $1';

    try {
        const results = await pool.query(sql, [qrCodeId]);
        
        if (results.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const product = results.rows[0];
        
        // லோக்கல் நள்ளிரவு நேரமாக மாற்றி டைம்சோன் எர்ரர் வராமல் துல்லியமாகக் கணக்கிடுகிறோம்
        const rawDate = new Date(product.expiry_date);
        const expiryDate = new Date(rawDate.getFullYear(), rawDate.getMonth(), rawDate.getDate(), 0, 0, 0, 0);

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

        // நாட்களின் வித்தியாசத்தைக் கணக்கிடுதல்
        const timeDiff = expiryDate.getTime() - today.getTime();
        const daysLeft = Math.round(timeDiff / (1000 * 60 * 60 * 24));

        let isExpired = false;
        let isNearExpiry = false;

        // கோர் கண்டிஷன் லாஜிக்:
        if (daysLeft < 0) {
            isExpired = true;       // காலாவதி ஆகிவிட்டது 🔴
        } else if (daysLeft <= 30) {
            isNearExpiry = true;    // இன்னும் 30 நாட்களுக்குள் காலாவதி ஆகப்போகிறது 🟡
        }

        const formattedDate = expiryDate.toLocaleDateString('en-GB'); // DD-MM-YYYY வடிவமைப்பு

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

// சர்வர் ரன் ஆகும் போர்ட் செட்டப்
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
