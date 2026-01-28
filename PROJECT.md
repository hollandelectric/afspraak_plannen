# Project: Holland Electric Afspraak Automatisering

## Overzicht
Automatische planning van installatieafspraken voor Holland Electric klanten. Een n8n workflow analyseert klantvoorkeuren, controleert monteur beschikbaarheid via Office365 calendars, berekent reistijden via Google Maps, en boekt automatisch de optimale afspraak.

## Doel
Wanneer een klant in de app 3-5 voorkeursdata selecteert, moet het systeem automatisch:
1. De beste monteur selecteren op basis van beschikbaarheid, reistijd en werklast
2. De afspraak boeken in de monteur's Office365 calendar
3. De HubSpot deal updaten naar de juiste stage
4. Bij conflicten: backoffice notificeren voor handmatige afhandeling

## Systemen & Integraties

| Systeem | Doel | Credentials nodig? |
|---------|------|-------------------|
| Microsoft Graph API | Lezen/schrijven Office365 calendars (4 monteurs) | OAuth2 App Registration |
| Google Maps API | Distance Matrix voor reistijdberekening | API Key |
| HubSpot API | Deal stage updates, klantgegevens | API Key (bestaand) |
| n8n | Workflow orchestratie | Self-hosted/Cloud instance |
| Bestaande App | Webhook trigger bij voorkeur-selectie | Geen (interne call) |

## Bedrijfscontext

| Aspect | Waarde |
|--------|--------|
| Monteurs | 4 (allemaal kunnen alle types installaties) |
| Volume | 50+ afspraken per week |
| Werkgebied | Heel Nederland |
| Boekperiode | Week 1 geblokkeerd, dan binnen 2 weken |
| Installatieduur | Varieert per offerte, staat in HubSpot `installatie_duur` |
| Gedeelde mailbox | planning@hollandelectric.nl |
| n8n | Cloud instance (bestaand) |

## Frontend UX Flow (8 stappen)

```
┌─────────────────────────────────────────────────────────────────────┐
│  STAP 1-4: Bestaande flow (ongewijzigd)                             │
│  1. Email invoeren → 2. WhatsApp verificatie →                      │
│  3. Offerte accepteren → 4. Adres bevestigen                        │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STAP 5: Voorkeuren selecteren (bestaand, licht aangepast)          │
│  • Klant kiest 3-5 voorkeursdata                                    │
│  • Week 1 geblokkeerd (niet klikbaar)                               │
│  • Kalender toont 2 weken vooruit                                   │
│  • "Volgende" knop → triggert planning                              │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STAP 6: Planning Resultaat (NIEUW)                                 │
│                                                                     │
│  LOADING STATE (< 5 seconden):                                      │
│  • Lottie animatie (geel/groen huisstijl)                           │
│  • Tekst: "We plannen uw afspraak in..."                            │
│                                                                     │
│  SUCCES:                          GEEN MATCH:                       │
│  ✓ Datum: 15 feb 09:00            Uw voorkeuren zijn niet           │
│  ✓ Monteur: Jan Jansen            beschikbaar.                      │
│  [Bevestigen]                     Beschikbare alternatieven:        │
│                                   ○ 17 feb 10:00                    │
│                                   ○ 18 feb 14:00                    │
│                                   ○ 19 feb 09:00                    │
│                                   [Kies datum] → Bevestiging popup  │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STAP 7: Adres verificatie (bestaand, hernummerd van 6)             │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STAP 8: Bevestigingsscherm (hernummerd van 7)                      │
│  • Samenvatting + WhatsApp bevestiging                              │
└─────────────────────────────────────────────────────────────────────┘
```

## Backend Architectuur

```
┌─────────────────────────────────────────────────────────────────────┐
│                        KLANT APP (React)                            │
│  Step 5: Selecteert 3-5 voorkeursdata → POST /api/schedule-request  │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     n8n WORKFLOW                                     │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────────┐ │
│  │   Webhook    │──▶│  Haal Data   │──▶│  Loop door voorkeuren    │ │
│  │   Trigger    │   │  (HubSpot)   │   │  (3-5 opties)            │ │
│  └──────────────┘   └──────────────┘   └──────────────────────────┘ │
│                                                    │                 │
│                                                    ▼                 │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              PER VOORKEUR:                                    │   │
│  │  1. Haal calendars op (4 monteurs) - Microsoft Graph          │   │
│  │  2. Filter beschikbare slots                                  │   │
│  │  3. Bereken reistijden (Google Maps)                          │   │
│  │  4. Score monteurs (beschikbaarheid + werklast + reistijd)    │   │
│  │  5. Selecteer beste match                                     │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                   │                                  │
│                    ┌──────────────┴──────────────┐                   │
│                    ▼                             ▼                   │
│  ┌────────────────────────────┐   ┌────────────────────────────┐    │
│  │     MATCH GEVONDEN         │   │     GEEN MATCH / CONFLICT  │    │
│  │  • Boek in Calendar        │   │  • Notificeer Backoffice   │    │
│  │  • Update HubSpot          │   │  • Email/Slack alert       │    │
│  │  • Bevestig aan klant      │   │  • Deal stage → Handmatig  │    │
│  └────────────────────────────┘   └────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

## Workflow Stappen

### 1. Trigger: Webhook ontvangst
**Node:** Webhook Trigger
```json
{
  "dealId": "12345",
  "contactEmail": "klant@email.nl",
  "customerAddress": "Hoofdstraat 123, 1234AB Amsterdam",
  "installationDuration": 180,
  "preferences": [
    { "date": "2025-02-03", "timeSlot": "08:00", "period": "ochtend" },
    { "date": "2025-02-04", "timeSlot": "12:00", "period": "middag" },
    { "date": "2025-02-05", "timeSlot": "08:00", "period": "ochtend" }
  ]
}
```

### 2. Verwerking: Data ophalen
**Nodes:**
- HTTP Request → HubSpot: Haal deal details en klantgegevens
- Code Node: Laad monteur configuratie (startlocaties, werkuren)

### 3. Verwerking: Calendar check per monteur
**Nodes:**
- Loop: Voor elke voorkeur
  - Microsoft Graph: GET /users/{monteur}/calendar/calendarView
  - Code Node: Filter beschikbare tijdslots
  - Google Maps: Distance Matrix API voor reistijd

### 4. Verwerking: Scoring algoritme
**Code Node:** Bereken score per monteur per voorkeur
```javascript
// Scoring factoren (gewichten configureerbaar)
const score = {
  beschikbaar: isAvailable ? 100 : 0,
  reistijd: Math.max(0, 50 - (travelMinutes / 2)),
  werklast_jobs: Math.max(0, 30 - (weekJobs * 3)),
  werklast_uren: Math.max(0, 20 - (weekHours / 4))
};
return score.beschikbaar + score.reistijd + score.werklast_jobs + score.werklast_uren;
```

### 5. Output: Beslissing
**IF Node:** Beste score > drempelwaarde?

**JA - Automatisch boeken:**
- Microsoft Graph: POST calendar event
- HubSpot: Update deal stage → "Ingepland" (nieuwe stage)
- Webhook Response: Bevestiging met datum/tijd/monteur

**NEE - Toon alternatieven:**
- Zoek 3 eerstvolgende beschikbare slots
- Webhook Response: alternatives[] met top 3 opties
- Klant kiest alternatief → popup bevestiging → direct boeken

**GEEN ALTERNATIEVEN - Escalatie naar backoffice:**
- Slack: Notificatie naar backoffice
- HubSpot: Update deal stage → "Handmatig plannen"
- Webhook Response: "Wij nemen contact op"

## Data Mapping

### Inkomend (App → n8n)
| Bron | Veld | Doel | Veld |
|------|------|------|------|
| App | dealId | n8n | dealId |
| App | contactEmail | n8n | email |
| App | preferences[] | n8n | dateOptions |
| HubSpot | address + zip + city | n8n | customerAddress |
| HubSpot | deal.installatie_duur | n8n | durationMinutes |

### Uitgaand (n8n → Systemen)
| Bron | Veld | Doel | Veld |
|------|------|------|------|
| n8n | selectedDate | Office365 | event.start |
| n8n | endTime | Office365 | event.end |
| n8n | customerAddress | Office365 | event.location |
| n8n | monteurId | Office365 | calendar owner |
| n8n | dealId | HubSpot | deal to update |
| n8n | confirmedDate | HubSpot | geplande_datum |
| n8n | monteurName | HubSpot | toegewezen_monteur |

## Monteur Configuratie

Aan te maken in n8n (Static Data node of externe config):

```json
{
  "monteurs": [
    {
      "id": "monteur1@hollandelectric.nl",
      "naam": "Jan Jansen",
      "thuisAdres": "Werkplaats 1, 1000AA Amsterdam",
      "werkuren": { "start": "08:00", "eind": "17:00" },
      "maxJobsPerWeek": 20,
      "maxUrenPerWeek": 40
    },
    {
      "id": "monteur2@hollandelectric.nl",
      "naam": "Piet Pieters",
      "thuisAdres": "...",
      "werkuren": { "start": "08:00", "eind": "17:00" },
      "maxJobsPerWeek": 20,
      "maxUrenPerWeek": 40
    }
    // ... monteur 3 en 4
  ]
}
```

## Conflict Regels

Het systeem markeert voor handmatige review wanneer:
1. **Geen beschikbaarheid**: Geen monteur beschikbaar voor alle 3-5 voorkeuren
2. **Te lange reistijd**: Reistijd > 60 minuten
3. **Werklast overschreden**: Monteur zou boven max jobs/uren komen
4. **Overlap detectie**: Nieuwe afspraak zou overlappen met bestaande
5. **Buiten werkuren**: Gevraagde tijd valt buiten 08:00-17:00

## API Configuratie

### Microsoft Graph API
```
Permissions nodig:
- Calendars.ReadWrite (delegated of application)
- User.Read.All (om monteur calendars te kunnen lezen)

Endpoints:
- GET /users/{id}/calendar/calendarView?startDateTime=X&endDateTime=Y
- POST /users/{id}/calendar/events
```

### Google Maps Distance Matrix API
```
Endpoint: https://maps.googleapis.com/maps/api/distancematrix/json
Parameters:
- origins: vorige afspraak locatie (of thuisadres)
- destinations: klant adres
- departure_time: geplande vertrektijd
- mode: driving
```

## Acceptatiecriteria

### Fase 1: Basis automatisering
- [ ] n8n workflow ontvangt webhook van app
- [ ] Workflow leest 4 monteur calendars via Microsoft Graph
- [ ] Workflow berekent reistijden via Google Maps
- [ ] Workflow selecteert beste monteur o.b.v. beschikbaarheid
- [ ] Workflow boekt afspraak in Office365 calendar
- [ ] Workflow update HubSpot deal stage

### Fase 2: Intelligente planning
- [ ] Scoring algoritme weegt reistijd, werklast, beschikbaarheid
- [ ] Eerlijke verdeling over monteurs (jobs + uren)
- [ ] Conflict detectie en handmatige escalatie
- [ ] Backoffice notificaties bij conflicten

### Fase 3: Integratie & polish
- [ ] App toont bevestigde afspraak i.p.v. alleen voorkeuren
- [ ] Klant ontvangt bevestigingsmail met monteur details
- [ ] Dashboard voor backoffice met planning overzicht
- [ ] Error handling en retry logica

## Implementatie Stappen

### Stap 1: API Setup (voorbereiding)
1. Microsoft Azure: App Registration aanmaken
   - Redirect URI configureren
   - Client secret genereren
   - Calendar permissions toekennen
2. Google Cloud: Project aanmaken
   - Distance Matrix API enablen
   - API key genereren met restricties
3. n8n: Credentials aanmaken voor beide APIs

### Stap 2: Monteur Data
1. Verzamel thuisadressen van 4 monteurs
2. Bepaal werkuren en max capaciteit per monteur
3. Configureer in n8n als Static Data

### Stap 3: n8n Workflow Basis
1. Webhook trigger node
2. Microsoft Graph nodes voor calendar reads
3. Google Maps HTTP request node
4. Basis beschikbaarheidscheck

### Stap 4: Scoring & Booking
1. Code node voor scoring algoritme
2. IF node voor auto vs manual routing
3. Calendar event creation
4. HubSpot update nodes

### Stap 5: App Integratie
1. Nieuwe endpoint `/api/schedule-request` in Express backend
2. Webhook call naar n8n vanuit Step 5 completion
3. Response handling voor directe bevestiging

### Stap 6: Backoffice Flow
1. Email/Slack notificatie bij conflicten
2. Handmatige planning interface (optioneel)
3. Override mogelijkheid voor edge cases

## Verificatie

### Testen van de workflow:
1. **Unit test**: Mock data door n8n workflow sturen
2. **Integratie test**: Echte calendar check met test account
3. **E2E test**: Volledige flow van app naar geboekte afspraak
4. **Edge cases**:
   - Alle monteurs bezet
   - Overlap met bestaande afspraken
   - Lange reistijden
   - Buiten werkuren requests

### Monitoring:
- n8n execution logs
- Google Maps API usage tracking
- Microsoft Graph API rate limits
- HubSpot API call volume

## Notities

### Huidige situatie
- Klant app bestaat en werkt (React + Express)
- Step 5 slaat voorkeuren op in HubSpot veld `datum_weken_installatie`
- Backoffice plant handmatig in Office365 calendars
- Deal wordt handmatig verplaatst in HubSpot pipeline

### Na automatisering
- Klant krijgt direct bevestiging (bij succesvolle match)
- Monteur ziet afspraak automatisch in calendar
- HubSpot deal wordt automatisch naar juiste stage verplaatst
- Backoffice handelt alleen conflicten af

### Technische risico's
- Microsoft Graph rate limits (max 10.000 requests/10 min)
- Google Maps API kosten ($5 per 1000 Distance Matrix calls)
- Calendar sync delays (tot 30 sec voor updates)

### Aanbevelingen
1. Start met 1 monteur als pilot
2. Bouw uitgebreide logging in voor debugging
3. Houd handmatige override altijd mogelijk
4. Monitor eerste 2 weken intensief

---
*Dit project gebruikt n8n voor workflow automatisering met Microsoft Graph, Google Maps en HubSpot integraties*
