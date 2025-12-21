import React, { useState, useEffect } from "react";
import { Divider, List, ListItem, ListItemText } from "@mui/material";
import { Link } from "react-router-dom";
import fetchModel from "../../lib/fetchModelData";

import "./styles.css";

function UserList() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const data = await fetchModel("/user/list");
      setUsers(data);
    };
    fetchData();
  }, []);

  return (
    <div>
      <List component="nav">
        {users.map((item) => (
          <React.Fragment key={item._id}>
            <ListItem component={Link} to={`/users/${item._id}`}>
              <ListItemText
                primary={`${item.first_name} ${item.last_name}`}
                secondary={
  <>
    {item.location}
    <br />
    Ảnh: {item.photo_count} • Bình luận: {item.comment_count}
  </>
}
              />
            </ListItem>
            <Divider />
          </React.Fragment>
        ))}
      </List>
    </div>
  );
}

export default UserList;
