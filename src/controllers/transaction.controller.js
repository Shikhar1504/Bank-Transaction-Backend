import transactionModel from "../models/transaction.model.js";
import ledgerModel from "../models/ledger.model.js";
import accountModel from "../models/account.model.js";
import mongoose from "mongoose";

async function createTransaction(req, res) {
  const { fromAccount, toAccount, amount, idempotencyKey, note } = req.body;

  if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
    return res.status(400).json({
      success: false,
      message: "All fields are required"
    });
  }

  if (
    !mongoose.Types.ObjectId.isValid(fromAccount) ||
    !mongoose.Types.ObjectId.isValid(toAccount)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid account IDs"
    });
  }

  if (fromAccount === toAccount) {
    return res.status(400).json({
      success: false,
      message: "Cannot transfer to same account"
    });
  }

  try {
    const existing = await transactionModel.findOne({
      idempotencyKey,
      fromAccount
    });

    if (existing) {
      return res.status(200).json({
        success: true,
        message: `Transaction already ${existing.status.toLowerCase()}`,
        transaction: existing
      });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const updatedFrom = await accountModel.findOneAndUpdate(
        {
          _id: fromAccount,
          user: req.user._id,
          status: "ACTIVE",
          balance: { $gte: amount }
        },
        {
          $inc: { balance: -amount }
        },
        { session, new: true }
      );

      if (!updatedFrom) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Insufficient funds or unauthorized"
        });
      }

      const updatedTo = await accountModel.findOneAndUpdate(
        {
          _id: toAccount,
          status: "ACTIVE"
        },
        {
          $inc: { balance: amount }
        },
        { session, new: true }
      );

      if (!updatedTo) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: "Destination account not found"
        });
      }

      const transaction = new transactionModel({
        fromAccount,
        toAccount,
        amount,
        idempotencyKey,
        note, // ✅ added
        status: "PENDING"
      });

      await transaction.save({ session });

      await ledgerModel.create(
        [
          {
            account: fromAccount,
            type: "DEBIT",
            amount,
            transaction: transaction._id,
            balanceAfter: updatedFrom.balance,
            currency: updatedFrom.currency // ✅ added
          },
          {
            account: toAccount,
            type: "CREDIT",
            amount,
            transaction: transaction._id,
            balanceAfter: updatedTo.balance,
            currency: updatedTo.currency // ✅ added
          }
        ],
        { session }
      );

      transaction.status = "COMPLETED";
      await transaction.save({ session });

      await session.commitTransaction();
      session.endSession();

      return res.status(201).json({
        success: true,
        message: "Transaction completed successfully",
        transaction
      });

    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Transaction failed",
        error: error.message
      });
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
}

async function createInitialFundsTransaction(req, res) {
  const { toAccount, amount, idempotencyKey, note } = req.body;

  if (!toAccount || !amount || !idempotencyKey) {
    return res.status(400).json({
      success: false,
      message: "All fields are required"
    });
  }

  if (!mongoose.Types.ObjectId.isValid(toAccount)) {
    return res.status(400).json({
      success: false,
      message: "Invalid account ID"
    });
  }

  try {
    const systemAccount = await accountModel.findOne({
      user: req.user._id
    });

    if (!systemAccount) {
      return res.status(404).json({
        success: false,
        message: "System account not found"
      });
    }

    const existing = await transactionModel.findOne({
      idempotencyKey,
      fromAccount: systemAccount._id
    });

    if (existing) {
      return res.status(200).json({
        success: true,
        message: `Transaction already ${existing.status.toLowerCase()}`,
        transaction: existing
      });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const updatedFrom = await accountModel.findOneAndUpdate(
        {
          _id: systemAccount._id,
          status: "ACTIVE",
          balance: { $gte: amount }
        },
        {
          $inc: { balance: -amount }
        },
        { session, new: true }
      );

      const updatedTo = await accountModel.findOneAndUpdate(
        {
          _id: toAccount,
          status: "ACTIVE"
        },
        {
          $inc: { balance: amount }
        },
        { session, new: true }
      );

      if (!updatedFrom || !updatedTo) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: "Account not found"
        });
      }

      const transaction = new transactionModel({
        fromAccount: updatedFrom._id,
        toAccount,
        amount,
        idempotencyKey,
        note, // ✅ added
        status: "PENDING"
      });

      await transaction.save({ session });

      await ledgerModel.create(
        [
          {
            account: updatedFrom._id,
            type: "DEBIT",
            amount,
            transaction: transaction._id,
            balanceAfter: updatedFrom.balance,
            currency: updatedFrom.currency // ✅ added
          },
          {
            account: toAccount,
            type: "CREDIT",
            amount,
            transaction: transaction._id,
            balanceAfter: updatedTo.balance,
            currency: updatedTo.currency // ✅ added
          }
        ],
        { session }
      );

      transaction.status = "COMPLETED";
      await transaction.save({ session });

      await session.commitTransaction();
      session.endSession();

      return res.status(201).json({
        success: true,
        message: "Initial funds transaction completed successfully",
        transaction
      });

    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Transaction failed",
        error: error.message
      });
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
}

async function getTransactionHistoryController(req, res) {
  try {
    const { accountId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(accountId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid accountId"
      });
    }

    // ✅ ownership check
    const account = await accountModel.findOne({
      _id: accountId,
      user: req.user._id
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found"
      });
    }

    const page = parseInt(req.query.page) || 1;
const limit = parseInt(req.query.limit) || 10;
const skip = (page - 1) * limit;

const transactions = await ledgerModel
  .find({ account: accountId })
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit)
  .populate({
    path: "transaction",
    select: "note amount status createdAt"
  })
  .lean();

// ✅ ADD HERE
const formatted = transactions.map(tx => ({
  ...tx,
  direction: tx.type === "DEBIT" ? "OUT" : "IN"
}));

const total = await ledgerModel.countDocuments({ account: accountId });

return res.status(200).json({
  success: true,
  page,
  limit,
  total,
  transactions: formatted // ✅ use formatted
});

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
}

export { createTransaction, createInitialFundsTransaction,getTransactionHistoryController };