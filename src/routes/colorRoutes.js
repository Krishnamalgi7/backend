const express = require("express");

const {
  getColors,
    getAllColors,
  createColor,
   toggleColorStatus,
} = require("../controllers/colorController");

const verifyToken = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getColors);
router.get("/all", verifyToken, getAllColors);
router.post("/", verifyToken, createColor);
router.patch("/:id/toggle", verifyToken, toggleColorStatus);

module.exports = router;