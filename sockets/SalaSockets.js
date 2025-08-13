const Sala = require('../models/Sala');
const { v4: uuidv4 } = require('uuid');
const { obtenerFutbolistaAleatorio } = require('../services/FutbolistaService');

function salaSockets(io) {
  io.on('connection', (socket) => {
    console.log('🟢 Usuario conectado:', socket.id);

    socket.on('crearSala', async ({ nombre }, callback) => {
      const codigo = uuidv4().slice(0, 6).toUpperCase();
      const nuevoJugador = { nombre, socketId: socket.id, esImpostor: false };
      const sala = await Sala.create({
        codigo,
        hostId: null, // temporal, lo actualizamos después con el jugador creado
        jugadores: [nuevoJugador]
      });
      // Asignar hostId al _id del primer jugador
      sala.hostId = sala.jugadores[0]._id;
      await sala.save();

      socket.join(codigo);
      callback(sala);
    });

    socket.on('unirseSala', async ({ codigo, nombre }, callback) => {
      const sala = await Sala.findOne({ codigo });
      if (!sala || sala.estado !== 'esperando') return callback(null);

      // ✅ Verificar límite de 6 jugadores
      if (sala.jugadores.length >= 6) {
        return callback({ error: 'La sala está llena (máximo 6 jugadores)' });
      }

      sala.jugadores.push({
        nombre,
        socketId: socket.id,
        esImpostor: false
      });

      await sala.save();
      socket.join(codigo);

      // Emitir sala completa actualizada para todos
      io.to(codigo).emit('salaActualizada', sala);
      callback(sala);
    });

    socket.on('iniciarJuego', async ({ codigo }, callback) => {
      const sala = await Sala.findOne({ codigo });

      // ✅ Cambiar mínimo a 3 jugadores
      if (!sala || sala.jugadores.length < 3) {
        return callback({ error: 'Se necesitan al menos 3 jugadores para iniciar' });
      }

      // ✅ Verificar máximo de 6 jugadores
      if (sala.jugadores.length > 6) {
        return callback({ error: 'Máximo 6 jugadores permitidos' });
      }

      // Elegir al impostor
      const indexImpostor = Math.floor(Math.random() * sala.jugadores.length);
      sala.jugadores[indexImpostor].esImpostor = true;
      sala.impostorId = sala.jugadores[indexImpostor]._id;
      sala.estado = 'jugando';
      sala.rondaActual = 1;

      // Crear la primera ronda - seleccionar EL futbolista que se usará durante todo el juego
      const futbolista = await obtenerFutbolistaAleatorio();
      console.log('🏈 Futbolista seleccionado para TODO el juego:', {
        id: futbolista?._id,
        nombre: futbolista?.nombre || futbolista?.name,
        imagen: futbolista?.imageUrl || futbolista?.image || futbolista?.foto,
        objetoCompleto: futbolista
      });

      // Guardar el futbolista principal en la sala para usarlo en todas las rondas
      sala.futbolistaPrincipal = {
        _id: futbolista._id,
        nombre: futbolista.nombre,
        nombreCompleto: futbolista.nombreCompleto,
        imageUrl: futbolista.imageUrl,
        posicion: futbolista.posicion,
        nacionalidad: futbolista.nacionalidad,
        fechaNacimiento: futbolista.fechaNacimiento
      };

      sala.historialRondas.push({
        numero: 1,
        futbolista: sala.futbolistaPrincipal, // Usar el futbolista principal
        comentarios: [],
        votos: [],
        finalizada: false,
        confirmacionesSiguienteRonda: []
      });

      await sala.save();

      // Emitir juego iniciado
      io.to(codigo).emit('juegoIniciado', sala);

      // Iniciar fase de comentarios
      setTimeout(() => {
        iniciarFaseComentarios(io, codigo);
      }, 1000);
    });

    socket.on('enviarComentario', async ({ codigo, jugadorId, texto }) => {
      try {
        const sala = await Sala.findOne({ codigo });
        if (!sala) return;

        const ronda = sala.historialRondas[sala.rondaActual - 1];
        const jugador = sala.jugadores.find(j => j._id.toString() === jugadorId && !j.eliminado);

        if (jugador && ronda && !ronda.finalizada) {
          // Verificar que el jugador no haya comentado ya
          const yaComento = ronda.comentarios.find(c => c.jugadorId.toString() === jugadorId);
          if (!yaComento) {
            ronda.comentarios.push({ jugadorId, texto });
            await sala.save();

            // Emitir comentario agregado a todos los jugadores
            io.to(codigo).emit('comentarioAgregado', {
              jugadorId,
              texto,
              nombreJugador: jugador.nombre,
              totalComentarios: ronda.comentarios.length,
              jugadoresActivos: sala.jugadores.filter(j => !j.eliminado).length
            });

            console.log(`💬 Comentario de ${jugador.nombre}: ${texto}`);

            // Verificar si todos los jugadores activos han comentado
            const jugadoresActivos = sala.jugadores.filter(j => !j.eliminado).length;
            if (ronda.comentarios.length >= jugadoresActivos) {
              // Si todos comentaron, pasar a fase de votación inmediatamente
              iniciarFaseVotacion(io, codigo);
            }
          }
        }
      } catch (error) {
        console.error('Error al enviar comentario:', error);
      }
    });

    socket.on('votar', async ({ codigo, votanteId, sospechosoId }) => {
      try {
        const sala = await Sala.findOne({ codigo });
        if (!sala) return;

        const ronda = sala.historialRondas[sala.rondaActual - 1];
        const votante = sala.jugadores.find(j => j._id.toString() === votanteId && !j.eliminado);

        if (votante && ronda && !ronda.finalizada) {
          // Verificar que no haya votado ya
          const yaVoto = ronda.votos.find(v => v.votanteId.toString() === votanteId);
          if (!yaVoto) {
            ronda.votos.push({ votanteId, sospechosoId });
            await sala.save();

            // Emitir voto registrado
            io.to(codigo).emit('votoRegistrado', {
              votanteId,
              totalVotos: ronda.votos.length,
              jugadoresActivos: sala.jugadores.filter(j => !j.eliminado).length
            });

            console.log(`🗳️ ${votante.nombre} votó por ${sospechosoId}`);

            // Verificar si todos los jugadores activos han votado
            const jugadoresActivos = sala.jugadores.filter(j => !j.eliminado).length;
            if (ronda.votos.length >= jugadoresActivos) {
              // Si todos votaron, procesar resultados
              await procesarResultadosVotacion(io, codigo);
            }
          }
        }
      } catch (error) {
        console.error('Error al votar:', error);
      }
    });

    socket.on('confirmarSiguienteRonda', async ({ codigo, jugadorId }) => {
      try {
        const sala = await Sala.findOne({ codigo });
        if (!sala) return;

        const ronda = sala.historialRondas[sala.rondaActual - 1];
        const jugador = sala.jugadores.find(j => j._id.toString() === jugadorId && !j.eliminado);

        if (!jugador || !ronda || !ronda.finalizada) return;

        // Verificar que no haya confirmado ya
        const yaConfirmo = ronda.confirmacionesSiguienteRonda.includes(jugadorId);
        if (!yaConfirmo) {
          ronda.confirmacionesSiguienteRonda.push(jugadorId);
          await sala.save();

          // Contar jugadores activos y confirmaciones
          const jugadoresActivos = sala.jugadores.filter(j => !j.eliminado).length;
          const confirmaciones = ronda.confirmacionesSiguienteRonda.length;

          // Emitir actualización de confirmaciones
          io.to(codigo).emit('confirmacionActualizada', {
            confirmaciones,
            jugadoresActivos
          });

          // Si todos los jugadores activos confirmaron, avanzar
          if (confirmaciones >= jugadoresActivos) {
            verificarFinDeJuego(io, codigo);
          }
        }
      } catch (error) {
        console.error('Error al confirmar siguiente ronda:', error);
      }
    });

    // Nuevo evento: Terminar juego y volver al lobby
    socket.on('terminarJuego', async ({ codigo, jugadorId }) => {
      try {
        const sala = await Sala.findOne({ codigo });
        if (!sala) return;

        const jugador = sala.jugadores.find(j => j._id.toString() === jugadorId);
        if (!jugador) return;

        // Verificar que no haya votado ya
        if (!sala.votosTerminarJuego) {
          sala.votosTerminarJuego = [];
        }

        const yaVoto = sala.votosTerminarJuego.includes(jugadorId);
        if (!yaVoto) {
          sala.votosTerminarJuego.push(jugadorId);
          await sala.save();

          const jugadoresVivos = sala.jugadores.filter(j => !j.eliminado);
          const votosTerminar = sala.votosTerminarJuego.length;

          // Emitir actualización de votos
          io.to(codigo).emit('votoTerminarActualizado', {
            votosTerminar,
            jugadoresVivos: jugadoresVivos.length
          });

          // Si todos votaron terminar, enviar al lobby
          if (votosTerminar >= jugadoresVivos.length) {
            sala.estado = 'finalizado';
            await sala.save();
            io.to(codigo).emit('volverAlLobby');
          }
        }
      } catch (error) {
        console.error('Error al terminar juego:', error);
      }
    });

    // Nuevo evento: Seguir jugando con los mismos jugadores
    socket.on('seguirJugando', async ({ codigo, jugadorId }) => {
      try {
        const sala = await Sala.findOne({ codigo });
        if (!sala) return;

        const jugador = sala.jugadores.find(j => j._id.toString() === jugadorId);
        if (!jugador) return;

        // Verificar que no haya votado ya
        if (!sala.votosSeguirJugando) {
          sala.votosSeguirJugando = [];
        }

        const yaVoto = sala.votosSeguirJugando.includes(jugadorId);
        if (!yaVoto) {
          sala.votosSeguirJugando.push(jugadorId);
          await sala.save();

          const jugadoresVivos = sala.jugadores.filter(j => !j.eliminado);
          const votosSeguir = sala.votosSeguirJugando.length;

          // Emitir actualización de votos
          io.to(codigo).emit('votoSeguirActualizado', {
            votosSeguir,
            jugadoresVivos: jugadoresVivos.length
          });

          // Si todos votaron seguir, crear nueva sala
          if (votosSeguir >= jugadoresVivos.length) {
            await crearNuevaSalaConJugadores(io, sala);
          }
        }
      } catch (error) {
        console.error('Error al seguir jugando:', error);
      }
    });

    socket.on('disconnect', async () => {
      console.log('🔴 Usuario desconectado:', socket.id);
      try {
        const sala = await Sala.findOne({ 'jugadores.socketId': socket.id });
        if (sala) {
          const jugador = sala.jugadores.find(j => j.socketId === socket.id);
          if (jugador) {
            jugador.eliminado = true;
            await sala.save();
            io.to(sala.codigo).emit('jugadorDesconectado', jugador);
          }
        }
      } catch (error) {
        console.error('Error al manejar desconexión:', error);
      }
    });
  });
}

async function iniciarFaseComentarios(io, codigo) {
  try {
    const sala = await Sala.findOne({ codigo });
    if (!sala || sala.estado !== 'jugando') return;

    const ronda = sala.historialRondas[sala.rondaActual - 1];
    if (!ronda) return;

    console.log(`🎮 Iniciando fase de comentarios - Ronda ${ronda.numero}`);

    // Emitir inicio de fase de comentarios
    io.to(codigo).emit('faseComentario', {
      sala,
      ronda,
      duracion: 30000 // ✅ Reducido a 30 segundos
    });

    // ✅ Después de 30 segundos, iniciar fase de votación
    setTimeout(() => {
      iniciarFaseVotacion(io, codigo);
    }, 30000);

  } catch (error) {
    console.error('Error en fase de comentarios:', error);
  }
}

async function iniciarFaseVotacion(io, codigo) {
  try {
    const sala = await Sala.findOne({ codigo });
    if (!sala || sala.estado !== 'jugando') return;

    const ronda = sala.historialRondas[sala.rondaActual - 1];
    if (!ronda) return;

    console.log(`🗳️ Iniciando fase de votación - Ronda ${ronda.numero}`);

    // Preparar comentarios para votación (sin mostrar quién los escribió)
    const comentariosParaVotacion = ronda.comentarios.map(c => {
      const jugador = sala.jugadores.find(j => j._id.toString() === c.jugadorId);
      return {
        jugadorId: c.jugadorId,
        texto: c.texto,
        nombreJugador: jugador ? jugador.nombre : 'Desconocido'
      };
    });

    // Verificar si la ronda ya está finalizada
    if (ronda.finalizada) {
      return;
    }

    // Emitir inicio de fase de votación
    io.to(codigo).emit('faseVotacion', {
      comentarios: comentariosParaVotacion,
      jugadoresVivos: sala.jugadores.filter(j => !j.eliminado),
      duracion: 30000 // ✅ Reducido a 30 segundos
    });

    // ✅ Después de 30 segundos, procesar resultados
    const timerVotacion = setTimeout(() => {
      procesarResultadosVotacion(io, codigo);
    }, 30000);

  } catch (error) {
    console.error('Error en fase de votación:', error);
  }
}

async function procesarResultadosVotacion(io, codigo) {
  try {
    const sala = await Sala.findOne({ codigo });
    if (!sala || sala.estado !== 'jugando') return;

    const ronda = sala.historialRondas[sala.rondaActual - 1];
    if (!ronda) return;

    // Contar votos
    const conteoVotos = {};
    ronda.votos.forEach(({ sospechosoId }) => {
      conteoVotos[sospechosoId] = (conteoVotos[sospechosoId] || 0) + 1;
    });

    // Encontrar al más votado
    const eliminadoId = Object.entries(conteoVotos)
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    if (eliminadoId) {
      const eliminado = sala.jugadores.find(j => j._id.toString() === eliminadoId);
      if (eliminado) {
        eliminado.eliminado = true;
        ronda.eliminadoId = eliminadoId;
        ronda.finalizada = true;
        
        // Inicializar el array de confirmaciones para la siguiente ronda
        if (!ronda.confirmacionesSiguienteRonda) {
          ronda.confirmacionesSiguienteRonda = [];
        }

        await sala.save();

        console.log(`❌ ${eliminado.nombre} fue eliminado`);

        // Marcar la ronda como finalizada
        ronda.finalizada = true;
        await sala.save();

        // Emitir votación finalizada y resultados inmediatamente
        io.to(codigo).emit('votacionFinalizada');
        io.to(codigo).emit('resultadoRonda', {
          eliminado,
          esImpostor: eliminado.esImpostor,
          votos: conteoVotos,
          esperandoConfirmaciones: true
        });
      }
    }

  } catch (error) {
    console.error('Error al procesar resultados:', error);
  }
}

async function verificarFinDeJuego(io, codigo) {
  try {
    const sala = await Sala.findOne({ codigo });
    if (!sala) return;

    const jugadoresVivos = sala.jugadores.filter(j => !j.eliminado);
    const impostor = jugadoresVivos.find(j => j._id.toString() === sala.impostorId.toString());
    const jugadoresNormales = jugadoresVivos.filter(j => j._id.toString() !== sala.impostorId.toString());

    // Condiciones de fin de juego
    if (!impostor) {
      // El impostor fue eliminado - mostrar opciones y revelar al futbolista
      sala.estado = 'esperando_decision';
      sala.votosTerminarJuego = [];
      sala.votosSeguirJugando = [];
      await sala.save();
      
      io.to(codigo).emit('impostorEliminado', {
        mensaje: '¡El impostor fue eliminado! ¿Qué quieren hacer?',
        jugadoresVivos: jugadoresVivos.length,
        futbolistaRevelado: sala.futbolistaPrincipal, // Revelar el futbolista real
        sala
      });
      return;
    }

    if (jugadoresNormales.length === 0 || jugadoresVivos.length <= 2) {
      // Solo queda el impostor o muy pocos jugadores - gana el impostor
      sala.estado = 'finalizado';
      await sala.save();
      io.to(codigo).emit('juegoTerminado', {
        ganador: 'impostor',
        razon: jugadoresNormales.length === 0 ? 'todos_eliminados' : 'muy_pocos_jugadores',
        sala
      });
      return;
    }

    // Continuar con siguiente ronda
    setTimeout(() => {
      iniciarNuevaRonda(io, codigo);
    }, 2000);

  } catch (error) {
    console.error('Error al verificar fin de juego:', error);
  }
}

async function iniciarNuevaRonda(io, codigo) {
  try {
    const sala = await Sala.findOne({ codigo });
    if (!sala || sala.estado !== 'jugando') return;

    // NO crear nuevo futbolista - usar el mismo de toda la partida
    console.log('🏈 Usando el mismo futbolista para la nueva ronda:', {
      nombre: sala.futbolistaPrincipal?.nombre,
      ronda: sala.rondaActual + 1
    });

    sala.rondaActual++;

    sala.historialRondas.push({
      numero: sala.rondaActual,
      futbolista: sala.futbolistaPrincipal, // Usar el mismo futbolista
      comentarios: [],
      votos: [],
      finalizada: false,
      confirmacionesSiguienteRonda: []
    });

    await sala.save();

    console.log(`🆕 Nueva ronda ${sala.rondaActual} iniciada con el mismo futbolista`);

    // Emitir nueva ronda
    io.to(codigo).emit('nuevaRonda', sala);

    // Iniciar fase de comentarios
    setTimeout(() => {
      iniciarFaseComentarios(io, codigo);
    }, 1000);

  } catch (error) {
    console.error('Error al iniciar nueva ronda:', error);
  }
}

async function crearNuevaSalaConJugadores(io, salaAnterior) {
  try {
    const jugadoresVivos = salaAnterior.jugadores.filter(j => !j.eliminado);
    
    // Verificar que hay al menos 3 jugadores
    if (jugadoresVivos.length < 3) {
      // No hay suficientes jugadores, ponerlos en espera
      io.to(salaAnterior.codigo).emit('esperandoJugadores', {
        mensaje: 'No hay suficientes jugadores para crear una nueva sala. Esperando más jugadores...',
        jugadoresActuales: jugadoresVivos.length,
        jugadoresNecesarios: 3
      });
      return;
    }

    // Crear nueva sala con código único
    const nuevoCodigo = uuidv4().slice(0, 6).toUpperCase();
    
    // Preparar jugadores para la nueva sala (resetear estados)
    const jugadoresNuevaSala = jugadoresVivos.map(jugador => ({
      nombre: jugador.nombre,
      socketId: jugador.socketId,
      esImpostor: false,
      eliminado: false
    }));

    const nuevaSala = await Sala.create({
      codigo: nuevoCodigo,
      hostId: null, // Se asignará después
      jugadores: jugadoresNuevaSala,
      estado: 'esperando'
      // No incluir futbolistaPrincipal aquí - se asignará cuando inicien el juego
    });

    // Asignar hostId al primer jugador
    nuevaSala.hostId = nuevaSala.jugadores[0]._id;
    await nuevaSala.save();

    // Hacer que todos los jugadores se unan a la nueva sala
    jugadoresVivos.forEach(jugador => {
      const socket = io.sockets.sockets.get(jugador.socketId);
      if (socket) {
        socket.leave(salaAnterior.codigo);
        socket.join(nuevoCodigo);
      }
    });

    // Finalizar la sala anterior
    salaAnterior.estado = 'finalizado';
    await salaAnterior.save();

    // Emitir la nueva sala a todos los jugadores
    io.to(nuevoCodigo).emit('nuevaSalaCreada', {
      sala: nuevaSala,
      mensaje: '¡Nueva sala creada! Pueden iniciar el juego cuando estén listos.'
    });

    console.log(`🆕 Nueva sala creada: ${nuevoCodigo} con ${jugadoresNuevaSala.length} jugadores`);

  } catch (error) {
    console.error('Error al crear nueva sala:', error);
  }
}

module.exports = salaSockets;