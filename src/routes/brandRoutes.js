const express = require("express");

const {
  getBrands,
  createBrand,
  updateBrand,
  getBrandMeta,
} = require("../controllers/brandController");

const router = express.Router();

router.get("/meta", getBrandMeta);

router.get("/", getBrands);

router.post("/", createBrand);

router.patch("/:id", updateBrand);


module.exports = router;