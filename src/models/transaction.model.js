import mongoose from "mongoose";

const transactionSchema=new mongoose.Schema({
  fromAccount:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"account",
    required:[true,"Transaction must have a source account"],
    index:true
  },
  toAccount:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"account",
    required:[true,"Transaction must have a destination account"],    
    index:true
  },
  status:{
    type:String,
    enum:{
      values:["PENDING","COMPLETED","FAILED","REVERSED"],
      message:"Status must be either PENDING, COMPLETED ,FAILED or REVERSED",
    },
    default:"PENDING"
  },
  amount:{
    type:Number,
    required:[true,"Transaction amount is required"],
    min: [1, "Transaction amount must be greater than 0"]
  },
  idempotencyKey:{
    type:String,
    required:[true,"Idempotency key is required"],
    unique:true,
    index:true
  }
},{
  timestamps:true
})

const transactionModel=mongoose.model("transaction",transactionSchema);

export default transactionModel;