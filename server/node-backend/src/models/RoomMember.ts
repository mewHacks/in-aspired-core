import mongoose, { Schema, Document } from 'mongoose';

// Define member roles in a room
export enum MemberRole {
    HOST = 'host',
    MODERATOR = 'moderator',
    PARTICIPANT = 'participant'
}

// Define TS shape for room member document
export interface IRoomMemberDocument extends Document {
    roomId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    role: MemberRole;
    isMuted: boolean; // Whether the member is muted
    joinedAt: Date;
    leftAt?: Date; // When user left (null = still inside)
}

// Define Mongoose schema for room member document
const RoomMemberSchema: Schema = new Schema({
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: {
        type: String,
        enum: Object.values(MemberRole),
        default: MemberRole.PARTICIPANT
    },
    isMuted: { type: Boolean, default: false },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date } // Null means currently in the room
}, {
    timestamps: true
});

// Index to quickly find who is in what room
RoomMemberSchema.index({ roomId: 1, userId: 1 });
RoomMemberSchema.index({ userId: 1 });

// Export Mongoose model
export default mongoose.model<IRoomMemberDocument>('RoomMember', RoomMemberSchema);
