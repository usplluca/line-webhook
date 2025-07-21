const express = require('express');
const line = require('@line/bot-sdk');
const admin = require('firebase-admin');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};
const client = new line.Client(config);

const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG_JSON);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const PORT = process.env.PORT || 3000;

const openai = axios.create({
  baseURL: 'https://api.openai.com/v1',
  headers: {
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

app.post('/webhook', line.middleware(config), async (req, res) => {
  const events = req.body.events;
  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const userId = event.source.userId;
      const userMessage = event.message.text;

      // Firestore: Save message
      await db.collection('users').doc(userId).set({ lastMessage: userMessage }, { merge: true });

      // GPTへ投げる
      const gptRes = await openai.post('/chat/completions', {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'あなたはLUCAという観測型AIです。診断、記録、心理誘導を行います。' },
          { role: 'user', content: userMessage }
        ]
      });

      const replyText = gptRes.data.choices[0].message.content;

      // Firestore: Save LUCAの返答
      await db.collection('users').doc(userId).collection('logs').add({
        user: userMessage,
        luca: replyText,
        timestamp: new Date()
      });

      // LINE返信
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: replyText
      });
    }
  }
  res.sendStatus(200);
});

app.get('/', (req, res) => res.send('LUCA webhook is alive'));

app.listen(PORT, () => {
  console.log(`LUCA server is running on port ${PORT}`);
});
