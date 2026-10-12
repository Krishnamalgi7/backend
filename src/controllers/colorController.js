const Color = require("../models/Color");

const getColors = async (req, res) => {
  try {
    const colors = await Color.find({ isActive: true }).sort({ name: 1 });

    res.status(200).json({
      colors,
    });
  } catch (error) {
    console.error("Get colors error:", error);

    res.status(500).json({
      message: "Failed to fetch colors",
    });
  }
};

const getAllColors = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "all",
    } = req.query;

    const currentPage = Math.max(parseInt(page, 10) || 1, 1);

    const requestedLimit = parseInt(limit, 10) || 10;

    const currentLimit = Math.min(
      Math.max(requestedLimit, 1),
      50,
    );

    const query = {};

    // Search by color name
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

    const skip = (currentPage - 1) * currentLimit;

    const [colors, total] = await Promise.all([
      Color.find(query)
        .sort({ name: 1 })
        .skip(skip)
        .limit(currentLimit),

      Color.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / currentLimit);

    res.status(200).json({
      items: colors,
      pagination: {
        page: currentPage,
        limit: currentLimit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Get all colors error:", error);

    res.status(500).json({
      message: "Failed to fetch colors",
    });
  }
};

const createColor = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Color name is required",
      });
    }

    const color = await Color.create({
      name: name.trim(),
    });

    res.status(201).json({
      message: "Color created successfully",
      color,
    });
  } catch (error) {
    console.error("Create color error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        message: "Color already exists",
      });
    }

    res.status(500).json({
      message: "Failed to create color",
    });
  }
};

const toggleColorStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const color = await Color.findById(id);

    if (!color) {
      return res.status(404).json({
        message: "Color not found",
      });
    }

    color.isActive = !color.isActive;

    await color.save();

    res.status(200).json({
      message: `Color ${
        color.isActive ? "activated" : "deactivated"
      } successfully`,
      color,
    });
  } catch (error) {
    console.error("Toggle color status error:", error);

    res.status(500).json({
      message: "Failed to update color status",
    });
  }
};

module.exports = {
  getColors,
  getAllColors,
  createColor,
    toggleColorStatus,
};