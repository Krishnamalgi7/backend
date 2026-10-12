const mongoose = require("mongoose");

const phoneSettingSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["variant", "brand", "ram", "rom", "discount"],
    },

    value: {
      type: String,
      required: true,
      trim: true,
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

const PhoneSetting = mongoose.model(
  "PhoneSetting",
  phoneSettingSchema,
);

module.exports = PhoneSetting;