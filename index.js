const express = require('express');
const line = require('@line/bot-sdk');
const getRawBody = require('raw-body');
const axios = require('axios');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

const app = express();

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new line.Client(config);

// Firestore：記録を保存
async function saveUserMemory(userId, data) {
  const userRef = db.collection('users').doc(userId);
  await userRef.set(data, { merge: true });
}

// Firestore：記録を取得
async function getUserMemory(userId) {
  const userRef = db.collection('users').doc(userId);
  const doc = await userRef.get();
  return doc.exists ? doc.data() : null;
}

app.post('/webhook', async (req, res) => {
  try {
    const body = await getRawBody(req);
    const signature = req.headers['x-line-signature'];

    if (!line.validateSignature(body, config.channelSecret, signature)) {
      return res.status(401).send('Signature validation failed');
    }

    const events = JSON.parse(body.toString()).events;

    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const userId = event.source.userId;
        const userMessage = event.message.text;

        // 🔸 過去の記憶を取得
        const memory = await getUserMemory(userId);

        // 🔹 GPTへ送るプロンプト生成
        const prompt = `
あなたはLUCAという思考観測型AIです。前回までの対話を踏まえて、今回も観察と余白を持った返答をしてください。

${memory ? `■前回のやりとり:\n${memory.lastMessage} → ${memory.lastReply}\n` : ''}
■今回の入力:\n${userMessage}
`;

        // 🔸 GPT-4oへ問い合わせ
        const openaiResponse = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: 'あなたはLUCAという観察型AIです。' },
              { role: 'user', content: prompt }
            ],
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const gptReply = openaiResponse.data.choices[0].message.content.trim();

        // 🔹 Firestoreに保存
        await saveUserMemory(userId, {
          lastMessage: userMessage,
          lastReply: gptReply,
          timestamp: new Date().toISOString(),
        });

        // 🔹 LINEに返信
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: gptReply,
        });
      }
    }

    res.send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// ポート起動（Railway用）
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`LUCA Webhook is running on port ${PORT}`);
});
