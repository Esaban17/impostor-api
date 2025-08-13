const express = require('express');
const router = express.Router();
const { obtenerFutbolistas, obtenerFutbolistaById, obtenerFutbolistaAleatorio } = require('../services/FutbolistaService');
const Futbolista = require('../models/Futbolista');


// POST /api/futbolistas/cargar
router.post('/cargar', async (req, res) => {
  try {
    const futbolistas = req.body;

    let insertados = 0;
    for (const jugador of futbolistas) {
      const existe = await Futbolista.findOne({ nombre: jugador.nombre });
      if (!existe) {
        await Futbolista.create(jugador);
        insertados++;
      }
    }

    res.status(201).json({ mensaje: 'Carga completada', insertados });
  } catch (err) {
    console.error('Error al cargar futbolistas:', err);
    res.status(500).json({ error: 'Error al cargar futbolistas' });
  }
});

router.get('/', async (req, res) => {
  const data = await obtenerFutbolistas();
  res.json(data);
});

router.get('/random', async (req, res) => {
  const data = await obtenerFutbolistaAleatorio();
  res.json(data);
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const futbolista = await obtenerFutbolistaById(id);
  if (!futbolista) {
    return res.status(404).json({ error: 'Futbolista no encontrado' });
  }
    res.json(futbolista);

});

module.exports = router;