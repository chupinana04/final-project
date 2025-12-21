const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../db/userModel");
const router = express.Router();
const Photo = require("../db/photoModel.js");
const JWT_SECRET = "your-secret-key-change-in-production";

// Authentication middleware
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user_id = decoded.user_id;
    req.login_name = decoded.login_name;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};


router.get("/list", requireAuth, async (req, res) => {
  try {
    const users = await User.aggregate([
      {
        $lookup: {
          from: "photos",
          localField: "_id",
          foreignField: "user_id",
          as: "photos",
        },
      },
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "user_id",
          as: "comments",
        },
      },
      {
        $project: {
          _id: 1,
          first_name: 1,
          last_name: 1,
          location: 1,
          photo_count: { $size: "$photos" },
          comment_count: { $size: "$comments" },
        },
      },
    ]);

    res.status(200).json(users);
  } catch (err) {
    console.error("Error fetching user list:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /user/:id - Return detailed information of a specific user
router.get("/:id", requireAuth, async (request, response) => {
  const userId = request.params.id;
  // console.log(userId);

  try {
    const user = await User.findById(userId).select("-password");

    if (!user) {
      response.status(400).json({ error: "User not found" });
      return;
    }

    response.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    response.status(400).json({ error: "Invalid user ID" });
  }
});

// POST /user - Register a new user
router.post("/", async (request, response) => {
  const {
    login_name,
    password,
    first_name,
    last_name,
    location,
    description,
    occupation,
  } = request.body;

  // Validate required fields
  if (!login_name || !password || !first_name || !last_name) {
    return response.status(400).json({
      error: "login_name, password, first_name, and last_name are required",
    });
  }

  // Check if fields are non-empty strings
  if (
    login_name.trim() === "" ||
    password.trim() === "" ||
    first_name.trim() === "" ||
    last_name.trim() === ""
  ) {
    return response.status(400).json({
      error:
        "login_name, password, first_name, and last_name must be non-empty",
    });
  }

  try {
    // Check if login_name already exists
    const existingUser = await User.findOne({ login_name }).exec();
    if (existingUser) {
      return response.status(400).json({ error: "login_name already exists" });
    }

    // Create new user (in production, hash the password with bcrypt)
    const newUser = new User({
      login_name,
      password,
      first_name,
      last_name,
      location: location || "",
      description: description || "",
      occupation: occupation || "",
    });

    await newUser.save();

    // Return login_name as required by tests
    response.status(200).json({ login_name: newUser.login_name });
  } catch (error) {
    console.error("Error creating user:", error);
    response.status(400).json({ error: "Error creating user" });
  }
});

router.put("/:id", requireAuth, async (request, response) => {
  const userId = request.params.id;
  const {
    first_name,
    last_name,
    location,
    description,
    occupation,
    password,
  } = request.body;

  try {
    if(request.user_id !== userId){
      return response.status(403).json({ error: "Forbidden: Cannot update other user's profile" });
    }

    const user = await User.findById(userId).exec();
    if (!user) {
      return response.status(400).json({ error: "User not found" });
    }

    // Update fields if provided
    if (first_name && first_name.trim() !== "") user.first_name = first_name.trim();
    if (last_name && last_name.trim() !== "") user.last_name = last_name.trim();
    if (location !== undefined) user.location = location;
    if (description !== undefined) user.description = description;
    if (occupation !== undefined) user.occupation = occupation;
    if (password && password.trim() !== "") user.password = password.trim(); 
    await user.save();
    res.status(200).json({ message: "User updated successfully", user });

  }catch (error) {
    console.error("Error updating user:", error);
    response.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", requireAuth, async (request, response) => {
  const userId = request.params.id;

  try {
    if(request.user_id !== userId){
      return response.status(403).json({ error: "Forbidden: Cannot delete other user's account" });
    }

    const user = await User.findByIdAndDelete(userId).exec();
    if (!user) {
      return response.status(400).json({ error: "User not found" });
    }

    response.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    response.status(500).json({ error: "Internal server error" });
  }
});

router.get("/", requireAuth, async (request, response) => {
  try {
    const users = await User.find({}).select("-password").exec();
    response.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    response.status(500).json({ error: "Internal server error" });
  }
});

// router.get("/getNumberOfPhotos/:id", requireAuth, async (request, response) => {
//   const userId = request.params.id;

//   try {
//     const user = await User.findById(userId).exec();
//     if (!user) {
//       return response.status(400).json({ error: "User not found" });
//     }

//     const photoCount = await Photo.countDocuments({ user_id: userId }).exec();
//     response.status(200).json({ photoCount });
//   } catch (error) {
//     console.error("Error fetching number of photos:", error);
//     response.status(500).json({ error: "Internal server error" });
//   }
// });


module.exports = router;
