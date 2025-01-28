// Socket.IO Connection
const socket = io();
let environmentChart, weightChart;

// Helper functions
async function fetchData(endpoint) {
    const response = await fetch(endpoint);
    return await response.json();
}

function createLineChart(ctx, labels, datasets) {
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            scales: {
                x: { title: { display: true, text: 'Waktu' } },
                y: { title: { display: true, text: 'Nilai' } }
            }
        }
    });
}

function updateChart(chart, label, dataSets) {
    chart.data.labels.push(label);
    dataSets.forEach((data, index) => {
        chart.data.datasets[index].data.push(data);
    });
    chart.update();
}

// Setup Charts
function setupCharts() {
    environmentChart = createLineChart(
        document.getElementById('environmentChart').getContext('2d'),
        [],
        [
            { label: 'Suhu (°C)', data: [], borderColor: 'rgba(255, 99, 132, 1)', fill: false },
            { label: 'Kelembaban (%)', data: [], borderColor: 'rgba(54, 162, 235, 1)', fill: false }
        ]
    );

    weightChart = createLineChart(
        document.getElementById('weightChart').getContext('2d'),
        [],
        [
            { label: 'Berat Maggot (g)', data: [], borderColor: 'rgba(255, 206, 86, 1)', fill: false }
        ]
    );
}

// Socket event handlers
socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('mqttData', (data) => {
    // Update display values
    document.getElementById('temperature').innerText = data.temperature;
    document.getElementById('humidity').innerText = data.humidity;
    document.getElementById('pressure').innerText = data.pressure;
    document.getElementById('altitude').innerText = data.altitude;
    document.getElementById('heatIndex').innerText = data.heatIndex;
    document.getElementById('dewPoint').innerText = data.dewPoint;

    // Update charts
    const timeLabel = new Date().toLocaleTimeString();
    if (data.humidity !== undefined) {
        updateChart(environmentChart, timeLabel, [data.temperature, data.humidity]);
    }
    // Add weight update if available in data
    if (data.weight !== undefined) {
        updateChart(weightChart, timeLabel, [data.weight]);
    }
});

// Event listeners
document.getElementById('intervalInput').addEventListener('change', (e) => {
    const interval = 1000; //e.target.value;
    socket.emit('updateInterval', interval);
});

// Initialize charts
setupCharts(); 