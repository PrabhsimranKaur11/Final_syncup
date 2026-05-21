import User from "../models/User.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

// GET /api/users — Get all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (error) {
    console.error("GetAllUsers error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/users/:id — Get single user
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("GetUserById error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// PATCH /api/users/:id — Update user profile
export const updateUser = async (req, res) => {
  try {
    const { fullName, avatar } = req.body;

    // Only allow users to update their own profile
    if (req.params.id !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only update your own profile" });
    }

    const updateData = {};
    if (fullName) updateData.fullName = fullName;

    // Handle avatar upload if a file is provided
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, "syncup/avatars");
      updateData.avatar = result.secure_url;
    } else if (avatar) {
      updateData.avatar = avatar;
    }

    const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    }).select("-password");

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("UpdateUser error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// PATCH /api/users/:id/status — Update user online status
export const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["online", "away", "offline"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const updateData = { status };

    // Update lastSeen when going offline
    if (status === "offline") {
      updateData.lastSeen = new Date();
    }

    const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    }).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("UpdateUserStatus error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
