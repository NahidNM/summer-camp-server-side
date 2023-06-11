const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)

const jwt = require('jsonwebtoken');

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 5000;

// midleware
app.use(cors());
app.use(express.json())

const verifyJWT = (req, res, next) =>{
  const authorization =req.headers.authorization;
  if(!authorization){
    return res.status(401).send({error: true, message: 'unauthorized access'})
  }
  // bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) =>{
    if(error){
      return res.status(401).send({error: true, message: 'unauthorized access'})
    }
req.decoded= decoded;
next();
  })
}


// firebase 
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
    const PaymentCollection = client.db("summerCamp").collection("payments");

// -----------jWT--------

    app.post('/jwt', (req, res)=>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '5h' })
     res.send({token})
    })

    //---------------- varifu Admin------------

    const verifyAdmin = async(req, res, next) =>{
      const email = req.decoded.email;
      const quary = {email: email};
      const user = await usersCollection.findOne(quary);
      // console.log(user);
      if(user?.role !== 'admin'){
        return res.status(403).send({error: true, message: 'forbidden messeage'})
      }
      next();
    }



    // --------------------varify Instructor--------------------

    const verifyInstructor = async(req, res, next) =>{
      const email = req.decoded.email;
      const quary = {email: email};
      const user = await usersCollection.findOne(quary);
      if(user?.role !== 'instructor'){
        return res.status(403).send({error: true, message: 'forbidden messeage'})
      }
      next();
    }



//------------- user related apis--------------

app.get('/users', verifyJWT, verifyAdmin, async(req, res)=>{
  const result = await usersCollection.find().toArray();
  res.send(result)
})

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

app.delete('/users/:id', async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await usersCollection.deleteOne(query);
  res.send(result);
})


// --------------user Admin-------------

app.get('/users/admin/:email', verifyJWT,  async(req, res) =>{
  const email = req.params.email;

  if(req.decoded.email !== email){
    res.send({admin: false})
  }
  const quary = {email: email};
  const user = await usersCollection.findOne(quary);
  const result = {admin: user?.role === 'admin'}
  res.send(result);
})

app.patch('/users/admin/:id', async(req, res)=>{
  const id = req.params.id;
  const filter = {_id: new ObjectId(id)};
  const updateDoc = {
    $set: {
      role: 'admin'
    },
  };

  const result =await usersCollection.updateOne(filter, updateDoc);
  res.send(result)
})


// --------------user Instructor-------------

app.get('/users/instructor/:email', verifyJWT,   async(req, res) =>{
  const email = req.params.email;
  if(req.decoded.email !== email){
    res.send({instructor: false})
  }
  const quary = {email: email};
  const user = await usersCollection.findOne(quary);
  const result = {instructor: user?.role === 'instructor'}
  res.send(result);
})

app.patch('/users/instructor/:id', async(req, res)=>{
  const id = req.params.id;
  const filter = {_id: new ObjectId(id)};
  const updateDoc = {
    $set: {
      role: 'instructor'
    },
  };

  const result =await usersCollection.updateOne(filter, updateDoc);
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

    app.post('/classes',  async(req, res) =>{
      const newClass =req.body;
      const result = await classesCollection.insertOne(newClass);
      res.send(result)
      
    })



    //-------------- instuctor api---------
    app.get('/insturctor', async (req, res) => {
      const query = {}
      const options = {
        sort: { 'classNumber': -1 }
      }
      const result = await instuctorsCollection.find(query, options).toArray();
      res.send(result);
    })

    

// ----------------------Add class in user colection-------------------
app.get('/addClasses', verifyJWT, async(req, res) =>{
  const email = req.query.email;
  // console.log(email);
  if(!email){
    res.send([])
  }

  const decodedEmail = req.decoded.email;
  if(email !== decodedEmail){
    return res.status(401).send({error: true, message: 'forbiden access'})
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


// -----------Creat Payment sectors and Single addClasse data get----------

app.get('/addClasses/:id', async (req, res) => {
  const id = req.params.id;
const quary = {_id: new ObjectId(id)}
  const result = await addClassCollection.findOne(quary);
  res.send(result);
})

app.post('/create-payment-intent', verifyJWT, async(req, res) =>{
  const {price} = req.body;
  const amount =parseInt(price *100);
  
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: 'usd',
    payment_method_types: ['card']
  });
  res.send({
    clientSecret: paymentIntent.client_secret
  })

})


// ------------------Payment database and update set ------------

// class update
app.get('/classupdatedata/:id', async(req, res)=>{
  const id =req.params.id;
  const quary = {_id: new ObjectId(id)};
  const result = await classesCollection.findOne(quary);
  res.send(result);
} )

app.put('/classupdatedata/:id', async (req, res) =>{
  const id =req.params.id;
  const filter = {_id: new ObjectId(id)};
  const option = { upsert: true };
  const update = req.body;
  const updateDoc = {
    $set: {
      available_seats: update.newseat,
      enroll: update.newEnroll,
    }
  }

  const result = await classesCollection.updateOne(filter, updateDoc, option);
  res.send(result);
})


// ----------------------Enroll database-------------

app.get('/enrollclass', async (req, res) => {
  const result = await PaymentCollection.find().toArray();
  res.send(result);
})

app.post('/payment',  async(req, res)=>{
  const payment = req.body;
  // console.log(payment);
  const insertResult =await PaymentCollection.insertOne(payment);

  const id=payment.classId;
  const quary = {_id: {$in: [new ObjectId(id)]}};
  const deleteResult = await addClassCollection.deleteOne(quary);
  res.send({insertResult, deleteResult});
})




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!")
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