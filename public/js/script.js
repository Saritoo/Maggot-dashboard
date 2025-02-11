
// Konfigurasi URL Backend
const BASE_URL = "http://holiday-myers.gl.at.ply.gg:61089/api"; // Ganti sesuai dengan URL backend Anda
const SENSOR_LATEST_URL = `${BASE_URL}/sensor/latest`;
const SENSOR_HISTORY_URL = `${BASE_URL}/sensor/history`;
const FEED_SETTINGS_URL = `${BASE_URL}/feed/settings`;
const PID_SETTINGS_URL = `${BASE_URL}/pid/settings`;
const ATS_LATEST_URL = `${BASE_URL}/ats/latest`;
const PAKAN_REALTIME_URL = `${BASE_URL}/pakan/realtime`;
// Inisialisasi Chart
const envCanvas = document.getElementById('environmentChart');
let envChart;
if (envCanvas) {
  const envCtx = envCanvas.getContext('2d');
  envChart = new Chart(envCtx, {
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
}

// Fungsi untuk menambahkan data baru ke chart
function updateChart(temperature, humidity, timestamp) {
    if (!envChart) return;
    // Tambahkan data baru ke chart
    envChart.data.labels.push(timestamp);
    envChart.data.datasets[0].data.push(temperature);
    envChart.data.datasets[1].data.push(humidity);
    
    // Batasi chart hanya menampilkan 15 data terakhir
    if (envChart.data.labels.length > 15) {
      envChart.data.labels.shift();
      envChart.data.datasets[0].data.shift();
      envChart.data.datasets[1].data.shift();
    }
    envChart.update();
  }

  async function updateData() {
    try {
      const response = await fetch(SENSOR_LATEST_URL);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      console.log("📡 Data API:", data);
      
      // Ambil nilai suhu dan kelembaban dari data
      const temperature = data?.temperature;
      const humidity = data?.humidity;
      
      // Update tampilan nilai realtime
      document.getElementById('temperatureRealtimeValue').textContent =
        (temperature != null) ? temperature.toFixed(1) : '--';
      document.getElementById('humidityRealtimeValue').textContent =
        (humidity != null) ? humidity.toFixed(1) : '--';
      
      // Jika data valid, tambahkan ke chart
      if (temperature != null && humidity != null) {
        const now = new Date().toLocaleTimeString();
        updateChart(temperature, humidity, now);
      }
      
    } catch (error) {
      console.error('❌ Error updateData:', error);
      document.getElementById('temperatureRealtimeValue').textContent = '--';
      document.getElementById('humidityRealtimeValue').textContent = '--';
    }
  }

// Fungsi Ambil Data Historis
async function fetchHistoricalData() {
    try {
      const response = await fetch(SENSOR_HISTORY_URL);
      if (!response.ok) throw new Error('Gagal mengambil histori sensor');
      const historyData = await response.json();
      
      // Ambil 15 data terakhir dan balik urutannya sehingga data terbaru berada di akhir
      const latest15 = historyData.slice(0, 15).reverse();
      
      const labels = latest15.map(entry => new Date(entry.createdAt).toLocaleTimeString());
      const temps = latest15.map(entry => entry.temperature);
      const humids = latest15.map(entry => entry.humidity);
      
      // Perbarui chart dengan data historis
      if (envChart) {
        envChart.data.labels = labels;
        envChart.data.datasets[0].data = temps;
        envChart.data.datasets[1].data = humids;
        envChart.update();
      }
      
    } catch (error) {
      console.error('❌ Error fetching historical data:', error);
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
// Fungsi untuk mengambil dan memperbarui data ATS di tampilan
async function updateATSData() {
    try {
      // Tambahkan parameter query untuk mencegah cache
      const url = ATS_LATEST_URL + '?t=' + new Date().getTime();
      console.log("DEBUG: Fetching ATS data from URL:", url);
  
      const response = await fetch(url);
      if (!response.ok) {
        console.error("DEBUG: HTTP error! status:", response.status);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      // Baca respon sebagai text (untuk debug) kemudian parse JSON-nya
      const rawText = await response.text();
      console.log("DEBUG: Raw response text:", rawText);
      
      const data = JSON.parse(rawText);
      console.log("DEBUG: Parsed ATS Data:", data);
      
      const batteryVoltage = data?.batteryVoltage;
      console.log("DEBUG: batteryVoltage:", batteryVoltage);
      
      if (batteryVoltage != null) {
        const formattedVoltage = parseFloat(batteryVoltage).toFixed(2);
        document.getElementById('voltage').textContent = formattedVoltage;
        console.log("DEBUG: Updated voltage element to:", formattedVoltage);
        
        // Contoh perhitungan: 10V = 0%, 15V = 100%
        const percent = Math.min(100, Math.max(0, ((batteryVoltage - 10) / 5) * 100));
        document.getElementById('batteryLevel').style.width = percent + '%';
        console.log("DEBUG: Updated batteryLevel element to width:", percent + '%');
      } else {
        document.getElementById('voltage').textContent = '--';
        document.getElementById('batteryLevel').style.width = '0%';
        console.log("DEBUG: batteryVoltage is null, updated UI to default");
      }
    } catch (error) {
      console.error("DEBUG: Error updating ATS data:", error);
      document.getElementById('voltage').textContent = '--';
      document.getElementById('batteryLevel').style.width = '0%';
    }
  }
  
  

  async function updateRealtimePakanData() {
    try {
      const response = await fetch(PAKAN_REALTIME_URL);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      console.log("📡 Realtime Pakan Data:", data);
      
      // Misalnya, gunakan nilai beforeFeedStock dan beforeMaggotWeight untuk tampilan realtime
      const feedWeight = data.beforeFeedStock != null ? data.beforeFeedStock : '--';
      const maggotWeight = data.beforeMaggotWeight != null ? data.beforeMaggotWeight : '--';
      
      document.getElementById('feedWeight').textContent = feedWeight + " gr";
      document.getElementById('maggotWeight').textContent = maggotWeight + " gr";
    } catch (error) {
      console.error("❌ Error updating realtime pakan data:", error);
      document.getElementById('feedWeight').textContent = '--';
      document.getElementById('maggotWeight').textContent = '--';
    }
  }  
// Event Listeners dan Inisialisasi
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Script berjalan...");

    // Ambil data historis untuk inisialisasi chart
    await fetchHistoricalData();

    // Mulai update data realtime (misalnya setiap 2000 milidetik)
    updateData(); // Panggil pertama kali
    setInterval(updateData, 2000);

    updateATSData(); // Panggil pertama kali
    setInterval(updateATSData, 2000);

    updateRealtimePakanData();
    setInterval(updateRealtimePakanData, 2000);

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
    } else if (cardId === 'cardATS') {
        document.getElementById('btnATS').classList.add('active');
    } else if (cardId === 'cardPID') {
        document.getElementById('btnPID').classList.add('active');
    }
}