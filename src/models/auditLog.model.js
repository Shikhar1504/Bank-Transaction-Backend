import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["SUCCESS", "FAILED"],
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "transaction",
    },
    details: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

const auditLogModel = mongoose.model("auditLog", auditLogSchema);

export default auditLogModel;
