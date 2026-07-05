async function generateQR() {
    const productName = document.getElementById('pName').value.trim();
    const qrId = document.getElementById('pId').value.trim();
    const expiryDate = document.getElementById('pExpiry').value;
    const qrImgTag = document.getElementById('qrCodeImage');

    if (!productName || !qrId || !expiryDate) {
        alert("Please fill all fields!");
        return;
    }

    try {
        const saveResponse = await fetch('/api/add-product', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_name: productName, expiry_date: expiryDate, qr_code_id: qrId })
        });
        const saveResult = await saveResponse.json();

        // இங்க saveResult.success செக் செய்யப்படுகிறது
        if (saveResponse.ok && saveResult.success) {
            const qrResponse = await fetch(`/api/generate-qr?text=${encodeURIComponent(qrId)}`);
            const qrData = await qrResponse.json();
            
            qrImgTag.src = qrData.qrImage;
            qrImgTag.style.display = 'block'; // கியூஆர் ஸ்கேனர் பெருசா டிஸ்ப்ளே ஆகும்
            alert("🎉 Product saved to Database & QR Code Generated!");
        } else {
            alert("❌ Database Save Error: " + saveResult.error);
        }
    } catch (err) {
        alert("❌ Something went wrong while saving!");
    }
}

async function verifyProduct() {
    const qrId = document.getElementById('vId').value.trim();
    const resultDiv = document.getElementById('statusResult');

    if (!qrId) {
        alert("Please enter a QR ID!");
        return;
    }

    try {
        resultDiv.style.display = "block";
        resultDiv.innerHTML = "🔄 Checking status from Database...";
        resultDiv.style.backgroundColor = "#eee";
        resultDiv.style.color = "#333";
        resultDiv.style.borderColor = "#ccc";

        const response = await fetch(`/api/verify-expiry/${qrId}`);
        
        if (response.status === 404) {
            resultDiv.innerHTML = "⚠️ Product Not Found in Database!";
            resultDiv.style.backgroundColor = "#fff3cd";
            resultDiv.style.color = "#856404";
            resultDiv.style.borderColor = "#ffeeba";
            return;
        }

        const product = await response.json();

        // 🔴 1. Expired நிலவரம்
        if (product.isExpired) {
            resultDiv.innerHTML = `🔴 <b>EXPIRED PRODUCT</b><br><br>Product: ${product.product_name}<br>Expiry: ${product.expiry_date_formatted}<br><small>(Do Not Use!)</small>`;
            resultDiv.style.backgroundColor = "#f8d7da";
            resultDiv.style.color = "#721c24";
            resultDiv.style.borderColor = "#f5c6cb";
        } 
        // 🟢 2. Valid நிலவரம் (மஞ்சள் இல்லாமல் நேரடியாக பச்சை காட்டும்)
        else {
            resultDiv.innerHTML = `🟢 <b>VALID PRODUCT (SAFE)</b><br><br>Product: ${product.product_name}<br>Expiry: ${product.expiry_date_formatted}<br><small>(${product.daysLeft} days remaining)</small>`;
            resultDiv.style.backgroundColor = "#d4edda";
            resultDiv.style.color = "#155724";
            resultDiv.style.borderColor = "#c3e6cb";
        }
    } catch (err) {
        alert("❌ Error verifying product");
    }
}