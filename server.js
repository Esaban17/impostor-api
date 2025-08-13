const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const salaSockets = require('./sockets/SalaSockets');

require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.json());

// Conectar a Mongo
mongoose.connect(process.env.MONGO_URI);

// Rutas
const futbolistasRoutes = require('./routes/FutbolistaRoutes');
app.use('/api/futbolistas', futbolistasRoutes);

// Sockets
salaSockets(io);

// Iniciar servidor
server.listen(process.env.PORT || 3001, () => {
  console.log(`🟢 Servidor en puerto ${process.env.PORT || 3001}`);
});