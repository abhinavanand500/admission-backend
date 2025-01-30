import express from "express";
import { MongoClient } from "mongodb";
import nodemailer from "nodemailer";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const port = 8000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// MongoDB connection
const client = new MongoClient(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Nodemailer Transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// MongoDB connection function
async function connectDB() {
  if (!client.topology || !client.topology.isConnected()) {
    await client.connect();
  }
  return client.db("examDB");
}

// Route handler for both POST and GET requests
app.all("/api/user", async (req, res) => {
  const { email, phone, name } = req.body;

  if (req.method === "POST") {
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
    } finally {
      await client.close();
    }
  } else if (req.method === "GET") {
    try {
      const db = await connectDB();
      const usersCollection = db.collection("users");

      // Fetch user details based on email and phone from query parameters
      const { email, phone } = req.body;

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
    } finally {
      await client.close();
    }
  } else {
    res.status(405).json({ message: "Method not allowed." });
  }
});

// Root Route
app.get("/", (req, res) => {
  res.send("Hello, Express!");
});

// Start Server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
