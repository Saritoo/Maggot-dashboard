// src/mqtt/broker.js
const aedes = require('aedes')();
const net = require('net');

const MQTT_PORT = process.env.MQTT_PORT || 1883;

// Membuat server TCP untuk broker Aedes
const server = net.createServer(aedes.handle);

server.listen(MQTT_PORT, () => {
  console.log(`Aedes MQTT broker is running on port ${MQTT_PORT}`);
});

// Opsional: Menangani event client connect/disconnect
aedes.on('client', (client) => {
  console.log(`Client Connected: ${client.id}`);
});

aedes.on('clientDisconnect', (client) => {
  console.log(`Client Disconnected: ${client.id}`);
});

module.exports = aedes;
