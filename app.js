const express = require("express");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const { MongoClient } = require("mongodb");
require("dotenv").config(); // Load environment variables from .env file
const cors = require("cors"); // Import the cors packa

const app = express();
app.use(cors());
const port = 3001;

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  res.send("Hello, Express!");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

app.post("/send-email", (req, res) => {
  const beautifulString = req.body
    .map((item) => `${item.Attribute}: ${item.Value}`)
    .join("\n");
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: "mbbsadmissionsinabroad@gmail.com",
    subject: "New Form Submission",
    text: beautifulString,
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending email", error);
      res.status(500).send({ message: "Error sending email" });
    } else {
      console.log("Email sent: " + info.response);
      res.status(200).send({ message: "Email sent successfully" });
    }
  });
});

const client = new MongoClient(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// MongoDB connection function
async function connectDB() {
  try {
    if (!client.topology || !client.topology.isConnected()) {
      await client.connect();
    }
    return client.db("examDB");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw new Error("MongoDB connection failed");
  }
}

// Route handler for both POST and GET requests
app.all("/api/user", async (req, res) => {
  if (req.method === "POST") {
    const { email, phone, name } = req.body;
    try {
      const db = await connectDB();
      const usersCollection = db.collection("users");

      // Check if the user already exists
      const existingUser = await usersCollection.findOne({ email, phone });

      if (existingUser) {
        // If user exists, update the attempts count by incrementing it
        if (existingUser.attempts >= 2) {
          return res.status(400).json({
            message: "You have exceeded the maximum number of attempts.",
          });
        }

        // Increment attempts count for existing user
        await usersCollection.updateOne(
          { email, phone },
          { $inc: { attempts: 1 } }
        );

        return res
          .status(200)
          .json({ message: "User attempts updated successfully." });
      }

      // If user doesn't exist, insert new record
      await usersCollection.insertOne({
        name,
        email,
        phone,
        attempts: 1,
      });

      res.status(200).json({ message: "User details saved successfully." });
    } catch (error) {
      console.error("Error saving/updating user:", error);
      res.status(500).json({ message: "Something went wrong." });
    }
  } else if (req.method === "GET") {
    try {
      const db = await connectDB();
      const usersCollection = db.collection("users");

      // Fetch user details based on email and phone from query parameters

      const { email, phone } = req.query;

      // Find the user by email and phone
      const user = await usersCollection.findOne({ email, phone });

      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      // Return user name and number of attempts
      res.status(200).json({ name: user.name, attempts: user.attempts });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Something went wrong." });
    }
  } else {
    res.status(405).json({ message: "Method not allowed." });
  }
});
