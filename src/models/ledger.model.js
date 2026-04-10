import mongoose from "mongoose";

const ledgerSchema=new mongoose.Schema({
  account:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"account",
    required:[true,"Ledger entry must be associated with an account"],
    index:true,
    immutable:true
  },
  amount:{
    type:Number,
    required:[true,"Ledger entry must have an amount"],
    immutable:true
  },
  transaction:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"transaction",
    required:[true,"Ledger entry must be associated with a transaction"],
    index:true,
    immutable:true
  },
  type:{
    type:String,
    enum:{
      values:["DEBIT","CREDIT"],    
      message:"Ledger entry type must be either DEBIT or CREDIT",
    },
    required:[true,"Ledger entry must have a type"],  
    immutable:true
  }
})

function preventLedgerModification(){
  throw new Error("Ledger entries cannot be modified or deleted");
}

ledgerSchema.pre("findOneAndUpdate", preventLedgerModification);
ledgerSchema.pre("findOneAndDelete", preventLedgerModification);
ledgerSchema.pre("updateOne", preventLedgerModification);
ledgerSchema.pre("deleteOne", preventLedgerModification); 
ledgerSchema.pre("remove", preventLedgerModification);
ledgerSchema.pre("deleteMany", preventLedgerModification);
ledgerSchema.pre("updateMany", preventLedgerModification);
ledgerSchema.pre("findOneAndReplace", preventLedgerModification);

const ledgerModel=mongoose.model("ledger",ledgerSchema);

export default ledgerModel;