const mongoose = require("mongoose");

const romSchema = new mongoose.Schema(
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

const Rom = mongoose.model("Rom", romSchema);

module.exports = Rom;