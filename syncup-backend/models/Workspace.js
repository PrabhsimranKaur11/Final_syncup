import mongoose from "mongoose";
import crypto from "crypto";

const generateCode = () => crypto.randomBytes(4).toString("hex").toUpperCase(); // 8-char

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Workspace name is required"],
    },
    icon: {
      type: String,
      default: "💼",
    },
    inviteCode: {
      type: String,
      unique: true,
      default: generateCode,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    channels: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Channel",
      },
    ],
  },
  { timestamps: true }
);

const Workspace = mongoose.model("Workspace", workspaceSchema);
export default Workspace;
