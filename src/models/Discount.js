const mongoose = require("mongoose");

const discountSchema = new mongoose.Schema(
  {
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

const Discount = mongoose.model("Discount", discountSchema);

module.exports = Discount;