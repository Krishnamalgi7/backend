const jwt = require("jsonwebtoken");

const customerAuthMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.customer = decoded;

    next();
  } catch (error) {
    console.error("Customer authentication error:", error);

    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

module.exports = customerAuthMiddleware;