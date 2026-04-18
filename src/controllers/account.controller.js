import accountModel from "../models/account.model.js";
import mongoose from "mongoose";

async function createAccountController(req, res) {
  try {
    const user = req.user;

    const account = await accountModel.create({
      user: user._id,
    });

    return res.status(201).json({
      success: true,
      account,
    });
  } catch (error) {
    console.error(error);

    // ✅ handle duplicate account (unique index)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Account already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
}

async function getUserAccountsController(req, res) {
  try {
    const accounts = await accountModel
      .find({ user: req.user._id })
      .select("_id status currency balance createdAt")
      .lean();

    return res.status(200).json({
      success: true,
      accounts,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
}

async function getAccountBalanceController(req, res) {
  try {
    const { accountId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(accountId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid accountId",
      });
    }

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

    // ✅ direct balance (no function needed)
    const balance = account.balance;

    return res.status(200).json({
      success: true,
      accountId: account._id,
      balance,
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
  createAccountController,
  getUserAccountsController,
  getAccountBalanceController,
};
