
// Konfigurasi URL Backend
const BASE_URL = "http://holiday-myers.gl.at.ply.gg:61089/api"; // Ganti sesuai dengan URL backend Anda
const SENSOR_LATEST_URL = `${BASE_URL}/sensor/latest`;
const SENSOR_HISTORY_URL = `${BASE_URL}/sensor/history`;
const FEED_SETTINGS_URL = `${BASE_URL}/feed/settings`;
const PID_SETTINGS_URL = `${BASE_URL}/pid/settings`;

// Inisialisasi Chart
const envCtx = document.getElementById('environmentChart').getContext('2d');
const envChart = new Chart(envCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Suhu (°C)',
            data: [],
            borderColor: '#ef5350',
            tension: 0.4
        }, {
            label: 'Kelembaban (%)',
            data: [],
            borderColor: '#42a5f5',
            tension: 0.4
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: false
            }
        }
    }
});

// // Fungsi Update Data Real-time
// async function updateData() {
//     try {
//         const response = await fetch(SENSOR_LATEST_URL);
//         if (!response.ok) throw new Error('Gagal mengambil data');
//         const data = await response.json();
        
//         // Update nilai utama
//         document.getElementById('temperature').textContent = data.temperature.toFixed(1);
//         document.getElementById('humidity').textContent = data.humidity.toFixed(1);
//         document.getElementById('voltage').textContent = data.voltage.toFixed(2);
        
//         // Update nilai real-time
//         document.getElementById('temperatureRealtimeValue').textContent = 
//             (typeof data.temperaturereal === "number") ? data.temperaturereal.toFixed(1) : '--';

//         document.getElementById('humidityRealtimeValue').textContent = 
//             (typeof data.humidityreal === "number") ? data.humidityreal.toFixed(1) : '--';

//         // Update chart
//         const labels = envChart.data.labels;
//         const newLabel = new Date(data.createdAt).toLocaleTimeString();
//         labels.push(newLabel);
//         if(labels.length > 15) labels.shift();
        
//         envChart.data.datasets[0].data.push(data.temperature);
//         envChart.data.datasets[1].data.push(data.humidity);
        
//         if(envChart.data.datasets[0].data.length > 15) {
//             envChart.data.datasets[0].data.shift();
//             envChart.data.datasets[1].data.shift();
//         }
        
//         envChart.update();
        
//         // Update level baterai
//         const batteryLevel = ((data.voltage - 11) / (14 - 11) * 100).toFixed(1);
//         document.getElementById('batteryLevel').style.width = `${Math.min(Math.max(batteryLevel, 0), 100)}%`;
        
//     } catch (error) {
//         console.error('Error:', error);
//         // Tampilkan nilai default jika error
//         document.getElementById('temperature').textContent = '--';
//         document.getElementById('humidity').textContent = '--';
//         document.getElementById('voltage').textContent = '--';
//     }
// }

async function updateData() {
    try {
        const response = await fetch(SENSOR_LATEST_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        console.log("📡 Data API:", data);

        // Update values dengan default value jika data tidak ada
        document.getElementById('temperatureRealtimeValue').textContent = 
            data?.temperature?.toFixed(1) ?? '--';
        document.getElementById('humidityRealtimeValue').textContent = 
            data?.humidity?.toFixed(1) ?? '--';

    } catch (error) {
        console.error('❌ Error:', error);
        // Fallback ke nilai default
        document.getElementById('temperatureRealtimeValue').textContent = '--';
        document.getElementById('humidityRealtimeValue').textContent = '--';
    }
}

// Inisialisasi
document.addEventListener('DOMContentLoaded', () => {
    console.log("Script berjalan...");
    setInterval(updateData, 2000);
    updateData(); // Panggil pertama kali
});




// Fungsi Ambil Data Historis
async function fetchHistoricalData() {
    try {
        const response = await fetch(SENSOR_HISTORY_URL);
        if (!response.ok) throw new Error('Gagal mengambil histori');
        const historyData = await response.json();
        
        // Proses data untuk chart
        const latest15 = historyData.slice(0, 15).reverse();
        
        const labels = latest15.map(entry => 
            new Date(entry.createdAt).toLocaleTimeString()
        );
        const temps = latest15.map(entry => entry.temperature);
        const humids = latest15.map(entry => entry.humidity);
        
        // Update chart
        envChart.data.labels = labels;
        envChart.data.datasets[0].data = temps;
        envChart.data.datasets[1].data = humids;
        envChart.update();
        
    } catch (error) {
        console.error('Error:', error);
    }
}

// Fungsi Pengaturan Pakan
async function saveFeedSettings() {
    const feedSettings = {
        times: [
            document.getElementById('feedTime1Input').value,
            document.getElementById('feedTime2Input').value,
            document.getElementById('feedTime3Input').value
        ],
        amount: document.getElementById('targetFeed').value
    };

    try {
        const response = await fetch(FEED_SETTINGS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(feedSettings)
        });
        
        if (response.ok) {
            document.getElementById('feedTime1').textContent = feedSettings.times[0];
            document.getElementById('feedTime2').textContent = feedSettings.times[1];
            document.getElementById('feedTime3').textContent = feedSettings.times[2];
            document.getElementById('totalFeedPerTime').textContent = feedSettings.amount;
            closeFeedSettings();
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Gagal menyimpan pengaturan pakan');
    }
}

// Fungsi Pengaturan PID
async function savePIDSettings() {
    const pidSettings = {
        temperature: document.getElementById('tempSetpoint').value,
        humidity: document.getElementById('humiditySetpoint').value
    };

    try {
        const response = await fetch(PID_SETTINGS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(pidSettings)
        });
        
        if (response.ok) {
            alert("Setpoint suhu dan kelembaban telah diperbarui!");
            closePIDSettings();
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Gagal menyimpan pengaturan PID');
    }
}

// Event Listeners dan Inisialisasi
document.addEventListener('DOMContentLoaded', async () => {
    await fetchHistoricalData();
    setInterval(updateData, 2000); // Update data setiap 2 detik
});

// Modal Functions
function openFeedSettings() {
    document.getElementById("feedSettingsModal").style.display = "flex";
}

function closeFeedSettings() {
    document.getElementById("feedSettingsModal").style.display = "none";
}

function openPIDSettings() {
    document.getElementById("pidSettingsModal").style.display = "flex";
}

function closePIDSettings() {
    document.getElementById("pidSettingsModal").style.display = "none";
}

