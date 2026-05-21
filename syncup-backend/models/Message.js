import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
    },
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    text: { type: String, default: "" },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
    },
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    content: { type: String, default: "" },
    type: {
      type: String,
      enum: ["text", "image", "file", "system"],
      default: "text",
    },
    fileUrl: { type: String },
    fileType: { type: String },
    fileName: { type: String },
    fileSize: { type: Number },
    pinned: { type: Boolean, default: false },
    pinnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    pinnedAt: { type: Date },
  },
  { timestamps: true }
);

messageSchema.pre("validate", function syncLegacyFields(next) {
  if (this.channelId && !this.channel) this.channel = this.channelId;
  if (this.channel && !this.channelId) this.channelId = this.channel;
  if (this.senderId && !this.sender) this.sender = this.senderId;
  if (this.sender && !this.senderId) this.senderId = this.sender;
  if (this.workspaceId && !this.workspace) this.workspace = this.workspaceId;
  if (this.workspace && !this.workspaceId) this.workspaceId = this.workspace;
  const body = this.content || this.text || "";
  if (body && !this.text) this.text = body;
  if (body && !this.content) this.content = body;
  next();
});

const Message = mongoose.model("Message", messageSchema);
export default Message;
