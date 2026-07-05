// 1. QR Code மற்றும் பொருளின் விபரங்களை டேட்டாபேஸில் சேமித்து QR உருவாக்குதல்
async function generateQR() {
    // HTML-ல் இருக்கும் இன்புட் பாக்ஸ்களை வரிசையாக எடுக்கிறோம்
    const inputs = document.querySelectorAll('input');
    const productNameInput = inputs[0];
    const qrIdInput = inputs[1];
    const expiryDateInput = inputs[2];

    if (!productNameInput || !qrIdInput || !expiryDateInput) {
        alert("HTML Elements not found! Please refresh the page.");
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
        // ஸ்டெப் A: ஆன்லைன் PostgreSQL டேட்டாபேஸில் சேமிக்கிறோம்
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
            // ஸ்டெப் B: QR Code இமேஜை உருவாக்குகிறோம்
            const qrResponse = await fetch(`/api/generate-qr?text=${encodeURIComponent(qrId)}`);
            const qrData = await qrResponse.json();
            
            // HTML-ல் இருக்கும் க்யூஆர் இமேஜ் டேக்
            let qrImgTag = document.getElementById('qrCodeImage') || document.querySelector('.form-group img') || document.querySelector('img');
            if (qrImgTag) {
                qrImgTag.src = qrData.qrImage;
                qrImgTag.id = 'qrCodeImage';
            }
            
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
    // பொதுவாக வெரிஃபை பாக்ஸ் 4-வது (கடைசி) இன்புட்டாக இருக்கும்
    const qrIdInput = verifyInputs[verifyInputs.length - 1]; 
    
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
        // HTML-ல் இருக்கும் ரிசல்ட் பாக்ஸை எடுக்கிறோம்
        let resultDiv = document.getElementById('statusResult') || document.querySelector('.status-box'); 
        
        // ஒருவேளை HTML-ல் இல்லை என்றால் புதிய DIV ஒன்றை உருவாக்குகிறது
        if (!resultDiv) {
            resultDiv = document.createElement('div');
            resultDiv.id = 'statusResult';
            qrIdInput.parentElement.appendChild(resultDiv);
        }

        // பொதுவான பாக்ஸ் சிஎஸ்எஸ் ஸ்டைல் செட்டப்
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
            <span style="font-size: 13px; font-weight: normal; color: #721c24;">(This item is already expired!)</span>`;
            
            resultDiv.style.backgroundColor = "#f8d7da";
            resultDiv.style.color = "#721c24";
            resultDiv.style.borderColor = "#f5c6cb";
        } 
        // 🟡 WARNING: மஞ்சள் நிற ஸ்டைல் 
        else if (product.isNearExpiry) { 
            resultDiv.innerHTML = `⚠️ EXPIRING SOON (WARNING)<br><br>
            Product: ${product.product_name}<br>
            Expiry Date: ${product.expiry_date_formatted}<br>
            <span style="font-size: 13px; font-weight: normal; color: #856404;">(Only ${product.daysLeft} days remaining!)</span>`;
            
            resultDiv.style.backgroundColor = "#fff3cd"; 
            resultDiv.style.color = "#856404";           
            resultDiv.style.borderColor = "#ffeeba";     
        } 
        // 🟢 VALID: பச்சை நிற ஸ்டைல்
        else {
            resultDiv.innerHTML = `🟢 VALID PRODUCT (SAFE)<br><br>
            Product: ${product.product_name}<br>
            Expiry Date: ${product.expiry_date_formatted}<br>
            <span style="font-size: 13px; font-weight: normal; color: #155724;">(Safe to use. ${product.daysLeft} days left.)</span>`;
            
            resultDiv.style.backgroundColor = "#d4edda";
            resultDiv.style.color = "#155724";
            resultDiv.style.borderColor = "#c3e6cb";
        }

    } catch (err) {
        console.error(err);
        alert("❌ System Error verifying product expiry");
    }
}

// விண்டோவிற்கான குளோபல் பங்க்ஷன்களாக மாற்றுகிறோம் (HTML inline onclick வேலை செய்ய இது அவசியம்)
window.generateQR = generateQR;
window.verifyProduct = verifyProduct;