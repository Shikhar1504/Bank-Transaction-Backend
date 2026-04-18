import express from "express";
import authRouter from "./routes/auth.routes.js";
import cookieParser from "cookie-parser";
import accountRouter from "./routes/account.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";
import { apiLimiter } from "./middleware/rateLimit.middleware.js";
import adminRoutes from "./routes/admin.routes.js";

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use("/api", apiLimiter);

app.use("/api/auth", authRouter);
app.use("/api/accounts", accountRouter);
app.use("/api/transactions", transactionRoutes);
app.use("/api/admin", adminRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.statusCode || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : err.message,
  });
});

export default app;
