const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const {
  MongoClient,
  ServerApiVersion,
  ObjectId,
  ReturnDocument,
} = require("mongodb");
const cors = require("cors");
var jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
// middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: ["http://localhost:5173"], credentials: true }));

// mongo db

//

const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASSWORD}@cluster0.6tngyrc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
// custom middleware
const logger = async (req, res, next) => {
  console.log("called", req.host, req.originalUrl);
  next();
};
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  console.log("value of token in middleware", token);
  if (!token) {
    return res.status(401).send({ message: "not authorized" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    // error
    if (err) {
      console.log(err);
      return res.status(401).send({ message: "unauhtrozied" });
    }
    // if token is valid it would be decoded
    console.log("value in the token", decoded);
    req.user = decoded;
    next();
  });
};
async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    const serviceDB = client.db("carDoctor");
    const servicesCollection = serviceDB.collection("serviecs");
    const bookingCollection = client.db("carDoctor").collection("bookings");
    // auth related API
    app.post("/jwt", logger, async (req, res) => {
      const user = req.body;
      console.log(user);
      // create a token
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: false,
        })
        .send({ success: true });
    });

    // services relat ed api
    app.get("/services", logger, async (req, res) => {
      const cursor = servicesCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    //
    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        // Include only the `title` and `imdb` fields in the returned document
        projection: { _id: 0, title: 1, price: 1, service_id: 1, img: 1 },
      };
      const result = await servicesCollection.findOne(query, options);
      res.send(result);
    });

    // bookings
    // i am not looking for a specific data or every data
    // sum data => those fulfill requirement
    app.get("/bookings", logger, verifyToken, async (req, res) => {
      let query = {};
      // console.log("tok tok token", req.cookies.token);
      console.log("user in the valid token", req.query);
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });
    // delete
    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });
    // update the info
    app.patch("/bookings/:id", async (req, res) => {
      const updateBooking = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: updateBooking.status,
        },
      };

      const result = await bookingCollection.updateOne(filter, updateDoc);

      console.log(updateBooking);
      res.send(result);
    });
    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
