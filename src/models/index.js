'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.js')[env];
const db = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, {
    ...config,
    logging: false, // Disable logging query SQL ke console
  });
}

// Membaca dan mengimpor semua model di folder ini
fs.readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

// Jika ada relasi antar model, panggil fungsi associate
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// Sinkronisasi database (membuat/memperbarui tabel)
(async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log("✅ Database telah disinkronkan. Semua tabel siap digunakan.");
  } catch (error) {
    console.error("❌ Gagal sinkronisasi database:", error);
  }
})();

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
