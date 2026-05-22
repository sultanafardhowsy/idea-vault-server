const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// MongoDB Setup
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let ideasCollection;
let commentsCollection;

async function connectDB() {
  try {
    await client.connect();
    const db = client.db('ideavault');
    
    ideasCollection = db.collection('allideas');
    commentsCollection = db.collection('comments');

    // Create Text Index for better search
    await ideasCollection.createIndex({
      title: "text",
      shortDescription: "text",
      description: "text",
      category: "text",
      founder: "text",
      problemStatement: "text",
      proposedSolution: "text"
    });

    console.log("✅ MongoDB Connected Successfully");
    console.log("✅ Text Search Index Created");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
  }
}

// ====================== ROUTES ======================

app.get('/', (req, res) => {
  res.send('Idea Vault Server is Running');
});

// ==================== IDEAS ====================

// Get All Ideas with Search
app.get("/allideas", async (req, res) => {
  try {
    const search = (req.query.search || "").trim();

    let query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { shortDescription: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { founder: { $regex: search, $options: "i" } },
        { problemStatement: { $regex: search, $options: "i" } },
        { proposedSolution: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } }
      ];
    }

    const result = await ideasCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch ideas" });
  }
});

// Get Limited Ideas (for homepage)
app.get('/ideas', async (req, res) => {
  try {
    const result = await ideasCollection
      .find()
      .sort({ createdAt: -1 })
      .limit(6)
      .toArray();

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create New Idea
app.post('/allidea', async (req, res) => {
  try {
    const newIdea = req.body;
    const result = await ideasCollection.insertOne(newIdea);

    res.status(201).json({
      success: true,
      message: "Idea published successfully!",
      insertedId: result.insertedId
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Ideas by Email
app.get("/ideas-by-email", async (req, res) => {
  try {
    const userEmail = req.query.email;

    if (!userEmail) {
      return res.status(400).json({ error: "Email is required" });
    }

    const result = await ideasCollection
      .find({ email: userEmail })
      .sort({ createdAt: -1 })
      .toArray();

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch ideas" });
  }
});

// Get Single Idea
app.get('/showalldata/:id', async (req, res) => {
  try {
    const token = req.headers.authorization;
    console.log(token);

    const { id } = req.params;

    const result = await ideasCollection.findOne({
      _id: new ObjectId(id)
    });

    if (!result) {
      return res.status(404).json({ error: "Idea not found" });
    }

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch idea" });
  }
});

// Update Idea
app.patch('/showalldata/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const result = await ideasCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Idea not found" });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Get My Comments
app.get('/mycomments', async (req, res) => {
  try {
    const userId = req.query.userId;

    if (!userId) {
      return res.status(400).json({ error: 'UserId is required' });
    }

    const result = await commentsCollection
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Delete Idea + Comments
app.delete("/ideas/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await ideasCollection.deleteOne({ _id: new ObjectId(id) });
    await commentsCollection.deleteMany({ ideaId: id });

    res.json({ success: true, message: "Idea and comments deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// Get 6 Latest Comments (for Community Feedback section)
app.get("/comments6", async (req, res) => {
  try {
    const result = await commentsCollection
      .find()
      .sort({ createdAt: -1 })
      .limit(6)
      .toArray();

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// Get Comments for a specific idea
app.get("/comments", async (req, res) => {
  try {
    const { ideaId } = req.query;
    const comments = await commentsCollection
      .find({ ideaId })
      .sort({ createdAt: -1 })
      .toArray();

    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add Comment
app.post("/comments", async (req, res) => {
  try {
    const comment = { 
      ...req.body, 
      createdAt: new Date() 
    };
    const result = await commentsCollection.insertOne(comment);

    res.status(201).json({ _id: result.insertedId, ...comment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Comment
app.put("/comments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await commentsCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          text: req.body.text, 
          updatedAt: new Date() 
        } 
      }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Comment
app.delete("/comments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await commentsCollection.deleteOne({ _id: new ObjectId(id) });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.patch("/ideas/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await ideasCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: req.body
      }
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Update failed" });
  }
});

// Start Server
async function startServer() {
  await connectDB();
  
  app.listen(PORT, () => {
    console.log(` Server running on http://localhost:${PORT}`);
  });
}

startServer();