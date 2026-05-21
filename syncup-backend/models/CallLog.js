import mongoose from 'mongoose';

const callLogSchema = new mongoose.Schema(
  {
    callerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    calleeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel',
      required: true,
    },
    contextChannelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel',
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
    },
    callType: {
      type: String,
      enum: ['audio', 'video'],
      default: 'audio',
    },
    status: {
      type: String,
      enum: ['ringing', 'accepted', 'missed', 'declined', 'canceled', 'ended'],
      default: 'ringing',
    },
    startedAt: { type: Date },
    endedAt: { type: Date },
    durationSeconds: { type: Number, default: 0 },
    incomingMessagePosted: { type: Boolean, default: false },
    incomingMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
  },
  { timestamps: true }
);

callLogSchema.index({ channelId: 1, createdAt: -1 });
callLogSchema.index({ callerId: 1, calleeId: 1, createdAt: -1 });

const CallLog = mongoose.model('CallLog', callLogSchema);
export default CallLog;
