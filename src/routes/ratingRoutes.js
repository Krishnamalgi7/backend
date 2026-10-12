
const express = require("express");

const { createRating, getMyRating } = require("../controllers/ratingController");
const customerAuthMiddleware = require("../middleware/customerAuthMiddleware");

const router = express.Router();

router.get("/:id", customerAuthMiddleware, getMyRating);
router.post("/:id", customerAuthMiddleware, createRating);

module.exports = router;
