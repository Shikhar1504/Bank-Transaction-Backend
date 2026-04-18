import accountModel from "../models/account.model.js";
import userModel from "../models/user.model.js";
import transactionModel from "../models/transaction.model.js";

export async function freezeAccount(req, res) {
  const { accountId } = req.params;

  try {
    const account = await accountModel.findByIdAndUpdate(
      accountId,
      { status: "FROZEN" },
      { new: true },
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Account frozen successfully",
      account,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
}

export async function getAllUsers(req, res) {
  const users = await userModel.find().select("-password");

  return res.status(200).json({
    success: true,
    users,
  });
}

export async function getAllTransactions(req, res) {
  const transactions = await transactionModel.find().sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    transactions,
  });
}
