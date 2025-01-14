const express = require('express');
const app = express();
const port = 61089;

// Middleware untuk melayani file statis
app.use(express.static('public'));

// Rute utama
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Jalankan server
app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});
