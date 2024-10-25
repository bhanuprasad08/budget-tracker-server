import mongoose from "mongoose"

const membersSchema = mongoose.Schema(
  {
    members: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true
    },
    spents: {
      type: Number,
    },
    groupId: {  
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    membersData: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "GroupMembersData",
      },
    ],
  },
  { timestamps: true }
)

const GroupMembers = mongoose.model('GroupMembers',membersSchema)
export default GroupMembers
