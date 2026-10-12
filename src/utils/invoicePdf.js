const PDFDocument = require("pdfkit");
const path = require("path");

const generateInvoicePdf = (invoice, res) => {
  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${invoice.invoiceNumber}.pdf"`,
  );

  doc.pipe(res);

  // STORE DETAILS

  if (invoice.storeLogo) {
    const logoPath = path.join(
      __dirname,
      "../../",
      invoice.storeLogo.replace(/^\/+/, ""),
    );

    try {
      doc.image(logoPath, {
        fit: [100, 70],
        align: "center",
      });

      doc.moveDown(0.5);
    } catch (error) {
      console.error("Failed to load invoice logo:", error);
    }
  }

  doc
    .fontSize(20)
    .font("Helvetica-Bold")
    .text(invoice.storeName || "Store", {
      align: "center",
    });

  doc.moveDown(0.5);

  doc
    .fontSize(10)
    .font("Helvetica")
    .text(invoice.storeAddress || "", {
      align: "center",
    });

  doc.text(`Phone: ${invoice.storePhone || "-"}`, {
    align: "center",
  });

  doc.text(`GSTIN: ${invoice.storeGstNumber || "-"}`, {
    align: "center",
  });

  doc.moveDown();

  // INVOICE TITLE
  doc.fontSize(18).font("Helvetica-Bold").text("TAX INVOICE", {
    align: "center",
  });

  doc.moveDown();

  // INVOICE INFORMATION
  doc
    .fontSize(10)
    .font("Helvetica")
    .text(`Invoice No: ${invoice.invoiceNumber}`);

  doc.text(
    `Invoice Date: ${new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}`,
  );

  doc.moveDown();

  // CUSTOMER DETAILS
  doc.fontSize(12).font("Helvetica-Bold").text("Bill To");

  doc.moveDown(0.3);

  doc
    .fontSize(10)
    .font("Helvetica")
    .text(`Name: ${invoice.customerName}`)
    .text(`Phone: ${invoice.customerPhone}`)
    .text(`Email: ${invoice.customerEmail}`)
    .text(`Address: ${invoice.customerAddress}`);

  doc.moveDown();

  // ITEM DETAILS
  doc.fontSize(12).font("Helvetica-Bold").text("Item Details");

  doc.moveDown(0.5);

  const tableTop = doc.y;

  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .text("Description", 50, tableTop)
    .text("Qty", 300, tableTop)
    .text("Original Price", 350, tableTop)
    .text("Amount", 450, tableTop);

  doc
    .moveTo(50, tableTop + 15)
    .lineTo(545, tableTop + 15)
    .stroke();

  const itemTop = tableTop + 25;

invoice.items.forEach((item, index) => {
  const rowY = itemTop + index * 20;

  doc
    .fontSize(9)
    .font("Helvetica")
    .text(item.itemDescription || "-", 50, rowY)
    .text(String(item.quantity), 300, rowY)
    .text(`₹${Number(item.originalPrice).toFixed(2)}`, 350, rowY)
    .text(`₹${Number(item.taxableAmount).toFixed(2)}`, 450, rowY);
});

doc.moveDown(3);

  // PRICE DETAILS
  const taxableSubtotal = invoice.items.reduce(
  (total, item) => total + Number(item.taxableAmount || 0),
  0,
);

doc
  .fontSize(10)
  .font("Helvetica")
  .text(
    `Taxable Amount: ₹${taxableSubtotal.toFixed(2)}`,
    {
      align: "right",
    },
  );

  doc.text(
    `GST (${invoice.gstPercentage}%): ₹${Number(invoice.gstAmount).toFixed(2)}`,
    {
      align: "right",
    },
  );

  doc.text(`Round Off: ₹${Number(invoice.roundedOff).toFixed(2)}`, {
    align: "right",
  });

  doc.moveDown(0.5);

  doc
    .fontSize(13)
    .font("Helvetica-Bold")
    .text(`Total Amount: ₹${Number(invoice.totalAmount).toFixed(2)}`, {
      align: "right",
    });

  doc.moveDown();

  // AMOUNT IN WORDS
  doc.fontSize(10).font("Helvetica-Bold").text("Amount in Words:");

  doc.font("Helvetica").text(invoice.amountInWords || "-");

  doc.moveDown(2);

  // FOOTER
  doc.fontSize(9).font("Helvetica").text("Thank you for your purchase!", {
    align: "center",
  });

  doc.end();
};

module.exports = generateInvoicePdf;
