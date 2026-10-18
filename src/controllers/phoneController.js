const Phone = require("../models/Phone");
const StockNotification = require("../models/StockNotification");
const Brand = require("../models/Brand");
const Variant = require("../models/Variant");
const Ram = require("../models/Ram");
const Rom = require("../models/Rom");
const Discount = require("../models/Discount");
const Color = require("../models/Color");
const mongoose = require("mongoose");
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5000";
const fs = require("fs");
const path = require("path");

// Get phones with filtering and pagination
const getPhones = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 6,
      search = "",
      brand = "",
      variant = "",
      ram = "",
      rom = "",
      minPrice,
      maxPrice,
      minRating,
      priceSort = "",
      isNewPhone,
    } = req.query;

    // Convert and validate pagination values
    const currentPage = Math.max(parseInt(page, 10) || 1, 1);

    const requestedLimit = parseInt(limit, 10) || 6;

    // Prevent very large requests
    const pageSize = Math.min(Math.max(requestedLimit, 1), 50);

    const skip = (currentPage - 1) * pageSize;

    // Build MongoDB filter
    const filter = {};

    // Search by phone name or brand
    if (search.trim()) {
      const searchValue = search.trim();

      const [matchingBrands] = await Promise.all([
        Brand.find({
          name: {
            $regex: searchValue,
            $options: "i",
          },
          isActive: true,
        }).select("_id"),
      ]);

      const brandIds = matchingBrands.map((brand) => brand._id);

      filter.$or = [
        {
          name: {
            $regex: searchValue,
            $options: "i",
          },
        },
        {
          brandId: {
            $in: brandIds,
          },
        },
      ];
    }

    if (isNewPhone !== undefined) {
      filter.isNewPhone = isNewPhone === "true";
    }

    // Exact filters
    if (brand.trim()) {
      filter.brandId = brand.trim();
    }

    if (variant.trim()) {
      filter.variantId = variant.trim();
    }

    if (ram.trim()) {
      filter.ramId = ram.trim();
    }

    if (rom.trim()) {
      filter.romId = rom.trim();
    }

    // Price range
    const hasMinPrice = minPrice !== undefined && minPrice !== "";
    const hasMaxPrice = maxPrice !== undefined && maxPrice !== "";

    if (hasMinPrice || hasMaxPrice) {
      const minimumPrice = hasMinPrice ? Number(minPrice) : 0;
      const maximumPrice = hasMaxPrice
        ? Number(maxPrice)
        : Number.MAX_SAFE_INTEGER;

      if (
        Number.isNaN(minimumPrice) ||
        Number.isNaN(maximumPrice) ||
        minimumPrice < 0 ||
        maximumPrice < 0 ||
        minimumPrice > maximumPrice
      ) {
        return res.status(400).json({
          message: "Invalid price range",
        });
      }

      filter.totalPrice = {
        $gte: minimumPrice,
        $lte: maximumPrice,
      };
    }

    // Rating filter
    if (minRating !== undefined && minRating !== "") {
      const minimumRating = Number(minRating);

      if (
        Number.isNaN(minimumRating) ||
        minimumRating < 0 ||
        minimumRating > 5
      ) {
        return res.status(400).json({
          message: "Invalid rating filter",
        });
      }

      filter.averageRating = {
        $gte: minimumRating,
      };
    }

    // Get total number of matching phones
    const totalItems = await Phone.countDocuments(filter);

    let sortOption = {
      createdAt: -1,
    };

    if (priceSort === "low-high") {
      sortOption = {
        totalPrice: 1,
      };
    } else if (priceSort === "high-low") {
      sortOption = {
        totalPrice: -1,
      };
    }

    // Get only the phones needed for this page
    const phones = await Phone.find(filter)
      .populate("brandId", "name")
      .populate("variantId", "name")
      .populate("ramId", "value")
      .populate("romId", "value")
      .populate("colorId", "name")
      .sort(sortOption)
      .skip(skip)
      .limit(pageSize);

    // Calculate total pages
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);

    // Convert image paths
    const phonesWithImages = phones.map((phone) => {
      const phoneData = phone.toObject();

      // Uploaded image stored in backend/uploads
      if (phoneData.image) {
        if (phoneData.image.startsWith("/uploads/")) {
          phoneData.image = `${API_BASE_URL}${phoneData.image}`;
        }
      } else if (phoneData.imageUrl) {
        phoneData.image = phoneData.imageUrl;
      }

      return phoneData;
    });

    res.status(200).json({
      phones: phonesWithImages,

      pagination: {
        currentPage,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
      },
    });
  } catch (error) {
    console.error("Failed to fetch phones:", error);

    res.status(500).json({
      message: "Failed to fetch phones",
    });
  }
};

// Filter logic for brand with variant
const getVariantsByBrand = async (req, res) => {
  try {
    const { brandId } = req.query;

    if (!brandId) {
      return res.status(400).json({
        message: "Brand ID is required",
      });
    }

    // Find phones belonging to the selected brand
    const phones = await Phone.find({
      brandId,
    }).select("variantId");

    // Get unique variant IDs
    const variantIds = [
      ...new Set(
        phones.map((phone) => phone.variantId?.toString()).filter(Boolean),
      ),
    ];

    // Find active variants
    const variants = await Variant.find({
      _id: { $in: variantIds },
      isActive: true,
    }).select("_id name");

    res.status(200).json(variants);
  } catch (error) {
    console.error("Failed to fetch variants by brand:", error);

    res.status(500).json({
      message: "Failed to fetch variants",
    });
  }
};

const getPhoneFilters = async (req, res) => {
  try {
    const {
      brandId,
      variantId,
      ramId,
      romId,
      excludeBrand,
      excludeVariant,
      excludeRam,
      excludeRom,
    } = req.query;

    // Build filter using all selected options
    const buildFilter = (excludeFields = []) => {
      const filter = {};

      if (
        !excludeFields.includes("brand") &&
        !excludeBrand &&
        brandId &&
        mongoose.Types.ObjectId.isValid(brandId)
      ) {
        filter.brandId = new mongoose.Types.ObjectId(brandId);
      }

      if (
        !excludeFields.includes("variant") &&
        !excludeVariant &&
        variantId &&
        mongoose.Types.ObjectId.isValid(variantId)
      ) {
        filter.variantId = new mongoose.Types.ObjectId(variantId);
      }

      if (
        !excludeFields.includes("ram") &&
        !excludeRam &&
        ramId &&
        mongoose.Types.ObjectId.isValid(ramId)
      ) {
        filter.ramId = new mongoose.Types.ObjectId(ramId);
      }

      if (
        !excludeFields.includes("rom") &&
        !excludeRom &&
        romId &&
        mongoose.Types.ObjectId.isValid(romId)
      ) {
        filter.romId = new mongoose.Types.ObjectId(romId);
      }

      return filter;
    };

    const [
      brandIds,
      compatibleBrandIds,
      variantIds,
      ramIds,
      romIds,
      priceStats,
    ] = await Promise.all([
      Phone.distinct("brandId"),
      Phone.distinct("brandId", buildFilter("brand")),

      Phone.distinct("variantId"),

      Phone.distinct("ramId", buildFilter("ram")),

      Phone.distinct("romId", buildFilter("rom")),

      Phone.aggregate([
        {
          $match: buildFilter(""),
        },
        {
          $group: {
            _id: null,
            minPrice: {
              $min: {
                $ifNull: ["$totalPrice", "$price"],
              },
            },
            maxPrice: {
              $max: {
                $ifNull: ["$totalPrice", "$price"],
              },
            },
          },
        },
      ]),
    ]);

    const [brands, compatibleBrands, variants, rams, roms] = await Promise.all([
      Brand.find({
        _id: { $in: brandIds },
        isActive: true,
      })
        .select("_id name")
        .sort({ name: 1 }),

      Brand.find({
        _id: { $in: compatibleBrandIds },
        isActive: true,
      })
        .select("_id name")
        .sort({ name: 1 }),

      Variant.find({
        _id: { $in: variantIds },
        isActive: true,
      })
        .select("_id name")
        .sort({ name: 1 }),

      Ram.find({
        _id: { $in: ramIds },
        isActive: true,
      })
        .select("_id value")
        .sort({ value: 1 }),

      Rom.find({
        _id: { $in: romIds },
        isActive: true,
      })
        .select("_id value")
        .sort({ value: 1 }),
    ]);


    const priceRange = priceStats[0] || {
      minPrice: 0,
      maxPrice: 0,
    };

    res.status(200).json({
      brands,
      compatibleBrands,
      variants,
      rams,
      roms,
      price: {
        min: priceRange.minPrice,
        max: priceRange.maxPrice,
      },
    });
  } catch (error) {
    console.error("Failed to fetch phone filters:", error);

    res.status(500).json({
      message: "Failed to fetch phone filters",
    });
  }
};

// Get one phone
const getPhoneById = async (req, res) => {
  try {
    const phone = await Phone.findById(req.params.id)
      .populate("brandId", "name")
      .populate("variantId", "name")
      .populate("ramId", "value")
      .populate("romId", "value")
      .populate("colorId", "name");

    if (!phone) {
      return res.status(404).json({
        message: "Phone not found",
      });
    }

    const phoneData = phone.toObject();

    if (phoneData.image) {
      if (phoneData.image.startsWith("/uploads/")) {
        phoneData.image = `${API_BASE_URL}${phoneData.image}`;
      }
    } else if (phoneData.imageUrl) {
      phoneData.image = phoneData.imageUrl;
    }

    if (phoneData.images?.length) {
      phoneData.images = phoneData.images.map((image) => {
        if (image.startsWith("/uploads/")) {
          return `${API_BASE_URL}${image}`;
        }

        return image;
      });
    }

    res.status(200).json(phoneData);
  } catch (error) {
    console.error("Failed to fetch phone:", error);

    res.status(500).json({
      message: "Failed to fetch phone",
    });
  }
};

// Create a phone
const createPhone = async (req, res) => {
  try {
    const {
      name,
      brandId,
      variantId,
      ramId,
      romId,
      colorId,
      discountId,
      price,
      description,
      isNewPhone,
      imageUrl,
      quantity, // Added quantity field
    } = req.body;

    const phoneFolderName = name.trim();
    const phoneFolderPath = path.join(
      __dirname,
      "../../uploads",
      phoneFolderName,
    );

    if (!fs.existsSync(phoneFolderPath)) {
      fs.mkdirSync(phoneFolderPath, { recursive: true });
    }

    const [brand, variant, ram, rom] = await Promise.all([
      Brand.findOne({ _id: brandId, isActive: true }),
      Variant.findOne({ _id: variantId, isActive: true }),
      Ram.findOne({ _id: ramId, isActive: true }),
      Rom.findOne({ _id: romId, isActive: true }),
    ]);

    if (!brand) {
      return res.status(400).json({
        message: "Selected brand is inactive or invalid",
      });
    }

    if (!variant) {
      return res.status(400).json({
        message: "Selected variant is inactive or invalid",
      });
    }

    if (!ram) {
      return res.status(400).json({
        message: "Selected RAM is inactive or invalid",
      });
    }

    if (!rom) {
      return res.status(400).json({
        message: "Selected ROM is inactive or invalid",
      });
    }

    const color = await Color.findOne({
      _id: colorId,
      isActive: true,
    });

    if (!color) {
      return res.status(400).json({
        message: "Invalid or inactive color",
      });
    }

    let discount = null;

    if (discountId) {
      discount = await Discount.findOne({
        _id: discountId,
        isActive: true,
      });

      if (!discount) {
        return res.status(400).json({
          message: "Selected discount is inactive or invalid",
        });
      }
    }

    const phonePrice = Number(price);

    if (Number.isNaN(phonePrice) || phonePrice < 0) {
      return res.status(400).json({
        message: "Price must be a valid non-negative number",
      });
    }

    const discountPercentage = discount ? discount.percentage : 0;

    const discountPrice = Number(
      ((phonePrice * discountPercentage) / 100).toFixed(2),
    );

    const totalPrice = Number((phonePrice - discountPrice).toFixed(2));

    const phoneQuantity = Number(quantity);

    if (!Number.isInteger(phoneQuantity) || phoneQuantity < 0) {
      return res.status(400).json({
        message: "Quantity must be a valid non-negative integer",
      });
    }

    let image = null;

    // If user uploaded an image from their computer
    if (req.files?.image?.[0]) {
      const primaryFile = req.files.image[0];

      const oldImagePath = primaryFile.path;
      const newImagePath = path.join(phoneFolderPath, primaryFile.filename);

      fs.renameSync(oldImagePath, newImagePath);

      image = `/uploads/${phoneFolderName}/${primaryFile.filename}`;
    }

    const additionalImages = [];

    if (req.files?.images?.length) {
      req.files.images.forEach((file) => {
        const oldImagePath = file.path;
        const newImagePath = path.join(phoneFolderPath, file.filename);

        fs.renameSync(oldImagePath, newImagePath);

        additionalImages.push(`/uploads/${phoneFolderName}/${file.filename}`);
      });
    }

    const phone = await Phone.create({
      name,

      // Keep these temporarily for compatibility
      brand: brand.name,
      variant: variant.name,
      ram: ram.value,
      rom: rom.value,

      // New normalized references
      brandId: brand._id,
      variantId: variant._id,
      ramId: ram._id,
      romId: rom._id,
      colorId: color._id,
      price: phonePrice,

      discountId: discount ? discount._id : null,
      discountPercentage,
      discountPrice,
      totalPrice,
      quantity: phoneQuantity, // Store the validated quantity

      description,
      isNewPhone,
      imageUrl: imageUrl || null,
      image,
      images: additionalImages,
    });

    res.status(201).json({
      message: "Phone added successfully",
      phone,
    });
  } catch (error) {
    console.error("Failed to create phone:", error);

    res.status(500).json({
      message: "Failed to create phone",
    });
  }
};

// Update a phone
const updatePhone = async (req, res) => {
  try {
    const phone = await Phone.findById(req.params.id);

    if (!phone) {
      return res.status(404).json({
        message: "Phone not found",
      });
    }

    const {
      name,
      brandId,
      variantId,
      ramId,
      romId,
      colorId,
      discountId,
      price,
      description,
      isNewPhone,
      imageUrl,
      quantity,

      imageRemoved,
      removedAdditionalImages,
    } = req.body;

    /*
     * -----------------------------------------
     * VALIDATE MASTER DATA
     * -----------------------------------------
     */

    const [brand, variant, ram, rom] = await Promise.all([
      Brand.findOne({
        _id: brandId,
        isActive: true,
      }),

      Variant.findOne({
        _id: variantId,
        isActive: true,
      }),

      Ram.findOne({
        _id: ramId,
        isActive: true,
      }),

      Rom.findOne({
        _id: romId,
        isActive: true,
      }),
    ]);

    if (!brand) {
      return res.status(400).json({
        message: "Selected brand is inactive or invalid",
      });
    }

    if (!variant) {
      return res.status(400).json({
        message: "Selected variant is inactive or invalid",
      });
    }

    if (!ram) {
      return res.status(400).json({
        message: "Selected RAM is inactive or invalid",
      });
    }

    if (!rom) {
      return res.status(400).json({
        message: "Selected ROM is inactive or invalid",
      });
    }

    const color = await Color.findOne({
      _id: colorId,
      isActive: true,
    });

    if (!color) {
      return res.status(400).json({
        message: "Invalid or inactive color",
      });
    }

    let discount = null;

    if (discountId) {
      discount = await Discount.findOne({
        _id: discountId,
        isActive: true,
      });

      if (!discount) {
        return res.status(400).json({
          message: "Selected discount is inactive or invalid",
        });
      }
    }

    const phonePrice = Number(price);

    if (Number.isNaN(phonePrice) || phonePrice < 0) {
      return res.status(400).json({
        message: "Price must be a valid non-negative number",
      });
    }

    const phoneQuantity = Number(quantity);

    if (!Number.isInteger(phoneQuantity) || phoneQuantity < 0) {
      return res.status(400).json({
        message: "Quantity must be a valid non-negative integer",
      });
    }

    // Discount validation
    const discountPercentage = discount ? discount.percentage : 0;

    const discountPrice = Number(
      ((phonePrice * discountPercentage) / 100).toFixed(2),
    );

    const totalPrice = Number((phonePrice - discountPrice).toFixed(2));

    const updateData = {
      name,

      // Actual values
      brand: brand.name,
      variant: variant.name,
      ram: ram.value,
      rom: rom.value,

      // Reference IDs
      brandId: brand._id,
      variantId: variant._id,
      ramId: ram._id,
      romId: rom._id,
      colorId: color._id,
      price,

      discountId: discount ? discount._id : null,
      discountPercentage,
      discountPrice,
      totalPrice,
      quantity: phoneQuantity,

      description,
      isNewPhone,
    };

    /*
     * -----------------------------------------
     * IMAGE UPLOAD
     * -----------------------------------------
     */

    if (req.files?.image?.[0]) {
      const primaryFile = req.files.image[0];

      //  Delete old local image
      if (phone.image && phone.image.startsWith("/uploads/")) {
        const oldImageName = path.basename(phone.image);

        const oldImagePath = path.join(
          __dirname,
          "../../uploads",
          phone.name,
          oldImageName,
        );

        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      /*
       * Create phone folder if it does not exist
       */
      const phoneFolderName = name.trim();

      const phoneFolderPath = path.join(
        __dirname,
        "../../uploads",
        phoneFolderName,
      );

      if (!fs.existsSync(phoneFolderPath)) {
        fs.mkdirSync(phoneFolderPath, { recursive: true });
      }

      const oldImagePath = primaryFile.path;

      const newImagePath = path.join(phoneFolderPath, primaryFile.filename);

      fs.renameSync(oldImagePath, newImagePath);

      updateData.image = `/uploads/${phoneFolderName}/${primaryFile.filename}`;

      updateData.imageUrl = null;
    } else if (imageRemoved === "true") {
      // REMOVE IMAGE
      if (phone.image && phone.image.startsWith("/uploads/")) {
        const oldImageName = path.basename(phone.image);

        const oldImagePath = path.join(
          __dirname,
          "../../uploads",
          oldImageName,
        );

        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      updateData.image = null;
      updateData.imageUrl = null;
    } else if (imageUrl) {
      //IMAGE URL
      updateData.imageUrl = imageUrl;
    }

    if (req.files?.images?.length || removedAdditionalImages) {
      const existingImages = phone.images || [];

      let imagesToRemove = [];

      

if (removedAdditionalImages) {
  try {
    const parsedImages = JSON.parse(removedAdditionalImages);

    imagesToRemove = parsedImages.map((image) => {
      try {
        // Convert a full image URL into its stored relative path.
        // Example: https://backend.example.com/uploads/Phone/image.jpg
        // becomes: /uploads/Phone/image.jpg
        return decodeURIComponent(new URL(image).pathname);
      } catch {
        // If it is already a relative path, keep it unchanged.
        return image;
      }
    });
  } catch (error) {
    return res.status(400).json({
      message: "Invalid removed additional images data",
    });
  }
}



      const remainingImages = existingImages.filter(
        (image) => !imagesToRemove.includes(image),
      );

      const newImagesCount = req.files?.images?.length || 0;

      if (remainingImages.length + newImagesCount > 4) {
        return res.status(400).json({
          message: "A maximum of 4 additional images is allowed",
        });
      }

      imagesToRemove.forEach((image) => {
        if (!image.startsWith("/uploads/")) {
          return;
        }

        const imageName = path.basename(image);

        const imagePath = path.join(
          __dirname,
          "../../uploads",
          phone.name,
          imageName,
        );

        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      });

      const newAdditionalImages = [];

      if (req.files?.images?.length) {
        const phoneFolderName = name.trim();

        const phoneFolderPath = path.join(
          __dirname,
          "../../uploads",
          phoneFolderName,
        );

        if (!fs.existsSync(phoneFolderPath)) {
          fs.mkdirSync(phoneFolderPath, { recursive: true });
        }

        req.files.images.forEach((file) => {
          const oldImagePath = file.path;

          const newImagePath = path.join(phoneFolderPath, file.filename);

          fs.renameSync(oldImagePath, newImagePath);

          newAdditionalImages.push(
            `/uploads/${phoneFolderName}/${file.filename}`,
          );
        });
      }

      updateData.images = [...remainingImages, ...newAdditionalImages];
    }

    
    // UPDATE PHONE
    const previousQuantity = phone.quantity;

    const updatedPhone = await Phone.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        returnDocument: "after",
        runValidators: true,
      },
    );

    // Detect when an out-of-stock phone becomes available
    
    if (previousQuantity === 0 && updatedPhone.quantity > 0) {
      await StockNotification.updateMany(
        {
          phoneId: updatedPhone._id,
          status: "pending",
        },
        {
          $set: {
            status: "notified",
            notifiedAt: new Date(),
          },
        },
      );
    }

    res.status(200).json({
      message: "Phone updated successfully",
      phone: updatedPhone,
    });
  } catch (error) {
    console.error("Failed to update phone:", error);

    res.status(500).json({
      message: "Failed to update phone",
    });
  }
};

// Delete a phone
const deletePhone = async (req, res) => {
  try {
    const phone = await Phone.findById(req.params.id);

    if (!phone) {
      return res.status(404).json({
        message: "Phone not found",
      });
    }

    // Delete the local image if it exists
    if (phone.image && phone.image.startsWith("/uploads/")) {
      const imageName = path.basename(phone.image);

      const imagePath = path.join(__dirname, "../../uploads", imageName);

      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Delete the phone from MongoDB
    await Phone.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: "Phone deleted successfully",
      phone,
    });
  } catch (error) {
    console.error("Failed to delete phone:", error);

    res.status(500).json({
      message: "Failed to delete phone",
    });
  }
};

// Toggle phone active / inactive status
const togglePhoneStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const phone = await Phone.findById(id);

    if (!phone) {
      return res.status(404).json({
        message: "Phone not found",
      });
    }

    phone.isActive = !phone.isActive;

    await phone.save();

    return res.status(200).json({
      message: `Phone ${
        phone.isActive ? "activated" : "deactivated"
      } successfully`,
      phone,
    });
  } catch (error) {
    console.error("Toggle phone status error:", error);

    return res.status(500).json({
      message: "Failed to update phone status",
    });
  }
};

module.exports = {
  getPhones,
  getPhoneById,
  createPhone,
  updatePhone,
  deletePhone,
  getPhoneFilters,
  togglePhoneStatus,
  getVariantsByBrand,
};
