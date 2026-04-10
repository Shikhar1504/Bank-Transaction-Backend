import mongoose from "mongoose";

async function connectDB() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("Connected to MongoDB");

    mongoose.connection.on("disconnected", () => {
      console.log("MongoDB disconnected");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("MongoDB reconnected");
    });

  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
    process.exit(1);
  }
}

export default connectDB;