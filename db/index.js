import mongoose from "mongoose"
import { DB_NAME } from "../constants.js"

const connectDB = async () => {
  try {
    const response = await mongoose.connect(`${process.env.MONGODB_URI}`, {
      dbName: DB_NAME,
    })
    console.log("Connected to Mongo successfully: ", response.connection.host)
  } catch (error) {
    console.log("Error connecting to MongoDB: ", error)
    process.exit(1)
  }
}
export default connectDB
