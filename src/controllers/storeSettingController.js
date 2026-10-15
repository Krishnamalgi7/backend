const StoreSetting = require("../models/StoreSetting");

const getStoreSetting = async (req, res) => {
  try {
    let setting = await StoreSetting.findOne();

    if (!setting) {
      setting = await StoreSetting.create({
        brandName: "Nova",
        logo: "/logo.png",
      });
    }

    res.status(200).json(setting);
  } catch (error) {
    console.error("Get store setting error:", error);

    res.status(500).json({
      message: "Failed to fetch store settings",
    });
  }
};

const updateStoreSetting = async (req, res) => {
  try {
    const { brandName, gstNumber, gstPercentage, address, phoneNumber } =
      req.body;

    if (!brandName || !brandName.trim()) {
      return res.status(400).json({
        message: "Brand name is required",
      });
    }

    if (
      gstPercentage !== undefined &&
      gstPercentage !== "" &&
      (Number(gstPercentage) < 0 || Number(gstPercentage) > 100)
    ) {
      return res.status(400).json({
        message: "GST percentage must be between 0 and 100",
      });
    }

    let setting = await StoreSetting.findOne();

    if (!setting) {
      setting = new StoreSetting();
    }

    setting.brandName = brandName.trim();

    setting.gstNumber = gstNumber?.trim() || "";
    setting.gstPercentage =
      gstPercentage === "" || gstPercentage === undefined
        ? 0
        : Number(gstPercentage);
    setting.address = address?.trim() || "";
    setting.phoneNumber = phoneNumber?.trim() || "";

    if (req.file) {
      setting.logo = `/uploads/${req.file.filename}`;
    } else if (req.body.removeLogo === "true") {
      setting.logo = "";
    }

    await setting.save();

    res.status(200).json({
      message: "Store Data updated successfully",
      setting,
    });
  } catch (error) {
    console.error("Update store setting error:", error);

    res.status(500).json({
      message: "Failed to update store Data",
    });
  }
};

module.exports = {
  getStoreSetting,
  updateStoreSetting,
};
