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
  
const socket = io();
let suhuChart, pakanChart;

socket.on('connect', () => {
    console.log('Connected to server');
  });

function updateChart(chart, label, dataSets) {
    chart.data.labels.push(label);
    dataSets.forEach((data, index) => {
      chart.data.datasets[index].data.push(data);
    });
    chart.update();
  }

function setupCharts() {
    suhuChart = createLineChart(
      document.getElementById('suhuChart').getContext('2d'),
      [],
      [
        { label: 'Suhu (°C)', data: [], borderColor: 'rgba(255, 99, 132, 1)', fill: false },
        { label: 'Kelembaban (%)', data: [], borderColor: 'rgba(54, 162, 235, 1)', fill: false }
      ]
    );
  
    pakanChart = createLineChart(
      document.getElementById('pakanChart').getContext('2d'),
      [],
      [
        { label: 'Tekanan (Pa)', data: [], borderColor: 'rgba(75, 192, 192, 1)', fill: false },
        { label: 'Ketinggian (m)', data: [], borderColor: 'rgba(153, 102, 255, 1)', fill: false }
      ]
    );
}

socket.on('mqttData', (data) => {
    const timeLabel = new Date().toLocaleTimeString();
    if (data.humidity !== undefined) {
      updateChart(suhuChart, timeLabel, [data.temperature, data.humidity]);
    }
    if (data.pressure !== undefined) {
      updateChart(pakanChart, timeLabel, [data.pressure, data.altitude]);
    }
});

document.getElementById('intervalInput').addEventListener('change', (e) => {
    const interval = 1000//e.target.value;
    socket.emit('updateInterval', interval);
});
  
setupCharts();

  