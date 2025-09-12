# Impostor Futbolero

¡Bienvenido a Impostor Futbolero! Un juego multijugador en tiempo real donde los jugadores deben poner a prueba su conocimiento sobre fútbol para descubrir al impostor que se esconde entre ellos.

## 🤔 ¿De qué se trata?

En cada partida, un jugador es elegido aleatoriamente como el **impostor**. Se selecciona un futbolista secreto para el resto de los jugadores (la "tripulación"). El objetivo de la tripulación es adivinar quién es el impostor, mientras que el impostor debe engañar a todos y evitar ser descubierto.

El juego se desarrolla en rondas. En cada ronda, los jugadores dejan un comentario o pista sobre el futbolista secreto. El impostor, al no conocer al futbolista, debe usar su ingenio para crear un comentario creíble y no levantar sospechas. Luego, todos votan por el jugador que creen que es el impostor. ¡El más votado es eliminado!

## ✨ Características Principales

- **Salas de Juego Privadas**: Crea una sala y comparte el código con tus amigos para jugar.
- **Partidas de 3 a 6 Jugadores**: Diseñado para grupos pequeños, ideal para jugar con amigos.
- **Juego en Tiempo Real**: Toda la acción (comentarios, votos, resultados) ocurre instantáneamente gracias a WebSockets.
- **Rol de Impostor Aleatorio**: En cada partida, la suerte decide quién será el impostor, garantizando rejugabilidad.
- **Sistema de Votación**: Usa tu intuición y las pistas para votar y eliminar al sospechoso.
- **Base de Datos de Futbolistas**: El juego utiliza una colección de futbolistas para asegurar que cada partida sea diferente.

## 💻 Tecnologías Utilizadas

- **Backend**: Node.js, Express.js
- **Base de Datos**: MongoDB con Mongoose para modelar los datos.
- **Comunicación en Tiempo Real**: Socket.IO
- **Variables de Entorno**: Dotenv

## 🚀 Cómo Empezar

Sigue estos pasos para ejecutar el proyecto en tu máquina local.

### Prerrequisitos

- Tener instalado [Node.js](https://nodejs.org/) (versión 14 o superior).
- Tener acceso a una base de datos de MongoDB (local o en la nube como MongoDB Atlas).

### Instalación

1.  **Clona el repositorio:**
    ```bash
    git clone https://github.com/tu-usuario/impostorapp.git
    cd impostorapp
    ```

2.  **Instala las dependencias:**
    ```bash
    npm install
    ```

3.  **Configura las variables de entorno:**
    Crea un archivo `.env` en la raíz del proyecto y añade las siguientes variables:
    ```
    MONGO_URI=tu_string_de_conexion_a_mongodb
    PORT=3001
    ```
    Reemplaza `tu_string_de_conexion_a_mongodb` por la URL de conexión a tu base de datos.

4.  **Inicia el servidor:**
    ```bash
    npm start
    ```
    El servidor se iniciará en el puerto que hayas definido (por defecto, 3001).

##  API Endpoints

El proyecto expone una API REST para gestionar los datos de los futbolistas.

- `POST /api/futbolistas/cargar`
  - Carga un array de objetos de futbolistas en la base de datos. Útil para poblar la base de datos inicialmente.
  - **Body**: `[{ "nombre": "...", "posicion": "...", ... }]`

- `GET /api/futbolistas`
  - Devuelve una lista de todos los futbolistas en la base de datos.

- `GET /api/futbolistas/random`
  - Devuelve un futbolista aleatorio de la base de datos.

- `GET /api/futbolistas/:id`
  - Devuelve un futbolista específico por su `_id`.

## 🔌 Eventos de Socket.IO

La lógica del juego se maneja a través de eventos de Socket.IO.

### Eventos Emitidos por el Cliente

- `crearSala`: Crea una nueva sala de juego.
- `unirseSala`: Se une a una sala existente con un código.
- `iniciarJuego`: Inicia la partida (solo el host).
- `enviarComentario`: Envía un comentario durante la ronda.
- `votar`: Emite un voto por un jugador sospechoso.
- `confirmarSiguienteRonda`: Confirma para pasar a la siguiente ronda.
- `terminarJuego`: Vota para terminar el juego y volver al lobby.
- `seguirJugando`: Vota para jugar otra partida con los mismos jugadores.

### Eventos Emitidos por el Servidor

- `salaActualizada`: Notifica a los jugadores cuando alguien se une o sale de la sala.
- `juegoIniciado`: Anuncia que el juego ha comenzado y envía el estado inicial de la sala.
- `faseComentario`: Inicia la fase de comentarios.
- `comentarioAgregado`: Notifica que un nuevo comentario ha sido añadido.
- `faseVotacion`: Inicia la fase de votación.
- `votoRegistrado`: Confirma que un voto ha sido registrado.
- `resultadoRonda`: Anuncia el resultado de la votación y quién fue eliminado.
- `nuevaRonda`: Inicia una nueva ronda de juego.
- `juegoTerminado`: Anuncia el final del juego y quién ha ganado.
- `impostorEliminado`: Notifica que el impostor ha sido descubierto.
- `volverAlLobby`: Redirige a todos los jugadores al lobby.
- `nuevaSalaCreada`: Crea una nueva sala para los jugadores que decidieron "seguir jugando".
- `jugadorDesconectado`: Notifica que un jugador se ha desconectado.
