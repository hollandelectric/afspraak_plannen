# n8n Workflow Setup Guide

## Overzicht

Deze guide helpt je de Holland Electric Afspraak Planner workflow te configureren in n8n Cloud.

## Bestanden

- `n8n-workflow-afspraak-planner.json` - Basis versie (voor testen met gesimuleerde data)
- `n8n-workflow-production.json` - Productie versie (met echte API calls)

## Stap 1: Credentials Aanmaken

### 1.1 Microsoft Outlook OAuth2

1. Ga naar [Azure Portal](https://portal.azure.com)
2. Navigeer naar **Azure Active Directory** → **App registrations** → **New registration**
3. Vul in:
   - Name: `Holland Electric n8n`
   - Supported account types: `Accounts in this organizational directory only`
   - Redirect URI: `https://YOUR-N8N-INSTANCE.app.n8n.cloud/rest/oauth2-credential/callback`
4. Na aanmaken, noteer:
   - **Application (client) ID**
   - **Directory (tenant) ID**
5. Ga naar **Certificates & secrets** → **New client secret**
   - Noteer de **Value** (dit is je Client Secret)
6. Ga naar **API permissions** → **Add a permission** → **Microsoft Graph**:
   - `Calendars.ReadWrite` (Delegated)
   - `User.Read` (Delegated)
7. Klik op **Grant admin consent**

**In n8n:**
1. Ga naar **Credentials** → **Add Credential** → **Microsoft Outlook OAuth2 API**
2. Vul in:
   - Client ID: (van stap 4)
   - Client Secret: (van stap 5)
   - Tenant ID: (van stap 4)
3. Klik **Connect** en log in met `planning@hollandelectric.nl`

### 1.2 HubSpot API

1. In n8n: **Credentials** → **Add Credential** → **HubSpot API**
2. Gebruik je bestaande HubSpot API key (dezelfde als in de app)

### 1.3 Google Maps API (optioneel voor Distance Matrix)

1. Ga naar [Google Cloud Console](https://console.cloud.google.com)
2. Maak een project of selecteer bestaand
3. Ga naar **APIs & Services** → **Library**
4. Zoek en enable: **Distance Matrix API**
5. Ga naar **Credentials** → **Create Credentials** → **API Key**
6. Noteer de API key

**In de workflow:**
- Vervang `YOUR_GOOGLE_MAPS_API_KEY` met je echte key

### 1.4 Slack Webhook

1. Ga naar [Slack API](https://api.slack.com/apps)
2. **Create New App** → **From scratch**
3. Ga naar **Incoming Webhooks** → Enable
4. **Add New Webhook to Workspace**
5. Selecteer het kanaal voor planning notificaties
6. Kopieer de Webhook URL

**In de workflow:**
- Vervang `YOUR_SLACK_WEBHOOK_URL` met je echte URL

## Stap 2: Calendar IDs Ophalen

Om de calendar IDs van de monteur calendars te vinden:

### Via n8n (aanbevolen)

1. Maak een tijdelijke workflow met een **HTTP Request** node:
   ```
   Method: GET
   URL: https://graph.microsoft.com/v1.0/users/planning@hollandelectric.nl/calendars
   Authentication: Microsoft Outlook OAuth2
   ```
2. Run de workflow
3. In de output zie je alle calendars met hun `id` veld
4. Noteer de IDs voor elke monteur calendar

### Via Graph Explorer

1. Ga naar [Graph Explorer](https://developer.microsoft.com/graph/graph-explorer)
2. Log in met je Microsoft account
3. Run: `GET https://graph.microsoft.com/v1.0/users/planning@hollandelectric.nl/calendars`
4. Kopieer de calendar IDs

## Stap 3: Workflow Importeren

1. Open n8n Cloud dashboard
2. Ga naar **Workflows** → **Import from File**
3. Upload `n8n-workflow-production.json`
4. De workflow wordt geopend

## Stap 4: Configuratie Aanpassen

### 4.1 Monteur Data

Open de **"Config + Validatie"** Code node en pas aan:

```javascript
const MONTEURS = [
  {
    id: "monteur1",
    email: "planning@hollandelectric.nl",
    naam: "ECHTE NAAM",           // ← Pas aan
    thuisAdres: "ECHT ADRES",     // ← Pas aan
    werkuren: { start: "08:00", eind: "17:00" },
    maxJobsPerWeek: 20,
    maxUrenPerWeek: 40,
    calendarId: "AAMkAG..."      // ← Pas aan (van stap 2)
  },
  // ... herhaal voor alle 4 monteurs
];
```

### 4.2 HubSpot Stage IDs

Vervang in de workflow:
- `INGEPLAND_STAGE_ID` → Je echte HubSpot deal stage ID voor "Ingepland"
- `HANDMATIG_PLANNEN_STAGE_ID` → Je echte stage ID voor "Handmatig plannen"

Je vindt deze IDs via:
1. HubSpot → Settings → Objects → Deals → Pipelines
2. Klik op de pipeline
3. De stage IDs staan in de URL of via de API

### 4.3 Slack Configuratie

In de **"Slack - Notify"** node:
- Vervang `YOUR_SLACK_WEBHOOK_URL`
- Vervang `YOUR_PORTAL_ID` met je HubSpot portal ID (voor de link naar deals)

## Stap 5: Credentials Koppelen

1. Klik op elke node die een credential nodig heeft (rode warning)
2. Selecteer de juiste credential uit de dropdown
3. Nodes die credentials nodig hebben:
   - **HubSpot - Get Deal** → HubSpot API
   - **Microsoft Graph - Get Calendar Events** → Microsoft Outlook OAuth2
   - **Graph - Boek Afspraak** → Microsoft Outlook OAuth2
   - **HubSpot - Update (Succes)** → HubSpot API
   - **HubSpot - Update (Handmatig)** → HubSpot API

## Stap 6: Testen

### Test met Mock Data

1. Klik op **Test Workflow**
2. In de Webhook node, klik **Listen for Test Event**
3. Stuur een test request:

```bash
curl -X POST "https://YOUR-N8N-INSTANCE.app.n8n.cloud/webhook-test/schedule-appointment" \
  -H "Content-Type: application/json" \
  -d '{
    "dealId": "12345",
    "contactEmail": "test@email.nl",
    "customerAddress": "Teststraat 1, 1234AB Amsterdam",
    "preferences": [
      { "date": "2025-02-10", "timeSlot": "09:00" },
      { "date": "2025-02-11", "timeSlot": "14:00" }
    ]
  }'
```

4. Bekijk de execution en controleer of alle nodes correct draaien

### Verificatie Checklist

- [ ] Webhook ontvangt data correct
- [ ] HubSpot deal wordt opgehaald
- [ ] Calendar events worden gelezen (check Microsoft Graph response)
- [ ] Google Maps reistijd wordt berekend (check Distance Matrix response)
- [ ] Scoring algoritme produceert resultaten
- [ ] Bij match: Calendar event wordt aangemaakt
- [ ] Bij geen match: Slack notificatie wordt verzonden
- [ ] Response wordt correct teruggestuurd

## Stap 7: Activeren

1. Zorg dat alle tests slagen
2. Klik op **Activate** (toggle rechtsboven)
3. De workflow is nu live!

## Webhook URL voor de App

Na activatie is je webhook URL:
```
https://YOUR-N8N-INSTANCE.app.n8n.cloud/webhook/schedule-appointment
```

Deze URL gebruik je in de Express backend (`/api/schedule-request` endpoint).

## Troubleshooting

### "Insufficient privileges" bij Microsoft Graph

- Controleer of de Azure App Registration de juiste permissions heeft
- Zorg dat **admin consent** is gegeven
- Controleer of je bent ingelogd met het juiste account

### Calendar events worden niet gevonden

- Controleer of de calendar IDs correct zijn
- Check of de datum range klopt (startDateTime/endDateTime)
- Verifieer dat er events in de calendars staan

### Google Maps geeft geen resultaat

- Check of de API key correct is
- Verifieer dat Distance Matrix API is ingeschakeld
- Controleer of de adressen geldig zijn

### Slack notificatie komt niet aan

- Test de webhook URL direct in browser/Postman
- Controleer of het kanaal correct is geselecteerd
- Check Slack app permissions

## Volgende Stappen

Na succesvolle setup van de workflow:

1. **Backend endpoint bouwen** - `/api/schedule-request` in Express
2. **Frontend component bouwen** - Step 6 met loading/success/alternatives states
3. **WhatsApp bevestiging toevoegen** - Extra node na succesvolle boeking

---

*Vragen? Check de [n8n documentatie](https://docs.n8n.io) of open een issue.*
