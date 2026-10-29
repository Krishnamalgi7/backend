const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },

    // Keep the existing reply field for backward compatibility.
    reply: {
      type: String,
      default: "",
      trim: true,
    },

    // Store the complete conversation history.
    messages: [
      {
        sender: {
          type: String,
          enum: ["customer", "admin"],
          required: true,
        },

        text: {
          type: String,
          required: true,
          trim: true,
        },

        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    lastAdminReplyAt: {
      type: Date,
      default: null,
    },

    lastAdminReplyReadAt: {
      type: Date,
      default: null,
    },

    // Track whether the admin has read this query notification.
    adminNotificationReadAt: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["pending", "in_progress", "completed"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  },
);

const Contact = mongoose.model("Contact", contactSchema);

module.exports = Contact;
