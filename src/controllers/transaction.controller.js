import transactionModel from "../models/transaction.model.js";
import ledgerModel from "../models/ledger.model.js";
import accountModel from "../models/account.model.js";
import mongoose from "mongoose";

async function createTransaction(req,res) {
  const { fromAccount, toAccount, amount, idempotencyKey } = req.body;

  if(!fromAccount || !toAccount || !amount || !idempotencyKey){
    return res.status(400).json({
      success:false,
      message:"All fields are required"
    })
  }

  const fromUserAccount=await accountModel.findOne({_id:fromAccount});
  const toUserAccount=await accountModel.findOne({_id:toAccount});

  if(!fromUserAccount || !toUserAccount){
    return res.status(404).json({
      success:false,
      message:"One or both accounts not found"
    })
  }

  const isTransactionAlreadyExists=await transactionModel.findOne({idempotencyKey});

  if(isTransactionAlreadyExists){
    if(isTransactionAlreadyExists.status==="COMPLETED"){
      return res.status(200).json({
        success:true,
        message:"Transaction already completed",
        transaction:isTransactionAlreadyExists
      })
    }

    if(isTransactionAlreadyExists.status==="PENDING"){
      return res.status(200).json({
        success:true,
        message:"Transaction is pending",
        transaction:isTransactionAlreadyExists
      })
    }

    if(isTransactionAlreadyExists.status==="FAILED"){
      return res.status(500).json({
        success:true,
        message:"Transaction already failed",
      })
    }

    if(isTransactionAlreadyExists.status==="REVERSED"){
      return res.status(500).json({
        success:true,
        message:"Transaction already reversed",
      })
    }
  }

  if(fromUserAccount.status!=="ACTIVE" || toUserAccount.status!=="ACTIVE"){
    return res.status(400).json({
      success:false,
      message:"One or both accounts are not active"
    })
  }

  const balance=await fromUserAccount.getBalance();

  if(balance<amount){
    return res.status(400).json({
      success:false,
      message:"Insufficient funds in source account"
    })
  }

  let transaction;

  try{

  const session=await mongoose.startSession();

  session.startTransaction();

  transaction=(await transactionModel.create([{fromAccount,toAccount,amount,idempotencyKey,status:"PENDING"}],{session}))[0];

  const debitLedgerEntry=await ledgerModel.create([{account:fromAccount,type:"DEBIT",amount,transaction:transaction._id}],{session});

  await (()=>{
    return new Promise((resolve)=> setTimeout(resolve,15*1000))
  })()

  const creditLedgerEntry=await ledgerModel.create([{account:toAccount,type:"CREDIT",amount,transaction:transaction._id}],{session});

  await transactionModel.findOneAndUpdate({_id:transaction._id},{status:"COMPLETED"},{session});

  // transaction.status="COMPLETED";
  // await transaction.save({session});

  await session.commitTransaction();
  session.endSession();

}catch(error){
  return res.status(400).json({
    success:false,
    message:"Transaction is Pending due to some issues. Retry after some time",
    error:error.message
  })
}

  return res.status(201).json({
    success:true,
    message:"Transaction completed successfully",
    transaction   
  })
}

async function createInitialFundsTransaction(req,res){
  const {toAccount, amount, idempotencyKey } = req.body;

  if(!toAccount || !amount || !idempotencyKey){
    return res.status(400).json({
      success:false,
      message:"All fields are required"
    })
  }

  const toUserAccount=await accountModel.findOne({_id:toAccount});

  if(!toUserAccount){
    return res.status(404).json({
      success:false,
      message:"Destination account not found"
    })
  }

  const fromUserAccount=await accountModel.findOne({
    user:req.user._id
  });

  if(!fromUserAccount){
    return res.status(404).json({
      success:false,
      message:"System user account not found"
    })
  }

  const session=await mongoose.startSession();
  session.startTransaction();

  const transaction=new transactionModel({fromAccount:fromUserAccount._id,toAccount,amount,idempotencyKey,status:"PENDING"});

  const debitLedgerEntry=await ledgerModel.create([{account:fromUserAccount._id,type:"DEBIT",amount,transaction:transaction._id}],{session});
  const creditLedgerEntry=await ledgerModel.create([{account:toAccount,type:"CREDIT",amount,transaction:transaction._id}],{session});

  transaction.status="COMPLETED";
  await transaction.save({session});

  await session.commitTransaction();
  session.endSession();

  return res.status(201).json({
    success:true,
    message:"Initial funds transaction completed successfully",
    transaction
  })
}

export { createTransaction, createInitialFundsTransaction }