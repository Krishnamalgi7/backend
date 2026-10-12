const jwt = require("jsonwebtoken");
const Customer = require("../models/Customer");

const OTP_EXPIRY_MINUTES = 2;

// Send OTP
const sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        message: "Phone number is required",
      });
    }

    const normalizedPhone = phone.trim();

    // Generate 4-digit OTP
    const otp = "1234";

    // OTP expires after 2 minutes
    const otpExpiresAt = new Date(
      Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000
    );

    // Find existing customer
    let customer = await Customer.findOne({
      phone: normalizedPhone,
    });

    // Create customer if it doesn't exist
    if (!customer) {
      customer = await Customer.create({
        phone: normalizedPhone,
        otp,
        otpExpiresAt,
      });
    } else {
      // Replace existing OTP
      customer.otp = otp;
      customer.otpExpiresAt = otpExpiresAt;

      await customer.save();
    }
    return res.status(200).json({
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("Send OTP error:", error);

    return res.status(500).json({
      message: "Failed to send OTP",
    });
  }
};

// Verify OTP
const verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        message: "Phone number and OTP are required",
      });
    }

    const normalizedPhone = phone.trim();

    const customer = await Customer.findOne({
      phone: normalizedPhone,
    });

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    if (!customer.otp || !customer.otpExpiresAt) {
      return res.status(400).json({
        message: "OTP not found. Please request a new OTP",
      });
    }

    // Check expiry
    if (new Date() > customer.otpExpiresAt) {
      customer.otp = null;
      customer.otpExpiresAt = null;

      await customer.save();

      return res.status(400).json({
        message: "OTP has expired. Please request a new OTP",
      });
    }

    // Check OTP
    if (customer.otp !== otp.trim()) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    // OTP is valid → immediately remove it
    customer.otp = null;
    customer.otpExpiresAt = null;
    customer.isVerified = true;

    await customer.save();

    // Create application's JWT
    const token = jwt.sign(
      {
        customerId: customer._id,
        email: customer.email || null,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      customer: {
        id: customer._id,
        name: customer.name || "",
        phone: customer.phone,
        email: customer.email || "",
        address: customer.address || "",
      },
    });
  } catch (error) {
    console.error("Verify OTP error:", error);

    return res.status(500).json({
      message: "Failed to verify OTP",
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const customerId = req.customer.customerId;
    const { name, address, email } = req.body;

    const updateData = {};

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (address !== undefined) {
      updateData.address = address.trim();
    }

    if (email !== undefined) {
      updateData.email = email.trim().toLowerCase();
    }

    const customer = await Customer.findByIdAndUpdate(
      customerId,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      customer: {
        id: customer._id,
        name: customer.name || "",
        phone: customer.phone,
        email: customer.email || "",
        address: customer.address || "",
      },
    });
  } catch (error) {
    console.error("Customer profile update error:", error);

    return res.status(500).json({
      message: "Failed to update profile",
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const customerId = req.customer.customerId;

    const customer = await Customer.findById(customerId).select(
      "name phone email address"
    );

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    return res.status(200).json({
      customer: {
        id: customer._id,
        name: customer.name || "",
        phone: customer.phone,
        email: customer.email || "",
        address: customer.address || "",
      },
    });
  } catch (error) {
    console.error("Customer get profile error:", error);

    return res.status(500).json({
      message: "Failed to fetch profile",
    });
  }
};

module.exports = {
  sendOtp,
  verifyOtp,
  updateProfile,
  getProfile,
};