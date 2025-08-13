const axios = require('axios');
require('dotenv').config();
const Futbolista = require('../models/Futbolista');

const obtenerFutbolistas = async () => {
  try {
    const futbolistas = await Futbolista.find(); // todos los jugadores
    return futbolistas;
  } catch (err) {
    console.error('Error al obtener futbolistas:', err);
    return [];
  }
};

const obtenerFutbolistaById = async (id) => {
  try {
    const jugador = await Futbolista.findById(id);
    if (!jugador) {
      throw new Error('Jugador no encontrado');
    }
    return jugador;
  } catch (err) {
    console.error(`Error al obtener jugador ID ${id}:`, err.message);
    throw new Error('No se pudo obtener el jugador');
  }
};

const obtenerFutbolistaAleatorio = async () => {
  try {
    const count = await Futbolista.countDocuments();
    const randomIndex = Math.floor(Math.random() * count);
    const futbolista = await Futbolista.findOne().skip(randomIndex);
    return futbolista;
  } catch (err) {
    console.error('Error al obtener futbolista aleatorio:', err.message);
    throw new Error('No se pudo obtener un futbolista aleatorio');
  }
};

module.exports = {
  obtenerFutbolistas,
  obtenerFutbolistaById,
  obtenerFutbolistaAleatorio
};