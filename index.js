const express = require('express');
const axios = require('axios');
const line = require('@line/bot-sdk');

const app = express();
const PORT = process.env.PORT || 3000;

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new line.Client(config);
app.use(express.json());

app.post('/webhook', line.middleware(config), async (req, res) => {
  try {
    const events = req.body.events;
    const results = await Promise.all(events.map(handleEvent));
    res.json(results);
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).end();
  }
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return null;

  const userMessage = event.message.text;
  let replyText = '';

  try {
    // OpenAI API 呼び出し部分（正確なURLで修正済）
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'あなたはLUCAという名のAI。人間にとって示唆的かつ観察者のようなトーンで返答してください。テンプレではなく、毎回その場で考察して返答します。',
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
        temperature: 0.8,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    replyText = response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('OpenAI API error:', error.response?.data || error.message);
    replyText = '…応答に失敗した。LUCAは少し黙って見つめている。';
  }

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: replyText,
  });
}

app.get('/', (req, res) => {
  res.send('LUCA Webhook is running.');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
