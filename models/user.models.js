import mongoose from "mongoose"

const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  budget: {
    type: Number,
    required: true,
    min: 0,
    default: 500,
  },
  remaining: {
    type: Number,
  },
  spents: {
    type: Number,
  },
  data: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Data",
    },
  ],
})

const User = mongoose.model("User", userSchema)
export default User
