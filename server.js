const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const salaSockets = require('./sockets/SalaSockets');

require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Configurar CORS más específico para producción
const allowedOrigins = [
  'http://localhost:3000',
  'https://your-app-name.vercel.app', // Actualizar con tu dominio real
  process.env.FRONTEND_URL
].filter(Boolean);

const io = new Server(server, {
  cors: { 
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

// Middleware de CORS para HTTP
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

app.use(express.json());

// Conectar a Mongo
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Ruta raíz para verificar que el API funciona
app.get('/', (req, res) => {
  res.json({ message: 'Impostor API funcionando correctamente!' });
});

// Rutas
const futbolistasRoutes = require('./routes/FutbolistaRoutes');
app.use('/api/futbolistas', futbolistasRoutes);

// Sockets
salaSockets(io);

// Iniciar servidor
server.listen(process.env.PORT || 3001, () => {
  console.log(`🟢 Servidor en puerto ${process.env.PORT || 3001}`);
});