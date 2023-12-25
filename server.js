const http = require('http');
const Koa = require('koa');
const cors = require('@koa/cors');
const { koaBody } = require('koa-body');
const Router = require('koa-router');
const ws = require('ws');
const crypto = require ('crypto');

const posts = [{
  "id": crypto.randomUUID(),
  "type": "text",
  "label": "none",
  "body": "Это обычное текстовое сообщение. У него нет никаких характеристик.",
  "attach": null,
  "date": "December 9, 2023 12:24",
},
{
  "id": crypto.randomUUID(),
  "type": "text",
  "label": "later",
  "body": "Это что-то, что мне потребуется сделать позже. Сообщение говорит мне об этом при помощи цветной метки",
  "attach": null,
  "date": "December 10, 2023 10:13",
},
{
  "id": crypto.randomUUID(),
  "type": "links",
  "label": "imp",
  "body": "https://ru.wikipedia.org/wiki/JavaScript",
  "attach": null,
  "date": "December 11, 2023 02:43",
}];

const app = new Koa();
const router = new Router();

app.use(koaBody());
app.use(cors());
app.use(router.routes());
app.use(router.allowedMethods());

router.get('/', async (ctx) => {
  ctx.response.body ='hello';
});

router.get('/archive', async (ctx) => {
  try {
    const result = {
      status: "ok",
      messages: posts,
    };
    ctx.response.body = JSON.stringify(result);
  } catch (err) {
    throw err;
  }
});

app.use((ctx, next) => {
  ctx.response.set('Access-Control-Allow-Origin', '*');

  console.log(ctx.headers);

  next();
})

const port = process.env.PORT || 7070;
const server = http.createServer(app.callback());
const wsServer = new ws.Server({
  server
});

wsServer.on('connection', (ws) => {
  ws.on("message", (data) => {
    const receivedMSG = JSON.parse(data);
    if (receivedMSG.type === "send") {
      const newMessage = {
        "id": crypto.randomUUID(),
        "type": receivedMSG.msg.type,
        "label": receivedMSG.msg.label,
        "body": receivedMSG.msg.body,
        "attach": receivedMSG.msg.attach,
        "date": Date.now(),
      }
      posts.push(newMessage);
      ws.send(JSON.stringify(newMessage));
    } else if (receivedMSG.type === "search") {
      let foundPosts = [];
      posts.forEach((post) => {
        if (post.body && post.body.includes(receivedMSG.msg)) {
        foundPosts.push(post);
      }});

      const response = {
        "operation": "search",
        "arr": foundPosts,
        "value": receivedMSG.msg,
      }

      ws.send(JSON.stringify(response));
    }
  });
})

server.listen(port, (err) => {
  if (err) {
    console.log(err);
  }
  return;
})

console.log('server is listening to port №' + port);