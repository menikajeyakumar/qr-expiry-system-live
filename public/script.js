// 1. QR Code மற்றும் பொருளின் விபரங்களை டேட்டாபேஸில் சேமித்து QR உருவாக்குதல்
async function generateQR() {
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
            const qrResponse = await fetch(`/api/generate-qr?text=${encodeURIComponent(qrId)}`);
            const qrData = await qrResponse.json();
            
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

// 2. க்யூஆர் ஐடியை டைப் செய்து எக்ஸ்பைரி சரிபார்த்தல் (🟢/🟡/🔴 இன்லைன் ஸ்டைலிங்குடன்)
async function verifyProduct() {
    const verifyInputs = document.querySelectorAll('input');
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
        let resultDiv = statusResult;
        if (!resultDiv) {
            resultDiv = document.createElement('div');
            resultDiv.id = 'statusResult';
            qrIdInput.parentElement.appendChild(resultDiv);
        }

        // பொதுவான பாக்ஸ் ஸ்டைல் செட்டப்
        resultDiv.style.padding = "15px";
        resultDiv.style.marginTop = "15px";
        resultDiv.style.borderRadius = "8px";
        resultDiv.style.fontWeight = "bold";
        resultDiv.style.textAlign = "center";
        resultDiv.style.border = "1px solid";
        resultDiv.innerHTML = "🔄 Checking status from database...";
        
        const response = await fetch(`/api/verify-expiry/${qrId}`);
        
        if (response.status === 404) {
            resultDiv.innerHTML = "⚠️ Product Not Found in Database!";
            resultDiv.style.backgroundColor = "#fff3cd";
            resultDiv.style.color = "#856404";
            resultDiv.style.borderColor = "#ffeeba";
            return;
        }

        if (!response.ok) {
            resultDiv.innerHTML = "❌ Error occurred while retrieving data.";
            resultDiv.style.backgroundColor = "#f8d7da";
            resultDiv.style.color = "#721c24";
            return;
        }

        const product = await response.json();

        // 🔴 EXPIRED: சிவப்பு நிற ஸ்டைல்
        if (product.isExpired) {
            resultDiv.innerHTML = `🔴 EXPIRED PRODUCT<br><br>
            Product: ${product.product_name}<br>
            Expiry Date: ${product.expiry_date_formatted}<br>
            <span style="font-size: 12px; font-weight: normal; color: #721c24;">(This item is already expired!)</span>`;
            
            resultDiv.style.backgroundColor = "#f8d7da";
            resultDiv.style.color = "#721c24";
            resultDiv.style.borderColor = "#f5c6cb";
        } 
        // 🟡 WARNING: மஞ்சள் நிற ஸ்டைல் (உங்க லேட்டஸ்ட் டெஸ்ட்)
        else if (product.isNearExpiry) { 
            resultDiv.innerHTML = `⚠️ EXPIRING SOON (WARNING)<br><br>
            Product: ${product.product_name}<br>
            Expiry Date: ${product.expiry_date_formatted}<br>
            <span style="font-size: 12px; font-weight: normal; color: #856404;">(Only ${product.daysLeft} days remaining!)</span>`;
            
            resultDiv.style.backgroundColor = "#fff3cd"; // லைட் மஞ்சள் பேக்ரவுண்ட்
            resultDiv.style.color = "#856404";           // டார்க் பிரவுன்/மஞ்சள் டெக்ஸ்ட்
            resultDiv.style.borderColor = "#ffeeba";     // பார்டர்
        } 
        // 🟢 VALID: பச்சை நிற ஸ்டைல்
        else {
            resultDiv.innerHTML = `🟢 VALID PRODUCT (SAFE)<br><br>
            Product: ${product.product_name}<br>
            Expiry Date: ${product.expiry_date_formatted}<br>
            <span style="font-size: 12px; font-weight: normal; color: #155724;">(Safe to use. ${product.daysLeft} days left.)</span>`;
            
            resultDiv.style.backgroundColor = "#d4edda";
            resultDiv.style.color = "#155724";
            resultDiv.style.borderColor = "#c3e6cb";
        }

    } catch (err) {
        console.error(err);
        alert("❌ System Error verifying product expiry");
    }
}

// பட்டன்களை இணைத்தல்
window.onload = function() {
    const buttons = document.querySelectorAll('button');
    if (buttons.length >= 2) {
        buttons[0].addEventListener('click', generateQR);
        buttons[1].addEventListener('click', verifyProduct);
    }
};