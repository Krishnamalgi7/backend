
const Rating = require("../models/Rating");
const Phone = require("../models/Phone");
const Invoice = require("../models/Invoice");
const mongoose = require("mongoose");

const createRating = async (req, res) => {
  try {
    const customerId = req.customer?.customerId;
    const { id: phoneId } = req.params;
    const phoneRating = Number(req.body.rating);

    // 1. Confirm the authenticated customer exists in the token.
    if (!customerId || !mongoose.isValidObjectId(customerId)) {
      return res.status(401).json({
        message: "Customer authentication required",
      });
    }

    // 2. Validate the phone ID.
    if (!mongoose.isValidObjectId(phoneId)) {
      return res.status(400).json({
        message: "Invalid phone ID",
      });
    }

    // 3. Validate the rating.
    if (
      !Number.isInteger(phoneRating) ||
      phoneRating < 1 ||
      phoneRating > 5
    ) {
      return res.status(400).json({
        message: "Rating must be an integer between 1 and 5",
      });
    }

    // 4. Confirm the phone exists and is active.
    const phone = await Phone.findOne({
      _id: phoneId,
      isActive: true,
    });

    if (!phone) {
      return res.status(404).json({
        message: "Phone not found",
      });
    }

    // 5. Allow ratings only for phones in this customer's invoices.
    const purchasedPhone = await Invoice.exists({
      customerId,
      "items.phoneId": phoneId,
    });

    if (!purchasedPhone) {
      return res.status(403).json({
        message: "You can rate only phones you have purchased",
      });
    }

    // 6. Use the authenticated customer ID, never a client-provided userKey.
    const userKey = String(customerId);

    await Rating.findOneAndUpdate(
      { phoneId, userKey },
      {
        $set: { rating: phoneRating },
        $setOnInsert: { phoneId, userKey },
      },
      {
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    // 7. Recalculate the average and total number of ratings.
    const stats = await Rating.aggregate([
      {
        $match: {
          phoneId: new mongoose.Types.ObjectId(phoneId),
        },
      },
      {
        $group: {
          _id: "$phoneId",
          averageRating: { $avg: "$rating" },
          ratingCount: { $sum: 1 },
        },
      },
    ]);

    const averageRating = Number(
      (stats[0]?.averageRating || 0).toFixed(1)
    );
    const ratingCount = stats[0]?.ratingCount || 0;

    // 8. Save the updated rating information on the phone.
    await Phone.findByIdAndUpdate(phoneId, {
      averageRating,
      ratingCount,
    });

    return res.status(200).json({
      message: "Rating submitted successfully",
      averageRating,
      ratingCount,
    });
  } catch (error) {
    console.error("Create rating error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Rating already exists. Please try again",
      });
    }

    return res.status(500).json({
      message: "Failed to submit rating",
    });
  }
};

const getMyRating = async (req, res) => {
  try {
    const customerId = req.customer?.customerId;
    const { id: phoneId } = req.params;

    if (!customerId || !mongoose.isValidObjectId(customerId)) {
      return res.status(401).json({
        message: "Customer authentication required",
      });
    }

    if (!mongoose.isValidObjectId(phoneId)) {
      return res.status(400).json({
        message: "Invalid phone ID",
      });
    }

    const rating = await Rating.findOne({
      phoneId,
      userKey: String(customerId),
    }).select("rating -_id");

    return res.status(200).json({
      rating: rating ? rating.rating : null,
    });
  } catch (error) {
    console.error("Get customer rating error:", error);

    return res.status(500).json({
      message: "Failed to fetch your rating",
    });
  }
};

module.exports = {
  createRating,
    getMyRating,
};
