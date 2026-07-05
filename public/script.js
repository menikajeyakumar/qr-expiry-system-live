// 1. QR Code மற்றும் பொருளின் விபரங்களை டேட்டாபேஸில் சேமித்து QR உருவாக்குதல்
async function generateQR() {
    // HTML-ல் இருக்கும் இன்புட் பாக்ஸ்களை ஐடி அல்லது டேக் மூலமாக எடுக்கிறோம்
    const productNameInput = document.querySelector('input[placeholder*="Product Name"]') || document.querySelectorAll('input')[0];
    const qrIdInput = document.querySelector('input[placeholder*="Unique QR ID"]') || document.querySelectorAll('input')[1];
    const expiryDateInput = document.querySelector('input[type="date"]');

    if (!productNameInput || !qrIdInput || !expiryDateInput) {
        alert("HTML elements not found! Please check inputs.");
        return;
    }

    const productName = productNameInput.value.trim();
    const qrId = qrIdInput.value.trim();
    const expiryDate = expiryDateInput.value;

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
            // ஸ்ட்ரெப் B: டேட்டாபேஸில் சேமிக்கப்பட்ட பிறகு QR Code இமேஜை உருவாக்குகிறோம்
            const qrResponse = await fetch(`/api/generate-qr?text=${encodeURIComponent(qrId)}`);
            const qrData = await qrResponse.json();
            
            // QR காட்டும் இமேஜ் டேக்
            let qrImgTag = document.getElementById('qrCodeImage') || document.querySelector('.container img');
            if (!qrImgTag) {
                qrImgTag = document.createElement('img');
                qrImgTag.id = 'qrCodeImage';
                qrImgTag.style.display = 'block';
                qrImgTag.style.margin = '15px auto';
                qrImgTag.style.maxWidth = '150px';
                expiryDateInput.parentElement.appendChild(qrImgTag);
            }
            
            qrImgTag.src = qrData.qrImage;
            alert("🎉 Product saved to Database & QR Code Generated!");
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
    // வெரிஃபை செய்யுற இன்புட் பாக்ஸை எடுக்கிறோம்
    const verifyInputs = document.querySelectorAll('input');
    // பொதுவாக வெரிஃபை பாக்ஸ் கடைசி இன்புட்டாக இருக்கும்
    const qrIdInput = verifyInputs[verifyInputs.length - 1]; 
    const statusResult = document.getElementById('statusResult') || document.querySelector('.status-box'); 
    
    if (!qrIdInput) {
        alert("Verify Input box not found!");
        return;
    }

    const qrId = qrIdInput.value.trim();

    if (!qrId) {
        alert("Please enter or scan a QR ID to check status!");
        return;
    }

    try {
        // ரிசல்ட் பாக்ஸ் இல்லை என்றால் புதிய டிவ் (DIV) ஒன்றை உருவாக்குகிறது
        let resultDiv = statusResult;
        if (!resultDiv) {
            resultDiv = document.createElement('div');
            resultDiv.id = 'statusResult';
            qrIdInput.parentElement.appendChild(resultDiv);
        }

        resultDiv.innerHTML = "🔄 Checking status from database...";
        resultDiv.className = "status-box"; 
        
        const response = await fetch(`/api/verify-expiry/${qrId}`);
        
        if (response.status === 404) {
            resultDiv.innerHTML = "⚠️ Product Not Found in Database!";
            resultDiv.className = "status-box expired"; 
            return;
        }

        if (!response.ok) {
            resultDiv.innerHTML = "❌ Error occurred while retrieving data.";
            resultDiv.className = "status-box expired";
            return;
        }

        const product = await response.json();

        // 🟢 🟡 🔴 கலர் லாஜிக் அவுட்புட்:
        if (product.isExpired) {
            resultDiv.innerHTML = `🔴 <b>EXPIRED PRODUCT</b><br><br>
            <b>Product:</b> ${product.product_name}<br>
            <b>Expiry Date:</b> ${product.expiry_date_formatted}<br>
            <small style="color: #ffcccc;">(This item is already expired!)</small>`;
            resultDiv.className = "status-box expired"; 
        } 
        else if (product.isNearExpiry) { 
            resultDiv.innerHTML = `⚠️ <b>EXPIRING SOON (WARNING)</b><br><br>
            <b>Product:</b> ${product.product_name}<br>
            <b>Expiry Date:</b> ${product.expiry_date_formatted}<br>
            <small style="color: #444;">(Only ${product.daysLeft} days remaining!)</small>`;
            resultDiv.className = "status-box warning"; 
        } 
        else {
            resultDiv.innerHTML = `🟢 <b>VALID PRODUCT (SAFE)</b><br><br>
            <b>Product:</b> ${product.product_name}<br>
            <b>Expiry Date:</b> ${product.expiry_date_formatted}<br>
            <small style="color: #e6ffe6;">(Safe to use. ${product.daysLeft} days left.)</small>`;
            resultDiv.className = "status-box valid"; 
        }

    } catch (err) {
        console.error(err);
        alert("❌ System Error verifying product expiry");
    }
}

// விண்டோ லோடானதும் இன்லைன் onclick தேவையில்லாமல் நாமே பட்டன்களை இணைக்கிறோம்
window.onload = function() {
    const buttons = document.querySelectorAll('button');
    if (buttons.length >= 2) {
        buttons[0].addEventListener('click', generateQR);      // முதலாவது பட்டன் -> Generate
        buttons[1].addEventListener('click', verifyProduct);  // இரண்டாவது பட்டன் -> Check Expiry
    }
};
