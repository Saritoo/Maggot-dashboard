const mongoose = require('mongoose');

const pakanSchema = new mongoose.Schema({
    jadwal: {
        type: String,
        required: true,
        // Format waktu dalam "HH:mm" (contoh: "08:30")
    },
    jumlahPakan: {
        type: Number,
        required: true,
        min: 0,
        // Jumlah pakan dalam gram
    },
    status: {
        type: String,
        enum: ['terjadwal', 'selesai', 'gagal'],
        default: 'terjadwal'
    },
    tanggalDibuat: {
        type: Date,
        default: Date.now
    },
    tanggalPemberian: {
        type: Date
    },
    keterangan: {
        type: String,
        default: ''
    },
    aktif: {
        type: Boolean,
        default: true
    }
});

// Index untuk optimasi query berdasarkan jadwal
pakanSchema.index({ jadwal: 1 });

// Method untuk memformat data sebelum dikirim ke client
pakanSchema.methods.toJSON = function() {
    const pakan = this.toObject();
    pakan.id = pakan._id;
    delete pakan._id;
    delete pakan.__v;
    return pakan;
};

const Pakan = mongoose.model('Pakan', pakanSchema);

module.exports = Pakan;