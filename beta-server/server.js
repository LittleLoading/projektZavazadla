const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();

app.use(express.json());
app.use(express.static('public')); 

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// --- 1. WEBSOCKET LOGIKA ---
const broadcast = (data) => {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
};

// --- 2. WEBHOOK RECEIVER (Příjem od Alphy) ---
app.post('/webhook-receiver', (req, res) => {
    const { event, data } = req.body;
    console.log(`📨 Přijat Webhook: ${event} pro kufr ${data.id}`);

    let wsMessage = {};

    if (event === 'bag_loaded') {
        // Scénář 1: Kufr je v letadle (na cestě)
        wsMessage = { 
            type: 'PLANE_LOADED', 
            bag: data 
        };
    } else if (event === 'bag_arrived') {
        // Scénář 2: Kufr je vyložen -> Musíme určit pás
        // Business Logic: Lety začínající na "OK" jdou na Pás 1, ostatní na Pás 2
        const assignedBelt = data.flight.startsWith('OK') ? 1 : 2;
        
        wsMessage = { 
            type: 'BELT_ARRIVAL', 
            bag: data, 
            belt: assignedBelt 
        };
    }

    // Pošleme info všem připojeným klientům (prohlížečům)
    broadcast(wsMessage);

    res.sendStatus(200); // Odpovíme Alphě "OK"
});

server.listen(8080, '0.0.0.0', () => {
  console.log('BETA (Display) běží na http://localhost:8080');
});