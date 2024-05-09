const express = require("express");
const http = require("http");
const mongodb = require("mongodb");

if (!process.env.PORT) {
  throw new Error(
    "Please specify the port number for the HTTP server with the environment variable PORT."
  );
}
const PORT = process.env.PORT;
const VIDEO_STORAGE_HOST = process.env.VIDEO_STORAGE_HOST;
const VIDEO_STORAGE_PORT = process.env.VIDEO_STORAGE_PORT;
const DBHOST = process.env.DBHOST;
const DBNAME = process.env.DBNAME;

function sendViewedMessage(videoPath) {
  const postOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  };
  const requestBody = {
    videoPath: videoPath,
  };

  //
  const req = http.request("http://history/viewed", postOptions);
  console.log("Request sent to history: ", req);
  req.on("close", () => {
    console.log("Sent 'viewed' message to history microservice");
  });

  req.on("error", (err) => {
    console.error("Failed to send 'view' message!");
    console.error((err && err.stack) || err);
  });

  req.write(JSON.stringify(requestBody));
  req.end();
}

//
// Application entry point
//
async function main() {
  const client = await mongodb.MongoClient.connect(DBHOST);
  const db = client.db(DBNAME);
  const videoCollection = db.collection("videos");

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
    sendViewedMessage(videoRecord.videoPath);
  });

  app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
}
main().catch((err) => {
  console.error("Microservice failed to start");
  console.error(err & err.stack || err);
});
