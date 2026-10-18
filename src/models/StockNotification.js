const mongoose = require("mongoose");

const stockNotificationSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    phoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Phone",
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "notified", "cancelled"],
      default: "pending",
    },

    notifiedAt: {
      type: Date,
      default: null,
    },

    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Prevent duplicate pending requests for the same customer and phone.
stockNotificationSchema.index(
  { customerId: 1, phoneId: 1 },
  {
    unique: true,
  },
);

module.exports = mongoose.model("StockNotification", stockNotificationSchema);
