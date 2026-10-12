const PhoneSetting = require("../models/PhoneSetting");

const getSettings = async (req, res) => {
  try {
    const settings = await PhoneSetting.find().sort({
      type: 1,
      value: 1,
    });

    res.status(200).json(settings);
  } catch (error) {
    console.error("Get settings error:", error);

    res.status(500).json({
      message: "Failed to fetch settings",
    });
  }
};

const createSetting = async (req, res) => {
  try {
    const { type, value } = req.body;

    if (!type || !value) {
      return res.status(400).json({
        message: "Type and value are required",
      });
    }

    if (type === "discount") {
      const discount = Number(value);
      if (isNaN(discount) || discount < 0 || discount > 100) {
        return res.status(400).json({
          message: "Discount value must be a number between 0 and 100",
        });
      }
    }

    const existingSetting = await PhoneSetting.findOne({
      type,
      value: value.trim(),
    });

    if (existingSetting) {
      return res.status(409).json({
        message: "This setting already exists",
      });
    }

    const setting = await PhoneSetting.create({
      type,
      value: value.trim(),
      isActive: true,
    });

    res.status(201).json({
      message: "Setting created successfully",
      setting,
    });
  } catch (error) {
    console.error("Create setting error:", error);

    res.status(500).json({
      message: "Failed to create setting",
    });
  }
};

const updateSettingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const setting = await PhoneSetting.findByIdAndUpdate(
      id,
      { isActive },
      { new: true },
    );

    if (!setting) {
      return res.status(404).json({
        message: "Setting not found",
      });
    }

    res.status(200).json({
      message: "Setting status updated successfully",
      setting,
    });
  } catch (error) {
    console.error("Update setting status error:", error);

    res.status(500).json({
      message: "Failed to update setting status",
    });
  }
};

module.exports = {
  getSettings,
  createSetting,
  updateSettingStatus,

};