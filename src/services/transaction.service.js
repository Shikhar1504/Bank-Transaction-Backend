import transactionModel from "../models/transaction.model.js";
import ledgerModel from "../models/ledger.model.js";
import accountModel from "../models/account.model.js";
import auditLogModel from "../models/auditLog.model.js";
import mongoose from "mongoose";
import eventBus from "../events/eventBus.js";
import idempotencyModel from "../models/idempotency.model.js";

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
  const existingKey = await idempotencyModel.findOne({
    key: idempotencyKey,
    fromAccount,
  });

  if (existingKey) {
    throw new Error("Duplicate request");
  }

  // ✅ Retry logic (separate from idempotency)
  const existingFailed = await transactionModel
    .findOne({
      fromAccount,
      toAccount,
      amount,
      status: "FAILED",
      createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
    })
    .sort({ createdAt: -1 });

  if (existingFailed) {
    if (existingFailed.retryCount >= MAX_RETRY) {
      throw new Error("Retry limit exceeded");
    }

    transaction = existingFailed;
    transaction.status = "PROCESSING";
    transaction.retryCount += 1;
    await transaction.save();
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

    await idempotencyModel.create({
      key: idempotencyKey,
      fromAccount,
    });

    await auditLogModel.create({
      action: "TRANSFER_SUCCESS",
      status: "SUCCESS",
      userId,
      transactionId: transaction._id,
      details: "Transaction completed successfully",
    });

    eventBus.emit("transaction.completed", {
      transactionId: transaction._id,
      userId,
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

      eventBus.emit("transaction.failed", {
        transactionId: transaction._id,
        userId,
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
  if (amount > MAX_PER_TXN) {
    throw new Error("Amount exceeds per transaction limit");
  }

  const systemAccount = await accountModel.findOne({ user: userId });

  if (!systemAccount) {
    throw new Error("System account not found");
  }

  let transaction;

  // ✅ Idempotency
  const existingKey = await idempotencyModel.findOne({
    key: idempotencyKey,
    fromAccount: systemAccount._id,
  });

  if (existingKey) {
    throw new Error("Duplicate request");
  }

  const existingFailed = await transactionModel
    .findOne({
      fromAccount: systemAccount._id,
      toAccount,
      amount,
      status: "FAILED",
      createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
    })
    .sort({ createdAt: -1 });

  if (existingFailed) {
    if (existingFailed.retryCount >= MAX_RETRY) {
      throw new Error("Retry limit exceeded");
    }

    transaction = existingFailed;
    transaction.status = "PROCESSING";
    transaction.retryCount += 1;
    await transaction.save();
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

    await idempotencyModel.create({
      key: idempotencyKey,
      fromAccount: systemAccount._id,
    });

    await auditLogModel.create({
      action: "SYSTEM_TRANSFER_SUCCESS",
      status: "SUCCESS",
      userId,
      transactionId: transaction._id,
      details: "Initial funds transaction completed",
    });

    eventBus.emit("transaction.completed", {
      transactionId: transaction._id,
      userId,
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

      eventBus.emit("transaction.failed", {
        transactionId: transaction._id,
        userId,
      });

      transaction.status = "FAILED";
      transaction.failureReason = error.message;
      transaction.retryCount += 1;
      await transaction.save();
    }

    throw error;
  }
}
