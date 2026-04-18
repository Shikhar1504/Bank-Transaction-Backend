import mongoose from "mongoose";
import {
  processTransaction,
  processSystemTransaction,
} from "../services/transaction.service.js";
import accountModel from "../models/account.model.js"; // ✅ keep (used in history API)
import ledgerModel from "../models/ledger.model.js"; // ✅ keep (used in history API)

async function createTransaction(req, res) {
  const { fromAccount, toAccount, amount, idempotencyKey, note } = req.body;

  // ✅ Basic validation only
  if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
    return res.status(400).json({
      success: false,
      message: "All fields are required",
    });
  }

  if (
    !mongoose.Types.ObjectId.isValid(fromAccount) ||
    !mongoose.Types.ObjectId.isValid(toAccount)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid account IDs",
    });
  }

  if (fromAccount === toAccount) {
    return res.status(400).json({
      success: false,
      message: "Cannot transfer to same account",
    });
  }

  try {
    const transaction = await processTransaction({
      fromAccount,
      toAccount,
      amount,
      idempotencyKey,
      note,
      userId: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Transaction processed",
      transaction,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

async function createInitialFundsTransaction(req, res) {
  const { toAccount, amount, idempotencyKey, note } = req.body;

  if (!toAccount || !amount || !idempotencyKey) {
    return res.status(400).json({
      success: false,
      message: "All fields are required",
    });
  }

  if (!mongoose.Types.ObjectId.isValid(toAccount)) {
    return res.status(400).json({
      success: false,
      message: "Invalid account ID",
    });
  }

  try {
    const transaction = await processSystemTransaction({
      toAccount,
      amount,
      idempotencyKey,
      note,
      userId: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Initial funds transaction processed",
      transaction,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

async function getTransactionHistoryController(req, res) {
  try {
    const { accountId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(accountId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid accountId",
      });
    }

    // ✅ ownership check
    const account = await accountModel.findOne({
      _id: accountId,
      user: req.user._id,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const skip = (page - 1) * limit;

    const transactions = await ledgerModel
      .find({ account: accountId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "transaction",
        select: "note amount status createdAt",
      })
      .lean();

    // ✅ ADD HERE
    const formatted = transactions.map((tx) => ({
      ...tx,
      direction: tx.type === "DEBIT" ? "OUT" : "IN",
    }));

    const total = await ledgerModel.countDocuments({ account: accountId });

    return res.status(200).json({
      success: true,
      page,
      limit,
      total,
      transactions: formatted, // ✅ use formatted
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
}

export {
  createTransaction,
  createInitialFundsTransaction,
  getTransactionHistoryController,
};
