const Ram = require("../models/Ram");

// Get RAM values with search, status filter and pagination
const getRams = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", status = "all" } = req.query;

    const currentPage = Math.max(parseInt(page, 10) || 1, 1);

    const requestedLimit = parseInt(limit, 10) || 10;

    const currentLimit = Math.min(Math.max(requestedLimit, 1), 50);

    const query = {};

    // Search by RAM value
    if (search.trim()) {
      query.value = {
        $regex: search.trim(),
        $options: "i",
      };
    }

    // Filter by active/inactive
    if (status === "active") {
      query.isActive = true;
    } else if (status === "inactive") {
      query.isActive = false;
    }

    const skip = (currentPage - 1) * currentLimit;

    const [rams, total] = await Promise.all([
      Ram.find(query).sort({ value: 1 }).skip(skip).limit(currentLimit),

      Ram.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / currentLimit);

    res.status(200).json({
      items: rams,

      pagination: {
        page: currentPage,
        limit: currentLimit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Failed to fetch RAM values:", error);

    res.status(500).json({
      message: "Failed to fetch RAM values",
    });
  }
};

const getRamMeta = async (req, res) => {
  try {
    const [total, active, inactive] = await Promise.all([
      Ram.countDocuments(),
      Ram.countDocuments({
        isActive: true,
      }),
      Ram.countDocuments({
        isActive: false,
      }),
    ]);

    res.status(200).json({
      total,
      active,
      inactive,
    });
  } catch (error) {
    console.error("Failed to fetch RAM metadata:", error);

    res.status(500).json({
      message: "Failed to fetch RAM metadata",
    });
  }
};

// Create RAM
const createRam = async (req, res) => {
  try {
    const { value } = req.body;

    if (!value || !value.trim()) {
      return res.status(400).json({
        message: "RAM value is required",
      });
    }

    const existingRam = await Ram.findOne({
      value: value.trim(),
    });

    if (existingRam) {
      return res.status(409).json({
        message: "RAM value already exists",
      });
    }

    const ram = await Ram.create({
      value: value.trim(),
      isActive: true,
    });

    res.status(201).json({
      message: "RAM created successfully",
      ram,
    });
  } catch (error) {
    console.error("Failed to create RAM:", error);

    res.status(500).json({
      message: "Failed to create RAM",
    });
  }
};

// Update RAM
const updateRam = async (req, res) => {
  try {
    const { value, isActive } = req.body;

    const ram = await Ram.findById(req.params.id);

    if (!ram) {
      return res.status(404).json({
        message: "RAM not found",
      });
    }

    if (value !== undefined) {
      const trimmedValue = value.trim();

      if (!trimmedValue) {
        return res.status(400).json({
          message: "RAM value cannot be empty",
        });
      }

      const existingRam = await Ram.findOne({
        value: trimmedValue,
        _id: { $ne: req.params.id },
      });

      if (existingRam) {
        return res.status(409).json({
          message: "Another RAM value already exists",
        });
      }

      ram.value = trimmedValue;
    }

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          message: "isActive must be a boolean",
        });
      }

      ram.isActive = isActive;
    }

    await ram.save();

    res.status(200).json({
      message: "RAM updated successfully",
      ram,
    });
  } catch (error) {
    console.error("Failed to update RAM:", error);

    res.status(500).json({
      message: "Failed to update RAM",
    });
  }
};

module.exports = {
  getRams,
  getRamMeta,
  createRam,
  updateRam,
};
