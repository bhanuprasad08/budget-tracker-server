import mongoose from "mongoose"

const groupSchema = mongoose.Schema(
  {
    groupName: {
      type: String,
      required: true,
      unique: true,
    },
    groupPassword: {
      type: String,
      required: true,
    },
    groupMembers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "GroupMembers",
      },
    ],
  },
  { timestamps: true }
)
const Group = mongoose.model("Group", groupSchema)
export default Group
