// வெப்சைட் திறந்தவுடன் தானாக லிஸ்டை லோடு செய்யும்
window.onload = function() {
    loadProductsList();
};

// 1. டேட்டாபேஸில் இருக்கும் எல்லாப் பொருட்களையும் எடுத்து டேபிளில் காட்டும் ஃபங்க்ஷன்
async function loadProductsList() {
    const tableBody = document.getElementById('productTableBody');
    tableBody.innerHTML = `<tr><td colspan="3" style="text-align:center;">🔄 Loading dashboard products...</td></tr>`;

    try {
        const response = await fetch('/api/get-products');
        const products = await response.json();

        if (products.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#999;">No products available. Admin please upload CSV.</td></tr>`;
            return;
        }

        tableBody.innerHTML = ''; // கிளியர் செய்கிறது
        products.forEach(product => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><b>${product.product_name}</b></td>
                <td><code>${product.qr_code_id}</code></td>
                <td id="status-${product.qr_code_id}">
                    <button class="btn-check" onclick="checkRowExpiry('${product.qr_code_id}')">Click to Check Status</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (err) {
        tableBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:red;">❌ Error loading dashboard.</td></tr>`;
    }
}

// 2. கிளிக் செய்த ப்ராடக்ட்டின் ஸ்டேட்டஸை மட்டும் மாற்றுவது
async function checkRowExpiry(qrId) {
    const statusTd = document.getElementById(`status-${qrId}`);
    statusTd.innerHTML = `<span style="color:#666;">🔄 Checking...</span>`;

    try {
        const response = await fetch(`/api/verify-expiry/${qrId}`);
        const product = await response.json();

        if (product.isExpired) {
            statusTd.innerHTML = `<span class="status-badge status-expired">🔴 EXPIRED (Do Not Use)</span>`;
        } else {
            statusTd.innerHTML = `<span class="status-badge status-valid">🟢 VALID (${product.daysLeft} Days Left)</span>`;
        }
    } catch (err) {
        statusTd.innerHTML = `<span style="color:red;">❌ Error</span>`;
    }
}

// 3. அட்மின் CSV Bulk Upload
async function uploadCSV() {
    const fileInput = document.getElementById('csvFile');
    if (fileInput.files.length === 0) {
        alert("Please select a CSV file first!");
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async function(e) {
        const text = e.target.result;
        const lines = text.split('\n');
        const products = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const columns = line.split(',');
            if (columns.length >= 3) {
                products.push({
                    product_name: columns[0].trim(),
                    expiry_date: columns[1].trim(),
                    qr_code_id: columns[2].trim()
                });
            }
        }

        if (products.length === 0) {
            alert("No valid data found in CSV!");
            return;
        }

        try {
            const response = await fetch('/api/upload-csv', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ products })
            });
            const result = await response.json();

            if (response.ok && result.success) {
                alert(`🎉 Successfully uploaded ${result.count} products!`);
                fileInput.value = '';
                loadProductsList(); // அப்லோடு ஆனவுடன் லிஸ்டை புதுப்பிக்கிறது!
            } else {
                alert("❌ Upload Failed: " + result.error);
            }
        } catch (err) {
            alert("❌ Server connection error!");
        }
    };
    reader.readAsText(file);
}