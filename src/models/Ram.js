const mongoose = require("mongoose");

const ramSchema = new mongoose.Schema(
  {
    value: {
      type: String,
      required: true,
      trim: true,
      unique: true,
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

const Ram = mongoose.model("Ram", ramSchema);

module.exports = Ram;