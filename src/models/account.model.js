import mongoose from "mongoose";

const accountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: [true, "Account must belong to a user"],
      unique: true, // ✅ prevents duplicate accounts
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ["ACTIVE", "FROZEN", "CLOSED"],
        message: "Status must be either ACTIVE, FROZEN or CLOSED",
      },
      default: "ACTIVE",
    },
    currency: {
      type: String,
      required: [true, "Currency is required"],
      default: "INR",
    },
    balance: {
      type: Number,
      default: 0,
      min: [0, "Balance cannot be negative"],
    },
  },
  {
    timestamps: true,
  },
);

// optional composite index
accountSchema.index({ status: 1 });
accountSchema.index({ user: 1, status: 1 });

const accountModel = mongoose.model("account", accountSchema);

export default accountModel;
