const express = require("express");

const {
  getRoms,
  createRom,
  updateRom,
  getRomMeta
} = require("../controllers/romController");

const router = express.Router();

router.get("/meta", getRomMeta);

router.get("/", getRoms);

router.post("/", createRom);

router.patch("/:id", updateRom);

module.exports = router;