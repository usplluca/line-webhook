const express = require('express');
const line = require('@line/bot-sdk');
const app = express();

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new line.Client(config);
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.post('/webhook', (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const echo = { type: 'text', text: `LUCA: ${event.message.text}` };
  return client.replyMessage(event.replyToken, echo);
}

app.get('/', (req, res) => {
  res.send('LUCA webhook is alive');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
