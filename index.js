const express = require('express')
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'Un authorized access' });
  }
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'Un authorized access' })
    }
    req.decoded = decoded;
    next();
  })
}


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// const uri = "mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.obrngag.mongodb.net/?retryWrites=true&w=majority";
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.obrngag.mongodb.net/?authSource=admin`;

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
    const userCollection = client.db("martialDb").collection("user");
    const classCollection = client.db("martialDb").collection("class");
    const cartCollection = client.db("martialDb").collection("cart");


    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ token })
    })

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await userCollection.findOne(query);

      if (user?.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden message' });
      }
      next();
    }
    //users related api
    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    })
    app.post('/users', async (req, res) => {
      const user = req.body;
      console.log(user);
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);
      console.log('existing user: ', existingUser);
      if (existingUser) {
        return res.send({ message: 'user already exists' })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    })

    app.get("/users/:email", async (req, res) => {
      const result= await userCollection.find({email:req.params.email}).toArray();
      res.send(result);
    });

    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }
      const query = { email: email }
      const user = await userCollection.findOne(query);
      const result = { admin: user?.role === 'admin' }
      res.send(result);
    })
    app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        res.send({ instructor: false })
      }
      const query = { email: email }
      const user = await userCollection.findOne(query);
      const result = { instructor: user?.role === 'instructor' }
      res.send(result);
    })
    app.get('/users/student/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        res.send({ student: false })
      }
      const query = { email: email }
      const user = await userCollection.findOne(query);
      const result = { student: user?.role === 'student' }
      res.send(result);
    })

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedUser = req.body;
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      console.log(result);
      res.send(result);
    })

    app.patch('/users/instructor/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedUser = req.body;
      const updateDoc = {
        $set: {
          role: 'instructor'
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      console.log(result);
      res.send(result);
    })

    app.get('/instructors', async (req, res) => {
      const result = await userCollection.find({ role: 'instructor' }).toArray();
      res.send(result);
    })

    //   class route
    app.post('/addclass', async (req, res) => {
      const classItem = req.body;
      console.log(classItem);

      const result = await classCollection.insertOne(classItem);
      res.send(result);
    })

    // my class
    app.get("/myclass/:email", async (req, res) => {
      const result = await classCollection.find({ instructorEmail: req.params.email }).toArray();
      res.send(result);
    })
    //to do verifyJWT, verifyAdmin,
    app.get('/allClass', async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    })

    app.get('/allClass/approve', async (req, res) => {
      const result = await classCollection.find({ status: 'approve' }).toArray();
      res.send(result);
    })
    app.patch('/class/approve/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };

      const updateDoc = {
        $set: {
          status: 'approve'
        },
      };
      const result = await classCollection.updateOne(filter, updateDoc);
      console.log(result);
      res.send(result);
    })
    app.patch('/class/denied/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };

      const updateDoc = {
        $set: {
          status: 'denied'
        },
      };
      const result = await classCollection.updateOne(filter, updateDoc);
      console.log(result);
      res.send(result);
    })
    app.patch('/class/feedback/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedClass = req.body;
      console.log(updatedClass);
      const updateDoc = {
        $set: {

          feedback: updatedClass.feedback,
        },
      };
      const result = await classCollection.updateOne(filter, updateDoc)
      res.send(result);

    })
      // cart related api
      app.get('/carts', async(req,res)=>{
        const email = req.query.email;
        if(!email){
          res.send([]);
        }
  
        // const decodedEmail = req.decoded.email;
        // if(email!==decodedEmail){
        //   return res.status(403).send({error:true,message:'Forbidden access'})
        // }
        const query = { email: email };
        const result = await cartCollection.find(query).toArray();
        res.send(result);
      })   
    app.post('/carts', async(req,res)=>{
      const item = req.body;
      console.log(item);
      const result = await cartCollection.insertOne(item);
      res.send(result);
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Martial art is running')
})
app.listen(port, () => {
  console.log(`Martial art is running on port: ${port}`)
})