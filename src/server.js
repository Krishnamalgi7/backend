const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const connectDB = require("./config/db");
const phoneRoutes = require("./routes/phoneRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const contactRoutes = require("./routes/contactRoutes");
const adminRoutes = require("./routes/adminRoutes");
const customerAuthRoutes = require("./routes/customerAuthRoutes");
const cartRoutes = require("./routes/cartRoutes");
const phoneSettingRoutes = require("./routes/phoneSettingRoutes");
const brandRoutes = require("./routes/brandRoutes");
const variantRoutes = require("./routes/variantRoutes");
const ramRoutes = require("./routes/ramRoutes");
const romRoutes = require("./routes/romRoutes");
const storeSettingRoutes = require("./routes/storeSettingRoutes");
const colorRoutes = require("./routes/colorRoutes");
const ratingRoutes = require("./routes/ratingRoutes");
const stockNotificationRoutes = require("./routes/stockNotificationRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/phones", phoneRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/colors", colorRoutes);
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/api/admin", adminRoutes);
app.use("/api/customer-auth", customerAuthRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/settings", phoneSettingRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/variants", variantRoutes);
app.use("/api/rams", ramRoutes);
app.use("/api/roms", romRoutes);
app.use("/api/store-settings", storeSettingRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/stock-notifications", stockNotificationRoutes);
app.use("/api/invoices", invoiceRoutes);

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.json({
    message: "Node Backend API is running",
  });
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
