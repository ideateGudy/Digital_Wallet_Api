import jwt from "jsonwebtoken";
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token)
    return res.status(401).json({ message: "Unauthorized: No Token Provided" });
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
    res.status(401).json({ message: "Invalid Token" });
    next(error);
  }
};

export default authMiddleware;
