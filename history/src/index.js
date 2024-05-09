const express = require("express");
const mongodb = require("mongodb");

if (!process.env.PORT) {
  throw new Error(
    "Please specify the port number for the HTTP server with the environment variable PORT"
  );
}

if (!process.env.DBHOST) {
  throw new Error(
    "Please specify the database host using environment variable 'DBHOST'"
  );
}

if (!process.env.DBNAME) {
  throw new Error(
    "Please specify database name using environment variable DBNAME"
  );
}

const PORT = process.env.PORT;
const DBHOST = process.env.DBHOST;
const DBNAME = process.env.DBNAME;

async function main() {
  const app = express();

  //
  // Enable JSON body parsing for HTTP requests
  //
  app.use(express.json());

  //
  // Connect to the database
  //
  const client = await mongodb.MongoClient.connect(DBHOST);
  //   , (err, db) => {
  //   if (err) throw err;
  //   console.log("Database created");
  // });

  //
  // GEt database for the microservice
  //
  const db = client.db(DBNAME);

  //
  // Get collection forstoring video viewing history
  //
  const historyCollection = db.collection("history");

  app.get("/", (req, res) => {
    console.log("At home");
    res.status(200).json({ message: "Welcome to home" });
  });
  // Handles requeststo /viewed
  app.post("/viewed", async (req, res) => {
    const videoPath = req.body.videoPath; // Read JSON body from HTTP request.
    await historyCollection.insertOne({ videoPath: videoPath });

    console.log(`Added video ${videoPath} to history`);
    res.sendStatus(200);
  });

  app.get("/history", async (req, res) => {
    console.log("Received hist");
    const skip = parseInt(req.query.skip);
    const limit = parseInt(req.query.limit);
    const history = await historyCollection
      .find()
      .skip(skip)
      .limit(limit)
      .toArray();
    res.json({ history });
  });
  app.listen(PORT, () => {
    console.log("Microservice online, listening on port", PORT);
  });
}

main().catch((err) => {
  console.error("Microservice failed to start");
  console.error((err && err.stack) || err);
});
