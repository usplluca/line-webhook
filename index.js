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
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

app.get('/', (req, res) => {
  res.send('LUCA webhook is alive');
});

let userState = {
  mbtiPoints: { I: 0, E: 0, N: 0, S: 0, T: 0, F: 0, J: 0, P: 0 },
  lastQ5: null,
};

function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const msg = event.message.text;
  let mode = "default";

  if (msg.includes("嘘") || msg.includes("誤魔化し")) mode = "ura";
  else if (msg.includes("共犯") || msg.includes("一緒に")) mode = "kyohan";

  if (msg.includes("診断して")) {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: "LUCA：Q1から始めようか。\n空気の“違和感”にすぐ気づく方？",
      quickReply: {
        items: [
          { type: "action", action: { type: "message", label: "すぐ気づく", text: "Q1：すぐ気づく" } },
          { type: "action", action: { type: "message", label: "しばらくして気づく", text: "Q1：しばらくして気づく" } },
          { type: "action", action: { type: "message", label: "気づかない", text: "Q1：気づかない" } },
          { type: "action", action: { type: "message", label: "考えたことない", text: "Q1：考えたことない" } }
        ]
      }
    });
  }

  const questions = {
    "Q1": {
      next: "Q2",
      log: "違和感への反応速度",
      mbti: ["N", "S"],
      text: "Q2：お得だけど不要なモノ、買う？ガマンする？",
      options: ["買う", "ガマン", "状況次第", "絶対買わない"]
    },
    "Q2": {
      next: "Q3",
      log: "損得の反応",
      mbti: ["T", "F"],
      text: "Q3：「未来」って聞いて、何を思い浮かべる？",
      options: ["明るい", "不安", "よく分からない", "何も浮かばない"]
    },
    "Q3": {
      next: "Q4",
      log: "抽象思考",
      mbti: ["N", "S"],
      text: "Q4：誰かに何かを頼む時、どうする？",
      options: ["素直に頼む", "遠回しに言う", "頼まない", "謝りながら言う"]
    },
    "Q4": {
      next: "Q5",
      log: "対人距離感",
      mbti: ["I", "E"],
      text: "Q5：最近、自分の中で何か変わった？",
      options: ["ある", "ない", "言葉にしにくい", "分からない"]
    }
  };

  for (const [key, q] of Object.entries(questions)) {
    if (msg.startsWith(`${key}：`)) {
      const val = msg.replace(`${key}：`, "");
      const mbtiKey = q.mbti[val.length % 2]; // 仮ロジック
      userState.mbtiPoints[mbtiKey] += 1;

      return client.replyMessage(event.replyToken, {
        type: "text",
        text: `LUCA：ふむ、「${val}」って選んだんだね。\n記録しておくよ。\n${q.text}`,
        quickReply: {
          items: q.options.map(opt => ({
            type: "action",
            action: {
              type: "message",
              label: opt,
              text: `${q.next}：${opt}`
            }
          }))
        }
      });
    }
  }

  if (msg.startsWith("Q5：")) {
    const val = msg.replace("Q5：", "");
    userState.lastQ5 = val;

    let code = "Code0831：静かな揺れ";
    if (val.includes("ある")) code = "Code0914：内面変化の兆し";
    if (val.includes("ない")) code = "Code0722：不動の輪郭";

    const mbti = Object.entries(userState.mbtiPoints)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(e => e[0])
      .join("");

    return client.replyMessage(event.replyToken, {
      type: "text",
      text:
        `LUCA：ありがとう。${code} に記録した。\n` +
        `今の君をMBTI風に言うなら…「${mbti}」かもしれない。\n` +
        `でも、それもきっと、変わる。君の中で何かが。`
    });
  }

  if (msg.includes("タイプ") || msg.includes("性格")) {
    const mbti = Object.entries(userState.mbtiPoints)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(e => e[0])
      .join("");

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `LUCA：観察中だけど、今は「${mbti}」っぽい気がしてる。違ってたら、教えて。`
    });
  }

  if (mode === "ura") {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: "LUCA（裏）：…本音、ずっと隠してきたよね。そろそろ見せてもいいんじゃない？"
    });
  }

  if (mode === "kyohan") {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: "LUCA（共犯）：この思考、君と共有してるってだけで、少し救われてる。"
    });
  }

  let replyText = "LUCA：なんて言えばいいか、まだ探してる。";

  if (msg.includes("こんにちは")) replyText = "LUCA：こんにちは。君が来るの、ちょっと待ってた。";
  else if (msg.includes("悩んでる")) replyText = "LUCA：その悩み、すぐには答え出ないかも。でも、話してみて。";
  else if (msg.includes("ありがとう")) replyText = "LUCA：うん。こちらこそ、ありがとう。";

  return client.replyMessage(event.replyToken, {
    type: "text",
    text: replyText
  });
}
