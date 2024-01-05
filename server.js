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

const commands = [
  {name: 'погода',
  variants: {
    1: 'Сегодня холодный день: температура -19С, ветер с северо-востока. Одевайтесь потеплей!',
    2: 'Температура поднялась до -10С, ожидается легкий снегопад.',
    3: 'С запада пришел циклон. Весь день будут дуть сильные ветры.',
    4: 'Ожидается сильное потепление, а вечером - мокрый снег.',
    5: 'На улице сильный гололед и температура -17С. Будьте осторожны!',
    6: 'Ожидается солнечный день с легкими осадками к вечеру',
    7: 'Температура на улице - +2С. Ветра нет.'
  }},
  {name: 'новое',
  variants: {
    1: 'У вас 3 непрочитанных сообщения из сообщества "Рабочая группа"',
    2: 'Новый пользователь желает добавить вас в список контактов',
    3: 'В сообществе "Ежегодная конференция" выложен пост с пометкой "важное"',
    4: 'Ваше сообщение за 13 декабря 2023 года собрало больше 10 голосов',
  }},
  {name: 'события',
  variants: {
    1: 'Через 1 день, 3 часа, 15 минут начнется общее собрание коллектива.',
    2: 'Через 4 дня закончится срок сдачи документов за квартал.',
    3: 'Вас пригласили на видео-конференцию в сообществе "Рабочая группа".',
    4: 'Поделитесь своим мнением в опросе сообщества! Сбор голосов закрывается через 2 дня.',
    5: 'Пользователь "Иван Иванов" отмечает день рождения!',
  }},
  {name: 'онлайн',
  variants: {
    1: 'Вы были онлайн уже 45 минут',
    2: 'Вы были онлайн уже 1 час 30 минут',
    3: 'Вы были онлайн уже 2 часа. Рекомендуем сделать перерыв!',
    4: 'Вы были онлайн уже 15 минут',
    5: 'Вы были онлайн меньше 5 минут',
  }},
  {name: 'команды',
  variants: {
    1: '@chaos погода - узнать погоду на сегодня.<br>@chaos новое - проверить уведомления<br>@chaos события - проверить предстоящие события<br>@chaos онлайн - узнать длину рабочей сессии',
  }}
]

const app = new Koa();
const router = new Router();

app.use(koaBody({
  multipart: true,
  urlencoded: true,
}));
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
      const reg = new RegExp(receivedMSG.msg, 'i');
      posts.forEach((post) => {
        if (post.body.match(reg)) foundPosts.push(post);
      });
      const response = {
        "operation": "search",
        "arr": foundPosts,
        "value": receivedMSG.msg,
      }
      ws.send(JSON.stringify(response));

    } else if (receivedMSG.type === "command") {
      let answer = 'Неизвестная команда! Чтобы ознакомиться с их списом, введите "@chaos команды"';
      for (let key of commands) {
        if (key.name === receivedMSG.msg.body) {
          answer = key.variants[(Math.random() * Object.keys(key.variants).length) | 1];
        }
      }
      const newMessage = {
        "id": crypto.randomUUID(),
        "type": 'command',
        "label": null,
        "body": answer,
        "attach": null,
        "date": Date.now(),
      }
      posts.push(newMessage);
      ws.send(JSON.stringify(newMessage));
      
    } else if (receivedMSG.type === "filter") {
      let filteredPosts = [];
      posts.forEach((post) => {
        if (post.type === receivedMSG.value || post.label === receivedMSG.value) {
          filteredPosts.push(post);
      }});

      const response = {
        "operation": "filter",
        "arr": receivedMSG.value === 'all' ? posts : filteredPosts,
      }
      ws.send(JSON.stringify(response));
    } else if (receivedMSG.type === "changeLabel") {
      for (let i = 0; i < posts.length; i += 1) {
        if (posts[i].id === receivedMSG.targetID) {
          prevMsg = posts[i];
          posts[i].label = receivedMSG.label;
        }
      }
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