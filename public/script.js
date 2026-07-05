// 1. QR Code மற்றும் பொருளின் விபரங்களை டேட்டாபேஸில் சேமித்து QR உருவாக்குதல்
async function generateQR() {
    // HTML-ல் இருக்கும் இன்புட் பாக்ஸ் ஐடிகள் (உங்க டிசைன் படி)
    const productName = document.querySelector('input[placeholder="Product Name (e.g., Milk)"]').value.trim();
    const qrId = document.querySelector('input[placeholder="Unique QR ID (e.g., QR_MILK_001)"]').value.trim();
    const expiryDate = document.querySelector('input[type="date"]').value;

    // ஏதாச்சும் ஒரு பாக்ஸ் காலியாக இருந்தால் எச்சரிக்கும்
    if (!productName || !qrId || !expiryDate) {
        alert("Please fill all fields (Product Name, QR ID, and Expiry Date)");
        return;
    }

    try {
        // ஸ்டெப் A: முதலில் விபரங்களை ஆன்லைன் PostgreSQL டேட்டாபேஸில் சேமிக்கிறோம்
        const saveResponse = await fetch('/api/add-product', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                product_name: productName, 
                expiry_date: expiryDate, 
                qr_code_id: qrId 
            })
        });

        const saveResult = await saveResponse.json();

        if (saveResponse.ok && saveResult.success) {
            // ஸ்டெப் B: டேட்டாபேஸில் சேமிக்கப்பட்ட பிறகு QR Code இமேஜை உருவாக்குகிறோம்
            const qrResponse = await fetch(`/api/generate-qr?text=${qrId}`);
            const qrData = await qrResponse.json();
            
            // உங்க HTML-ல் இருக்கும் QR Code காட்டும் இமேஜ் டேக் (IMG)
            // ஒருவேளை உங்கள் IMG டேக்கிற்கு தனி ID இருந்தால் அதை இங்கு மாற்றலாம், இல்லையெனில் இது புது இமேஜை காட்டும்
            let qrImgTag = document.getElementById('qrCodeImage');
            if (!qrImgTag) {
                // இமேஜ் டேக் இல்லை என்றால் புதுசாக உருவாக்கி பட்டனுக்கு கீழே காட்டும்
                qrImgTag = document.createElement('img');
                qrImgTag.id = 'qrCodeImage';
                qrImgTag.style.display = 'block';
                qrImgTag.style.margin = '15px auto';
                document.querySelector('.form-group').appendChild(qrImgTag);
            }
            
            qrImgTag.src = qrData.qrImage;
            alert("🎉 Product saved to Database & QR Code Generated successfully!");
        } else {
            alert("❌ Error saving to database: " + (saveResult.error || "Unknown error"));
        }
    } catch (err) {
        console.error(err);
        alert("❌ Something went wrong while generating QR!");
    }
}

// 2. க்யூஆர் ஐடியை டைப் செய்து அல்லது ஸ்கேன் செய்து எக்ஸ்பைரி சரிபார்த்தல் (🟢/🟡/🔴)
async function verifyProduct() {
    const qrIdInput = document.querySelector('input[placeholder="Enter or Scan QR ID here"]');
    const statusResult = document.getElementById('statusResult'); 
    const qrId = qrIdInput.value.trim();

    if (!qrId) {
        alert("Please enter or scan a QR ID to check status!");
        return;
    }

    try {
        statusResult.innerHTML = "🔄 Checking status from database...";
        statusResult.className = "status-box"; // ஸ்டைலை ரீசெட் செய்கிறது
        
        // சர்வரில் இருக்கும் verify-expiry API எண்ட்பாயிண்ட்டை கூப்பிடுகிறோம்
        const response = await fetch(`/api/verify-expiry/${qrId}`);
        
        if (response.status === 404) {
            statusResult.innerHTML = "⚠️ Product Not Found in Database!";
            statusResult.className = "status-box expired"; // சிவப்பு கலர் எச்சரிக்கை
            return;
        }

        if (!response.ok) {
            statusResult.innerHTML = "❌ Error occurred while retrieving data.";
            statusResult.className = "status-box expired";
            return;
        }

        const product = await response.json();

        // 🟢 🟡 🔴 கோர் கலர் லாஜிக் இங்கதான் வேலை செய்யுது:
        if (product.isExpired) {
            statusResult.innerHTML = `🔴 <b>EXPIRED PRODUCT</b><br><br>
            <b>Product:</b> ${product.product_name}<br>
            <b>Expiry Date:</b> ${product.expiry_date_formatted}<br>
            <small style="color: #ffcccc;">(This item is already expired!)</small>`;
            
            statusResult.className = "status-box expired"; // 🔴 சிவப்பு நிறம்
        } 
        else if (product.isNearExpiry) { 
            statusResult.innerHTML = `⚠️ <b>EXPIRING SOON (WARNING)</b><br><br>
            <b>Product:</b> ${product.product_name}<br>
            <b>Expiry Date:</b> ${product.expiry_date_formatted}<br>
            <small style="color: #444;">(Only ${product.daysLeft} days remaining!)</small>`;
            
            statusResult.className = "status-box warning"; // 🟡 மஞ்சள் நிறம்
        } 
        else {
            statusResult.innerHTML = `🟢 <b>VALID PRODUCT (SAFE)</b><br><br>
            <b>Product:</b> ${product.product_name}<br>
            <b>Expiry Date:</b> ${product.expiry_date_formatted}<br>
            <small style="color: #e6ffe6;">(Safe to use. ${product.daysLeft} days left.)</small>`;
            
            statusResult.className = "status-box valid"; // 🟢 பச்சை நிறம்
        }

    } catch (err) {
        console.error(err);
        statusResult.innerHTML = "❌ System Error verifying product expiry";
        statusResult.className = "status-box expired";
    }
}

// HTML-ல் இருக்கும் பட்டன்களுக்கு இந்த ஜாவாஸ்கிரிப்ட் பங்க்ஷன்களை இணைக்கிறோம்
document.addEventListener("DOMContentLoaded", () => {
    // முதலாவது பட்டன் - Generate QR Code
    const generateBtn = document.querySelector('button[onclick="generateQR()"]') || document.querySelectorAll('button')[0];
    if (generateBtn) {
        generateBtn.removeAttribute('onclick'); // பழைய இன்லைன் லிங்க்கை நீக்குகிறது
        generateBtn.addEventListener('click', generateQR);
    }

    // இரண்டாவது பட்டன் - Check Expiry Status
    const verifyBtn = document.querySelector('button[onclick="verifyProduct()"]') || document.querySelectorAll('button')[1];
    if (verifyBtn) {
        verifyBtn.removeAttribute('onclick');
        verifyBtn.addEventListener('click', verifyProduct);
    }
});
