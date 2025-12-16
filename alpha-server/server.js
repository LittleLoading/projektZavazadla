const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// --- 1. DATABÁZE A KONFIGURACE ---
const FLIGHT_LIMITS = { 
    'OK123': 100,  // Malé letadlo
    'US999': 5000  // Velké letadlo
};

let bags = []; 

// --- 2. ENDPOINTY ---

// A) Vytvoření kufru (Check-in)
app.post('/bag', (req, res) => {
    const { owner, flight, weight } = req.body;

    // Business Logic: Kontrola přetížení
    const currentWeight = bags
        .filter(b => b.flight === flight)
        .reduce((sum, b) => sum + b.weight, 0);

    const maxWeight = FLIGHT_LIMITS[flight] || 2000;

    if (currentWeight + weight > maxWeight) {
        return res.status(409).json({ error: "Letadlo je přetížené!" });
    }

    const newBag = { id: Date.now(), owner, flight, weight, status: 'CHECKED_IN' };
    bags.push(newBag);
    
    console.log(`✅ Odbaven kufr: ${owner}, let ${flight}, váha ${weight}kg`);
    res.status(201).json(newBag);
});

// B) Změna stavu kufru (Spouští Webhook)
app.patch('/bag/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const bagIndex = bags.findIndex(b => b.id == id);
    if (bagIndex === -1) return res.status(404).send("Kufr nenalezen");

    // Aktualizace v DB
    bags[bagIndex].status = status;
    console.log(`🔄 Změna stavu kufru ${id} na: ${status}`);

    // LOGIKA WEBHOOKŮ: Kdy volat Betu?
    // 1. Když se nakládá do letadla (LOADED)
    // 2. Když se vykládá na pás (UNLOADED)
    if (status === 'LOADED' || status === 'UNLOADED') {
        const eventType = status === 'LOADED' ? 'bag_loaded' : 'bag_arrived';
        
        try {
            console.log(`📡 Odesílám Webhook (${eventType})...`);
            
            await axios.post('http://127.0.0.1:8080/webhook-receiver', {
                event: eventType,
                timestamp: new Date().toISOString(),
                data: bags[bagIndex]
            });
            console.log("✅ Webhook doručen.");
        } catch (error) {
            console.error("❌ Chyba webhooku (Zkontroluj, zda běží Beta):", error.message);
        }
    }

    res.json(bags[bagIndex]);
});

// C) Interakce (Beta nám říká "Vyzvednuto")
app.post('/bag/collected', (req, res) => {
    const { bagId } = req.body;
    console.log(`🎉 Pasažér si vyzvedl kufr ${bagId}. Archivuji...`);
    res.sendStatus(200);
});

app.listen(3000, () => {
    console.log('ALPHA (Check-in) běží na http://localhost:3000');
});