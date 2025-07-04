const express = require("express");
const fs = require("fs");
const path = require("path");
const session = require("express-session");
const bodyParser = require("body-parser");

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, "users.json");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.use(session({
  secret: "secret_key",
  resave: false,
  saveUninitialized: false
}));

function readUsers() {
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

function writeUsers(users) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
}

app.get("/", (req, res) => {
  res.redirect("/login");
});

app.get("/login", (req, res) => {
  res.render("login", { error: null });
});

app.post("/login", (req, res) => {
  const { id, password } = req.body;
  const users = readUsers();
  const user = users.find(u => u.id === id && u.password === password);

  if (!user) {
    return res.render("login", { error: "Identifiants incorrects." });
  }

  req.session.user = user;
  if (user.statut === "admin") {
    return res.redirect("/admin");
  } else {
    return res.redirect("/user");
  }
});

app.get("/user", (req, res) => {
  if (!req.session.user || req.session.user.statut === "admin") {
    return res.redirect("/login");
  }

  const users = readUsers();
  const user = users.find(u => u.id === req.session.user.id);
  res.render("user", { user });
});

app.get("/admin", (req, res) => {
  if (!req.session.user || req.session.user.statut !== "admin") {
    return res.redirect("/login");
  }
  const users = readUsers();
  res.render("admin", { users });
});

app.post("/admin/create", (req, res) => {
  const { id, password, nom, prenom, sexe, date_naissance, montant } = req.body;
  const users = readUsers();

  if (users.some(u => u.id === id)) {
    return res.send("L'identifiant existe déjà.");
  }

  users.push({
    id,
    password,
    nom,
    prenom,
    sexe,
    date_naissance,
    montant: parseFloat(montant),
    statut: "actif"
  });

  writeUsers(users);
  res.redirect("/admin");
});

app.post("/admin/update", (req, res) => {
  const { id, montant, statut } = req.body;
  const users = readUsers();
  const user = users.find(u => u.id === id);
  if (user) {
    user.montant = parseFloat(montant);
    user.statut = statut;
    writeUsers(users);
  }
  res.redirect("/admin");
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
