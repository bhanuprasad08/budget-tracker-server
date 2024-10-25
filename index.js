import dotenv from "dotenv"
import express from "express"
import cors from "cors"
import bcrypt, { hash } from "bcrypt"
import connnetDB from "./db/index.js"
import User from "./models/user.models.js"
import Data from "./models/data.models.js"
import Group from "./models/group.models.js"
import GroupMembers from "./models/groupMembers.js"
import GroupMembersData from "./models/groupMembersData.models.js"

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

    if (userCheck) {
      return res
        .status(409)
        .json({ message: "User already exists with this email" })
    }
    const salt = 10
    const hashedPassword = await bcrypt.hash(password, salt)

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
      dataRecord.history.push({amount: amount, date: new Date()})
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

/*----------------------Group Box--------------------------*/

// To create Group
app.post("/create-group", async (req, res) => {
  const { groupName, groupPassword } = req.body

  const existingGroup = await Group.findOne({ groupName })
  console.log(existingGroup)
  try {
    if (existingGroup) {
      return res.status(409).json({ message: "Group name already exists" })
    }

    const salt = 10
    const hashedGroupPass = await bcrypt.hash(groupPassword, salt)

    const newGroup = await Group.create({
      groupName: groupName,
      groupPassword: hashedGroupPass,
    })

    await newGroup.save()

    return res
      .status(201)
      .json({ message: "Group created successfully", group: newGroup })
  } catch (error) {
    return res
      .status(500)
      .json({ message: "getting error while creating group: " + error.message })
  }
})

// To Join Group
app.post("/join-group", async (req, res) => {
  const { groupName, groupPassword, groupMembers, groupMembersPassword } =
    req.body

  try {
    const salt = 10

    const existingGroup = await Group.findOne({ groupName })
    if (!existingGroup) {
      return res.status(404).json({ message: "No group found" })
    }

    const checkGroupPass = await bcrypt.compare(
      groupPassword,
      existingGroup.groupPassword
    )
    if (!checkGroupPass) {
      return res.status(401).json({ message: "Entered wrong Group Password" })
    }

    const existingMem = await GroupMembers.findOne({
      members: groupMembers,
      groupId: existingGroup._id,
    })

    if (existingMem) {
      const existingMemPassword = await bcrypt.compare(
        groupMembersPassword,
        existingMem.password
      )
      if (existingMemPassword) {
        return res.status(200).json({
          message: "User Joined Group",
          userId: existingMem._id,
          userName: groupMembers,
          spents: existingMem.spents,
          groupName: existingGroup.groupName,
          groupId: existingGroup._id,
        })
      }
      return res.status(401).json({ message: "Entered wrong User Password" })
    } else {
      const hashedGroupMemberPassword = await bcrypt.hash(
        groupMembersPassword,
        salt
      )

      const newUser = new GroupMembers({
        members: groupMembers,
        password: hashedGroupMemberPassword,
        spents: 0,
        groupId: existingGroup._id,
      })

      await newUser.save()

      existingGroup.groupMembers.push(newUser._id)
      await existingGroup.save()
      return res.status(201).json({
        message: "User created and joined successfully",
        userId: newUser._id,
        userName: groupMembers,
        spents: newUser.spents,
      })
    }
  } catch (error) {
    console.error("An error: ", error)
    return res.status(500).json({ error: "While joining group" })
  }
})

// To get all groups
app.get("/groups", async (req, res) => {
  try {
    const groups = await Group.find()
    return res.status(200).json({ groups })
  } catch (error) {
    return res.status(404).json({ error: "Error while getting details" })
  }
})

//To post data into group by member
app.post("/:groupId/members/:memberId/data", async (req, res) => {
  const { category, amount } = req.body
  const { memberId, groupId } = req.params

  try {
    const existingGroup = await Group.findById(groupId)
    if (!existingGroup) {
      return res.status(404).json({ message: "Group not found" })
    }
    const existingGroupMember = await GroupMembers.findOne({
      _id: memberId,
      groupId: groupId,
    })
    if (!existingGroupMember) {
      return res.status(404).json({ message: "Member not found in the group" })
    }

    const existingCategory = await GroupMembersData.findOne({
      groupMember: memberId,
      groupId: groupId,
      category: category,
    })

    if (existingCategory) {
      existingCategory.amount += amount
      await existingCategory.save()

      existingGroupMember.spents += amount
      await existingGroupMember.save()

      return res.status(200).json({
        message: "Amount added successfully",
        category: existingCategory,
        amount: amount,
        spents: existingGroupMember.spents,
      })
    }

    const newCategory = new GroupMembersData({
      groupMember: memberId,
      groupId: groupId,
      category: category,
      amount: amount,
    })
    await newCategory.save()

    existingGroupMember.spents += amount
    await existingGroupMember.save()

    return res.status(200).json({
      message: "New category added successfully",
      category: newCategory,
      amount: amount,
    })
  } catch (error) {
    return res.status(500).json({ error: "Error while posting details" })
  }
})

//To get the data of all users
app.get("/:groupId/members/data", async (req, res) => {
  const { groupId } = req.params
  try {
    const existingGroup = await Group.findById(groupId).populate("groupMembers")

    if (!existingGroup) {
      return res.status(404).json({ message: "Group not found" })
    }

    const members = existingGroup.groupMembers
    if (!members) {
      return res.status(404).json({ message: "No members found in this group" })
    }

    let groupMembersData = []
    for (let i = 0; i < members.length; i++) {
      const dataByGroupMember = await GroupMembersData.find({
        groupMember: members[i]._id,
      })

      groupMembersData.push({
        memberId: members[i]._id,
        memberName: members[i].members,
        spents: members[i].spents,
        dataByGroupMember,
      })
    }
    return res.status(200).json({
      membersData: groupMembersData,
    })
  } catch (error) {
    console.error("error retrieving members", error)
    return res
      .status(500)
      .json({ error: "Error while getting data of members" })
  }
})
//To Delete Data of particular member

app.delete("/:groupId/members/:memberId/data/:dataId", async (req, res) => {
  const { groupId, memberId, dataId } = req.params

  try {
    const existingGroup = await Group.findById(groupId)
    if (!existingGroup) {
      return res.status(404).json({ message: "Group not found" })
    }
    const existingMem = await GroupMembers.findOne({
      _id: memberId,
      groupId: groupId,
    })
    if (!existingMem) {
      return res.status(404).json({ message: "Member not found in the group" })
    }
    const existingCategory = await GroupMembersData.findOne({
      _id: dataId,
      groupMember: memberId,
      groupId: groupId,
    })
    if (!existingCategory) {
      return res
        .status(404)
        .json({ message: "Data not found in the member's category" })
    }

    await GroupMembersData.deleteOne({ _id: dataId })

    return res.status(200).json({ message: "Data deleted successfully" })
  } catch (error) {
    return res
      .status(404)
      .json({ message: "Getting error while deleting category" })
  }
})
