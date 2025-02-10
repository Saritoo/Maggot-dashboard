const { Sequelize } = require('sequelize');
require('dotenv').config();
const path = require('path');
const pidJsonPath = path.join(__dirname, '../data/pidSettings.json');
const feedJsonPath = path.join(__dirname, '../data/feedSettings.json');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false
  }
);

// Test koneksi
sequelize.authenticate()
  .then(() => console.log('MySQL connected successfully'))
  .catch(err => console.error('MySQL connection error:', err));

// Ekspor dalam bentuk objek agar bisa diekstrak (destructure) di file lain
module.exports = { 
  sequelize, 
  pidJsonPath, 
  feedJsonPath 
};
