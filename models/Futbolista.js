const mongoose = require('mongoose');

const FutbolistaSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  nombreCompleto: String,
  imageUrl: String,
  posicion: String,
  nacionalidad: String,
  fechaNacimiento: String
});

module.exports = mongoose.model('Futbolista', FutbolistaSchema);