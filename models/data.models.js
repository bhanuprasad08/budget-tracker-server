import mongoose from "mongoose";

const dataSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    history: [
      {
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

dataSchema.index({ user: 1, category: 1 }, { unique: true });
const Data = mongoose.model("Data", dataSchema);
export default Data;
