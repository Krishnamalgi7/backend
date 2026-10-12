const express = require("express");

const upload = require("../config/upload");

const verifyToken = require("../middleware/authMiddleware");

const {
  getPhones,
  getPhoneById,
  createPhone,
  updatePhone,
  deletePhone,
  getPhoneFilters,
  togglePhoneStatus,
  getVariantsByBrand,
} = require("../controllers/phoneController");

const router = express.Router();

// Get all phones
router.get("/", getPhones);

router.get("/variants", getVariantsByBrand);

// Create a phone with Admin JWT required
router.post("/", verifyToken, upload.fields([
  { name: "image", maxCount: 1 },
  { name: "images", maxCount: 4 },
]), createPhone);

// Filter phone route
router.get("/filters", getPhoneFilters);

// Get one phone
router.get("/:id", getPhoneById);

// Update a phone with Admin JWT required
router.put(
  "/:id",
  verifyToken,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "images", maxCount: 4 },
  ]),
  updatePhone,
);

// Toggle phone active / inactive
router.patch("/:id/status", verifyToken, togglePhoneStatus);

// Delete a phone with Admin JWT required
router.delete("/:id", verifyToken, deletePhone);

module.exports = router;
