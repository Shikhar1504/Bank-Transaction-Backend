import userModel from "../models/user.model.js";
import jwt from "jsonwebtoken";

async function authMiddleware(req,res,next) {
  let token;

if (req.cookies.token) {
  token = req.cookies.token;
} else if (req.headers.authorization?.startsWith("Bearer ")) {
  token = req.headers.authorization.split(" ")[1];
}

  if(!token){
    return res.status(401).json({
      success:false,
      message:"Unauthorized"
    })
  }

  try {
    const decoded=jwt.verify(token,process.env.JWT_SECRET);
    const user = await userModel.findById(decoded.userId).select("-password");
    if (!user) {
  return res.status(401).json({
    success: false,
    message: "User not found"
  });
}
    req.user=user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired"
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid token"
    });
  }

}

async function authSystemUserMiddleware(req,res,next) {
  let token;

if (req.cookies.token) {
  token = req.cookies.token;
} else if (req.headers.authorization?.startsWith("Bearer ")) {
  token = req.headers.authorization.split(" ")[1];
}

  if(!token){
    return res.status(401).json({
      success:false,
      message:"Unauthorized"
    })
  }

  try{
    const decoded=jwt.verify(token,process.env.JWT_SECRET);
    const user=await userModel.findById(decoded.userId).select("+systemUser");
    if (!user || !user.systemUser) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid token"
    });
  }
}

export {authMiddleware, authSystemUserMiddleware};