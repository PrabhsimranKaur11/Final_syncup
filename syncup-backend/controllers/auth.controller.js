import bcrypt from "bcryptjs";
import validator from "validator";
import crypto from "crypto";
import User from "../models/User.js";
import generateTokenAndSetCookie from "../utils/generateToken.js";

// POST /api/auth/register
export const register = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    // Validate input
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    // Generate token & set cookie
    generateTokenAndSetCookie(newUser._id, res);

    console.log(`New user registered: ${email}`);

    res.status(201).json({
      _id: newUser._id,
      fullName: newUser.fullName,
      email: newUser.email,
      avatar: newUser.avatar,
      status: newUser.status,
    });
  } catch (error) {
    console.error("Register error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Update status to online
    user.status = "online";
    user.lastSeen = new Date();
    await user.save();

    // Generate token & set cookie
    generateTokenAndSetCookie(user._id, res);

    console.log(`User logged in: ${email}`);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      avatar: user.avatar,
      status: user.status,
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/auth/logout
export const logout = async (req, res) => {
  try {
    // Update user status to offline if authenticated
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, {
        status: "offline",
        lastSeen: new Date(),
      });
    }

    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/auth/me
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("GetMe error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/auth/code-login
export const codeLogin = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) return res.status(400).json({ message: "Code is required" });

    const hashedCode = crypto.createHash("sha256").update(code).digest("hex");

    const user = await User.findOne({
      resetPasswordCode: hashedCode,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired code" });

    // Clear reset fields but keep password unchanged
    user.resetPasswordCode = null;
    user.resetPasswordExpires = null;
    user.status = "online";
    user.lastSeen = new Date();
    await user.save();

    // Generate token & set cookie
    generateTokenAndSetCookie(user._id, res);

    return res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      avatar: user.avatar,
      status: user.status,
    });
  } catch (error) {
    console.error("Code login error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
