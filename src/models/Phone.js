const mongoose = require("mongoose");

const phoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
    },

    discountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Discount",
      default: null,
    },

    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    discountPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    imageUrl: {
      type: String,
      default: null,
    },

    image: {
      type: String,
      default: null,
    },

    images: {
      type: [String],
      default: [],
      validate: {
        validator: function (value) {
          return value.length <= 4;
        },
        message: "A maximum of 4 additional images is allowed",
      },
    },

    isNewPhone: {
      type: Boolean,
      default: false,
    },

    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    ratingCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    /*
     * -----------------------------------------
     * OLD / DISPLAY FIELDS
     * -----------------------------------------
     *
     * These remain strings because your existing
     * MongoDB documents already contain values like:
     *
     * brand: "IPhone"
     * variant: "ios"
     * ram: "8"
     * rom: "128"
     */

    brand: {
      type: String,
      required: true,
    },

    variant: {
      type: String,
      required: true,
    },

    ram: {
      type: String,
      required: true,
    },

    rom: {
      type: String,
      required: true,
    },

    /*
     * -----------------------------------------
     * NEW REFERENCE FIELDS
     * -----------------------------------------
     */

    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
    },

    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Variant",
      required: true,
    },

    ramId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ram",
      required: true,
    },

    romId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rom",
      required: true,
    },

    colorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Color",
      required: true,
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

const Phone = mongoose.model("Phone", phoneSchema);

module.exports = Phone;
