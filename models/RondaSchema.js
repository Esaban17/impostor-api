const mongoose = require('mongoose');
const Futbolista = require('./Futbolista');

const ComentarioSchema = new mongoose.Schema({
  jugadorId: mongoose.Types.ObjectId,
  texto: String
}, { _id: false });

const VotoSchema = new mongoose.Schema({
  votanteId: mongoose.Types.ObjectId,
  sospechosoId: mongoose.Types.ObjectId
}, { _id: false });

const RondaSchema = new mongoose.Schema({
  numero: Number,
  futbolista: Futbolista.schema,
  comentarios: [ComentarioSchema],
  votos: [VotoSchema],
  eliminadoId: mongoose.Types.ObjectId,
  finalizada: { type: Boolean, default: false },
  confirmacionesSiguienteRonda: [{ type: String }] // Array de jugadorIds que confirmaron
}, { _id: false });

module.exports = RondaSchema;