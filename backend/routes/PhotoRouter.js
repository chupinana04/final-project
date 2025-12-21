const express = require("express");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const Photo = require("../db/photoModel");
const User = require("../db/userModel");
const router = express.Router();
const path = require("path");
const fs = require("fs");

const JWT_SECRET = "your-secret-key-change-in-production";

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


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../public/images");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });


router.get("/user/:id", requireAuth, async (request, response) => {
  const userId = request.params.id;
  console.log(userId);

  try {
    const user = await User.findById(userId).exec();
    if (!user) {
      response.status(400).json({ error: "User not found" });
      return;
    }

    const photos = await Photo.find({ user_id: userId })
      .select("_id user_id comments file_name date_time")
      .exec();

    const processedPhotos = await Promise.all(
      photos.map(async (photo) => {
        const photoObj = photo.toObject();

        if (photoObj.comments && photoObj.comments.length > 0) {
          photoObj.comments = await Promise.all(
            photoObj.comments.map(async (comment) => {
              const commentUser = await User.findById(comment.user_id)
                .select("_id first_name last_name")
                .exec();

              return {
                _id: comment._id,
                comment: comment.comment,
                date_time: comment.date_time,
                user: commentUser ? commentUser.toObject() : null,
              };
            })
          );
        }

        return photoObj;
      })
    );

    response.status(200).json(processedPhotos);
  } catch (error) {
    console.error("Error fetching photos:", error);
    response.status(400).json({ error: "Invalid user ID" });
  }
});


router.post(
  "/commentsOfPhoto/:photo_id",
  requireAuth,
  async (request, response) => {
    const photoId = request.params.photo_id;
    const { comment } = request.body;

    if (!comment || comment.trim() === "") {
      return response.status(400).json({ error: "Comment cannot be empty" });
    }

    try {
      const photo = await Photo.findById(photoId).exec();
      if (!photo) {
        return response.status(400).json({ error: "Photo not found" });
      }

      const newComment = {
        comment: comment.trim(),
        user_id: request.user_id,
        date_time: new Date(),
      };

      photo.comments.push(newComment);
      await photo.save();

      response.status(200).json({ message: "Comment added successfully" });
    } catch (error) {
      console.error("Error adding comment:", error);
      response.status(400).json({ error: "Error adding comment" });
    }
  }
);


router.post(
  "/new",
  requireAuth,
  upload.single("photo"),
  async (request, response) => {
    if (!request.file) {
      return response.status(400).json({ error: "No file uploaded" });
    }

    try {
      const newPhoto = new Photo({
        file_name: request.file.filename,
        user_id: request.user_id,
        date_time: new Date(),
        comments: [],
      });

      await newPhoto.save();
      response
        .status(200)
        .json({ message: "Photo uploaded successfully", photo: newPhoto });
    } catch (error) {
      console.error("Error uploading photo:", error);
      response.status(400).json({ error: "Error uploading photo" });
    }
  }
);

router.delete("/:photo_id", requireAuth, async (request, response) => {
  const photoID = request.params.photo_id;
  
  try{
    const photo = await Photo.findById(photoID).exec();
    if(!photo){
      return response.status(400).json({ error: "Photo not found" });
    }

    if(photo.user_id.toString() !== request.user_id){
      return response.status(403).json({ error: "Forbidden: You can only delete your own photos" });
    }
    await Photo.findByIdAndDelete(photoID).exec();
    response.status(200).json({ message: "Photo deleted successfully" });
  }catch(error){
    console.error("Error deleting photo:", error);
    response.status(500).json({ error: "Internal server error" });
  }
})

router.delete("/:photo_id/comments/:comment_id", requireAuth, async (request, response) => {
  const photoID = request.params.photo_id;
  const commentID = request.params.comment_id;
  console.log(photoID, commentID);
  try {
    const photo = await Photo.findById(photoID).exec();
    if (!photo){
      return response.status(400).json({ error: "Photo not found" });
    }
    const comment = photo.comments.id(commentID);
    if(!comment){
      return response.status(400).json({ error: "Comment not found" });
    }
    if(comment.user_id.toString() !== request.user_id){
      return response.status(403).json({ error: "Forbidden: You can only delete your own comments" });
    }
    photo.comments.pull({ _id: commentID });
    await photo.save();
    response.status(200).json({ message: "Comment deleted successfully" });
  }catch (error) {
    console.error("Error deleting comment:", error);
    response.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:photo_id/comments/:comment_id", requireAuth, async (request, response) => {
  const photoID = request.params.photo_id;
  const commentID = request.params.comment_id;
  const { comment } = request.body;

  if(comment.trim() === ""){
    return response.status(400).json({ error: "Comment cannot be empty" });
  }
  
  try {
    const photo = await Photo.findById(photoID).exec();
    if (!photo){
      return response.status(400).json({ error: "Photo not found" });
    }

    const existingComment = photo.comments.id(commentID);
    if(!existingComment){
      return response.status(400).json({ error: "Comment not found" });
    }

    if(existingComment.user_id.toString() !== request.user_id){
      return response.status(403).json({ error: "Forbidden: You can only edit your own comments" });
    }
    
    existingComment.comment = comment.trim();
    existingComment.date_time = new Date();
    await photo.save();
    response.status(200).json({ message: "Comment updated successfully" });
  }catch (error) {
    console.error("Error updating comment:", error);
    response.status(500).json({ error: "Internal server error" });
  }
})

router.get("/user/countsOfPhotos/:user_id", requireAuth, async (request, response) => {
  const userId = request.params.user_id;

  try {
    const photoCount = await Photo.countDocuments({ user_id: userId }).exec();
    response.status(200).json({ photo_count: photoCount });
  } catch (error) {
    console.error("Error fetching photo count:", error);
    response.status(500).json({ error: "Internal server error" });
  }
});

router.get("/photo/countsOfComments/:user_id", requireAuth, async (request, response) => {
  const userId = request.params.user_id;

  try {
    const photos = await Photo.find({ user_id: userId }).select("comments").exec();
    let commentCount = 0;
    photos.forEach(photo => {
      commentCount += photo.comments.length;
    });
    response.status(200).json({ comment_count: commentCount });
  } catch (error) {
    console.error("Error fetching comment count:", error);
    response.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
