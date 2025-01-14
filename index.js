// Install dependencies: npm install express socket.io express-session
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const session = require("express-session");

// Create Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Configure session middleware
const sessionMiddleware = session({
  secret: "your-secret-key",
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false },
});

app.use(sessionMiddleware);

// Serve static files (e.g., HTML, CSS, JS)
app.use(express.static("public"));

// Store active users by room
const activeUsers = {};

// Share session with Socket.IO
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  const session = socket.request.session;

  socket.on("joinRoom", ({ username, room, isGuest }) => {
    socket.join(room);

    // Add user to the active users list for the room
    if (!activeUsers[room]) activeUsers[room] = [];
    activeUsers[room].push({ id: socket.id, username, isGuest });

    // Save session data for logged-in users
    if (!isGuest) {
      session.username = username;
      session.room = room;
      session.save();
    }

    // Notify others in the room
    socket.to(room).emit("message", {
      username: "System",
      message: `${username} has joined the room.`,
    });

    // Send updated user list to the room
    io.to(room).emit("activeUsers", activeUsers[room]);
  });

  socket.on("sendMessage", ({ room, message, username }) => {
    // Broadcast the message to others in the room
    io.to(room).emit("message", { username, message });
  });

  socket.on("disconnect", () => {
    // Remove user from active users list
    for (const room in activeUsers) {
      activeUsers[room] = activeUsers[room].filter(
        (user) => user.id !== socket.id
      );

      // Notify others if the user was in the room
      io.to(room).emit("activeUsers", activeUsers[room]);
    }

    console.log("A user disconnected:", socket.id);
  });

  // Reconnect logged-in users to their previous room
  if (session.username && session.room) {
    socket.emit("joinRoom", {
      username: session.username,
      room: session.room,
      isGuest: false,
    });
  }
});

// Start the server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
