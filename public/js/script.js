
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
async function getFeedSettings() {
    try {
        const response = await fetch(FEED_SETTINGS_URL);
        if (!response.ok) throw new Error('Gagal mengambil data pengaturan pakan');
        const settings = await response.json();
        // Asumsikan response berbentuk { data: { times: [...], amount: ... } }
        if(settings && settings.data) {
            const { times, amount } = settings.data;
            // Perbarui tampilan pada dashboard
            document.getElementById('feedTime1').textContent = times[0];
            document.getElementById('feedTime2').textContent = times[1];
            document.getElementById('feedTime3').textContent = times[2];
            document.getElementById('totalFeedPerTime').textContent = amount;
            // Prefill nilai di modal (jika diperlukan)
            document.getElementById('feedTime1Input').value = times[0];
            document.getElementById('feedTime2Input').value = times[1];
            document.getElementById('feedTime3Input').value = times[2];
            document.getElementById('targetFeed').value = amount;
        }
    } catch (error) {
        console.error("❌ Error getFeedSettings:", error);
    }
}
// Fungsi Pengaturan Pakan
async function saveFeedSettings() {
    // Ambil nilai baru dari modal
    const time1 = document.getElementById('feedTime1Input').value;
    const time2 = document.getElementById('feedTime2Input').value;
    const time3 = document.getElementById('feedTime3Input').value;
    const targetFeedInput = document.getElementById('targetFeed').value;
    
    // Jika input kosong, kirim undefined (backend akan menggunakan data sebelumnya)
    const times = [time1 || undefined, time2 || undefined, time3 || undefined];
    // Jika targetFeed kosong, kirim undefined
    const amount = targetFeedInput !== "" ? parseFloat(targetFeedInput) : undefined;

    // Siapkan objek yang hanya berisi properti yang didefinisikan
    const feedSettings = {};
    if(times.some(val => val !== undefined)) feedSettings.times = times;
    if(amount !== undefined) feedSettings.amount = amount;

    try {
        const response = await fetch(FEED_SETTINGS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(feedSettings)
        });
        
        if (response.ok) {
            const result = await response.json();
            // Tampilkan notifikasi sukses dengan SweetAlert2
            Swal.fire({
                icon: 'success',
                title: 'Berhasil',
                text: result.message || 'Pengaturan pakan telah disimpan!'
            });
            // Tutup modal
            closeFeedSettings();
            // Perbarui tampilan dashboard dengan data terbaru
            getFeedSettings();
        } else {
            const errorData = await response.json();
            Swal.fire({
                icon: 'error',
                title: 'Gagal',
                text: errorData.error || 'Gagal menyimpan pengaturan pakan'
            });
        }
    } catch (error) {
        console.error('❌ Error saveFeedSettings:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Gagal menyimpan pengaturan pakan'
        });
    }
}

// Fungsi untuk mengambil pengaturan PID dari backend dan memperbarui tampilan UI
async function getPIDSettings() {
    try {
        const response = await fetch(PID_SETTINGS_URL);
        if (!response.ok) throw new Error('Gagal mengambil data pengaturan PID');
        const settings = await response.json();

        if (settings && settings.data) {
            const { targetTemp, targetHumidity } = settings.data;
            
            // Simpan ke localStorage
            localStorage.setItem('targetTemp', targetTemp);
            localStorage.setItem('targetHumidity', targetHumidity);
            
            // Perbarui tampilan pada dashboard
            document.getElementById('setpointTemperature').textContent = parseFloat(targetTemp).toFixed(1);
            document.getElementById('setpointHumidity').textContent = parseFloat(targetHumidity).toFixed(1);
            
            // Prefill nilai di modal
            document.getElementById('tempSetpoint').value = targetTemp;
            document.getElementById('humiditySetpoint').value = targetHumidity;
        }
    } catch (error) {
        console.error("❌ Error getPIDSettings:", error);
    }
}

// Fungsi Pengaturan PID dengan SweetAlert2 dan update parsial
async function savePIDSettings() {
    const tempVal = document.getElementById('tempSetpoint').value;
    const humidityVal = document.getElementById('humiditySetpoint').value;
    
    if(tempVal === "" || humidityVal === "") {
        Swal.fire({
            icon: 'error',
            title: 'Gagal',
            text: 'Data pengaturan PID tidak lengkap.'
        });
        return;
    }
    
    const pidSettings = {
        targetTemp: parseFloat(tempVal),
        targetHumidity: parseFloat(humidityVal)
    };

    try {
        const response = await fetch(PID_SETTINGS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pidSettings)
        });

        if (response.ok) {
            const result = await response.json();
            
            // Simpan ke localStorage
            localStorage.setItem('targetTemp', pidSettings.targetTemp);
            localStorage.setItem('targetHumidity', pidSettings.targetHumidity);

            // Perbarui tampilan dashboard untuk PID
            document.getElementById('setpointTemperature').textContent = pidSettings.targetTemp.toFixed(1);
            document.getElementById('setpointHumidity').textContent = pidSettings.targetHumidity.toFixed(1);

            Swal.fire({
                icon: 'success',
                title: 'Berhasil',
                text: 'Pengaturan PID berhasil disimpan.'
            });
        } else {
            throw new Error('Gagal menyimpan data ke server');
        }
    } catch (error) {
        console.error("❌ Error savePIDSettings:", error);
        Swal.fire({
            icon: 'error',
            title: 'Gagal',
            text: 'Terjadi kesalahan saat menyimpan pengaturan.'
        });
    }
}

// Event Listeners dan Inisialisasi
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Script berjalan...");
    await fetchHistoricalData();
    // Mulai update data sensor, chart, dsb. (kode updateData() dsb.)
    setInterval(updateData, 2000);
    updateData();
    // Dapatkan data pengaturan terbaru dari backend
    getFeedSettings();
    getPIDSettings();
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

function showCard(cardId) {
    // Hapus kelas active dari semua card
    var cards = document.querySelectorAll('.dashboard .card');
    cards.forEach(function(card) {
        card.classList.remove('active');
    });
    // Tambahkan kelas active ke card yang diinginkan
    document.getElementById(cardId).classList.add('active');
    
    // Perbarui status tombol pada mobile footer
    document.querySelectorAll('.mobile-footer button').forEach(function(btn) {
        btn.classList.remove('active');
    });
    if (cardId === 'cardLingkungan') {
        document.getElementById('btnLingkungan').classList.add('active');
    } else if (cardId === 'cardPLTS') {
        document.getElementById('btnPLTS').classList.add('active');
    } else if (cardId === 'cardPID') {
        document.getElementById('btnPID').classList.add('active');
    }
}