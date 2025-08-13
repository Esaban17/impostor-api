const mongoose = require('mongoose');

const JugadorSchema = new mongoose.Schema({
  nombre: String,
  socketId: String,
  esImpostor: { type: Boolean, default: false },
  eliminado: { type: Boolean, default: false },
  votosRecibidos: { type: Number, default: 0 },
  comentario: { type: String, default: "" },
});

module.exports = JugadorSchema;