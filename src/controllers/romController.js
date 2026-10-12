const Rom = require("../models/Rom");

// Get ROM values with search, status filter and pagination
const getRoms = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "all",
    } = req.query;

    const currentPage = Math.max(
      parseInt(page, 10) || 1,
      1
    );

    const requestedLimit = parseInt(limit, 10) || 10;

    const currentLimit = Math.min(
      Math.max(requestedLimit, 1),
      50
    );

    const query = {};

    // Search by ROM value
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

    const skip =
      (currentPage - 1) * currentLimit;

    const [roms, total] = await Promise.all([
      Rom.find(query)
        .sort({ value: 1 })
        .skip(skip)
        .limit(currentLimit),

      Rom.countDocuments(query),
    ]);

    const totalPages =
      Math.ceil(total / currentLimit);

    res.status(200).json({
      items: roms,

      pagination: {
        page: currentPage,
        limit: currentLimit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error(
      "Failed to fetch ROM values:",
      error
    );

    res.status(500).json({
      message: "Failed to fetch ROM values",
    });
  }
};

// Create ROM
const createRom = async (req, res) => {
  try {
    const { value } = req.body;

    if (!value || !value.trim()) {
      return res.status(400).json({
        message: "ROM value is required",
      });
    }

    const existingRom = await Rom.findOne({
      value: value.trim(),
    });

    if (existingRom) {
      return res.status(409).json({
        message: "ROM value already exists",
      });
    }

    const rom = await Rom.create({
      value: value.trim(),
      isActive: true,
    });

    res.status(201).json({
      message: "ROM created successfully",
      rom,
    });
  } catch (error) {
    console.error("Failed to create ROM:", error);

    res.status(500).json({
      message: "Failed to create ROM",
    });
  }
};

// Update ROM
const updateRom = async (req, res) => {
  try {
    const { value, isActive } = req.body;

    const rom = await Rom.findById(req.params.id);

    if (!rom) {
      return res.status(404).json({
        message: "ROM not found",
      });
    }

    if (value !== undefined) {
      const trimmedValue = value.trim();

      if (!trimmedValue) {
        return res.status(400).json({
          message: "ROM value cannot be empty",
        });
      }

      const existingRom = await Rom.findOne({
        value: trimmedValue,
        _id: { $ne: req.params.id },
      });

      if (existingRom) {
        return res.status(409).json({
          message: "Another ROM value already exists",
        });
      }

      rom.value = trimmedValue;
    }

    if (isActive !== undefined) {
  if (typeof isActive !== "boolean") {
    return res.status(400).json({
      message: "isActive must be a boolean",
    });
  }

  ram.isActive = isActive;
}

    await rom.save();

    res.status(200).json({
      message: "ROM updated successfully",
      rom,
    });
  } catch (error) {
    console.error("Failed to update ROM:", error);

    res.status(500).json({
      message: "Failed to update ROM",
    });
  }
};

const getRomMeta = async (req, res) => {
  try {
    const [total, active, inactive] =
      await Promise.all([
        Rom.countDocuments(),
        Rom.countDocuments({
          isActive: true,
        }),
        Rom.countDocuments({
          isActive: false,
        }),
      ]);

    res.status(200).json({
      total,
      active,
      inactive,
    });
  } catch (error) {
    console.error(
      "Failed to fetch ROM metadata:",
      error
    );

    res.status(500).json({
      message: "Failed to fetch ROM metadata",
    });
  }
};

module.exports = {
  getRoms,
  createRom,
  updateRom,
  getRomMeta,
};