const express = require('express');
const cors = require('cors')
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 4000;


app.use(cors({
  origin: [
    'car-doctors-47871.web.app',
    'car-doctors-47871.firebaseapp.com'
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.iyzg5.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const loger = (req, res, next) =>{
  console.log(req.method , req.url)
  next();
}

const verifyToken = (req, res, next)=>{
  const token = req?.cookies?.token;
  if(!token){
    return res.status(401).send({sucess: 'unauthorized access'})
  }
  jwt.verify(token, process.env.Secret_Token, (err, decoded)=>{
    if(err){
      return res.status(401).send({success: 'unauthorize access'})
    }
    req.user = decoded;
    next();
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db('carDoctor').collection('services');
    const bookingCollection = client.db('carDoctor').collection('bookings')

    app.post('/jwt', async (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.Secret_Token, { expiresIn: '1h' })



      res.cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none'
      })
        .send({ success: true })
    })

    app.post('/logout', async (req, res) => {
      const user = req.body;
      console.log('loginout', user);
      res.clearCookie('token', { maxAge: 0 }).send({ success: true })
    })


    app.get('/services', async (req, res) => {
      const cursor = serviceCollection.find();

      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/services/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        // Include only the `title` and `imdb` fields in the returned document
        projection: { title: 1, img: 1, price: 1 },
      };
      const result = await serviceCollection.findOne(query, options);
      res.send(result);
    })

    app.get('/bookings', loger, verifyToken, async (req, res) => {

      console.log(req.query?.email)
      
      if(req.query.email !== req.user.email){
        res.status(403).send({status: 'Forbiden'})
      }
      

      if (req.query?.email) {
        query = { email: req.query.email }
      }

      const result = await bookingCollection.find(query).toArray();
      res.send(result)
    })

    app.post('/bookings', async (req, res) => {
      const booking = req.body;
      const reslut = await bookingCollection.insertOne(booking);
      res.send(reslut);
    })

    app.get('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const cursor = { _id: new ObjectId(id) };
      const result = await bookingCollection.findOne(cursor);
      res.send(result)
    })

    app.delete('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const cursor = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(cursor);
      res.send(result)
    })

    app.patch('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const booking = req.body;
      const cursor = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: booking.status
        },
      };
      const result = await bookingCollection.updateOne(cursor, updateDoc)
      res.send(result)

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



app.get('/', (req, res) => {
  res.send('Car Doctor Server is Running')
})


app.listen(port, () => {
  console.log('server is running:', port)
})