const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    invoiceDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

  
    // STORE DETAILS SNAPSHOT

    storeName: {
      type: String,
      required: true,
      trim: true,
    },

    storeLogo: {
      type: String,
      default: "",
    },

    storeAddress: {
      type: String,
      default: "",
      trim: true,
    },

    storePhone: {
      type: String,
      default: "",
      trim: true,
    },

    storeGstNumber: {
      type: String,
      default: "",
      trim: true,
    },

    // CUSTOMER DETAILS

    customerId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Customer",
  required: false,
},

    customerName: {
  type: String,
  required: false,
  default: "",
  trim: true,
},

customerPhone: {
  type: String,
  required: true,
  trim: true,
},

customerEmail: {
  type: String,
  required: false,
  default: "",
  trim: true,
  lowercase: true,
},

customerAddress: {
  type: String,
  required: false,
  default: "",
  trim: true,
},

    // PHONE / ITEM DETAILS SNAPSHOT

     items: [
  {
    phoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Phone",
      required: true,
    },

    itemDescription: {
      type: String,
      required: true,
      trim: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    originalPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    discount: {
      type: Number,
      required: true,
      min: 0,
    },

    priceAfterDiscount: {
      type: Number,
      required: true,
      min: 0,
    },

    taxableAmount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
],

    phoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Phone",
      required: false,
    },

    itemDescription: {
      type: String,
      required: false,
      trim: true,
    },

    quantity: {
      type: Number,
      required: false,
      min: 1,
    },

    originalPrice: {
      type: Number,
      required: false,
      min: 0,
    },

    discount: {
      type: Number,
      required: false,
      min: 0,
    },

    priceAfterDiscount: {
      type: Number,
      required: false,
      min: 0,
    },

    // TAX DETAILS
     
    gstPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    gstAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    taxableSubtotal: {
  type: Number,
  required: true,
  min: 0,
},

    // FINAL AMOUNT
   
    roundedOff: {
      type: Number,
      default: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    amountInWords: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

const Invoice = mongoose.model("Invoice", invoiceSchema);

module.exports = Invoice;