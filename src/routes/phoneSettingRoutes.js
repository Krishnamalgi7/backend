const express = require("express");

const verifyToken = require("../middleware/authMiddleware");

const {
  getSettings,
  createSetting,
  updateSettingStatus,
  deleteSetting,

} = require("../controllers/phoneSettingController");

const{
  getDiscountMeta,
  getDiscounts,
  createDiscount,
  updateDiscountStatus,
} = require("../controllers/discountController");

const router = express.Router();

router.get("/discount/meta", verifyToken, getDiscountMeta);
router.get("/discount", verifyToken, getDiscounts);
router.post("/discount", verifyToken, createDiscount);
router.patch("/discount/:id/status", verifyToken, updateDiscountStatus);

router.get("/", verifyToken, getSettings);
router.post("/", verifyToken, createSetting);
router.patch("/:id/status", verifyToken, updateSettingStatus);
// router.delete("/:id", verifyToken, deleteSetting);

module.exports = router;