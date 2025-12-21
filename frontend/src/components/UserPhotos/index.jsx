import React, { useState, useEffect } from "react";
import {
  Typography,
  Card,
  CardMedia,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Divider,
  TextField,
  Button,
  Box,
  Dialog,
} from "@mui/material";
import { useParams, Link } from "react-router-dom";
import fetchModel from "../../lib/fetchModelData";

import "./styles.css";

function UserPhotos({ photoUploadTrigger, userLogin }) {
  const { userId } = useParams();

  const [photos, setPhotos] = useState([]);
  const [commentTexts, setCommentTexts] = useState({});
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [openViewer, setOpenViewer] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  
  const handleOpenViewer = (photo) => {
    setSelectedPhoto(photo);
    setOpenViewer(true);
  };

  const handleCloseViewer = () => {
    setOpenViewer(false);
    setSelectedPhoto(null);
};

  const fetchPhotos = async () => {
    const data = await fetchModel("/photo/user/" + userId);
    setPhotos(data);
  };

  useEffect(() => {
    fetchPhotos();
  }, [userId, photoUploadTrigger]);

 
  const handleCommentSubmit = async (photoId) => {
    const text = commentTexts[photoId];
    if (!text || text.trim() === "") {
      alert("Comment cannot be empty");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:8081/api/photo/commentsOfPhoto/${photoId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ comment: text.trim() }),
        }
      );

      if (response.ok) {
        setCommentTexts({ ...commentTexts, [photoId]: "" });
        fetchPhotos();
      } else {
        alert("Failed to add comment");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to add comment");
    }
  };


  const handleDeleteComment = async (photoId, commentId) => {
    if (!window.confirm("Delete this comment?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:8081/api/photo/${photoId}/comments/${commentId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        fetchPhotos();
      } else {
        alert("Failed to delete comment");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete comment");
    }
  };


  const handleUpdateComment = async (photoId, commentId) => {
    if (!editingText.trim()) {
      alert("Comment cannot be empty");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:8081/api/photo/${photoId}/comments/${commentId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ comment: editingText.trim() }),
        }
      );

      if (response.ok) {
        setEditingCommentId(null);
        setEditingText("");
        fetchPhotos();
      } else {
        alert("Failed to update comment");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update comment");
    }
  };

  
  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm("Delete this photo?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:8081/api/photo/${photoId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        fetchPhotos();
      } else {
        alert("Failed to delete photo");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete photo");
    }
  };


  return (
    <div>
        <div>
        <Dialog open={openViewer} onClose={handleCloseViewer} maxWidth="lg">
          {selectedPhoto && (
            <Box>
              <img
                src={`http://localhost:8081/images/${selectedPhoto.file_name}`}
                alt="Full view"
                style={{ width: "100%", height: "auto" }}
              />
              <Box p={2} display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="caption">
                  Posted on {new Date(selectedPhoto.date_time).toLocaleString()}
                </Typography>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={handleCloseViewer}
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          )}
        </Dialog>

  </div>
      {photos.map((photo) => (
        <Card key={photo._id} sx={{ mb: 3 }}>
          <CardMedia
            component="img"
            height="400"
            image={`http://localhost:8081/images/${photo.file_name}`}
              onClick={() => {
              setSelectedPhoto(photo);
              setOpenViewer(true);
            }}
            sx={{ cursor: "pointer" }}
          />

          <CardContent>
            <Typography variant="caption">
              Posted on {new Date(photo.date_time).toLocaleString()}
            </Typography>

            {userLogin._id === photo.user_id && (
              <Box mt={1}>
                <Button color="error" onClick={() => handleDeletePhoto(photo._id)}>
                  Delete Photo
                </Button>
              </Box>
            )}

            <Typography variant="h6" mt={2}>
              Comments
            </Typography>

            <List>
              {photo.comments?.map((comment) => {
                const isOwner = comment.user._id === userLogin._id;
                const isEditing = editingCommentId === comment._id;

                return (
                  <React.Fragment key={comment._id}>
                    <ListItem alignItems="flex-start">
                      <ListItemText
                        primary={
                          <Box display="flex" gap={1}>
                            <Typography
                              component={Link}
                              to={`/users/${comment.user._id}`}
                              color="primary"
                              sx={{ textDecoration: "none", fontWeight: 500 }}
                            >
                              {comment.user.first_name} {comment.user.last_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(comment.date_time).toLocaleString()}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          isEditing ? (
                            <Box mt={1}>
                              <TextField
                                fullWidth
                                multiline
                                size="small"
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                              />
                              <Box mt={1} display="flex" gap={1}>
                                <Button
                                  size="small"
                                  variant="contained"
                                  onClick={() =>
                                    handleUpdateComment(photo._id, comment._id)
                                  }
                                >
                                  Save
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => setEditingCommentId(null)}
                                >
                                  Cancel
                                </Button>
                              </Box>
                            </Box>
                          ) : (
                            <Typography variant="body2">
                              {comment.comment}
                            </Typography>
                          )
                        }
                      />

                      {isOwner && !isEditing && (
                        <Box display="flex" gap={1}>
                          <Button
                            size="small"
                            onClick={() => {
                              setEditingCommentId(comment._id);
                              setEditingText(comment.comment);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            onClick={() =>
                              handleDeleteComment(photo._id, comment._id)
                            }
                          >
                            Delete
                          </Button>
                        </Box>
                      )}
                    </ListItem>

                    <Divider />
                  </React.Fragment>
                );
              })}
            </List>

            <Box mt={2}>
              <TextField
                fullWidth
                multiline
                rows={2}
                placeholder="Write a comment..."
                value={commentTexts[photo._id] || ""}
                onChange={(e) =>
                  setCommentTexts({
                    ...commentTexts,
                    [photo._id]: e.target.value,
                  })
                }
              />
              <Button
                sx={{ mt: 1 }}
                variant="contained"
                onClick={() => handleCommentSubmit(photo._id)}
              >
                Post Comment
              </Button>
            </Box>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default UserPhotos;
