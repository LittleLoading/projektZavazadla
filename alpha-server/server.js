const express = require('express');
const axios = require('axios'); 
const app = express();

app.use(express.json());

// zatim jen tyto limity, mohou se přidat další
const FLIGHT_LIMITS = {
    'OK123': 100, 
    'US999': 500
};


let bags = []; 

// 1. Endpoint
app.post('/bag', (req, res) => {
    const { owner, flight, weight } = req.body;

 
    const currentWeight = bags
        .filter(b => b.flight === flight)
        .reduce((sum, b) => sum + b.weight, 0);
// kdyby let nebyl v limitu, vezmeme defaultni hodnotu 2000
    const maxWeight = FLIGHT_LIMITS[flight] || 2000;

    if (currentWeight + weight > maxWeight) {
        return res.status(409).json({ 
            error: "Letadlo je přetížené! Nelze odbavit.", 
            current: currentWeight, 
            limit: maxWeight 
        });
    }

    // Pokud OK, uložíme
    const newBag = { id: Date.now(), owner, flight, weight, status: 'CHECKED_IN' };
    bags.push(newBag);
    
    console.log(`✅ Odbaven kufr pro ${owner} na let ${flight}. Váha: ${weight}kg`);
    res.status(201).json(newBag);
});

// 2. Endpoint
app.patch('/bag/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const bagIndex = bags.findIndex(b => b.id == id);
    if (bagIndex === -1) return res.status(404).send("Kufr nenalezen");

    bags[bagIndex].status = status;
    console.log(`🔄 Změna stavu kufru ${id} na: ${status}`);

    // POKUD JE STAV 'UNLOADED', POŠLEME WEBHOOK NA BETU
    if (status === 'UNLOADED') {
        try {
            console.log("📡 Odesílám Webhook na Betu...");
            
 
            await axios.post('http://localhost:8080/webhook-receiver', {
                event: 'bag_arrived',
                timestamp: new Date().toISOString(),
                data: bags[bagIndex]
            });
            console.log("✅ Webhook úspěšně doručen.");
        } catch (error) {
            console.error("❌ Chyba při odesílání webhooku:", error.message);
        }
    }

    res.json(bags[bagIndex]);
});

app.listen(3000, () => {
    console.log('ALPHA (Check-in) běží na http://localhost:3000');
});