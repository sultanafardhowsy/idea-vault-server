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
    res.send('simple CRUD operation')
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