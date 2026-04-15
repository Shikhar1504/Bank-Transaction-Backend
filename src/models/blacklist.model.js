import mongoose from "mongoose";

const tokenBlacklistSchema=new mongoose.Schema({
  token:{
    type:String,
    required:[true, "Token is required"],
    unique:[true, "Token is already blacklisted"]
  }
},{
  timestamps:true 
})

tokenBlacklistSchema.index({createdAt:1},{
  expireAfterSeconds:60*60*24*3 // 3 days
});

const tokenBlacklistModel=mongoose.model("TokenBlacklist",tokenBlacklistSchema);

export default tokenBlacklistModel;