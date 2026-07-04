const express = require('express');
const mysql = require('mysql2');
const qrcode = require('qrcode');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup
app.use(express.json());
app.use(express.static('public'));

// MySQL Database Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed: ' + err.stack);
        return;
    }
    console.log('Connected to MySQL Database successfully!');
});

// 1. API: QR Code URL/Image Generate Seidhal
app.get('/api/generate-qr', async (req, res) => {
    const text = req.query.text; // Frontend-la irundhu vara QR ID
    if (!text) return res.status(400).json({ error: 'Text query is required' });

    try {
        // QR Code-ai Base64 Image string-ah mathuroom
        const qrImage = await qrcode.toDataURL(text);
        res.json({ qrImage });
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate QR Code' });
    }
});

// 2. API: Expiry Date-ai Verify Seidhal (The Core Logic 🔴/🟢)
app.get('/api/verify-expiry/:qrCodeId', (req, res) => {
    const { qrCodeId } = req.params;

    const sql = 'SELECT product_name, expiry_date FROM products WHERE qr_code_id = ?';
    db.query(sql, [qrCodeId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Product database-la illana 404 return pannuvom
        if (results.length === 0) return res.status(404).json({ error: 'Product not found' });

        const product = results[0];
        const expiryDate = new Date(product.expiry_date);
        const today = new Date(); // Inraiya current system date

        // Time elements-ah reset panni ore date-ah mattum compare pannuvom
        today.setHours(0,0,0,0);
        expiryDate.setHours(0,0,0,0);

        // Core Condition: Expiry date inraiya date-ai vida munnadi irundha -> Expired!
        const isExpired = expiryDate < today; 

        // Namma ooru date format-க்கு (DD-MM-YYYY) mathuvom display panna easy-ah iruka
        const formattedDate = expiryDate.toLocaleDateString('en-GB');

        res.json({
            product_name: product.product_name,
            expiry_date_formatted: formattedDate,
            isExpired: isExpired // true (Expired 🔴) OR false (Valid 🟢)
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});