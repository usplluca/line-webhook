const express = require('express');
const line = require('@line/bot-sdk');

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const app = express();
app.use(express.json());
app.use(line.middleware(config));

app.post('/webhook', (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then(result => res.json(result));
});

function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const client = new line.Client(config);
  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: `LUCAからの返答：${event.message.text}`
  });
}

app.listen(3000, () => {
  console.log('LINE bot is running on port 3000');
});
