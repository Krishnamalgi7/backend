const Variant = require("../models/Variant");

// Get variants with search, status filter and pagination
const getVariants = async (req, res) => {
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

    // Search by variant name
    if (search.trim()) {
      query.name = {
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

    const [variants, total] = await Promise.all([
      Variant.find(query)
        .sort({ name: 1 })
        .skip(skip)
        .limit(currentLimit),

      Variant.countDocuments(query),
    ]);

    const totalPages =
      Math.ceil(total / currentLimit);

    res.status(200).json({
      items: variants,

      pagination: {
        page: currentPage,
        limit: currentLimit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error(
      "Failed to fetch variants:",
      error
    );

    res.status(500).json({
      message: "Failed to fetch variants",
    });
  }
};

// Create a variant
const createVariant = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Variant name is required",
      });
    }

    const existingVariant = await Variant.findOne({
      name: name.trim(),
    });

    if (existingVariant) {
      return res.status(409).json({
        message: "Variant already exists",
      });
    }

    const variant = await Variant.create({
      name: name.trim(),
      isActive: true,
    });

    res.status(201).json({
      message: "Variant created successfully",
      variant,
    });
  } catch (error) {
    console.error("Failed to create variant:", error);

    res.status(500).json({
      message: "Failed to create variant",
    });
  }
};

// Update a variant
const updateVariant = async (req, res) => {
  try {
    const { name, isActive } = req.body;

    const variant = await Variant.findById(req.params.id);

    if (!variant) {
      return res.status(404).json({
        message: "Variant not found",
      });
    }

    if (name !== undefined) {
      const trimmedName = name.trim();

      if (!trimmedName) {
        return res.status(400).json({
          message: "Variant name cannot be empty",
        });
      }

      const existingVariant = await Variant.findOne({
        name: trimmedName,
        _id: { $ne: req.params.id },
      });

      if (existingVariant) {
        return res.status(409).json({
          message: "Another variant with this name already exists",
        });
      }

      variant.name = trimmedName;
    }

    if (isActive !== undefined) {
  if (typeof isActive !== "boolean") {
    return res.status(400).json({
      message: "isActive must be a boolean",
    });
  }

  variant.isActive = isActive;
}

    await variant.save();

    res.status(200).json({
      message: "Variant updated successfully",
      variant,
    });
  } catch (error) {
    console.error("Failed to update variant:", error);

    res.status(500).json({
      message: "Failed to update variant",
    });
  }
};

const getVariantMeta = async (req, res) => {
  try {
    const [total, active, inactive] =
      await Promise.all([
        Variant.countDocuments(),
        Variant.countDocuments({
          isActive: true,
        }),
        Variant.countDocuments({
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
      "Failed to fetch variant metadata:",
      error
    );

    res.status(500).json({
      message:
        "Failed to fetch variant metadata",
    });
  }
};


module.exports = {
  getVariants,
  createVariant,
  updateVariant,
  getVariantMeta
};