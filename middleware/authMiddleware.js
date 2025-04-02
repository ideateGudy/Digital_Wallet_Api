import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No Token Provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    const userId = decoded.id;
    const userIdFromParams = req.params.userId;

    if (userIdFromParams === undefined) return next();

    if (userId !== userIdFromParams) {
      return res.status(403).json({ message: "Unauthorized access: Login" });
    }

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res
        .status(401)
        .json({ message: "Token Expired. Please log in again." });
    } else if (error instanceof jwt.JsonWebTokenError) {
      return res
        .status(401)
        .json({ message: "Invalid Token. Please log in again." });
    } else if (error instanceof jwt.NotBeforeError) {
      return res
        .status(401)
        .json({ message: "Token not active yet. Please try later." });
    }

    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export default authMiddleware;
