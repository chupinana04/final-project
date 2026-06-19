import React, { useState, useEffect } from "react";
import { Typography, Paper, Button, TextField, Box } from "@mui/material";
import { Link, useParams } from "react-router-dom";
import fetchModel from "../../lib/fetchModelData";

import "./styles.css";

function UserDetail({currentUser}) {
  const { userId } = useParams();
  const [user, setUser] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    location: "",
    description: "",
    occupation: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      const data = await fetchModel("/user/" + userId);
      setUser(data);
      setFormData({
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        location: data.location || "",
        description: data.description || "",
        occupation: data.occupation || "",
      });
    };
    fetchData();
  }, [userId]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`/api/user/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (response.status === 200) {
      // Nếu backend trả về user đầy đủ
      if (data.user) {
        setUser(data.user);
      } else {
        // Nếu chỉ trả về message, fetch lại user từ API
        const refreshed = await fetchModel("/user/" + userId);
        setUser(refreshed);
      }
      setIsEditing(false);
    } else {
      alert(data.error || "Update failed");
    }
  } catch (error) {
    console.error("Error updating user:", error);
    alert("Error updating user");
  }
};


  if (!user) {
    return <Typography>User not found!</Typography>;
  }

  return (
    <Paper style={{ padding: 16 }}>
      {!isEditing ? (
        <>
          <Typography variant="h4">
            {user.first_name} {user.last_name}
          </Typography>
          <Typography variant="body1">
            <strong>Location:</strong> {user.location}
          </Typography>
          <Typography variant="body1">
            <strong>Description:</strong> {user.description}
          </Typography>
          <Typography variant="body1" gutterBottom>
            <strong>Occupation:</strong> {user.occupation}
          </Typography>

          <Box display="flex" gap={2} mt={2}>
            <Button
              variant="contained"
              color="primary"
              component={Link}
              to={`/photos/${user._id}`}
            >
              View Photos
            </Button>
            {currentUser && currentUser._id === user._id && (
              <Button
                variant="outlined"
                color="secondary"
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </Button>
            )}
          </Box>
        </>
      ) : (
        <>
          <TextField
            fullWidth
            label="First Name"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Last Name"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            margin="normal"
            multiline
            rows={3}
          />
          <TextField
            fullWidth
            label="Occupation"
            name="occupation"
            value={formData.occupation}
            onChange={handleChange}
            margin="normal"
          />

          <Box display="flex" gap={2} mt={2}>
            <Button variant="contained" color="primary" onClick={handleSave}>
              Save
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
          </Box>
        </>
      )}
    </Paper>
  );
}

export default UserDetail;
