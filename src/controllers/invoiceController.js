const mongoose = require("mongoose");
const Invoice = require("../models/Invoice");
const Phone = require("../models/Phone");
const Brand = require("../models/Brand");
const StoreSetting = require("../models/StoreSetting");
const InvoiceCounter = require("../models/InvoiceCounter");
const numberToWords = require("../utils/numberToWords");
const generateInvoicePdf = require("../utils/invoicePdf");
const Cart = require("../models/Cart");
const Customer = require("../models/Customer");

const getBillingPhones = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      search = "",
      brand = "",
      variant = "",
      ram = "",
      rom = "",
      rating = "",
      priceMin,
      priceMax,
      priceSort = "",
    } = req.query;

    const currentPage = Math.max(parseInt(page, 10) || 1, 1);

    const requestedLimit = parseInt(limit, 10) || 12;

    const pageSize = Math.min(Math.max(requestedLimit, 1), 50);

    const skip = (currentPage - 1) * pageSize;

    const filter = {
      isActive: true,
      quantity: { $gt: 0 },
    };

    /*
     * SEARCH
     */
    if (search.trim()) {
      const searchValue = search.trim();

      const matchingBrands = await Brand.find({
        name: {
          $regex: searchValue,
          $options: "i",
        },
        isActive: true,
      }).select("_id");

      const brandIds = matchingBrands.map((item) => item._id);

      filter.$or = [
        {
          name: {
            $regex: searchValue,
            $options: "i",
          },
        },
        {
          brandId: {
            $in: brandIds,
          },
        },
      ];
    }

    /*
     * MASTER FILTERS
     */
    if (brand.trim()) {
      filter.brandId = brand.trim();
    }

    if (variant.trim()) {
      filter.variantId = variant.trim();
    }

    if (ram.trim()) {
      filter.ramId = ram.trim();
    }

    if (rom.trim()) {
      filter.romId = rom.trim();
    }

    /*
     * RATING
     */
    if (rating !== undefined && rating !== "") {
      const minimumRating = Number(rating);

      if (
        Number.isNaN(minimumRating) ||
        minimumRating < 0 ||
        minimumRating > 5
      ) {
        return res.status(400).json({
          message: "Invalid rating filter",
        });
      }

      filter.averageRating = {
        $gte: minimumRating,
      };
    }

    /*
     * PRICE
     */
    const hasMinPrice = priceMin !== undefined && priceMin !== "";
    const hasMaxPrice = priceMax !== undefined && priceMax !== "";

    if (hasMinPrice || hasMaxPrice) {
      const minimumPrice = hasMinPrice ? Number(priceMin) : 0;
      const maximumPrice = hasMaxPrice
        ? Number(priceMax)
        : Number.MAX_SAFE_INTEGER;

      if (
        Number.isNaN(minimumPrice) ||
        Number.isNaN(maximumPrice) ||
        minimumPrice < 0 ||
        maximumPrice < 0 ||
        minimumPrice > maximumPrice
      ) {
        return res.status(400).json({
          message: "Invalid price range",
        });
      }

      filter.totalPrice = {
        $gte: minimumPrice,
        $lte: maximumPrice,
      };
    }

    /*
     * SORTING
     */
    let sortOption = {
      createdAt: -1,
    };

    if (priceSort === "low-high") {
      sortOption = {
        totalPrice: 1,
      };
    } else if (priceSort === "high-low") {
      sortOption = {
        totalPrice: -1,
      };
    }

    /*
     * FETCH PHONES
     */
    const totalItems = await Phone.countDocuments(filter);

    const phones = await Phone.find(filter)
      .populate("brandId", "name")
      .populate("variantId", "name")
      .populate("ramId", "value")
      .populate("romId", "value")
      .populate("colorId", "name")
      .sort(sortOption)
      .skip(skip)
      .limit(pageSize);

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);

    return res.status(200).json({
      phones,
      pagination: {
        currentPage,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
      },
    });
  } catch (error) {
    console.error("Failed to fetch billing phones:", error);

    return res.status(500).json({
      message: "Failed to fetch billing phones",
    });
  }
};

const createInvoice = async (req, res) => {
  let session;

  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const {
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
      items,
    } = req.body;

    const storeSetting = await StoreSetting.findOne().session(session);

    if (!storeSetting) {
      await session.abortTransaction();
      session.endSession();

      return res.status(404).json({
        message: "Store settings not found",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      await session.abortTransaction();
      session.endSession();

      return res.status(400).json({
        message: "At least one item is required",
      });
    }

    if (!customerName || !customerPhone || !customerEmail || !customerAddress) {
      await session.abortTransaction();
      session.endSession();

      return res.status(400).json({
        message: "Customer details are required",
      });
    }

    const gstPercentage = Number(storeSetting.gstPercentage || 0);

    const invoiceItems = [];
    let taxableSubtotal = 0;

    for (const item of items) {
      const { phoneId, quantity } = item;

      if (!mongoose.isValidObjectId(phoneId)) {
        await session.abortTransaction();
        session.endSession();

        return res.status(400).json({
          message: "Invalid phone ID",
        });
      }

      const requestedQuantity = Number(quantity);

      if (!Number.isInteger(requestedQuantity) || requestedQuantity < 1) {
        await session.abortTransaction();
        session.endSession();

        return res.status(400).json({
          message: "Quantity must be a positive integer",
        });
      }

      const phone = await Phone.findOne({
        _id: phoneId,
        isActive: true,
      }).session(session);

      if (!phone) {
        await session.abortTransaction();
        session.endSession();

        return res.status(404).json({
          message: "Phone not found or inactive",
        });
      }

      if (phone.quantity < requestedQuantity) {
        await session.abortTransaction();
        session.endSession();

        return res.status(400).json({
          message: `Insufficient stock for ${phone.name}`,
        });
      }

      const originalPrice = Number(phone.price);
      const discount = Number(phone.discountPrice || 0);
      const priceAfterDiscount = Number(phone.totalPrice);

      const taxableAmount = Number(
        (priceAfterDiscount * requestedQuantity).toFixed(2),
      );

      taxableSubtotal = Number((taxableSubtotal + taxableAmount).toFixed(2));

      invoiceItems.push({
        phoneId: phone._id,
        itemDescription: phone.name,
        quantity: requestedQuantity,
        originalPrice,
        discount,
        priceAfterDiscount,
        taxableAmount,
      });
    }

    const gstAmount = Number(
      ((taxableSubtotal * gstPercentage) / 100).toFixed(2),
    );

    const calculatedTotal = Number((taxableSubtotal + gstAmount).toFixed(2));

    const totalAmount = Number(calculatedTotal.toFixed(0));

    const roundedOff = Number((totalAmount - calculatedTotal).toFixed(2));

    const amountInWords = numberToWords(totalAmount);

    const currentYear = new Date().getFullYear();

    const counter = await InvoiceCounter.findOneAndUpdate(
      { year: currentYear },
      {
        $inc: {
          lastNumber: 1,
        },
      },
      {
        returnDocument: "after",
        upsert: true,
        setDefaultsOnInsert: true,
        session,
      },
    );

    const nextNumber = counter.lastNumber;

    const invoiceNumber = `INV-${currentYear}-${String(nextNumber).padStart(
      5,
      "0",
    )}`;


    const invoice = await Invoice.create(
      [
        {
          invoiceNumber,
          storeName: storeSetting.brandName,
          storeLogo: storeSetting.logo,
          storeAddress: storeSetting.address,
          storePhone: storeSetting.phoneNumber,
          storeGstNumber: storeSetting.gstNumber,

          customerName,
          customerPhone,
          customerEmail,
          customerAddress,

          items: invoiceItems,

          gstPercentage,
          gstAmount,
          taxableSubtotal,
          roundedOff,
          totalAmount,
          amountInWords,
          
        },
      ],
      { session },
    );

    for (const item of invoiceItems) {
      const updatedPhone = await Phone.findOneAndUpdate(
        {
          _id: item.phoneId,
          isActive: true,
          quantity: { $gte: item.quantity },
        },
        {
          $inc: {
            quantity: -item.quantity,
          },
        },
        {
          session,
        },
      );

      if (!updatedPhone) {
        throw new Error(`Failed to update stock for phone ${item.phoneId}`);
      }
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      message: "Invoice created successfully",
      invoice: invoice[0],
    });
  } catch (error) {
    console.error("Create invoice error:", error);

    if (session) {
      await session.abortTransaction();
      session.endSession();
    }

    return res.status(500).json({
      message: "Failed to create invoice",
    });
  }
};

const createCustomerInvoice = async (req, res) => {
  let session;

  try {
    const customerId = req.customer.customerId;

    session = await mongoose.startSession();
    session.startTransaction();

    // 1. Get the logged-in customer
    const customer = await Customer.findById(customerId).session(session);

    if (!customer) {
      await session.abortTransaction();
      session.endSession();

      return res.status(404).json({
        message: "Customer not found",
      });
    }

    // 2. Get store settings
    const storeSetting = await StoreSetting.findOne().session(session);

    if (!storeSetting) {
      await session.abortTransaction();
      session.endSession();

      return res.status(404).json({
        message: "Store settings not found",
      });
    }

    // 3. Get customer's cart
    const cart = await Cart.findOne({ customerId }).session(session);

    if (!cart || cart.items.length === 0) {
      await session.abortTransaction();
      session.endSession();

      return res.status(400).json({
        message: "Cart is empty",
      });
    }

    const gstPercentage = Number(storeSetting.gstPercentage || 0);

    const invoiceItems = [];
    let taxableSubtotal = 0;

    // 4. Read CURRENT phone data from database
    for (const cartItem of cart.items) {
      const requestedQuantity = Number(cartItem.quantity);

      const phone = await Phone.findOne({
        _id: cartItem.phoneId,
        isActive: true,
      }).session(session);

      if (!phone) {
        await session.abortTransaction();
        session.endSession();

        return res.status(404).json({
          message: "One of the phones in your cart is no longer available",
        });
      }

      // 5. Check CURRENT stock
      if (phone.quantity < requestedQuantity) {
        await session.abortTransaction();
        session.endSession();

        return res.status(400).json({
          message: `Insufficient stock for ${phone.name}. Only ${phone.quantity} item(s) are available`,
        });
      }

      // 6. IMPORTANT:
      // Never trust the price stored in the mobile cart.
      // Use the latest price from the Phone document.
      const originalPrice = Number(phone.price);
      const discount = Number(phone.discountPrice || 0);
      const priceAfterDiscount = Number(phone.totalPrice);

      const taxableAmount = Number(
        (priceAfterDiscount * requestedQuantity).toFixed(2)
      );

      taxableSubtotal = Number(
        (taxableSubtotal + taxableAmount).toFixed(2)
      );

      invoiceItems.push({
        phoneId: phone._id,
        itemDescription: phone.name,
        quantity: requestedQuantity,
        originalPrice,
        discount,
        priceAfterDiscount,
        taxableAmount,
      });
    }

    // 7. Calculate GST
    const gstAmount = Number(
      ((taxableSubtotal * gstPercentage) / 100).toFixed(2)
    );

    // 8. Calculate final amount
    const calculatedTotal = Number(
      (taxableSubtotal + gstAmount).toFixed(2)
    );

    const totalAmount = Number(calculatedTotal.toFixed(0));

    const roundedOff = Number(
      (totalAmount - calculatedTotal).toFixed(2)
    );

    const amountInWords = numberToWords(totalAmount);

    // 9. Generate invoice number using the existing counter
    const currentYear = new Date().getFullYear();

    const counter = await InvoiceCounter.findOneAndUpdate(
      { year: currentYear },
      {
        $inc: {
          lastNumber: 1,
        },
      },
      {
        returnDocument: "after",
        upsert: true,
        setDefaultsOnInsert: true,
        session,
      }
    );

    const nextNumber = counter.lastNumber;

    const invoiceNumber = `INV-${currentYear}-${String(
      nextNumber
    ).padStart(5, "0")}`;

    // 10. Create invoice
    const invoice = await Invoice.create(
      [
        {
          invoiceNumber,

          storeName: storeSetting.brandName,
          storeLogo: storeSetting.logo,
          storeAddress: storeSetting.address,
          storePhone: storeSetting.phoneNumber,
          storeGstNumber: storeSetting.gstNumber,

          customerId: customer._id,
          customerName: customer.name,
          customerPhone: customer.phone,
          customerEmail: customer.email,
          customerAddress: customer.address,

          items: invoiceItems,

          gstPercentage,
          gstAmount,
          taxableSubtotal,
          roundedOff,
          totalAmount,
          amountInWords,
        },
      ],
      { session }
    );

    // 11. Reduce stock ONLY after invoice data is prepared
    for (const item of invoiceItems) {
      const updatedPhone = await Phone.findOneAndUpdate(
        {
          _id: item.phoneId,
          isActive: true,
          quantity: { $gte: item.quantity },
        },
        {
          $inc: {
            quantity: -item.quantity,
          },
        },
        {
          session,
        }
      );

      if (!updatedPhone) {
        throw new Error(
          `Failed to update stock for phone ${item.phoneId}`
        );
      }
    }

    // 12. Clear cart after successful invoice + stock operations
    cart.items = [];
    await cart.save({ session });

    // 13. Commit everything together
    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      message: "Customer invoice created successfully",
      invoice: invoice[0],
    });
  } catch (error) {
    console.error("Create customer invoice error:", error);

    if (session) {
      await session.abortTransaction();
      session.endSession();
    }

    return res.status(500).json({
      message: "Failed to create customer invoice",
    });
  }
};

const getCustomerInvoices = async (req, res) => {
  try {
    const customerId = req.customer.customerId;

    const invoices = await Invoice.find({ customerId })
      .sort({ invoiceDate: -1 })
      .select(
        "invoiceNumber invoiceDate storeName customerName items gstPercentage gstAmount taxableSubtotal roundedOff totalAmount amountInWords createdAt"
      )
      .populate({
        path: "items.phoneId",
        select: "image images averageRating ratingCount",
      });

    return res.status(200).json({
      invoices,
    });
  } catch (error) {
    console.error("Get customer invoices error:", error);

    return res.status(500).json({
      message: "Failed to fetch customer invoices",
    });
  }
};

const getInvoiceByNumber = async (req, res) => {
  try {
    const { invoiceNumber } = req.params;

    if (!invoiceNumber || !invoiceNumber.trim()) {
      return res.status(400).json({
        message: "Invoice number is required",
      });
    }

    const invoice = await Invoice.findOne({
      invoiceNumber: invoiceNumber.trim(),
    });

    if (!invoice) {
      return res.status(404).json({
        message: "Invoice not found",
      });
    }

    return res.status(200).json({
      message: "Invoice found successfully",
      invoice,
    });
  } catch (error) {
    console.error("Failed to fetch invoice:", error);

    return res.status(500).json({
      message: "Failed to fetch invoice",
    });
  }
};

const downloadInvoicePdf = async (req, res) => {
  try {
    const { invoiceNumber } = req.params;

    if (!invoiceNumber || !invoiceNumber.trim()) {
      return res.status(400).json({
        message: "Invoice number is required",
      });
    }

    const invoice = await Invoice.findOne({
      invoiceNumber: invoiceNumber.trim(),
    });

    if (!invoice) {
      return res.status(404).json({
        message: "Invoice not found",
      });
    }

    return generateInvoicePdf(invoice, res);
  } catch (error) {
    console.error("Failed to generate invoice PDF:", error);

    return res.status(500).json({
      message: "Failed to generate invoice PDF",
    });
  }
};

const getInvoices = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const currentPage = Math.max(parseInt(page, 10) || 1, 1);

    const requestedLimit = parseInt(limit, 10) || 10;

    const pageSize = Math.min(Math.max(requestedLimit, 1), 50);

    const skip = (currentPage - 1) * pageSize;

    const filter = {};

    if (search.trim()) {
      const searchValue = search.trim();

      filter.$or = [
        {
          invoiceNumber: {
            $regex: searchValue,
            $options: "i",
          },
        },
        {
          customerName: {
            $regex: searchValue,
            $options: "i",
          },
        },
        {
          customerPhone: {
            $regex: searchValue,
            $options: "i",
          },
        },
      ];
    }

    const totalItems = await Invoice.countDocuments(filter);

    const invoices = await Invoice.find(filter)
      .select(
        "invoiceNumber invoiceDate customerName customerPhone itemDescription totalAmount",
      )
      .sort({
        invoiceDate: -1,
      })
      .skip(skip)
      .limit(pageSize);

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);

    return res.status(200).json({
      invoices,
      pagination: {
        currentPage,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
      },
    });
  } catch (error) {
    console.error("Failed to fetch invoices:", error);

    return res.status(500).json({
      message: "Failed to fetch invoices",
    });
  }
};

module.exports = {
  createInvoice,
  getBillingPhones,
  getInvoiceByNumber,
  downloadInvoicePdf,
  getInvoices,
  createCustomerInvoice,
  getCustomerInvoices,
};
