const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 5000;

// midleware
app.use(cors());
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jo7sbx1.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const usersCollection = client.db("summerCamp").collection("users");
    const classesCollection = client.db("summerCamp").collection("classes");
    const addClassCollection = client.db("summerCamp").collection("addClasses");
    const instuctorsCollection = client.db("summerCamp").collection("insturctor");

// user related apis
app.post('/users', async(req, res)=>{
  const user = req.body;
// console.log(user);
const quary = {email: user.email}
const existingUser = await usersCollection.findOne(quary);
// console.log(existingUser);
if(existingUser){
  return res.send({message: 'user already exists'})
}

  const result = await usersCollection.insertOne(user);
  res.send(result)
})

    // class api
    app.get('/classes', async (req, res) => {
      const query = {}
      const options = {
        sort: { 'available_seats': -1 }
      }
      const result = await classesCollection.find(query, options).toArray();
      res.send(result);
    })

    // instuctor api
    app.get('/insturctor', async (req, res) => {
      const query = {}
      const options = {
        sort: { 'classNumber': -1 }
      }
      const result = await instuctorsCollection.find(query, options).toArray();
      res.send(result);
    })

// Add class colection
app.get('/addClasses', async(req, res) =>{
  const email = req.query.email;
  console.log(email);
  if(!email){
    res.send([])
  }
  const query = {email: email}
  const result = await addClassCollection.find(query).toArray();
  res.send(result)
})

app.post('/addClasses', async (req, res) => {
  const item = req.body;
  const result = await addClassCollection.insertOne(item);
  res.send(result);
})

app.delete('/addClasses/:id', async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await addClassCollection.deleteOne(query);
  res.send(result);
})

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res)=>{
    res.send("Summer Sports is running");
    });

    app.listen(port, ()=>{
        console.log(`Summer Sports api is running on port : ${port}`)
    })