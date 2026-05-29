const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');
dotenv.config();
const uri = process.env.MONGODB_URI;

const app = express();
const PORT = process.env.PORT || 5000;


app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://idea-vault-phi-five.vercel.app"
    ],
    credentials: true,
  })
);

app.use(express.json());

// MongoDB Setup
const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: false,
    deprecationErrors: true,
  },
});

const JWKS = createRemoteJWKSet(new URL(`${process.env.CLIENT_URL}/api/auth/jwks`));

// Verify JWT
const verifyToken = async (req, res, next) => {
  const authHeader = req?.headers.authorization;
  console.log(authHeader);
  if (!authHeader) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);
    console.log(payload);
    next();
  } catch (error) {
    return res.status(403).json({ message: "Forbidden" });
  }
};


// const verifyToken = async (req, res, next) => {
//   const authHeader = req?.headers.authorization;

//   if (!authHeader) {
//     return res.status(401).json({
//       message: "Unauthorized",
//       redirect: `/login?redirect=${encodeURIComponent(req.originalUrl)}`
//     });
//   }

//   const token = authHeader.split(" ")[1];

//   if (!token) {
//     return res.status(401).json({
//       message: "Unauthorized",
//       redirect: `/login?redirect=${encodeURIComponent(req.originalUrl)}`
//     });
//   }

//   try {
//     const { payload } = await jwtVerify(token, JWKS);

//     req.user = payload; 

//     next();
//   } catch (error) {
//     return res.status(403).json({
//       message: "Forbidden",
//       redirect: `/login?redirect=${encodeURIComponent(req.originalUrl)}`
//     });
//   }
// };

async function run() {
  // await client.connect();

  const db = client.db("ideavault");

  const ideasCollection = db.collection("allideas");
  const commentsCollection = db.collection("comments");


  // Home Route
  app.get("/", (req, res) => {
    res.send("Idea Vault Server is Running");
  });

  // Get All Ideas with Search
  app.get("/allideas", async (req, res) => {
    try {
      const search = (req.query.search || "").trim();

      let query = {};

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          
        ];
      }

      const result = await ideasCollection
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();

      res.send(result);
    } catch (error) {
      res.status(500).send({
        error: "Failed to fetch ideas",
      });
    }
  });

  // Get Limited Ideas
  app.get("/ideas", async (req, res) => {
    try {
      const result = await ideasCollection
        .find()
        .sort({ createdAt: -1 })
        .limit(6)
        .toArray();

      res.send(result);
    } catch (error) {
      res.status(500).send({
        error: error.message,
      });
    }
  });

  // Create New Idea
  app.post("/allidea",verifyToken, async (req, res) => {
    try {
      const newIdea = {
        ...req.body,
        createdAt: new Date(),
      };

      const result = await ideasCollection.insertOne(newIdea);

      res.status(201).send({
        success: true,
        message: "Idea published successfully!",
        insertedId: result.insertedId,
      });
    } catch (error) {
      res.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  // Get Ideas by Email
  app.get("/ideas-by-email", async (req, res) => {
    try {
      const userEmail = req.query.email;

      if (!userEmail) {
        return res.status(400).send({
          error: "Email is required",
        });
      }

      const result = await ideasCollection
        .find({ email: userEmail })
        .sort({ createdAt: -1 })
        .toArray();

      res.send(result);
    } catch (error) {
      res.status(500).send({
        error: "Failed to fetch ideas",
      });
    }
  });

  

app.get("/showalldata/:id",verifyToken, async (req, res) => {
      const { id } = req.params;

      const result = await ideasCollection.findOne({
        _id: new ObjectId(id),
      });

      res.json(result);
    });



  // Update Idea
  app.patch("/showalldata/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const result = await ideasCollection.updateOne(
        {
          _id: new ObjectId(id),
        },
        {
          $set: req.body,
        },
      );

      if (result.matchedCount === 0) {
        return res.status(404).send({
          error: "Idea not found",
        });
      }

      res.send(result);
    } catch (error) {
      res.status(500).send({
        error: error.message,
      });
    }
  });

  // Delete Idea + Comments
  app.delete("/ideas/:id", async (req, res) => {
    try {
      const { id } = req.params;

      await ideasCollection.deleteOne({
        _id: new ObjectId(id),
      });

      await commentsCollection.deleteMany({
        ideaId: id,
      });

      res.send({
        success: true,
        message: "Idea and comments deleted",
      });
    } catch (error) {
      res.status(500).send({
        error: error.message,
      });
    }
  });

  // Update Idea
  app.patch("/ideas/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const result = await ideasCollection.updateOne(
        {
          _id: new ObjectId(id),
        },
        {
          $set: req.body,
        },
      );

      res.send(result);
    } catch (error) {
      res.status(500).send({
        error: "Update failed",
      });
    }
  });

  // Get My Comments
  app.get("/mycomments",verifyToken, async (req, res) => {
    try {
      const userId = req.query.userId;

      if (!userId) {
        return res.status(400).send({
          error: "UserId is required",
        });
      }

      const result = await commentsCollection
        .find({ userId })
        .sort({ createdAt: -1 })
        .toArray();

      res.send(result);
    } catch (error) {
      res.status(500).send({
        error: "Failed to fetch comments",
      });
    }
  });

  // Get Latest 6 Comments
  app.get("/comments6", async (req, res) => {
    try {
      const result = await commentsCollection
        .find()
        .sort({ createdAt: -1 })
        .limit(6)
        .toArray();

      res.send(result);
    } catch (error) {
      res.status(500).send({
        error: "Failed to fetch comments",
      });
    }
  });

  // Get Comments by Idea
  app.get("/comments", async (req, res) => {
    try {
      const { ideaId } = req.query;

      const comments = await commentsCollection
        .find({ ideaId })
        .sort({ createdAt: -1 })
        .toArray();

      res.send(comments);
    } catch (error) {
      res.status(500).send({
        error: error.message,
      });
    }
  });

  // Add Comment
  app.post("/comments", async (req, res) => {
    try {
      const comment = {
        ...req.body,
        createdAt: new Date(),
      };

      const result = await commentsCollection.insertOne(comment);

      res.status(201).send({
        _id: result.insertedId,
        ...comment,
      });
    } catch (error) {
      res.status(500).send({
        error: error.message,
      });
    }
  });

  // Update Comment
  app.put("/comments/:id", async (req, res) => {
    try {
      const { id } = req.params;

      await commentsCollection.updateOne(
        {
          _id: new ObjectId(id),
        },
        {
          $set: {
            text: req.body.text,
            updatedAt: new Date(),
          },
        },
      );

      res.send({
        success: true,
      });
    } catch (error) {
      res.status(500).send({
        error: error.message,
      });
    }
  });

  // Delete Comment
  app.delete("/comments/:id", async (req, res) => {
    try {
      const { id } = req.params;

      await commentsCollection.deleteOne({
        _id: new ObjectId(id),
      });

      res.send({
        success: true,
      });
    } catch (error) {
      res.status(500).send({
        error: error.message,
      });
    }
  });

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

run().catch(console.dir);