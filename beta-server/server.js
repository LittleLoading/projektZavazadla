const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();

app.use(express.json());
app.use(express.static('public'));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', ws => {
  console.log('WS: Klient (prohlížeč) připojen');
  ws.send(JSON.stringify({ message: "Vítejte v systému sledování zavazadel" }));
});

const broadcast = (data) => {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
};

app.post('/webhook-receiver', (req, res) => {
    const receivedData = req.body;
    console.log('📨 Přijat Webhook od Alphy:', receivedData);

    const bag = receivedData.data;


    const assignedBelt = bag.flight.startsWith('OK') ? 1 : 2;

    const displayMessage = {
        type: 'NEW_BAG',
        text: `Kufr pro ${bag.owner} (Let ${bag.flight}) dorazil!`,
        belt: assignedBelt,
        weight: bag.weight
    };

    broadcast(displayMessage);

    res.sendStatus(200); // Odpovíme Alphě, že jsme to přijali
});

server.listen(8080, '0.0.0.0', () => {
  console.log('BETA (Display) běží na http://localhost:8080');
});