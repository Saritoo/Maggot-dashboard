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
        maintainAspectRatio: false
    }
});

// Simulasi Data Real-time (Ganti dengan WebSocket/MQTT)
function updateData() {
    // Contoh data acak
    const newTemp = Math.random() * 10 + 25;
    const newHumid = Math.random() * 20 + 60;
    const newVoltage = Math.random() * 2 + 12;
    
    // Update tampilan
    document.getElementById('temperature').textContent = newTemp.toFixed(1);
    document.getElementById('humidity').textContent = newHumid.toFixed(1);
    document.getElementById('voltage').textContent = newVoltage.toFixed(2);
    
    // Update chart
    const labels = envChart.data.labels;
    labels.push(new Date().toLocaleTimeString());
    if(labels.length > 15) labels.shift();
    
    envChart.data.datasets[0].data.push(newTemp);
    envChart.data.datasets[1].data.push(newHumid);
    envChart.update();
    
    // Update battery
    const batteryLevel = (newVoltage - 11) / (14 - 11) * 100;
    document.getElementById('batteryLevel').style.width = `${Math.min(Math.max(batteryLevel, 0), 100)}%`;
    
    // Cek alert pakan
    if(Math.random() > 0.8) {
        document.getElementById('feedAlert').style.display = 'block';
    }
}

// Update data setiap 2 detik
setInterval(updateData, 2000);

// Fungsi Kontrol
function setFeeding() {
    const target = document.getElementById('targetFeed').value;
    // Kirim ke backend
    console.log('Set target feeding:', target);
}

function updatePID() {
    const pidParams = {
        setpoint: document.getElementById('tempSetpoint').value,
        kp: document.getElementById('kpValue').value,
        ki: document.getElementById('kiValue').value,
        kd: document.getElementById('kdValue').value
    };
    // Kirim ke backend
    console.log('Update PID:', pidParams);
}
function openFeedSettings() {
    document.getElementById("feedSettingsModal").style.display = "flex";
}
function closeFeedSettings() {
    document.getElementById("feedSettingsModal").style.display = "none";
}
function saveFeedSettings() {
    document.getElementById("feedTime1").textContent = document.getElementById("feedTime1Input").value;
    document.getElementById("feedTime2").textContent = document.getElementById("feedTime2Input").value;
    document.getElementById("feedTime3").textContent = document.getElementById("feedTime3Input").value;
    closeFeedSettings();
}

function openPIDSettings() {
    document.getElementById("pidSettingsModal").style.display = "flex";
}
function closePIDSettings() {
    document.getElementById("pidSettingsModal").style.display = "none";
}
function savePIDSettings() {
    alert("Setpoint suhu dan kelembaban telah diperbarui!");
    closePIDSettings();
}
