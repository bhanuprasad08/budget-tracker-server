import dotenv from "dotenv"
import express from "express"
import cors from "cors"
import jwt from "jsonwebtoken"
import axios from "axios"
import bcrypt from "bcrypt"
import connnetDB from "./db/index.js"
import User from "./models/user.models.js"
import Data from "./models/data.models.js"


const app = express()

app.use(express.json())
app.use(cors())

dotenv.config({
  path: "./.env",
})

connnetDB()
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log("Server is running on port " + process.env.PORT)
    })
  })
  .catch((err) => {
    console.error(err)
  })

//to get the users
app.get("/users", async (req, res) => {
  try {
    const users = await User.find()
    return res.status(200).json(users)
  } catch (error) {
    return res.status(500).json({ message: `failed to get data : ${error}` })
  }
})

//to get the particular user data
app.get("/users/:userId", async (req, res) => {
  const { userId } = req.params

  try {
    const user = await User.findById(userId).populate("data")
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    const sortedData = user.data.sort(
      (a, b) => new Date(a.createdAt - b.createdAt)
    )
    return res.status(200).json(sortedData)
  } catch (error) {
    return res.status(500).json({ message: "Server error" })
  }
})

//to signup
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body

    const userCheck = await User.findOne({ email })
    const salt = 10
    const hashedPassword = await bcrypt.hash(password, salt)

    if (userCheck) {
      if(!password){
        return res.status(400).json({ message: "Password is required for existing users." });
      }

      await User.updateOne({ email }, { password: hashedPassword });
      return res.status(200).json({ message: "Password updated successfully." });
    }

    const user = new User({ name, email, password: hashedPassword })
    await user.save()

    return res.status(201).json({
      message:
        "Got your credentials🥳 Bingo! You're now part of the family. Cheers! 🥂",
      passwordData: hashedPassword,
    })
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" })
  }
})

//to google signup
app.post("/googleSignup", async (req, res) => {
  const { token, email, name } = req.body

  try {
    const googleResponse = await axios.get(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${token}`
    )
    if (googleResponse.data.email !== email) {
      return res.status(400).json({ message: "Token email mismatch" })
    }

    const checkUser = await User.findOne({ email })
    if (checkUser) {
      return res.status(409).json({ message: "User already exists" })
    }
    const newUser = new User({
      email: email,
      name: name,
    })
    await newUser.save()

    const jwtToken = jwt.sign({ email, name }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    })

    return res.status(200).json({ token: jwtToken })
  } catch (error) {
    return res.status(500).json({ message: "Error signing up" })
  }
})

//to login
app.post("/login", async (req, res) => {
  const { email, password } = req.body

  try {
    const emailCheck = await User.findOne({ email })
    if (!emailCheck) {
      return res.status(404).json({ message: "Email incorrect" })
    }
    const isMatch = await bcrypt.compare(password, emailCheck.password)

    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password" })
    }
    return res.status(200).json({
      message: "Successfully logged in",
      userId: emailCheck._id,
      name: emailCheck.name,
    })
  } catch (error) {
    return res.status(500).json({ message: `error while login: ${error}` })
  }
})

//to login with google

app.post("/googleLogin", async (req, res) => {
  const { email } = req.body

  try {
    const emailCheck = await User.findOne({ email })
    if (!emailCheck) {
      return res.status(404).json({ message: "Email not found" })
    }
    return res.status(200).json({
      message: "Successfully logged in",
      userId: emailCheck._id,
      name: emailCheck.name,
    })
  } catch (error) {
    return res.status(500).json({ message: `error while login ${error}` })
  }
})

//to delete user
app.delete("/users/:id", async (req, res) => {
  const { id } = req.params

  try {
    await Data.deleteMany({ user: id })
    const result = await User.deleteOne({ _id: id })
    if (result.deleteCount > 0) {
      return res
        .status(200)
        .json({ message: "User and data deleted successfully" })
    } else {
      return res.status(404).json({ message: "User not found" })
    }
  } catch (error) {
    return res.status(500).json({ message: "Error deleting user" })
  }
})

//to post the data for that user
app.post("/users/:userId/data", async (req, res) => {
  const { category, amount, budget } = req.body
  const { userId } = req.params

  try {
    const userCheck = await User.findById(userId)
    if (!userCheck) {
      return res.status(404).json({ message: "User not found" })
    }

    let dataRecord = await Data.findOne({ user: userId, category })

    if (dataRecord) {
      dataRecord.amount += amount
      dataRecord.history.push({ amount: amount, date: new Date() })
      await dataRecord.save()

      return res.status(200).json({
        message: "Amount added successfully",
        data: dataRecord,
      })
    } else {
      const newData = new Data({
        user: userId,
        category,
        amount,
        budget: budget || 500,
        history: [{ amount: amount, date: new Date() }],
      })

      await newData.save()

      userCheck.data.push(newData._id)
      await userCheck.save()

      return res.status(201).json({
        message: "New data created successfully",
        data: newData,
      })
    }
  } catch (error) {
    console.error("Error handling data:", error)
    res.status(500).json({ message: "Error handling data", error })
  }
})
//to update the budget
app.post("/users/:userId/budget", async (req, res) => {
  try {
    const { budget } = req.body
    const { userId } = req.params

    const userCheck = await User.findById(userId)
    if (!userCheck) {
      return res.status(404).json({ message: "User not found" })
    }

    const prevBudget = userCheck.budget
    userCheck.budget = budget
    await userCheck.save()

    if (prevBudget > budget) {
      return res.status(200).json({
        message: "Budget decreased successfully! 💰📉",
        budgetAmount: budget,
        prevBudget,
      })
    } else if (prevBudget < budget) {
      return res.status(200).json({
        message: "Budget increased successfully! 💰📈",
        budgetAmount: budget,
        prevBudget,
      })
    } else {
      return res.status(200).json({
        message: "Budget remains the same! 💰📊",
        budgetAmount: budget,
        prevBudget,
      })
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: `Getting error while updating budget: ${error}` })
  }
})

//send Budget
app.get("/users/:userId/budget", async (req, res) => {
  const { userId } = req.params
  try {
    const userCheck = await User.findById(userId)

    if (!userCheck) {
      return res.status(404).json({ message: "No user found" })
    }
    return res.status(200).json({ budget: userCheck.budget })
  } catch (error) {
    return res
      .status(500)
      .json({ message: `Getting error while getting budget: ${error}` })
  }
})

//to delete the particular data for that user
app.delete("/users/:userId/data/:dataId", async (req, res) => {
  const { userId, dataId } = req.params

  try {
    const userExists = await User.findOne({ _id: userId })
    if (!userExists) {
      return res.status(404).json({ message: "User not found" })
    }

    const deletedData = await Data.deleteOne({ _id: dataId, user: userId })
    if (deletedData.deletedCount === 0) {
      return res.status(404).json({ message: "Data not found" })
    }

    userExists.data = userExists.data.filter((id) => id.toString() !== dataId)
    await userExists.save()

    return res.status(200).json({ message: "Data deleted successfully" })
  } catch (error) {
    return res.status(404).json({ error: "Invalid at deleting data" })
  }
})

