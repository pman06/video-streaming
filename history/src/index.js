const express = require("express");
const mongodb = require("mongodb");
const amqp = require("amqplib");

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

if (!process.env.RABBIT) {
  throw new Error(
    "Please specify the name of the RabbitMQ Host using environment variable RABBIT"
  );
}

const PORT = process.env.PORT;
const DBHOST = process.env.DBHOST;
const DBNAME = process.env.DBNAME;
const RABBIT = process.env.RABBIT;

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

  //
  // GEt database for the microservice
  //
  const db = client.db(DBNAME);

  //
  // Get collection forstoring video viewing history
  //
  const historyCollection = db.collection("history");

  //
  // Connects to RabbitMQ Server
  //
  const messagingConnection = await amqp.connect(RABBIT);
  console.log("Connected to RabbitMQ Server");

  //
  // Creates a RabbitMQ messaging channel
  //
  const messageChannel = await messagingConnection.createChannel();

  //
  // Asserts that we have "viewed" queue.
  //
  await messageChannel.assertExchange("viewed", "fanout");

  //
  // Create an anonymouse queue
  //
  const { queue } = await messageChannel.assertQueue("history_queue", {
    exlusive: true,
  });
  console.log(`Created queue ${queue}, binding it to "viewed" exchange`);

  //
  // Bind queue to the exchange
  //
  await messageChannel.bindQueue(queue, "viewed", "");

  //
  // Start receiving messages from the viewed queue
  //
  await messageChannel.consume(queue, async (msg) => {
    console.log("Received a 'viewed' message");

    const parsedMsg = JSON.parse(msg.content.toString()); // Parsed the JSON message

    await historyCollection.insertOne({ videoPath: parsedMsg.videoPath }); //Store the view in database
    console.log(JSON.stringify(parsedMsg, null, 4));
    console.log("Acknowledged messages was handled");

    messageChannel.ack(msg); // Acknowledge if no error
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
