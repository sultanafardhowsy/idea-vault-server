const express = require('express');
const app = express();
const dotenv = require('dotenv')
dotenv.config();
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT;

 app.use(cors())
 app.use(express.json())

app.get('/',(req,res) => {
    res.send('idea vault operation')
})



const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const run = async() =>{
try{
await client.connect();

const db = client.db('ideavault')
const destinationCollection = db.collection('allideas')
 const commentsCollection = db.collection("comments");


app.get('/allideas', async (req, res) => {
  try {
    const result = await destinationCollection.find().toArray();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ideas' });
  }
})


app.post('/allidea', async (req, res) => {
  try {
    const newIdea = req.body;
    
    // Insert document into your db and collection
    const result = await db.collection('allideas').insertOne(newIdea);
    
    res.status(201).json({ 
      success: true, 
      message: "Idea published successfully!", 
      insertedId: result.insertedId 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/ideas', async (req, res) => {
  try {
    const result = await db.collection('allideas')
      .find()
      .limit(6)
      .toArray();

    res.send(result);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

app.get('/showalldata/:id',(req,res,next) => {
const header = req.headers.authorization
if(header === "logged in"){
next()} else {
  res.status(401).json({message: "Unauthorised"})
}
},
   async(req,res) =>{
const {id} = req.params;
 const result = await destinationCollection.findOne({_id: new ObjectId(id)})
res.json(result)
})


app.patch('/showalldata/:id', async(req,res) =>{
  const id = req.params;
  const updatedData = req.body;
console.log(updatedData);
  const result = await destinationCollection.updateOne(
    {_id: new ObjectId(id)},
    {$set: updatedData}
  )
  res.json(result)
})

// GET COMMENTS
  app.get("/comments", async (req, res) => {
    const { ideaId } = req.query;

    const comments = await commentsCollection
      .find({ ideaId })
      .sort({ createdAt: -1 })
      .toArray();

    res.send(comments);
  });

  app.get("/comments6", async (req, res) => {
  const result = await commentsCollection
    .find()
    .sort({ createdAt: -1 })
    .limit(6)
    .toArray();

  res.send(result);
});

  // ADD COMMENT
  app.post("/comments", async (req, res) => {
    const comment = {
      ...req.body,
      createdAt: new Date(),
    };

    const result = await commentsCollection.insertOne(comment);

    res.send({
      _id: result.insertedId,
      ...comment,
    });
  });

  // UPDATE COMMENT
  app.put("/comments/:id", async (req, res) => {
    const { id } = req.params;

    await commentsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          text: req.body.text,
          updatedAt: new Date(),
        },
      }
    );

    res.send({ success: true });
  });

  // DELETE COMMENT
  app.delete("/comments/:id", async (req, res) => {
    const { id } = req.params;

    await commentsCollection.deleteOne({
      _id: new ObjectId(id),
    });

    res.send({ success: true });
  });

  // Fetch ideas shared ONLY by the logged-in user
app.get('/myideas', async (req, res) => {
  try {
    const userEmail = req.query.email;

    // Safety check: ensure an email was passed from Next.js
    if (!userEmail) {
      return res.status(400).json({ error: 'Email query parameter is required' });
    }

    // Query MongoDB: Match the 'email' field in your document
    const query = { email: userEmail }; 
    const result = await destinationCollection.find(query).toArray();
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch your personal ideas' });
  }
});

app.delete("/ideas/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const ideaQuery = { _id: new ObjectId(id) };

    // 1. Delete the actual idea from your 'allideas' collection
    const result = await destinationCollection.deleteOne(ideaQuery);

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Idea not found in the vault" });
    }

    // 2. OPTIONAL CLEANUP: If you want to wipe comments associated with this idea
    // Change 'ideaId' if your comments collection uses a different name to reference the parent idea
    await commentsCollection.deleteMany({ ideaId: id }); 

    res.send({ success: true, message: "Idea and its comments successfully removed" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete idea", details: err.message });
  }
});

app.patch('/ideas/:id', async (req, res) => {
  try {
    // 1. FIX: Destructure 'id' from req.params to get the string, not the object!
    const { id } = req.params; 
    const updatedData = req.body;

    console.log("Updating ID:", id);
    console.log("Data Received:", updatedData);

    // 2. Query MongoDB using the string variable
    const result = await destinationCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "No matching idea found to update" });
    }

    res.json(result);
  } catch (err) {
    console.error("Patch Route Error:", err);
    res.status(500).json({ error: "Failed to update idea document", details: err.message });
  }
});


await client.db('admin').command({ping: 1})
console.log("Pinged your deployment. You successfully connected to MongoDB!");
}
finally{

}
}
run().catch(console.dir)


app.listen(port,() =>{
    console.log(`simple CRUD server is running on port ${port}`);
})