const express = require("express");

const {
  getVariants,
  createVariant,
  updateVariant,
  getVariantMeta,
} = require("../controllers/variantController");

const router = express.Router();

router.get("/meta", getVariantMeta);

router.get("/", getVariants);

router.post("/", createVariant);

router.patch("/:id", updateVariant);

module.exports = router;