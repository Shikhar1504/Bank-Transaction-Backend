import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  fromAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "account",
    required: true,
    index: true
  },
  toAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "account",
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: {
      values: ["PENDING", "COMPLETED", "FAILED", "REVERSED"],
      message: "Invalid status"
    },
    default: "PENDING"
  },
  amount: {
    type: Number,
    required: true,
    min: [1, "Transaction amount must be greater than 0"]
  },
  idempotencyKey: {
    type: String,
    required: true
  },
  note: {
    type: String
  }
}, {
  timestamps: true
});

// prevent self-transfer
transactionSchema.pre("validate", function (next) {
  if (this.fromAccount.equals(this.toAccount)) {
    return next(new Error("Cannot transfer to same account"));
  }
  next();
});

// indexes
transactionSchema.index({ fromAccount: 1 });
transactionSchema.index({ toAccount: 1 });
transactionSchema.index({ fromAccount: 1, status: 1 });
transactionSchema.index(
  { idempotencyKey: 1, fromAccount: 1 },
  { unique: true }
);

const transactionModel = mongoose.model("transaction", transactionSchema);

export default transactionModel;