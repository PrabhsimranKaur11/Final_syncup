import mongoose from "mongoose";
import crypto from "crypto";

const channelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Channel name is required"],
    },
    description: { type: String, default: "" },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    inviteCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    type: {
      type: String,
      enum: ["text", "voice", "dm"],
      default: "text",
    },
  },
  { timestamps: true }
);

channelSchema.pre("validate", function syncLegacyFields(next) {
  if (this.workspaceId && !this.workspace) this.workspace = this.workspaceId;
  if (this.workspace && !this.workspaceId) this.workspaceId = this.workspace;
  if (this.createdBy && !this.owner) this.owner = this.createdBy;
  if (this.owner && !this.createdBy) this.createdBy = this.owner;
  next();
});

channelSchema.pre("save", function (next) {
  if (this.isPrivate && !this.inviteCode) {
    this.inviteCode = crypto.randomBytes(4).toString("hex").toUpperCase();
  }
  next();
});

const Channel = mongoose.model("Channel", channelSchema);
export default Channel;
