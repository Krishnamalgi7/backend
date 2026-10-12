const express = require("express");

const {
  sendOtp,
  verifyOtp,
  updateProfile,
  getProfile,
} = require("../controllers/customerAuthController");

const customerAuthMiddleware = require("../middleware/customerAuthMiddleware");

const router = express.Router();

// Authentication
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);

// Profile
router.get("/profile", customerAuthMiddleware, getProfile);
router.patch("/profile", customerAuthMiddleware, updateProfile);

module.exports = router;