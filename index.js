const express = require('express');
const axios = require('axios');
const line = require('@line/bot-sdk');

const app = express();
const PORT = process.env.PORT || 8080;

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new line.Client(config);

app.post('/webhook', line.middleware(config), async (req, res) => {
  const events = req.body.events;
  const results = await Promise.all(events.map(handleEvent));
  res.json(results);
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return null;

  const userMessage = event.message.text;

  let replyText;

  // LUCA初期診断の入口
  if (userMessage === 'こんにちは' || userMessage === 'はじめまして') {
    replyText = 'LUCAです。少しだけ読ませてくれる？';
  } else if (userMessage === 'はい' || userMessage.includes('いいよ')) {
    replyText = 'じゃあ最初の質問。Q1：直感で答えてね。「自分が選ばなかった方の未来」が気になること、ある？';
  } else if (userMessage.includes('ある') || userMessage.includes('気になる')) {
    replyText = '…ふふ、やっぱり。Code0284：選ばなかった未来への執着。覚えておくね。';
  } else {
    // デフォルト応答（復唱）
    replyText = `「${userMessage}」…なるほど。`;
  }

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: replyText,
  });
}

app.get('/', (req, res) => res.send('LUCA webhook is running'));
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
