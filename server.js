const express = require("express");
const dotenv = require("dotenv").config();
const path = require("path");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const serviceAccount = require("./config.json");
const { error } = require("console");
const { name } = require("ejs");

const app = express();
const port = process.env.PORT || 3000;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "public/views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/tasks/:id", async (req, res) => {
  const taskRef = db.collection("Tasks").doc(req.params.id).collection("tasks");
  const id = req.params.id;
  const userRef = db.collection("users").doc(id);
  let name = "";

  await userRef.get().then((snap) => {
    name = snap.data()["name"];
  });

  await taskRef
    .get()
    .then((snap) => {
      tasks = [];
      snap.forEach((doc) => {
        if (doc.exists) {
          var temp = { id: doc.id, data: doc.data() };

          tasks.push(temp);
        } else {
          console.log("Document does not exist");
        }
      });
      data = {
        id: id,
        userName: name,
        tasks: tasks,
      };
      res.render("tasks", { data });
    })
    .catch((error) => {
      console.error("Error getting document:", error);
    });
});

app.post("/updateTask/:id/:item", async (req, res) => {
  const id = req.params.id;
  const itemId = req.params.item;
  const action = req.body.action;

  const taskRef = db
    .collection("Tasks")
    .doc(id)
    .collection("tasks")
    .doc(itemId);

  let oldData = "";

  await taskRef
    .get()
    .then((data) => {
      oldData = data.data();
    })
    .catch((error) => {
      console.error(error);
    });

  oldData["done"] = action === "markDone" ? true : false;
  console.log(oldData);

  await taskRef.set(oldData);
  res.redirect(`/tasks/${id}`);
});

app.post("/addTask/:id", async (req, res) => {
  console.log(req.params.id);
  console.log(req.body.taskName);

  const id = req.params.id;

  try {
    const taskRef = db.collection("Tasks").doc(id).collection("tasks");

    const data = { done: false, name: req.body.taskName };

    await taskRef
      .add(data)
      .then(() => {
        console.log("Document created with specified ID:", id);
      })
      .catch((error) => {
        console.error("Error creating document:", error);
      });

    res.redirect(`/tasks/${id}`);
  } catch (error) {
    console.error("Error adding task:", error);
    res.status(500).json({ success: false, error: "Failed to add task." });
  }
});

app.post("/login", async (req, res) => {
  let email = req.body.email;
  let passwd = req.body.passwd;

  const taskRef = db.collection("users");
  let responseSent = false;

  await taskRef
    .get()
    .then((snap) => {
      snap.forEach((doc) => {
        const actual = doc.data();
        if (
          !responseSent &&
          actual["email"] == email &&
          actual["passwd"] == passwd
        ) {
          console.log(doc.id);
          responseSent = true;
          res.redirect(`/tasks/${doc.id}`);
        }
      });
      if (!responseSent) {
        res.json({ success: false, error: "Invalid username / password" });
      }
    })
    .catch((error) => {
      if (!responseSent) {
        console.error("Error getting documents:", error);
        res.status(500).json({ success: false, error: "Failed to get tasks." });
      }
    });
});

app.post("/signup", async (req, res) => {
  let name = req.body.name;
  let email = req.body.email;
  let phone_no = req.body.phone_no;
  let passwd = req.body.passwd;

  const data = {
    name: name,
    email: email,
    phone_no: phone_no,
    passwd: passwd,
  };

  try {
    const taskRef = db.collection("users");
    const docRef = await taskRef.add(data);
    const id = docRef["_path"]['segments'][1];
    res.redirect(`/tasks/${docRef.id}`);
  } catch (error) {
    console.error("Error adding task:", error);
    res.status(500).json({ success: false, error: "Failed to add task." });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running successful on ${port}`);
});
