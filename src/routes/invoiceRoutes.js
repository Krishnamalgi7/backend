const express = require("express");
const {
  createInvoice,
  getBillingPhones,
  getInvoiceByNumber,
  downloadInvoicePdf,
  getInvoices,
  createCustomerInvoice,
  getCustomerInvoices,
} = require("../controllers/invoiceController");
const verifyToken = require("../middleware/authMiddleware");

const router = express.Router();
const customerAuthMiddleware = require("../middleware/customerAuthMiddleware");

router.get("/phones", verifyToken, getBillingPhones);
router.post("/create-bill", verifyToken, createInvoice);
router.get("/history", verifyToken, getInvoices);


router.get(
  "/customer-history",
  customerAuthMiddleware,
  getCustomerInvoices
);

router.post(
  "/create-customer-invoice",
  customerAuthMiddleware,
  createCustomerInvoice
);


router.get("/:invoiceNumber/pdf", verifyToken, downloadInvoicePdf);

router.get("/:invoiceNumber", verifyToken, getInvoiceByNumber);


module.exports = router;
