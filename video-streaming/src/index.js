const express = require("express");
const fs = require("fs");
const app = express();

if (!process.env.PORT) {
  throw new Error(
    "Please specify the port number for the HTTP server with the environment variable PORT."
  );
}
const PORT = process.env.PORT;

app.get("/video", async (req, res) => {
  const videoPath = "./videos/SampleVideo_1280x720_1mb.mp4";
  const stats = await fs.promises.stat(videoPath);
  res.writeHead(200, {
    "Content-Length": stats.size,
    "Content-Type": "video/mp4",
  });
  fs.createReadStream(videoPath).pipe(res);
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
