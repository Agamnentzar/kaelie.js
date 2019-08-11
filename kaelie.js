const path = require('path');
const url = require('url');
const http = require('http');
const express = require('express');
const WebSocket = require('ws');
const config = require('./config.json');
const app = express();

// const YEAR = 365 * 24 * 60 * 60 * 1000;
const production = app.get('env') === 'production';
const maxAge = 0; // production ? YEAR : 0;
const etag = false;

const rooms = new Map();

for (const room of config.rooms) {
  rooms.set(room.id, { ...room, clients: [], messages: [] });
}

app.set('port', config.port);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.set('view options', { doctype: 'html' });
app.set('x-powered-by', false);
app.set('etag', false);

app.use(require('serve-favicon')(path.join(__dirname, 'favicon.ico')));

if (config.proxy) {
  app.set('trust proxy', config.proxy);
}

app.use(express.static(path.join(__dirname, 'public'), { maxAge, etag }));

if (!production) {
  app.use(require('errorhandler')());
}

app.get('/:room', (req, res) => {
  const roomId = req.params.room;
  const room = rooms.get(roomId);

  if (room) {
    const src = Array.isArray(room.src) ? room.src : [room.src];
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.render('index', { production, room: roomId, title: room.title, src: src });
  } else {
    res.status(404).end()
  }
});

app.get('/*', (req, res) => {
  res.status(404).end();
});

const httpServer = http.createServer(app);

const wsServer = new WebSocket.Server({
  server: httpServer,
  path: '/ws',
  perMessageDeflate: false,
});

wsServer.on('connection', (ws, req) => {
  let room;

  try {
    const { query } = url.parse(req.url, true);
    room = rooms.get(query && query.room);
  } catch (e) {
    console.error(e);
  }

  if (!room) {
    ws.close();
    return;
  }

  room.clients.push(ws);

  for (const message of room.messages) {
    ws.send(message);
  }

  ws.on('message', message => {
    if (message === 'ping')
      return;

    room.messages.push(message);

    while (room.messages.length > 50) {
      room.messages.shift();
    }

    for (const client of room.clients) {
      client.send(message);
    }
  });

  ws.on('close', () => {
    room.clients.splice(room.clients.indexOf(ws), 1);
  });
});

httpServer.listen(config.port, () => {
  console.log(`Listening on port ${config.port}`);
});
