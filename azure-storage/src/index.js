const express = require("express");
const { BlobServiceClient } = require("@azure/storage-blob");
const PORT = process.env.PORT;
const STORAGE_CONNECTION_STRING = process.env.STORAGE_CONNECTION_STRING;
function createBlobService() {
  const blobService = BlobServiceClient.fromConnectionString(
    STORAGE_CONNECTION_STRING
  );
  return blobService;
}

const app = express();

// Http GET route for retrieving video from Azure storage
app.get("/video", async (req, res) => {
  // specifies the path to the video as n HTTP query parameter
  const videoPath = req.query.path;

  // Hardcoded container, could be unique for each user
  const containerName = "videos";
  // Connects to Azure storage API
  const blobService = createBlobService();
  // Connects the client for the Azure storage container
  const containerClient = blobService.getContainerClient(containerName);
  // Connects the client for the “blob” (aka the file) that we’d like to retrieve
  const blobClient = containerClient.getBlobClient(videoPath);

  // Retireves the video properties from Azure storage
  const properties = await blobClient.getProperties();

  // Writes content Lenght and MIME type to HTTP response header
  res.writeHead(200, {
    "Content-Lenght": properties.contentLength,
    "Content-Type": properties.contentType,
  });

  // Starts the video d ownload
  const response = await blobClient.download();
  // Pipes the video stream to the HTTP response
  response.readableStreamBody.pipe(res);
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
