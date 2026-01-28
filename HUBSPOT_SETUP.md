# HubSpot API Setup (Eenvoudig)

## Probleem opgelost!
Je hebt geen OAuth 2.0 meer nodig. We gebruiken nu gewoon een simpele API key.

## Oplossing

### 1. Maak een Private App aan in HubSpot
1. Ga naar je HubSpot account → **Settings** → **Account Setup** → **Integrations** → **Private Apps**
2. Klik op **"Create private app"**
3. Geef je app een naam (bijv. "Afspraak Planner")
4. Selecteer alleen deze scope: **`crm.objects.contacts.read`**
5. Klik op **"Create app"**
6. Kopieer de **API key** (begint met `pat-`)

### 2. Environment Variables Instellen
Maak een `.env` bestand aan in je project root met:

```bash
# HubSpot API Key (Private App)
HUBSPOT_API_KEY=pat_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Database
DATABASE_URL=your_database_url_here

# Development
MOCK_VERIFICATION=false

# Server
PORT=5000
```

### 3. Nieuwe HubSpot Property Aanmaken
Je moet een nieuwe property aanmaken in je HubSpot deal object:

1. Ga naar **Settings** → **Properties** → **Deals**
2. Klik op **"Create property"**
3. Vul in:
   - **Label**: `Datum Weken Installatie`
   - **Internal name**: `datum_weken_installatie`
   - **Field type**: `Single-line text`
   - **Group**: `Deal information` (of een andere relevante groep)
4. Klik op **"Create"**

### 4. Wat de code nu doet
- Haalt contact informatie op basis van email op
- Retourneert: telefoonnummer, naam, adres, postcode en plaats
- **NIEUW**: Slaat datum en weken installatie op in HubSpot deals
- Geen OAuth flow meer nodig
- Veel eenvoudiger en betrouwbaarder

### 5. Testen
Start je server opnieuw op en test de HubSpot integratie. Het zou nu moeten werken!

## Troubleshooting

### API Key werkt niet
- Controleer of je Private App de juiste scope heeft (`crm.objects.contacts.read`)
- Zorg ervoor dat je API key correct is gekopieerd
- Controleer of je HubSpot account actief is

### Geen contact gevonden
- Controleer of het emailadres exact overeenkomt in HubSpot
- Zorg ervoor dat de contact eigenschappen (address, zip, city) zijn ingevuld

### Datum weken installatie wordt niet opgeslagen
- Controleer of de `datum_weken_installatie` property bestaat in je deal object
- Controleer of je Private App schrijfrechten heeft voor deals
- Voeg de scope `crm.objects.deals.write` toe aan je Private App

## Veiligheid
- Deel nooit je `HUBSPOT_API_KEY`
- Voeg `.env` toe aan je `.gitignore`
- Gebruik environment variables in productie

## Nieuwe Functionaliteit
De app slaat nu automatisch de geselecteerde afspraak voorkeuren op in HubSpot onder de property `datum_weken_installatie`. Dit gebeurt wanneer een klant een afspraak bevestigt.

**Formaat**: `12-08-2025 08:00, 12-08-2025 12:00, 13-08-2025 08:00` 