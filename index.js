const express = require("express");
const app = express();
const { User, Kitten } = require("./db");
const jwt = require("jsonwebtoken");
process.env.JWT_SECRET = "neverTell";
const bcrypt = require("bcrypt");
const saltCount = 10;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", async (req, res, next) => {
  try {
    console.log(req.user);
    res.send(`
      <h1>Welcome to Cyber Kittens!</h1>
      <p>Cats are available at <a href="/kittens/1">/kittens/:id</a></p>
      <p>Create a new cat at <b><code>POST /kittens</code></b> and delete one at <b><code>DELETE /kittens/:id</code></b></p>
      <p>Log in via POST /login or register via POST /register</p>
    `);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

// Verifies token with jwt.verify and sets req.user
// TODO - Create authentication middleware
const setUser = async (req, res, next) => {
  const auth = req.header("Authorization");
  if (!auth) res.sendStatus(401);
  else {
    const [, token] = auth.split(" ");
    const userObj = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(userObj.id);
    req.user = user;
    next();
  }
};

// POST /register
// OPTIONAL - takes req.body of {username, password} and creates a new user with the hashed password
app.post("/register", async (req, res, next) => {
  const { username, password } = req.body;
  const hashedPW = await bcrypt.hash(password, saltCount);
  const user = await User.create({ username, password: hashedPW });

  const token = jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET
  );
  res.send({ message: "success", token });
});

// POST /login
// OPTIONAL - takes req.body of {username, password}, finds user by username, and compares the password with the hashed version from the DB
app.post("/login", async (req, res, next) => {
  const { username, password } = req.body;
  const user = await User.findOne({ where: { username } });
  const isAMatch = await bcrypt.compare(password, user.password);
  if (isAMatch) {
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET
    );
    res.send({ message: "success", token });
  } else {
    res.sendStatus(401);
  }
});

// GET /kittens/:id
// TODO - takes an id and returns the cat with that id
app.get("/kittens/:id", setUser, async (req, res, next) => {
  const kitten = await Kitten.findByPk(req.params.id);
  if (!req.user) {
    res.sendStatus(401);
  } else if (req.user.id !== kitten.ownerId) {
    res.sendStatus(401);
  } else {
    res.send({ age: kitten.age, name: kitten.name, color: kitten.color });
  }
});

// POST /kittens
// TODO - takes req.body of {name, age, color} and creates a new cat with the given name, age, and color
app.post("/kittens", setUser, async (req, res, next) => {
  if (!req.user) {
    res.sendStatus(401);
  } else {
    const kitten = await Kitten.create({
      ownerId: req.user.id,
      name: req.body.name,
      age: req.body.age,
      color: req.body.color,
    });
    res
      .status(201)
      .send({ age: kitten.age, name: kitten.name, color: kitten.color });
  }
});

// DELETE /kittens/:id
// TODO - takes an id and deletes the cat with that id
app.delete("/kittens/:id", setUser, async (req, res, next) => {
  if (!req.user) {
    res.sendStatus(401);
  } else {
    const kitten = await Kitten.findByPk(req.params.id);
    if (kitten.ownerId !== req.user.id) {
      res.sendStatus(401);
    } else {
      await kitten.destroy();
      res.sendStatus(204);
    }
  }
});

// error handling middleware, so failed tests receive them
app.use((error, req, res, next) => {
  console.error("SERVER ERROR: ", error);
  if (res.statusCode < 400) res.status(500);
  res.send({ error: error.message, name: error.name, message: error.message });
});

// we export the app, not listening in here, so that we can run tests
module.exports = app;
