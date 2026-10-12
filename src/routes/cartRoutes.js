const express = require("express");

const customerAuthMiddleware = require("../middleware/customerAuthMiddleware");

const {
  addToCart,
  getCart,
  getCartSummary,
  updateCartQuantity,
  removeFromCart
} = require("../controllers/cartController");

const router = express.Router();

router.post(
  "/add",
  customerAuthMiddleware,
  addToCart
);

router.get(
  "/get-cart",
  customerAuthMiddleware,
  getCart
);

router.get(
  "/get-cart-summary",
  customerAuthMiddleware,
  getCartSummary
);

router.patch(
  "/update-quantity",
  customerAuthMiddleware,
  updateCartQuantity
);

router.delete(
  "/remove-from-cart",
  customerAuthMiddleware,
  removeFromCart
);

module.exports = router;