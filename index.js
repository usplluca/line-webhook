const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// LINEのWebhookエンドポイント（200を返すだけ）
app.post('/webhook', (req, res) => {
  res.status(200).send('OK');
});

// 動作確認用のルート
app.get('/', (req, res) => {
  res.send('LUCA webhook is alive');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
