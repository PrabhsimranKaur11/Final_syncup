import jwt from "jsonwebtoken";

/**
 * Generate a JWT token and set it as an HTTP-only cookie on the response.
 * @param {string} userId - The user's MongoDB _id
 * @param {object} res - Express response object
 * @returns {string} The generated JWT token
 */
const generateTokenAndSetCookie = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

  res.cookie("jwt", token, {
    maxAge: (Number(process.env.COOKIE_EXPIRES_IN) || 7) * 24 * 60 * 60 * 1000, // days → ms
    httpOnly: true, // prevent XSS attacks
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return token;
};

export default generateTokenAndSetCookie;
