import mongoose from "mongoose";

const idempotencySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    fromAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "account",
    },
  },
  {
    timestamps: true,
  },
);

// ✅ TTL here (safe now)
idempotencySchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 });

export default mongoose.model("idempotency", idempotencySchema);
