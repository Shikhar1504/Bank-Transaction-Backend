import transactionModel from "../models/transaction.model.js";
import ledgerModel from "../models/ledger.model.js";
import accountModel from "../models/account.model.js";
import auditLogModel from "../models/auditLog.model.js";
import mongoose from "mongoose";

const MAX_PER_TXN = 10000;
const MAX_RETRY = 3;

export async function processTransaction({
  fromAccount,
  toAccount,
  amount,
  idempotencyKey,
  note,
  userId,
}) {
  if (amount > MAX_PER_TXN) {
    throw new Error("Amount exceeds per transaction limit");
  }

  let transaction;

  // ✅ Idempotency
  const existing = await transactionModel.findOne({
    idempotencyKey,
    fromAccount,
  });

  if (existing) {
    if (existing.status === "COMPLETED") {
      return existing;
    }

    if (existing.status === "FAILED") {
      if (existing.retryCount >= MAX_RETRY) {
        throw new Error("Retry limit exceeded");
      }

      transaction = existing;
      transaction.status = "PROCESSING";
      transaction.retryCount += 1;
      await transaction.save();
    } else {
      return existing;
    }
  }

  // ✅ Create if not exists
  if (!transaction) {
    transaction = await transactionModel.create({
      fromAccount,
      toAccount,
      amount,
      idempotencyKey,
      note,
      status: "INITIATED",
    });

    transaction.status = "PROCESSING";
    await transaction.save();
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const updatedFrom = await accountModel.findOneAndUpdate(
      {
        _id: fromAccount,
        user: userId,
        status: "ACTIVE",
        balance: { $gte: amount },
      },
      { $inc: { balance: -amount } },
      { session, new: true },
    );

    if (!updatedFrom) {
      throw new Error(
        "Insufficient funds, unauthorized, or account not ACTIVE",
      );
    }

    const updatedTo = await accountModel.findOneAndUpdate(
      { _id: toAccount, status: "ACTIVE" },
      { $inc: { balance: amount } },
      { session, new: true },
    );

    if (!updatedTo) {
      throw new Error("Destination account not found or not active");
    }

    await ledgerModel.create(
      [
        {
          account: fromAccount,
          type: "DEBIT",
          amount,
          transaction: transaction._id,
          balanceAfter: updatedFrom.balance,
          currency: updatedFrom.currency,
        },
        {
          account: toAccount,
          type: "CREDIT",
          amount,
          transaction: transaction._id,
          balanceAfter: updatedTo.balance,
          currency: updatedTo.currency,
        },
      ],
      { session },
    );

    transaction.status = "COMPLETED";
    await transaction.save({ session });

    await session.commitTransaction();
    session.endSession();

    await auditLogModel.create({
      action: "TRANSFER_SUCCESS",
      status: "SUCCESS",
      userId,
      transactionId: transaction._id,
      details: "Transaction completed successfully",
    });

    return transaction;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    if (transaction) {
      await auditLogModel.create({
        action: "TRANSFER_FAILED",
        status: "FAILED",
        userId,
        transactionId: transaction._id,
        details: error.message,
      });

      transaction.status = "FAILED";
      transaction.failureReason = error.message;
      transaction.retryCount += 1;
      await transaction.save();
    }

    throw error;
  }
}

export async function processSystemTransaction({
  toAccount,
  amount,
  idempotencyKey,
  note,
  userId,
}) {
  const MAX_PER_TXN = 10000;
  const MAX_RETRY = 3;

  if (amount > MAX_PER_TXN) {
    throw new Error("Amount exceeds per transaction limit");
  }

  const systemAccount = await accountModel.findOne({ user: userId });

  if (!systemAccount) {
    throw new Error("System account not found");
  }

  let transaction;

  // ✅ Idempotency
  const existing = await transactionModel.findOne({
    idempotencyKey,
    fromAccount: systemAccount._id,
  });

  if (existing) {
    if (existing.status === "COMPLETED") return existing;

    if (existing.status === "FAILED") {
      if (existing.retryCount >= MAX_RETRY) {
        throw new Error("Retry limit exceeded");
      }

      transaction = existing;
      transaction.status = "PROCESSING";
      transaction.retryCount += 1;
      await transaction.save();
    } else {
      return existing;
    }
  }

  if (!transaction) {
    transaction = await transactionModel.create({
      fromAccount: systemAccount._id,
      toAccount,
      amount,
      idempotencyKey,
      note,
      status: "INITIATED",
    });

    transaction.status = "PROCESSING";
    await transaction.save();
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const updatedFrom = await accountModel.findOneAndUpdate(
      {
        _id: systemAccount._id,
        status: "ACTIVE",
        balance: { $gte: amount },
      },
      { $inc: { balance: -amount } },
      { session, new: true },
    );

    const updatedTo = await accountModel.findOneAndUpdate(
      { _id: toAccount, status: "ACTIVE" },
      { $inc: { balance: amount } },
      { session, new: true },
    );

    if (!updatedFrom || !updatedTo) {
      throw new Error("Account not found or not ACTIVE");
    }

    await ledgerModel.create(
      [
        {
          account: updatedFrom._id,
          type: "DEBIT",
          amount,
          transaction: transaction._id,
          balanceAfter: updatedFrom.balance,
          currency: updatedFrom.currency,
        },
        {
          account: toAccount,
          type: "CREDIT",
          amount,
          transaction: transaction._id,
          balanceAfter: updatedTo.balance,
          currency: updatedTo.currency,
        },
      ],
      { session },
    );

    transaction.status = "COMPLETED";
    await transaction.save({ session });

    await session.commitTransaction();
    session.endSession();

    await auditLogModel.create({
      action: "SYSTEM_TRANSFER_SUCCESS",
      status: "SUCCESS",
      userId,
      transactionId: transaction._id,
      details: "Initial funds transaction completed",
    });

    return transaction;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    if (transaction) {
      await auditLogModel.create({
        action: "SYSTEM_TRANSFER_FAILED",
        status: "FAILED",
        userId,
        transactionId: transaction._id,
        details: error.message,
      });

      transaction.status = "FAILED";
      transaction.failureReason = error.message;
      transaction.retryCount += 1;
      await transaction.save();
    }

    throw error;
  }
}
