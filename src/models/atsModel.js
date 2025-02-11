// src/models/atsModel.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database'); // Pastikan path relatif benar

const Ats = sequelize.define('Ats', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  solarVoltage: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0
  },
  batteryVoltage: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0
  },
  psuVoltage: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'ats_data',
  timestamps: false
});

module.exports = Ats;
