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

// 2. API: Expiry Date-ai Verify Seidhal (The Core Logic 🔴/🟡/🟢)
app.get('/api/verify-expiry/:qrCodeId', (req, res) => {
    const { qrCodeId } = req.params;

    // உங்க டேட்டாபேஸில் 'qr_code_id' என்று இருந்தால் இதைப் பயன்படுத்துங்கள்
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

        // இரண்டு தேதிகளுக்கும் இடையே உள்ள நாட்களைக் கணக்கிடுகிறோம் (Difference in Days)
        const timeDiff = expiryDate.getTime() - today.getTime();
        const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

        let isExpired = false;
        let isNearExpiry = false;

        // Core Conditions:
        if (daysLeft < 0) {
            isExpired = true;       // காலாவதி ஆகிவிட்டது 🔴
        } else if (daysLeft <= 30) {
            isNearExpiry = true;    // இன்னும் 30 நாட்களுக்குள் காலாவதி ஆகப்போகிறது 🟡
        }

        // Namma ooru date format-க்கு (DD-MM-YYYY) mathuvom display panna easy-ah iruka
        const formattedDate = expiryDate.toLocaleDateString('en-GB');

        res.json({
            product_name: product.product_name,
            expiry_date_formatted: formattedDate,
            isExpired: isExpired,       // true (Expired 🔴)
            isNearExpiry: isNearExpiry, // true (Expiring Soon 🟡)
            daysLeft: daysLeft          // மீதமுள்ள நாட்கள்
        });
    });
});

// சர்வர் ரன் ஆகும் போர்ட் செட்டப் (இங்குதான் தட்டச்சுப் பிழை இருந்தது, இப்போது சரிசெய்யப்பட்டது)
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});