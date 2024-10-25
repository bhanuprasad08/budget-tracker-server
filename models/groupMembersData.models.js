import mongoose from "mongoose"

const dataSchema = mongoose.Schema(
  {
    groupMember: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GroupMembers",
      required: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
)

const GroupMembersData = mongoose.model('GroupMembersData', dataSchema)
export default GroupMembersData