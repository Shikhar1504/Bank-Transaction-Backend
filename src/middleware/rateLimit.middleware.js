import rateLimit from "express-rate-limit";

// 🌍 Global limiter (for all APIs)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100, // max 100 requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later",
  },
});

// 🔐 Strict limiter (for sensitive routes)
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // only 10 requests
  message: {
    success: false,
    message: "Too many attempts, please slow down",
  },
});
