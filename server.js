import app from "./src/app.js";
import dotenv from "dotenv";
import connectDB from "./src/config/db.js";

dotenv.config();

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
  process.exit(1);
});

let server;

async function startServer(){
  try {
    await connectDB();
    const PORT = process.env.PORT || 3000;

    server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

process.on("SIGTERM", () => {
  console.log("SIGTERM received. Closing server...");

  if (server) {
    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on("SIGINT", () => {
  console.log("SIGINT received. Closing server...");

  if (server) {
    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

startServer();