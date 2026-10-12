const express = require("express");

const upload = require("../config/upload");
const verifyToken = require("../middleware/authMiddleware");

const {
  getStoreSetting,
  updateStoreSetting,
} = require("../controllers/storeSettingController");

const router = express.Router();

// Public
router.get("/", getStoreSetting);

// Admin only
router.put("/", verifyToken, upload.single("logo"), updateStoreSetting);

module.exports = router;