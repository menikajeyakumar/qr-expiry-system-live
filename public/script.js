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

        if (saveResponse.ok && saveResult.success) {
            // க்யூஆர் கோடு இமேஜை சர்வரில் இருந்து பெறுகிறோம்
            const qrResponse = await fetch(`/api/generate-qr?text=${encodeURIComponent(qrId)}`);
            const qrData = await qrResponse.json();
            
            // க்யூஆர் இமேஜை ஸ்கிரீனில் காண்பிக்கிறோம்
            qrImgTag.src = qrData.qrImage;
            qrImgTag.style.display = 'block'; 
            alert("🎉 Product saved to Database & QR Code Generated!");
        } else {
            alert("❌ Error: " + saveResult.error);
        }
    } catch (err) {
        alert("❌ Something went wrong!");
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
        resultDiv.innerHTML = "🔄 Checking...";
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

        // 🔴 1. காலாவதியான பொருள் (Expired Product)
        if (product.isExpired) {
            resultDiv.innerHTML = `🔴 <b>EXPIRED PRODUCT</b><br><br>Product: ${product.product_name}<br>Expiry: ${product.expiry_date_formatted}<br><small>(This product cannot be used)</small>`;
            resultDiv.style.backgroundColor = "#f8d7da";
            resultDiv.style.color = "#721c24";
            resultDiv.style.borderColor = "#f5c6cb";
        } 
        // 🟢 2. நல்ல பொருள் (Valid Product) - மஞ்சள் நிறம் இல்லாமல் நேரடியாகப் பச்சை காட்டும்
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