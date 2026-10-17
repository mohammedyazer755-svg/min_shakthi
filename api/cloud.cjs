// The root function shares one HTTP server for the API and WebSocket upgrades.
module.exports = require('../apps/server/dist/cloud-api.cjs');
