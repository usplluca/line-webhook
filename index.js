const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');
require('dotenv').config();

const app = express();
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new Client(config);

app.post('/webhook', middleware(config), async (req, res) => {
  try {
    const events = req.body.events;
    const results = await Promise.all(events.map(async (event) => {
      if (event.type === 'message' && event.message.type === 'text') {
        const replyText = event.message.text;
        return client.replyMessage(event.replyToken, {
          type: 'text',
          text: replyText,
        });
      }
    }));
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).end();
  }
});

app.get('/', (req, res) => {
  res.send('LUCA webhook is running.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
