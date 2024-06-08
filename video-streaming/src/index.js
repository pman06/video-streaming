const express = require("express");
const http = require("http");
const mongodb = require("mongodb");
const amqp = require("amqplib");

if (!process.env.PORT) {
  throw new Error(
    "Please specify the port number for the HTTP server with the environment variable PORT."
  );
}

if (!process.env.RABBIT) {
  throw new Error(
    "Please specify the name of the RabbitMQ Host using environment variable RABBIT"
  );
}

const PORT = process.env.PORT;
const VIDEO_STORAGE_HOST = process.env.VIDEO_STORAGE_HOST;
const VIDEO_STORAGE_PORT = process.env.VIDEO_STORAGE_PORT;
const DBHOST = process.env.DBHOST;
const DBNAME = process.env.DBNAME;
const RABBIT = process.env.RABBIT;

//
// Application entry point
//
async function main() {
  console.log("Connecting to RabbitMQ server");

  const messagingConnection = await amqp.connect(RABBIT); //Conntects to the RabbitMQ server
  console.log("Connecgted to RabbitMQ");

  const messageChannel = await messagingConnection.createChannel(); //Creates a RabbitMQ messaging Channel
  await messageChannel.assertExchange("viewed", "fanout");
  const client = await mongodb.MongoClient.connect(DBHOST);
  const db = client.db(DBNAME);
  const videoCollection = db.collection("videos");
  //
  // Send the viewed to the History channel
  //
  function broadcastViewedMessage(messageChannel, videoPath) {
    console.log("Publishing message on 'viewed' exchange");

    const msg = { videoPath: videoPath };
    const jsonMsg = JSON.stringify(msg);
    messageChannel.publish("viewed", "", Buffer.from(jsonMsg));
  }

  const app = express();

  app.get("/video", async (req, res) => {
    const videoId = new mongodb.ObjectId(req.query.id);
    const videoRecord = await videoCollection.findOne({ _id: videoId });
    if (!videoRecord) {
      res.sendStatus(400);
      return;
    }
    const forwardRequest = http.request(
      {
        host: VIDEO_STORAGE_HOST,
        port: VIDEO_STORAGE_PORT,
        path: `/video?path=${videoRecord.videoPath}`,
        method: "GET",
        headers: req.headers,
      },
      (forwardResponse) => {
        res.writeHeader(forwardResponse.statusCode, forwardResponse.headers);
        forwardResponse.pipe(res);
      }
    );
    req.pipe(forwardRequest);
    broadcastViewedMessage(messageChannel, videoRecord.videoPath);
  });

  app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
}
main().catch((err) => {
  console.error("Microservice failed to start");
  console.error(err & err.stack || err);
});
