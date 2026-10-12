const Cart = require("../models/Cart");
const Phone = require("../models/Phone");

const addToCart = async (req, res) => {
  try {
    const { phoneId } = req.body;
    const requestedQuantity = Number(req.body.quantity ?? 1);
    const hasRequestedQuantity = req.body.quantity !== undefined;
    const customerId = req.customer.customerId;

    if (!phoneId) {
      return res.status(400).json({
        message: "Phone ID is required",
      });
    }

    const phone = await Phone.findOne({
      _id: phoneId,
      isActive: true,
    });

    if (!phone) {
      return res.status(404).json({
        message: "Phone not found",
      });
    }

    if (phone.quantity <= 0) {
      return res.status(400).json({
        message: "Phone is out of stock",
      });
    }

    if (
  !Number.isInteger(requestedQuantity) ||
  requestedQuantity < 1
) {
  return res.status(400).json({
    message: "Quantity must be a positive integer",
  });
}

if (requestedQuantity > phone.quantity) {
  return res.status(400).json({
    message: `Only ${phone.quantity} item(s) are currently available`,
  });
}

    let cart = await Cart.findOne({ customerId });

    if (!cart) {
      cart = await Cart.create({
        customerId,
        items: [
          {
            phoneId,
            quantity: requestedQuantity,
          },
        ],
      });

      return res.status(201).json({
        message: "Phone added to cart",
        cart,
      });
    }

    const existingItem = cart.items.find(
      (item) => item.phoneId.toString() === phoneId
    );

    if (existingItem) {
      if (existingItem.quantity >= phone.quantity) {
        return res.status(400).json({
          message: "Cannot add more than available stock",
        });
      }
if (hasRequestedQuantity) {
  existingItem.quantity = requestedQuantity;
} else {
      existingItem.quantity += 1;
}
    } else {
      cart.items.push({
        phoneId,
        quantity: requestedQuantity,
      });
    }

    await cart.save();

    return res.status(200).json({
      message: "Phone added to cart",
      cart,
    });
  } catch (error) {
    console.error("Add to cart error:", error);

    return res.status(500).json({
      message: "Failed to add phone to cart",
    });
  }
};

const getCart = async (req, res) => {
  try {
    const customerId = req.customer.customerId;

    const cart = await Cart.findOne({ customerId }).populate({
      path: "items.phoneId",
      select:
        "name price discountPercentage discountPrice totalPrice image images brand variant ram rom quantity isActive",
    });

    if (!cart) {
      return res.status(200).json({
        message: "Cart is empty",
        cart: {
          items: [],
        },
      });
    }

    return res.status(200).json({
      message: "Cart fetched successfully",
      cart,
    });
  } catch (error) {
    console.error("Get cart error:", error);

    return res.status(500).json({
      message: "Failed to fetch cart",
    });
  }
};

const updateCartQuantity = async (req, res) => {
  try {
    const customerId = req.customer.customerId;
    const { phoneId, quantity } = req.body;

    // 1. Validate required fields
    if (!phoneId || quantity === undefined) {
      return res.status(400).json({
        message: "phoneId and quantity are required",
      });
    }

    // 2. Validate quantity
    const requestedQuantity = Number(quantity);

    if (
      !Number.isInteger(requestedQuantity) ||
      requestedQuantity < 1
    ) {
      return res.status(400).json({
        message: "Quantity must be a positive integer",
      });
    }

    // 3. Check the current phone and its stock
    const phone = await Phone.findOne({
      _id: phoneId,
      isActive: true,
    });

    if (!phone) {
      return res.status(404).json({
        message: "Phone not found or inactive",
      });
    }

    // 4. Make sure requested quantity is currently available
    if (requestedQuantity > phone.quantity) {
      return res.status(400).json({
        message: `Only ${phone.quantity} item(s) are currently available`,
      });
    }

    // 5. Find the customer's cart
    const cart = await Cart.findOne({ customerId });

    if (!cart) {
      return res.status(404).json({
        message: "Cart not found",
      });
    }

    // 6. Find the phone inside the cart
    const cartItem = cart.items.find(
      (item) => item.phoneId.toString() === phoneId.toString()
    );

    if (!cartItem) {
      return res.status(404).json({
        message: "Phone is not in the cart",
      });
    }

    // 7. Update only the cart quantity
    cartItem.quantity = requestedQuantity;

    await cart.save();

    return res.status(200).json({
      message: "Cart quantity updated successfully",
      cart,
    });
  } catch (error) {
    console.error("Update cart quantity error:", error);

    return res.status(500).json({
      message: "Failed to update cart quantity",
    });
  }
};

const removeFromCart = async (req, res) => {
  try {
    const customerId = req.customer.customerId;
    const { phoneId } = req.body;

    // 1. Validate phoneId
    if (!phoneId) {
      return res.status(400).json({
        message: "phoneId is required",
      });
    }

    // 2. Find the customer's cart
    const cart = await Cart.findOne({ customerId });

    if (!cart) {
      return res.status(404).json({
        message: "Cart not found",
      });
    }

    // 3. Check whether the phone exists in the cart
    const cartItemExists = cart.items.some(
      (item) => item.phoneId.toString() === phoneId.toString()
    );

    if (!cartItemExists) {
      return res.status(404).json({
        message: "Phone is not in the cart",
      });
    }

    // 4. Remove the phone from the cart
    cart.items = cart.items.filter(
      (item) => item.phoneId.toString() !== phoneId.toString()
    );

    await cart.save();

    return res.status(200).json({
      message: "Phone removed from cart successfully",
      cart,
    });
  } catch (error) {
    console.error("Remove from cart error:", error);

    return res.status(500).json({
      message: "Failed to remove phone from cart",
    });
  }
};

const getCartSummary = async (req, res) => {
  try {
    const customerId = req.customer.customerId;

    const cart = await Cart.findOne({ customerId });

    if (!cart || cart.items.length === 0) {
      return res.status(200).json({
        summary: {
          originalPrice: 0,
          discount: 0,
          taxableSubtotal: 0,
          gstPercentage: 0,
          gstAmount: 0,
          roundedOff: 0,
          totalAmount: 0,
        },
      });
    }

    const storeSetting = await require("../models/StoreSetting").findOne();

    if (!storeSetting) {
      return res.status(404).json({
        message: "Store settings not found",
      });
    }

    const gstPercentage = Number(
      storeSetting.gstPercentage || 0
    );

    let originalPrice = 0;
    let discount = 0;
    let taxableSubtotal = 0;

    for (const cartItem of cart.items) {
      const phone = await Phone.findOne({
        _id: cartItem.phoneId,
        isActive: true,
      });

      if (!phone) {
        return res.status(404).json({
          message: "One of the phones in your cart is no longer available",
        });
      }

      const quantity = Number(cartItem.quantity);

      const phoneOriginalPrice = Number(phone.price);
      const phoneDiscount = Number(phone.discountPrice || 0);
      const priceAfterDiscount = Number(phone.totalPrice);

      originalPrice += phoneOriginalPrice * quantity;
      discount += phoneDiscount * quantity;
      taxableSubtotal += priceAfterDiscount * quantity;
    }

    originalPrice = Number(originalPrice.toFixed(2));
    discount = Number(discount.toFixed(2));
    taxableSubtotal = Number(taxableSubtotal.toFixed(2));

    const gstAmount = Number(
      ((taxableSubtotal * gstPercentage) / 100).toFixed(2)
    );

    const calculatedTotal = Number(
      (taxableSubtotal + gstAmount).toFixed(2)
    );

    const totalAmount = Number(
      calculatedTotal.toFixed(0)
    );

    const roundedOff = Number(
      (totalAmount - calculatedTotal).toFixed(2)
    );

    return res.status(200).json({
      summary: {
        originalPrice,
        discount,
        taxableSubtotal,
        gstPercentage,
        gstAmount,
        roundedOff,
        totalAmount,
      },
    });
  } catch (error) {
    console.error("Get cart summary error:", error);

    return res.status(500).json({
      message: "Failed to calculate cart summary",
    });
  }
};

module.exports = {
  addToCart,
  getCart,
  updateCartQuantity,
  removeFromCart,
  getCartSummary,
};