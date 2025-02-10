const { DataTypes } = require('sequelize');
// Lakukan destructuring untuk mendapatkan instance sequelize yang benar
const { sequelize } = require('../config/database');

const Sensor = sequelize.define('Sensor', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  temperature: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  humidity: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('normal', 'warning', 'error'),
    defaultValue: 'normal'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'sensors',
  timestamps: false
});

module.exports = Sensor;
