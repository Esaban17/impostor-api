const mongoose = require('mongoose');
const JugadorSchema = require('./JugadorSchema');
const RondaSchema = require('./RondaSchema');
const Futbolista = require('./Futbolista');

const SalaSchema = new mongoose.Schema({
  codigo: { type: String, unique: true },
  jugadores: [JugadorSchema],
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  estado: { type: String, enum: ['esperando', 'jugando', 'finalizado', 'esperando_decision'], default: 'esperando' },
  impostorId: mongoose.Types.ObjectId,
  rondaActual: { type: Number, default: 0 },
  historialRondas: [RondaSchema],
  futbolistaPrincipal: Futbolista.schema, // Usar el esquema del modelo Futbolista existente
  votosTerminarJuego: [{ type: String }], // Array de jugadorIds que votaron terminar
  votosSeguirJugando: [{ type: String }], // Array de jugadorIds que votaron seguir
  creadoEn: { type: Date, default: Date.now },
  finalizadoEn: Date
});

module.exports = mongoose.model('Sala', SalaSchema);
