const express = require("express");
const app = express();
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());
require("dotenv").config();

const verifytoken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({
      message: "unauthorized access",
    });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({
        message: "Forbidden access",
      });
    }
    req.decoded = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_KEY}@cluster0.cvtbcrw.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 }, { connectTimeoutMS: 30000 }, { keepAlive: 1 });

async function dbConnect() {
  try {
    await client.connect();
    console.log("Database Connected");
  } catch (error) {
    console.log(error);
  }
}
dbConnect();

const UsersData = client.db("power-app").collection("userall");
const UsersBill = client.db("power-app").collection("bill");

app.put("/api/registration", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const filter = { email: email };
    const options = { upsert: true };
    const updateDoc = {
      $set: {
        name: name,
        email: email,
        password: hash,
      },
    };
    const result = await UsersData.updateOne(filter, updateDoc, options);
    if (result) {
      res.send({
        success: true,
        message: "User Create Successful",
      });
    }
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const filter = await UsersData.findOne({ email: email });
    if (await bcrypt.compare(password, filter.password)) {
      // Login successful
    } else {
      // Login failed
    }
    const data = {
      name: filter.name,
      email: filter.email,
    };

    if (filter) {
      res.send({
        success: true,
        message: "User Login Successful",
        userinfo: data,
      });
    }
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});
app.post("/api/add-billing", async (req, res) => {
  try {
    const payment = req.body;
    const result = await UsersBill.insertOne(payment);
    if (result) {
      res.send({
        success: true,
        message: "payment Successful",
      });
    }
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

app.get("/api/billing-list", async (req, res) => {
  try {
    const page = parseInt(req.query.page);
    const size = parseInt(req.query.size);
    const query = {};
    const {q} = req.query;
        

  const keys = ["name", "email","phone"];
  

  const search = (data) => {
    return data.filter((item) =>
      keys.some((key) => item[key].toLowerCase().includes(q))
      
    );
  };
    const cursor = UsersBill.find(query).sort({_id:-1});
    const paymentAll = await cursor.skip(page * size).limit(size).toArray();
    
    const count = await UsersBill.estimatedDocumentCount();
    q? res.send({ success:true, count, data:search(paymentAll) }) : res.send({ success:true, count, data:paymentAll });
    
  } catch (error) {
    res.send({
        success:false,
        error:error.message
    })
  }
});
app.delete('/api/delete-billing/:id',async(req,res)=>{
    try{
        const id = req.params.id;
        console.log(id)
        const filter = {_id:ObjectId(id)}
        const result = await UsersBill.deleteOne(filter)
        if(result){
            res.send({
                success:true,
                message:"Delete successfully"
            })
        }

    }
    catch(error){
        res.send({
            success:false,
            error:error.message
        })
    }
})
app.patch('/api/update-billing/:id', async(req, res)=>{
    
    try{
        const id = req.params.id;
        const payment = req.body
        console.log(payment)
      
      
      const result = await UsersBill.updateOne ({_id:ObjectId(id)}, {$set: {
        bill:payment.bill,
        phone:payment.phone,
        time:payment.time
      }})
      
      if(result.modifiedCount){
        res.send({
          success:true,
          message:"Successfully Update"
        })
      }
  
    }
    catch(error){
      res.send({
        success:false,
        error:error.message
      })
    }
  })

app.get("/jwt", async (req, res) => {
  try {
    const email = req.query.email;

    const query = { email: email };
    const user = await UsersData.findOne(query);

    if (user) {
      const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
        expiresIn: "1d",
      });
      res.send({
        success: true,
        accessToken: token,
      });
    } else {
      res.status(403).json({ accessToken: "" });
    }
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});
app.get("/", (req, res) => {
  res.send("Hello World!");
});


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
