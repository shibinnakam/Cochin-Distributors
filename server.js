const express = require("express");
const session = require("express-session");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();

function isAuthenticated(req, res, next) {
  if (req.session.loggedIn) return next();
  res.redirect("/login");
}

const ITEMS_FILE = path.join(__dirname, "items.json");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public"))); // ✅ Serve static files

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(session({
  secret: "mysecretkey",
  resave: false,
  saveUninitialized: true,
}));

const upload = multer({ dest: "public/uploads/" });

// Routes

app.get("/", (req, res) => {
  const content = JSON.parse(fs.readFileSync("content.json", "utf-8"));
  res.render("index", { content });
});

app.get("/items", (req, res) => {
  const items = JSON.parse(fs.readFileSync(ITEMS_FILE, "utf-8"));
  res.render("items", { items });
});

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

app.get("/dashboard", isAuthenticated, (req, res) => {
  const content = JSON.parse(fs.readFileSync("content.json", "utf-8"));
  res.render("dashboard", { content });
});

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

app.get("/dashboard/items", isAuthenticated, (req, res) => {
  const items = JSON.parse(fs.readFileSync(ITEMS_FILE, "utf-8"));
  res.render("admin_items", { items });
});

app.post("/dashboard/items/add", isAuthenticated, upload.single("image"), (req, res) => {
  const items = JSON.parse(fs.readFileSync(ITEMS_FILE, "utf-8"));
  const { name, description, rate } = req.body;
  const newItem = {
    id: Date.now(),
    name,
    description,
    rate,
    image: req.file ? req.file.filename : "",
    active: true,
  };
  items.push(newItem);
  fs.writeFileSync(ITEMS_FILE, JSON.stringify(items, null, 2));
  res.redirect("/dashboard/items");
});

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

app.post("/dashboard/items/:id/delete", isAuthenticated, (req, res) => {
  let items = JSON.parse(fs.readFileSync(ITEMS_FILE, "utf-8"));
  const id = Number(req.params.id);
  items = items.filter(i => i.id !== id);
  fs.writeFileSync(ITEMS_FILE, JSON.stringify(items, null, 2));
  res.redirect("/dashboard/items");
});

app.get("/dashboard/items/:id/edit", isAuthenticated, (req, res) => {
  const items = JSON.parse(fs.readFileSync(ITEMS_FILE, "utf-8"));
  const id = Number(req.params.id);
  const item = items.find(i => i.id === id);
  if (!item) return res.status(404).send("Item not found");
  res.render("edit_item", { item });
});

app.post("/dashboard/items/:id/update", isAuthenticated, upload.single("image"), (req, res) => {
  const items = JSON.parse(fs.readFileSync(ITEMS_FILE, "utf-8"));
  const id = Number(req.params.id);
  const idx = items.findIndex(i => i.id === id);

  if (idx === -1) return res.status(404).send("Item not found");

  const { name, description, rate } = req.body;
  const updatedItem = {
    ...items[idx],
    name,
    description,
    rate,
    image: req.file ? req.file.filename : items[idx].image,
  };

  items[idx] = updatedItem;
  fs.writeFileSync(ITEMS_FILE, JSON.stringify(items, null, 2));
  res.redirect("/dashboard/items");
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

app.get("/about", (req, res) => {
  res.render("about");
});

app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
