const Discount = require("../models/Discount");

const getDiscounts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "all",
    } = req.query;

    const currentPage = Math.max(parseInt(page, 10) || 1, 1);

    const currentLimit = Math.min(
      Math.max(parseInt(limit, 10) || 10, 1),
      100,
    );

    const skip = (currentPage - 1) * currentLimit;

    const query = {};

    if (search.trim()) {
      const percentage = Number(search.trim());

      if (!Number.isNaN(percentage)) {
        query.percentage = percentage;
      }
    }

    if (status === "active") {
      query.isActive = true;
    } else if (status === "inactive") {
      query.isActive = false;
    }

    const [discounts, total] = await Promise.all([
      Discount.find(query)
        .sort({ percentage: 1 })
        .skip(skip)
        .limit(currentLimit),

      Discount.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / currentLimit);

    res.status(200).json({
      items: discounts,
      pagination: {
        page: currentPage,
        limit: currentLimit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Get discounts error:", error);

    res.status(500).json({
      message: "Failed to fetch discounts",
    });
  }
};

const getDiscountMeta = async (req, res) => {
  try {
    const [total, active] = await Promise.all([
      Discount.countDocuments(),
      Discount.countDocuments({ isActive: true }),
    ]);

    res.status(200).json({
      total,
      active,
      inactive: total - active,
    });
  } catch (error) {
    console.error("Get discount metadata error:", error);

    res.status(500).json({
      message: "Failed to fetch discount metadata",
    });
  }
};

const createDiscount = async (req, res) => {
  try {
    const { percentage } = req.body;

    if (percentage === undefined || percentage === "") {
      return res.status(400).json({
        message: "Discount percentage is required",
      });
    }

    const discountPercentage = Number(percentage);

    if (
      Number.isNaN(discountPercentage) ||
      discountPercentage < 0 ||
      discountPercentage > 100
    ) {
      return res.status(400).json({
        message: "Discount percentage must be between 0 and 100",
      });
    }

    const existingDiscount = await Discount.findOne({
      percentage: discountPercentage,
    });

    if (existingDiscount) {
      return res.status(409).json({
        message: "This discount already exists",
      });
    }

    const discount = await Discount.create({
      percentage: discountPercentage,
    });

    res.status(201).json({
      message: "Discount created successfully",
      item: discount,
    });
  } catch (error) {
    console.error("Create discount error:", error);

    res.status(500).json({
      message: "Failed to create discount",
    });
  }
};

const updateDiscountStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        message: "isActive must be a boolean",
      });
    }

    const discount = await Discount.findByIdAndUpdate(
      id,
      { isActive },
      { new: true },
    );

    if (!discount) {
      return res.status(404).json({
        message: "Discount not found",
      });
    }

    res.status(200).json({
      message: "Discount status updated successfully",
      item: discount,
    });
  } catch (error) {
    console.error("Update discount status error:", error);

    res.status(500).json({
      message: "Failed to update discount status",
    });
  }
};

module.exports = {
  getDiscounts,
  getDiscountMeta,
  createDiscount,
  updateDiscountStatus,
};