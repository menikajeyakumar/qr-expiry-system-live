// 1. QR Code Generate Panra Function (With Customer Mobile Link)
async function generateQR() {
    const productName = document.getElementById('prodName').value;
    const qrCodeId = document.getElementById('qrId').value;
    const expiryDate = document.getElementById('expiryDate').value;

    if (!productName || !qrCodeId || !expiryDate) {
        alert("Please fill all fields!");
        return;
    }

    try {
        const qrResultDiv = document.getElementById('qrResult');
        qrResultDiv.innerHTML = "<p>Generating QR Code...</p>";
        
        // QR-க்குள்ள வெறும் ID-க்கு பதிலா, ஸ்கேன் பண்ணா மொபைல்ல ஓபன் ஆக வேண்டிய வெப்சைட் லிங்க்கை வைக்கிறோம்
        const scanUrl = `${window.location.origin}/verify.html?id=${qrCodeId}`;
        
        const response = await fetch(`/api/generate-qr?text=${encodeURIComponent(scanUrl)}`);
        const data = await response.json();
        
        if(data.qrImage) {
            qrResultDiv.innerHTML = `
                <p style="color:green; font-weight:bold; margin-top:10px;">QR Code Created for Mobile Scanning!</p>
                <img src="${data.qrImage}" alt="QR Code" style="width:150px; margin:10px 0;"><br>
                <b>Link Inside QR:</b> <br>
                <span style="font-size:11px; color:#666; word-break: break-all;">${scanUrl}</span>
            `;
        } else {
            qrResultDiv.innerHTML = "<p style='color:red;'>Failed to generate QR</p>";
        }
    } catch (err) {
        console.error(err);
        alert("Error generating QR code");
    }
}

// 2. Admin Panel-ல எக்ஸ்பைரி செக் பண்ணி பாக்குற பழைய Function
async function verifyProduct() {
    const qrCodeId = document.getElementById('scanInput').value;
    const statusResult = document.getElementById('statusResult');

    if (!qrCodeId) {
        alert("Please enter a QR ID to check!");
        return;
    }

    try {
        const response = await fetch(`/api/verify-expiry/${qrCodeId}`);
        statusResult.className = "status-box"; 
        
        if (response.status === 404) {
            statusResult.innerHTML = "⚠️ Product Not Found in Database!";
            statusResult.classList.add('not-found');
            return;
        }

        const product = await response.json();
        
        if (product.isExpired) {
            statusResult.innerHTML = `🔴 EXPIRED PRODUCT!<br><br>
                                      <b>Product:</b> ${product.product_name}<br>
                                      <b>Expired On:</b> ${product.expiry_date_formatted}`;
            statusResult.classList.add('expired');
        } else {
            statusResult.innerHTML = `🟢 VALID PRODUCT (SAFE)<br><br>
                                      <b>Product:</b> ${product.product_name}<br>
                                      <b>Expiry Date:</b> ${product.expiry_date_formatted}`;
            statusResult.classList.add('valid');
        }

    } catch (err) {
        console.error(err);
        alert("Error verifying product expiry");
    }
}