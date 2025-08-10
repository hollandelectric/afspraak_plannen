# Holland Electric Afspraak Planner

Een moderne web-applicatie voor het plannen van elektrische installatie afspraken, geïntegreerd met HubSpot CRM.

## Nieuwe Functionaliteit: Datum en Weken Installatie

### Wat het doet
Wanneer een klant een afspraak bevestigt, worden de geselecteerde voorkeuren automatisch naar HubSpot gestuurd en opgeslagen in het veld `datum_weken_installatie`.

### Hoe het werkt
1. **Klant selecteert voorkeuren**: De klant kiest 3-5 voorkeuren voor de afspraak
2. **Automatische HubSpot update**: Bij bevestiging worden deze datums naar HubSpot gestuurd
3. **Property update**: De `datum_weken_installatie` property wordt bijgewerkt met alle geselecteerde datums

### HubSpot Property
- **Interne naam**: `datum_weken_installatie`
- **Formaat**: `DD-MM-YYYY HH:MM, DD-MM-YYYY HH:MM, ...`
- **Voorbeeld**: `12-08-2025 08:00, 12-08-2025 12:00, 13-08-2025 08:00`

### API Endpoints

#### Update Installatie Datums
```http
POST /api/update-installation-dates
Content-Type: application/json

{
  "dealId": "deal_id_here",
  "installationDates": [
    "2025-08-12T08:00:00.000Z",
    "2025-08-12T12:00:00.000Z",
    "2025-08-13T08:00:00.000Z"
  ]
}
```

#### Test Endpoint
```http
GET /api/test-deal-properties?dealId=deal_id_here
```

### Workflow
1. Klant doorloopt de afspraak stappen
2. Selecteert voorkeuren (stap 5)
3. Bevestigt alle gegevens (stap 6)
4. Bij definitieve bevestiging:
   - Deal status wordt bijgewerkt naar "Intake plannen" (2705156303)
   - `datum_weken_installatie` wordt bijgewerkt met alle voorkeuren
   - Klant krijgt bevestiging

### Technische Details
- **Server**: Node.js met Express
- **Client**: React met TypeScript
- **HubSpot**: REST API v3
- **Error handling**: Graceful fallback als HubSpot update mislukt
- **Mock mode**: Ondersteuning voor development zonder HubSpot API

### Setup
1. Zorg dat `HUBSPOT_API_KEY` is ingesteld in je `.env` bestand
2. De `datum_weken_installatie` property moet bestaan in je HubSpot deal object
3. Start de server en test de functionaliteit

### Troubleshooting
- **Property bestaat niet**: Maak de `datum_weken_installatie` property aan in HubSpot
- **API errors**: Controleer je HubSpot API key en rechten
- **Mock mode**: Zet `MOCK_VERIFICATION=true` in je `.env` voor development

## Bestaande Functionaliteit
- WhatsApp verificatie via UltraMsg
- HubSpot contact en deal integratie
- Dynamische offerte weergave
- Adres verificatie en bijwerking
- Responsive UI met Tailwind CSS 