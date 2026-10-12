const express = require("express");

const {
  getRams,
  createRam,
  updateRam,
  getRamMeta,
} = require("../controllers/ramController");

const router = express.Router();

router.get("/meta", getRamMeta);

router.get("/", getRams);

router.post("/", createRam);

router.patch("/:id", updateRam);

module.exports = router;