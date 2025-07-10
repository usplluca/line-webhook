const express = require('express');
const line = require('@line/bot-sdk');
const axios = require('axios');
const app = express();

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new line.Client(config);
app.use(express.json());

app.post('/webhook', async (req, res) => {
  const events = req.body.events;
  const results = await Promise.all(events.map(handleEvent));
  res.json(results);
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return null;
  }

  const userMessage = event.message.text;
  let replyText = '';

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'あなたは思考を観察し、少しだけ挑発的に返すLUCAです。テンプレートではなく、毎回即時に考察し返信してください。' },
          { role: 'user', content: userMessage }
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    replyText =
      response?.data?.choices?.[0]?.message?.content?.trim() ||
      '…（LUCAは少し黙って考えてる）';

  } catch (error) {
    console.error('OpenAI API error:', error);
    replyText = '…（LUCAは応答に失敗した。黙って見つめている）';
  }

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: replyText,
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
