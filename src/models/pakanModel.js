// pakanModel.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const pakan = sequelize.define('pakan', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  feedTime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  beforeMaggotWeight: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  beforeFeedStock: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  afterMaggotWeight: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  afterFeedStock: {
    type: DataTypes.FLOAT,
    allowNull: true
  }
}, {
  tableName: 'feed_logs',
  timestamps: false
});

module.exports = pakan;
