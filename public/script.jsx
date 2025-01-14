// Fetch data dari server dan tampilkan di Chart.js
fetch('/api/data')
  .then(response => response.json())
  .then(data => {
    const labels = data.map(item => new Date(item.timestamp).toLocaleTimeString());
    const temperatures = data.map(item => item.temperature);
    const humidities = data.map(item => item.humidity);

    const ctx = document.getElementById('sensorChart').getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Suhu (°C)',
            data: temperatures,
            borderColor: 'rgba(75, 192, 192, 1)',
            fill: false
          },
          {
            label: 'Kelembaban (%)',
            data: humidities,
            borderColor: 'rgba(255, 99, 132, 1)',
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          x: {
            title: { display: true, text: 'Waktu' }
          },
          y: {
            title: { display: true, text: 'Nilai' }
          }
        }
      }
    });
  })
  .catch(error => console.error('Error:', error));
