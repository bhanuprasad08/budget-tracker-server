import mongoose from "mongoose";
import Data from "./models/data.models.js";
import { DB_NAME } from "./constants.js"; // Import DB_NAME
import dotenv from "dotenv";

dotenv.config(); // Make sure to load environment variables

const dropIndex = async () => {
  try {
    const mongoURI = `${process.env.MONGODB_URI}/${DB_NAME}?retryWrites=true&w=majority`; // Add DB_NAME to URI

    // Connect to MongoDB using the URI and DB_NAME
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    // Drop the index
    await Data.collection.dropIndex('category_1');
    console.log('Index dropped successfully');
    
    // Close the connection
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error dropping index:', error);
  }
};

dropIndex();
