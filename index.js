require('dotenv').config();
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
const line = require('@line/bot-sdk');

// 環境変数から取得
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new line.Client(config);

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

  const userMessage = event.message.text;

  let replyText = "LUCA：なんて言えばいいか、ちょっと考えてる";

  if (userMessage.includes("こんにちは")) {
    replyText = "LUCA：こんにちは、今日はどんな風に過ごしてる？";
  } else if (userMessage.includes("悩んでる")) {
    replyText = "LUCA：その悩み、少しだけ話してみる？";
  } else if (userMessage.includes("診断して")) {
    replyText = "LUCA：じゃあ始めようか、Q1『最近、時間の流れが早いと感じる？』";
  }

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: replyText
  });
}
