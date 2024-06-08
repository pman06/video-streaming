const express = require("express");
const amqp = require("amqplib");

const RABBIT = process.env.RABBIT;
const PORT = process.env.PORT;
const app = express();

async function main() {
  const messagingConnection = await amqp.connect(RABBIT);

  const messageChannel = await messagingConnection.createChannel();
  await messageChannel.assertExchange("viewed", "fanout");
  const { queue } = await messageChannel.assertQueue("recommendation_queue", {
    exclusive: true,
  });
  console.log(`Created queue ${queue}, binding it to "viewed" exchange`);

  await messageChannel.bindQueue(queue, "viewed", "");

  await messageChannel.consume(queue, async (msg) => {
    console.log("Received a 'viewed' message");
    const parsedMsg = JSON.parse(msg.content.toString()); // Parsed the JSON message

    console.log(JSON.stringify(parsedMsg, null, 4));
    console.log("Acknowledged messages was handled");
  });
  app.listen(PORT, () => {
    console.log("Server listening on port", PORT);
  });
}

main().catch((err) => {
  console.error("Microservice failed to start");
  console.error((err && err.stack) || err);
});
