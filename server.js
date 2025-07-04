const express = require("express");
const fs = require("fs");
const path = require("path");
const session = require("express-session");
const bodyParser = require("body-parser");

const app = express();
const PORT = 3000;
const USERS_FILE = path.join(__dirname, "users.json");
const TRANSFERS_FILE = path.join(__dirname, "transfers.json");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.use(session({
  secret: "secret_key",
  resave: false,
  saveUninitialized: false
}));

// Fonctions utilitaires
function readUsers() {
  return JSON.parse(fs.readFileSync(USERS_FILE));
}
function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}
function readTransfers() {
  return JSON.parse(fs.readFileSync(TRANSFERS_FILE));
}
function writeTransfers(transfers) {
  fs.writeFileSync(TRANSFERS_FILE, JSON.stringify(transfers, null, 2));
}

// Middleware auth
function isAuthenticated(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  next();
}

// Routes
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

app.get("/user", isAuthenticated, (req, res) => {
  if (req.session.user.statut === "admin") {
    return res.redirect("/admin");
  }

  const users = readUsers();
  const transfers = readTransfers();
  const user = users.find(u => u.id === req.session.user.id);

  const userTransfers = transfers.filter(t => t.to === user.id);
  res.render("user", { user, userTransfers });
});

app.get("/admin", isAuthenticated, (req, res) => {
  if (req.session.user.statut !== "admin") {
    return res.redirect("/user");
  }

  const users = readUsers();
  const transfers = readTransfers();
  res.render("admin", {
    users,
    transfers,
    admin: req.session.user // ✅ envoyer l'admin connecté
  });
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

app.post("/admin/transfer", (req, res) => {
  const { fromId, toId, amount } = req.body;
  const users = readUsers();
  const transfers = readTransfers();

  const sender = users.find(u => u.id === fromId);
  const recipient = users.find(u => u.id === toId);
  const montant = parseFloat(amount);

  if (!sender || !recipient || sender.montant < montant) {
    return res.send("Erreur de transfert : vérifiez les soldes ou les identifiants.");
  }

  sender.montant -= montant;
  recipient.montant += montant;

  transfers.push({
    from: fromId,
    to: toId,
    amount: montant,
    date: new Date().toISOString(),
    status: "en cours"
  });

  writeUsers(users);
  writeTransfers(transfers);

  res.redirect("/admin");
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

app.listen(PORT, () => {
  console.log(`✅ Serveur lancé : http://localhost:${PORT}`);
});
