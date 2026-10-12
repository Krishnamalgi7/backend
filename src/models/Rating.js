const mongoose = require("mongoose");

const ratingSchema = new mongoose.Schema(
  {
    phoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Phone",
      required: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    userKey: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

ratingSchema.index(
  { phoneId: 1, userKey: 1 },
  { unique: true },
);

module.exports = mongoose.model("Rating", ratingSchema);