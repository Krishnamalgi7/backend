const mongoose = require("mongoose");

const storeSettingSchema = new mongoose.Schema(
  {
    brandName: {
      type: String,
      required: true,
      trim: true,
    },

    logo: {
      type: String,
      default: "/logo.png",
    },

     gstNumber: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
    },

    gstPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    address: {
      type: String,
      default: "",
      trim: true,
    },

    phoneNumber: {
      type: String,
      default: "",
      trim: true,
    },

  },
  {
    timestamps: true,
  },
);

const StoreSetting = mongoose.model(
  "StoreSetting",
  storeSettingSchema,
);

module.exports = StoreSetting;