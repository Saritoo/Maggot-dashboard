const mysql = require('mysql2');

// Konfigurasi database
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'TLWN722n',    // Ganti sesuai konfigurasi MySQL
  database: 'sensor_db'
});

// Koneksi ke database
db.connect(err => {
  if (err) throw err;
  console.log('Terhubung ke database MySQL!');
});

module.exports = db;
