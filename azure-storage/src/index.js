const express = require("express");
const {
  BlobServiceClient,
  StorageSharedKeyCredential,
} = require("@azure/storage-blob");
const PORT = process.env.PORT;
const STORAGE_ACCOUNT_NAME = process.env.STORAGE_ACCOUNT_NAME;
const STORAGE_ACCESS_KEY = process.env.STORAGE_ACCESS_KEY;
function createBlobService() {
  const sharedKeyCredential = new StorageSharedKeyCredential(
    STORAGE_ACCOUNT_NAME,
    STORAGE_ACCESS_KEY
  );
  const blobService = new BlobServiceClient(
    `https://{STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
    sharedKeyCredential
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

  // Starts the video download
  const response = await blobClient.download();
  // Pipes the video stream to the HTTP response
  response.readableStreamBody.pipe(res);
});

app.listen(PORT);
