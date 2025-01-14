// Install dependencies: npm install express socket.io
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

// Create Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files (e.g., HTML, CSS, JS)
app.use(express.static("public"));

// Store active users by room
const activeUsers = {};

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("joinRoom", ({ username, room }) => {
    socket.join(room);

    // Add user to the active users list for the room
    if (!activeUsers[room]) activeUsers[room] = [];
    activeUsers[room].push({ id: socket.id, username });

    // Notify others in the room
    socket.to(room).emit("message", `${username} has joined the room.`);

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
});

// Start the server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
