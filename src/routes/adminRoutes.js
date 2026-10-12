const express = require("express");

const {
  signupAdmin,
  loginAdmin,
  checkAdminExists,
} = require("../controllers/adminController");

const router = express.Router();

router.post("/signup", signupAdmin);
router.post("/login", loginAdmin);
router.get("/status", checkAdminExists);

module.exports = router;