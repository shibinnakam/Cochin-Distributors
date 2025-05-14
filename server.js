const express = require("express");
const session = require("express-session");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();

// Define isAuthenticated function
function isAuthenticated(req, res, next) {
  if (req.session.loggedIn) {
    return next();  // Admin is logged in, continue to the route
  } else {
    res.redirect("/login");  // Admin is not logged in, redirect to login
  }
}

const ITEMS_FILE = path.join(__dirname, "items.json");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(session({
  secret: "mysecretkey",
  resave: false,
  saveUninitialized: true,
}));

const upload = multer({ dest: "public/uploads/" });

// Routes

// Home route
app.get("/", (req, res) => {
  const content = JSON.parse(fs.readFileSync("content.json", "utf-8"));
  res.render("index", { content });
});

// Items page (public)
app.get("/items", (req, res) => {
  const items = JSON.parse(fs.readFileSync(ITEMS_FILE, "utf-8"));
  res.render("items", { items });
});

// Login route
app.get("/login", (req, res) => {
  res.render("login", { error: null });
});

app.post("/login", (req, res) => {
  const users = JSON.parse(fs.readFileSync("users.json", "utf-8"));
  const { username, password } = req.body;
  if (username === users.username && password === users.password) {
    req.session.loggedIn = true;
    res.redirect("/dashboard");
  } else {
    res.render("login", { error: "Invalid credentials" });
  }
});

// Dashboard route (Admin)
app.get("/dashboard", isAuthenticated, (req, res) => {
  const content = JSON.parse(fs.readFileSync("content.json", "utf-8"));
  res.render("dashboard", { content });
});

// Update content on dashboard
app.post("/update", isAuthenticated, upload.single("image"), (req, res) => {
  let content = {
    title: req.body.title,
    description: req.body.description,
    image: req.file
      ? req.file.filename
      : JSON.parse(fs.readFileSync("content.json", "utf-8")).image,
  };
  fs.writeFileSync("content.json", JSON.stringify(content, null, 2));
  res.redirect("/dashboard");
});

// Manage items (Admin)
app.get("/dashboard/items", isAuthenticated, (req, res) => {
  const items = JSON.parse(fs.readFileSync(ITEMS_FILE, "utf-8"));
  res.render("admin_items", { items });
});

// Add new item
app.post("/dashboard/items/add", isAuthenticated, upload.single("image"), (req, res) => {
  const items = JSON.parse(fs.readFileSync(ITEMS_FILE, "utf-8"));
  const { name, description, rate } = req.body;
  const newItem = {
    id: Date.now(),
    name,
    description,
    rate,
    image: req.file ? req.file.filename : "",
    active: true,  // Default to "In Stock"
  };
  items.push(newItem);
  fs.writeFileSync(ITEMS_FILE, JSON.stringify(items, null, 2));
  res.redirect("/dashboard/items");
});

// Toggle in-stock status
app.post("/dashboard/items/:id/toggle", isAuthenticated, (req, res) => {
  const items = JSON.parse(fs.readFileSync(ITEMS_FILE, "utf-8"));
  const id = Number(req.params.id);
  const idx = items.findIndex(i => i.id === id);
  if (idx !== -1) {
    items[idx].active = !items[idx].active;
    fs.writeFileSync(ITEMS_FILE, JSON.stringify(items, null, 2));
  }
  res.redirect("/dashboard/items");
});

// Delete item
app.post("/dashboard/items/:id/delete", isAuthenticated, (req, res) => {
  let items = JSON.parse(fs.readFileSync(ITEMS_FILE, "utf-8"));
  const id = Number(req.params.id);
  items = items.filter(i => i.id !== id);
  fs.writeFileSync(ITEMS_FILE, JSON.stringify(items, null, 2));
  res.redirect("/dashboard/items");
});

// Render the edit form for a specific item
app.get("/dashboard/items/:id/edit", isAuthenticated, (req, res) => {
  const items = JSON.parse(fs.readFileSync(ITEMS_FILE, "utf-8"));
  const id = Number(req.params.id);
  const item = items.find(i => i.id === id);
  
  if (!item) {
    return res.status(404).send("Item not found");
  }

  res.render("edit_item", { item }); // Render the edit form with existing item data
});

// Handle the update of the item
app.post("/dashboard/items/:id/update", isAuthenticated, upload.single("image"), (req, res) => {
  const items = JSON.parse(fs.readFileSync(ITEMS_FILE, "utf-8"));
  const id = Number(req.params.id);
  const idx = items.findIndex(i => i.id === id);

  if (idx === -1) {
    return res.status(404).send("Item not found");
  }

  const { name, description, rate } = req.body;
  const updatedItem = {
    ...items[idx],
    name,
    description,
    rate,
    image: req.file ? req.file.filename : items[idx].image, // Keep old image if no new one is uploaded
  };

  items[idx] = updatedItem;

  fs.writeFileSync(ITEMS_FILE, JSON.stringify(items, null, 2));
  res.redirect("/dashboard/items");
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// Start server
app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
