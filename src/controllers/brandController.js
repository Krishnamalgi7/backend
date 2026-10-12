const Brand = require("../models/Brand");

// Get brands with search, status filter and pagination
const getBrands = async (req, res) => {
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

    // Search by brand name
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

    const [brands, total] = await Promise.all([
      Brand.find(query)
        .sort({ name: 1 })
        .skip(skip)
        .limit(currentLimit),

      Brand.countDocuments(query),
    ]);

    const totalPages =
      Math.ceil(total / currentLimit);

    res.status(200).json({
      items: brands,

      pagination: {
        page: currentPage,
        limit: currentLimit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error(
      "Failed to fetch brands:",
      error
    );

    res.status(500).json({
      message: "Failed to fetch brands",
    });
  }
};

const getBrandMeta = async (req, res) => {
  try {
    const [total, active, inactive] =
      await Promise.all([
        Brand.countDocuments(),
        Brand.countDocuments({
          isActive: true,
        }),
        Brand.countDocuments({
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
      "Failed to fetch brand metadata:",
      error
    );

    res.status(500).json({
      message: "Failed to fetch brand metadata",
    });
  }
};

// Create a brand
const createBrand = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Brand name is required",
      });
    }

    const existingBrand = await Brand.findOne({
      name: name.trim(),
    });

    if (existingBrand) {
      return res.status(409).json({
        message: "Brand already exists",
      });
    }

    const brand = await Brand.create({
      name: name.trim(),
      isActive: true,
    });

    res.status(201).json({
      message: "Brand created successfully",
      brand,
    });
  } catch (error) {
    console.error("Failed to create brand:", error);

    res.status(500).json({
      message: "Failed to create brand",
    });
  }
};

// Update a brand
const updateBrand = async (req, res) => {
  try {
    const { name, isActive } = req.body;

    const brand = await Brand.findById(req.params.id);

    if (!brand) {
      return res.status(404).json({
        message: "Brand not found",
      });
    }

    if (name !== undefined) {
      const trimmedName = name.trim();

      if (!trimmedName) {
        return res.status(400).json({
          message: "Brand name cannot be empty",
        });
      }

      const existingBrand = await Brand.findOne({
        name: trimmedName,
        _id: { $ne: req.params.id },
      });

      if (existingBrand) {
        return res.status(409).json({
          message: "Another brand with this name already exists",
        });
      }

      brand.name = trimmedName;
    }

    if (isActive !== undefined) {
  if (typeof isActive !== "boolean") {
    return res.status(400).json({
      message: "isActive must be a boolean",
    });
  }

  brand.isActive = isActive;
}

    await brand.save();

    res.status(200).json({
      message: "Brand updated successfully",
      brand,
    });
  } catch (error) {
    console.error("Failed to update brand:", error);

    res.status(500).json({
      message: "Failed to update brand",
    });
  }
};

module.exports = {
  getBrands,
  createBrand,
  updateBrand,
  getBrandMeta
};