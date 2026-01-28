import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

type HubSpotContact = {
  id: string;
  properties?: {
    email?: string;
    firstname?: string;
    lastname?: string;
    phone?: string;
    mobilephone?: string;
    address?: string;
    zip?: string;
    city?: string;
  };
};

type HubSpotDeal = {
  id: string;
  properties?: {
    dealname?: string;
    amount?: string;
    dealstage?: string;
    closedate?: string;
    hs_deal_stage_probability?: string;
  };
};

type HubSpotQuote = {
  id: string;
  properties?: {
    hs_title?: string;
    hs_amount?: string;
    hs_expiration_date?: string;
    hs_quote_number?: string;
    hs_deal_stage?: string;
    hs_quote_status?: string;
  };
};

type HubSpotQuoteLineItem = {
  id: string;
  properties?: {
    hs_name?: string;
    hs_description?: string;
    hs_quantity?: string;
    hs_rate?: string;
    hs_amount?: string;
  };
};

function randomSixDigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function toE164(nlNumber: string): string {
  let digits = nlNumber.replace(/[^0-9+]/g, "");
  if (digits.startsWith("00")) digits = "+" + digits.slice(2);
  if (!digits.startsWith("+")) {
    if (digits.startsWith("0")) {
      digits = "+31" + digits.slice(1);
    } else {
      digits = "+31" + digits;
    }
  }
  return digits;
}



async function findHubSpotPhoneByEmail(email: string): Promise<{ phone?: string; name?: string; address?: string; zip?: string; city?: string } | undefined> {
  // Gebruik mock mode als er geen API key is of als MOCK_VERIFICATION=true
  if (process.env.MOCK_VERIFICATION === "true" || !process.env.HUBSPOT_API_KEY) {
    return { 
      phone: "+31612345678", 
      name: "Dev User",
      address: "Voorbeeldstraat 123",
      zip: "1234 AB",
      city: "Amsterdam"
    };
  }

  const apiKey = process.env.HUBSPOT_API_KEY;

  try {
    const searchUrl = "https://api.hubapi.com/crm/v3/objects/contacts/search";
    const body = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: "email",
              operator: "EQ",
              value: email,
            },
          ],
        },
      ],
      properties: [
        "email", 
        "firstname", 
        "lastname", 
        "phone", 
        "mobilephone",
        "address",
        "zip", 
        "city"
      ],
      limit: 1,
    };

    const res = await fetch(searchUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`HubSpot API error: ${res.status} ${text}`);
      throw new Error(`HubSpot zoeken mislukt: ${res.status} - Controleer je API key en rechten`);
    }

    const json = (await res.json()) as { results?: HubSpotContact[] };
    const contact = json.results?.[0];
    
    if (!contact?.properties) {
      return undefined;
    }

    const first = contact.properties.firstname ?? "";
    const last = contact.properties.lastname ?? "";
    const selectedPhone = contact.properties.mobilephone || contact.properties.phone || undefined;
    
    return { 
      phone: selectedPhone, 
      name: `${first} ${last}`.trim(),
      address: contact.properties.address,
      zip: contact.properties.zip,
      city: contact.properties.city
    };
  } catch (error) {
    console.error("HubSpot API error:", error);
    throw error;
  }
}

async function findHubSpotQuotesByEmail(email: string): Promise<{
  deals: HubSpotDeal[];
  quotes: HubSpotQuote[];
  lineItems: HubSpotQuoteLineItem[];
} | undefined> {
  // Gebruik mock mode als er geen API key is of als MOCK_VERIFICATION=true
  if (process.env.MOCK_VERIFICATION === "true" || !process.env.HUBSPOT_API_KEY) {
    return {
      deals: [{
        id: "gewonnen-deal-mock-1",
        properties: {
          dealname: "Elektrische installatie keuken",
          amount: "2448.36",
          dealstage: "2705156301", // Gewonnen status voor testen
          closedate: "2025-11-01"
        }
      }],
      quotes: [{
        id: "mock-quote-1",
        properties: {
          hs_title: "Offerte elektrische installatie",
          hs_amount: "2448.36",
          hs_expiration_date: "2025-11-01",
          hs_quote_number: "20250803-212659251"
        }
      }],
      lineItems: [
        {
          id: "mock-line-1",
          properties: {
            hs_name: "HEP 3 fase groepenkast",
            hs_description: "10 groepen B220xH330 + installatie",
            hs_quantity: "1",
            hs_rate: "2023.44",
            hs_amount: "2023.44"
          }
        },
        {
          id: "mock-line-2",
          properties: {
            hs_name: "Inductie groep aanleg",
            hs_description: "Aanleg via kruipruimte",
            hs_quantity: "1",
            hs_rate: "150.00",
            hs_amount: "150.00"
          }
        },
        {
          id: "mock-line-3",
          properties: {
            hs_name: "4x Kabelroutes keuken",
            hs_description: "Oven, vaatwasser, Quooker, koelkast",
            hs_quantity: "1",
            hs_rate: "300.00",
            hs_amount: "300.00"
          }
        },
        {
          id: "mock-line-4",
          properties: {
            hs_name: "2x Kabelroutes wasmachine",
            hs_description: "Wasmachine en droger",
            hs_quantity: "1",
            hs_rate: "150.00",
            hs_amount: "150.00"
          }
        }
      ]
    };
  }

  const apiKey = process.env.HUBSPOT_API_KEY;
  if (!apiKey) {
    throw new Error("HUBSPOT_API_KEY ontbreekt in je .env bestand");
  }

  try {
    // 1. Zoek contact op basis van email
    const contactSearchUrl = "https://api.hubapi.com/crm/v3/objects/contacts/search";
    const contactBody = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: "email",
              operator: "EQ",
              value: email,
            },
          ],
        },
      ],
      properties: ["email", "firstname", "lastname"],
      limit: 1,
    };

    const contactRes = await fetch(contactSearchUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(contactBody),
    });

    if (!contactRes.ok) {
      const text = await contactRes.text();
      throw new Error(`HubSpot contact zoeken mislukt: ${contactRes.status} ${text}`);
    }

    const contactJson = await contactRes.json() as { results?: HubSpotContact[] };
    const contact = contactJson.results?.[0];
    
    if (!contact?.id) {
      return undefined;
    }

    // 2. Zoek deals van dit contact (offerte uitgebracht EN gewonnen)
    const dealsSearchUrl = "https://api.hubapi.com/crm/v3/objects/deals/search";
    const dealsBody = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: "associations.contact",
              operator: "EQ",
              value: contact.id,
            },
            {
              propertyName: "dealstage",
              operator: "IN",
              values: ["2705156300", "2705156301"], // offerte uitgebracht EN gewonnen
            },
          ],
        },
      ],
      properties: ["dealname", "amount", "dealstage", "closedate"],
      limit: 10,
    };

    const dealsRes = await fetch(dealsSearchUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dealsBody),
    });

    if (!dealsRes.ok) {
      const text = await dealsRes.text();
      throw new Error(`HubSpot deals zoeken mislukt: ${dealsRes.status} ${text}`);
    }

    const dealsJson = await dealsRes.json() as { results?: HubSpotDeal[] };
    const deals = dealsJson.results || [];

    // 3. Zoek line items direct van de deals (zonder quotes)
    const lineItemsSearchUrl = "https://api.hubapi.com/crm/v3/objects/line_items/search";
    
    // Alleen zoeken als er deals zijn
    if (deals.length === 0) {
      return { deals, quotes: [], lineItems: [] };
    }
    
    const lineItemsBody = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: "associations.deal",
              operator: "IN",
              values: deals.map(deal => deal.id),
            },
          ],
        },
      ],
      properties: [
        // Naam en beschrijving
        "hs_name", "hs_description", "name", "description",
        // Hoeveelheid en prijs per stuk
        "hs_quantity", "hs_rate", "quantity", "price",
        // Bedragen (netto / bruto)
        "hs_amount", "amount",
        // Korting varianten
        "hs_discount_amount", "discount_amount", "hs_discount", "discount",
        "hs_discount_percentage", "discount_percentage"
      ],
      limit: 50,
    };

    const lineItemsRes = await fetch(lineItemsSearchUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(lineItemsBody),
    });

    if (!lineItemsRes.ok) {
      const text = await lineItemsRes.text();
      throw new Error(`HubSpot line items zoeken mislukt: ${lineItemsRes.status} ${text}`);
    }

    const lineItemsJson = await lineItemsRes.json() as { results?: HubSpotQuoteLineItem[] };
    const lineItems = lineItemsJson.results || [];

    // Voor nu geen quotes, alleen deals en line items
    return { deals, quotes: [], lineItems };

  } catch (error) {
    console.error("HubSpot quotes API error:", error);
    throw error;
  }
}

async function sendWhatsappCodeViaUltraMsg(phoneE164: string, code: string): Promise<void> {
  // Gebruik mock mode als er geen UltraMsg configuratie is of als MOCK_VERIFICATION=true
  if (process.env.MOCK_VERIFICATION === "true" || !process.env.ULTRAMSG_INSTANCE_ID || !process.env.ULTRAMSG_TOKEN) {
    console.log(`[DEV MOCK] WhatsApp code ${code} naar ${phoneE164}`);
    return;
  }
  const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
  const token = process.env.ULTRAMSG_TOKEN;

  const url = `https://api.ultramsg.com/${instanceId}/messages/chat`; // chat endpoint supports plain text
  const params = {
    token,
  };
  const message = `Je verificatiecode is ${code}. Deze code verloopt over 10 minuten.`;

  const form = new URLSearchParams();
  form.append("to", phoneE164);
  form.append("body", message);

  const res = await fetch(`${url}?token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`UltraMsg send failed: ${res.status} ${text}`);
  }
  try {
    const okText = await res.text();
    console.log(`[UltraMsg] Verzonden naar ${phoneE164}: ${okText.slice(0, 120)}...`);
  } catch {
    console.log(`[UltraMsg] Verzonden naar ${phoneE164}`);
  }
}

async function updateHubSpotContactAddress(email: string, address: string, zip: string, city: string): Promise<void> {
  // Gebruik mock mode als er geen API key is of als MOCK_VERIFICATION=true
  if (process.env.MOCK_VERIFICATION === "true" || !process.env.HUBSPOT_API_KEY) {
    console.log(`[HubSpot] Mock: Adres zou bijgewerkt worden voor ${email}: ${address}, ${zip} ${city}`);
    return;
  }

  const apiKey = process.env.HUBSPOT_API_KEY;

  try {
    // Eerst zoeken naar het contact op basis van email
    const searchUrl = "https://api.hubapi.com/crm/v3/objects/contacts/search";
    const searchBody = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: "email",
              operator: "EQ",
              value: email,
            },
          ],
        },
      ],
      properties: ["email"],
      limit: 1,
    };

    const searchRes = await fetch(searchUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(searchBody),
    });

    if (!searchRes.ok) {
      const text = await searchRes.text();
      console.error(`HubSpot zoeken error: ${searchRes.status} ${text}`);
      throw new Error(`Contact zoeken mislukt: ${searchRes.status}`);
    }

    const searchJson = (await searchRes.json()) as { results?: HubSpotContact[] };
    const contact = searchJson.results?.[0];
    
    if (!contact?.id) {
      throw new Error("Contact niet gevonden");
    }

    // Update het contact met de nieuwe adresgegevens
    const updateUrl = `https://api.hubapi.com/crm/v3/objects/contacts/${contact.id}`;
    const updateBody = {
      properties: {
        address: address,
        zip: zip,
        city: city,
      },
    };

    const updateRes = await fetch(updateUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateBody),
    });

    if (!updateRes.ok) {
      const text = await updateRes.text();
      console.error(`HubSpot update error: ${updateRes.status} ${text}`);
      throw new Error(`Adres bijwerken mislukt: ${updateRes.status}`);
    }

    console.log(`[HubSpot] Adres bijgewerkt voor contact ${contact.id}`);
  } catch (error) {
    console.error("HubSpot adres update error:", error);
    throw error;
  }
}

async function updateHubSpotDealStage(dealId: string, newStage: string): Promise<void> {
  // Gebruik mock mode als er geen API key is of als MOCK_VERIFICATION=true
  if (process.env.MOCK_VERIFICATION === "true" || !process.env.HUBSPOT_API_KEY) {
    console.log(`Mock: Deal ${dealId} status bijgewerkt naar ${newStage}`);
    return;
  }

  const apiKey = process.env.HUBSPOT_API_KEY;
  if (!apiKey) {
    throw new Error("HUBSPOT_API_KEY ontbreekt in je .env bestand");
  }

  try {
    const updateUrl = `https://api.hubapi.com/crm/v3/objects/deals/${dealId}`;
    const body = {
      properties: {
        dealstage: newStage
      }
    };

    const res = await fetch(updateUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`HubSpot API error response:`, text);
      
      // Probeer de fout te parsen als JSON
      try {
        const errorJson = JSON.parse(text);
        throw new Error(`HubSpot deal update mislukt: ${res.status} - ${errorJson.message || errorJson.status || 'Onbekende fout'}`);
      } catch {
        // Als het geen JSON is, gebruik de ruwe tekst
        throw new Error(`HubSpot deal update mislukt: ${res.status} - ${text.substring(0, 200)}`);
      }
    }

    console.log(`Deal ${dealId} status succesvol bijgewerkt naar ${newStage}`);
  } catch (error) {
    console.error("Error updating HubSpot deal stage:", error);
    throw error;
  }
}

// Helper functions for schedule-request endpoint
function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const startMinutes = hours * 60 + minutes;
  const endMinutes = startMinutes + durationMinutes;
  const endHours = Math.floor(endMinutes / 60);
  const endMins = endMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
}

function generateMockAlternatives(preferences: Array<{ date: string; timeSlot: string; period?: string }>) {
  // Generate 3 alternative slots near the requested dates
  const alternatives = [];
  const mockMonteurs = [
    { id: "mock-monteur-1", naam: "Jan van der Berg" },
    { id: "mock-monteur-2", naam: "Piet Jansen" },
    { id: "mock-monteur-3", naam: "Klaas de Vries" },
  ];

  const baseDate = preferences[0]?.date ? new Date(preferences[0].date) : new Date();
  const timeSlots = ['09:00', '10:00', '14:00'];

  for (let i = 0; i < 3; i++) {
    const altDate = new Date(baseDate);
    altDate.setDate(altDate.getDate() + i + 1);

    alternatives.push({
      date: altDate.toISOString().split('T')[0],
      timeSlot: timeSlots[i % timeSlots.length],
      period: parseInt(timeSlots[i % timeSlots.length].split(':')[0]) < 12 ? 'ochtend' : 'middag',
      monteur: mockMonteurs[i % mockMonteurs.length],
      score: 85 - (i * 5)
    });
  }

  return alternatives;
}

async function updateHubSpotDealInstallationDates(dealId: string, installationDates: string[]): Promise<void> {
  // Gebruik mock mode als er geen API key is of als MOCK_VERIFICATION=true
  if (process.env.MOCK_VERIFICATION === "true" || !process.env.HUBSPOT_API_KEY) {
    console.log(`Mock: Deal ${dealId} installatie datums bijgewerkt: ${installationDates.join(', ')}`);
    return;
  }

  const apiKey = process.env.HUBSPOT_API_KEY;
  if (!apiKey) {
    throw new Error("HUBSPOT_API_KEY ontbreekt in je .env bestand");
  }

  try {
    const updateUrl = `https://api.hubapi.com/crm/v3/objects/deals/${dealId}`;
    
    // Format de datums in het gewenste formaat: DD-MM-YYYY HH:MM
    const formattedDates = installationDates.map(dateStr => {
      const date = new Date(dateStr);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${day}-${month}-${year} ${hours}:${minutes}`;
    });

    const body = {
      properties: {
        datum_weken_installatie: formattedDates.join(', ')
      }
    };

    const res = await fetch(updateUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`HubSpot API error response:`, text);
      
      // Probeer de fout te parsen als JSON
      try {
        const errorJson = JSON.parse(text);
        throw new Error(`HubSpot deal installatie datums update mislukt: ${res.status} - ${errorJson.message || errorJson.status || 'Onbekende fout'}`);
      } catch {
        // Als het geen JSON is, gebruik de ruwe tekst
        throw new Error(`HubSpot deal installatie datums update mislukt: ${res.status} - ${text.substring(0, 200)}`);
      }
    }

    console.log(`Deal ${dealId} installatie datums succesvol bijgewerkt: ${formattedDates.join(', ')}`);
  } catch (error) {
    console.error("Error updating HubSpot deal installation dates:", error);
    throw error;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  // start verification: POST /api/verify/start { email }
  app.post("/api/verify/start", async (req: Request, res: Response) => {
    try {
      const email = (req.body?.email as string | undefined)?.trim().toLowerCase();
      if (!email) return res.status(400).json({ message: "email verplicht" });

      const found = await findHubSpotPhoneByEmail(email);
      if (!found?.phone) {
        return res.status(404).json({ message: "Geen telefoonnummer gevonden voor dit emailadres" });
      }

      const phoneE164 = toE164(found.phone);
      const code = randomSixDigitCode();
      const expiresAtMs = Date.now() + 10 * 60 * 1000;

      await storage.setVerification({
        email,
        phoneNumber: phoneE164,
        code,
        expiresAtMs,
        attempts: 0,
        lastSentAtMs: Date.now(),
        verified: false,
      });

      await sendWhatsappCodeViaUltraMsg(phoneE164, code);

      return res.json({ 
        ok: true, 
        maskedPhone: phoneE164, // Volledig telefoonnummer zonder maskering
        fullPhone: found.phone, // Volledig telefoonnummer voor weergave
        contactName: found.name ?? null,
        contactInfo: {
          address: found.address,
          zip: found.zip,
          city: found.city
        }
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message ?? "Interne fout" });
    }
  });

  // confirm verification: POST /api/verify/confirm { email, code }
  app.post("/api/verify/confirm", async (req: Request, res: Response) => {
    try {
      const email = (req.body?.email as string | undefined)?.trim().toLowerCase();
      const code = (req.body?.code as string | undefined)?.trim();
      if (!email || !code) return res.status(400).json({ message: "email en code verplicht" });

      const record = await storage.getVerification(email);
      if (!record) return res.status(400).json({ message: "Geen actieve verificatie" });
      if (record.verified) return res.json({ ok: true });
      if (Date.now() > record.expiresAtMs) {
        await storage.deleteVerification(email);
        return res.status(400).json({ message: "Code verlopen" });
      }
      if (record.attempts >= 5) {
        await storage.deleteVerification(email);
        return res.status(429).json({ message: "Te veel pogingen" });
      }
      if (record.code !== code) {
        record.attempts += 1;
        await storage.setVerification(record);
        return res.status(401).json({ message: "Ongeldige code" });
      }

      record.verified = true;
      await storage.setVerification(record);
      return res.json({ ok: true, phoneNumber: record.phoneNumber });
    } catch (err: any) {
      return res.status(500).json({ message: err.message ?? "Interne fout" });
    }
  });

  // resend verification: POST /api/verify/resend { email, phone? }
  app.post("/api/verify/resend", async (req: Request, res: Response) => {
    try {
      const email = (req.body?.email as string | undefined)?.trim().toLowerCase();
      const phoneRaw = (req.body?.phone as string | undefined)?.trim();
      if (!email) return res.status(400).json({ message: "email verplicht" });

      const record = await storage.getVerification(email);
      if (!record) return res.status(400).json({ message: "Geen actieve verificatie" });

      const code = randomSixDigitCode();
      record.code = code;
      record.expiresAtMs = Date.now() + 10 * 60 * 1000;
      record.attempts = 0;
      record.verified = false;
      if (phoneRaw) {
        record.phoneNumber = toE164(phoneRaw);
      }
      await storage.setVerification(record);

      await sendWhatsappCodeViaUltraMsg(record.phoneNumber, code);

      return res.json({ ok: true, maskedPhone: record.phoneNumber });
    } catch (err: any) {
      return res.status(500).json({ message: err.message ?? "Interne fout" });
    }
  });

  // test HubSpot object types: GET /api/test-hubspot-objects
  app.get("/api/test-hubspot-objects", async (req: Request, res: Response) => {
    try {
      const apiKey = process.env.HUBSPOT_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "HUBSPOT_API_KEY ontbreekt" });
      }

      // Test verschillende mogelijke object type namen
      const possibleObjectTypes = [
        "quote_line_items",
        "quote_line_item", 
        "quotelineitems",
        "quotelineitem",
        "line_items",
        "line_item",
        "quoteitems",
        "quoteitem"
      ];

      const results: Record<string, any> = {};

      for (const objectType of possibleObjectTypes) {
        try {
          const url = `https://api.hubapi.com/crm/v3/objects/${objectType}`;
          const response = await fetch(url, {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
          });

          if (response.ok) {
            const data = await response.json();
            results[objectType] = {
              status: "success",
              data: {
                name: data.name,
                labels: data.labels,
                properties: data.properties?.slice(0, 5) // Eerste 5 properties
              }
            };
          } else {
            results[objectType] = {
              status: "error",
              statusCode: response.status,
              message: await response.text()
            };
          }
        } catch (error) {
          results[objectType] = {
            status: "error",
            message: error instanceof Error ? error.message : "Onbekende fout"
          };
        }
      }

      return res.json({ 
        ok: true, 
        results,
        message: "Test van verschillende HubSpot object type namen"
      });
    } catch (err: any) {
      return res.status(500).json({ 
        ok: false, 
        message: err.message ?? "Interne fout",
        results: {}
      });
    }
  });

  // test HubSpot deal properties: GET /api/test-deal-properties
  app.get("/api/test-deal-properties", async (req: Request, res: Response) => {
    try {
      const apiKey = process.env.HUBSPOT_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "HUBSPOT_API_KEY ontbreekt" });
      }

      // Test of we de datum_weken_installatie property kunnen bijwerken
      const testDealId = req.query.dealId as string;
      if (!testDealId) {
        return res.status(400).json({ message: "dealId query parameter is verplicht" });
      }

      // Test de datum_weken_installatie property update
      const testDates = [
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // morgen
        new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // overmorgen
      ];

      await updateHubSpotDealInstallationDates(testDealId, testDates);

      return res.json({ 
        ok: true, 
        message: "Test datum_weken_installatie property update succesvol",
        testDates: testDates,
        dealId: testDealId
      });
    } catch (err: any) {
      return res.status(500).json({ 
        ok: false, 
        message: err.message ?? "Interne fout bij testen deal properties"
      });
    }
  });

  // update contact address: POST /api/update-address { email, address, zip, city }
  app.post("/api/update-address", async (req: Request, res: Response) => {
    try {
      const email = (req.body?.email as string | undefined)?.trim().toLowerCase();
      const address = (req.body?.address as string | undefined)?.trim();
      const zip = (req.body?.zip as string | undefined)?.trim();
      const city = (req.body?.city as string | undefined)?.trim();

      if (!email || !address || !zip || !city) {
        return res.status(400).json({ message: "email, address, zip en city zijn verplicht" });
      }

      await updateHubSpotContactAddress(email, address, zip, city);
      
      return res.json({ 
        ok: true, 
        message: "Adres succesvol bijgewerkt in HubSpot"
      });
    } catch (err: any) {
      console.error("Update address API error:", err);
      return res.status(500).json({ 
        ok: false, 
        message: err.message ?? "Interne fout bij bijwerken adres"
      });
    }
  });

  // get quotes: GET /api/quotes { email }
  app.get("/api/quotes", async (req: Request, res: Response) => {
    try {
      const email = (req.query?.email as string | undefined)?.trim().toLowerCase();
      if (!email) return res.status(400).json({ message: "email parameter verplicht" });

      const quotes = await findHubSpotQuotesByEmail(email);
      
      // Stuur altijd een response, ook als er geen quotes zijn
      return res.json({ 
        ok: true, 
        quotes: quotes?.quotes || [],
        deals: quotes?.deals || [],
        lineItems: quotes?.lineItems || []
      });
    } catch (err: any) {
      console.error("Quotes API error:", err);
      // Stuur een lege response in plaats van een error
      return res.json({ 
        ok: false, 
        quotes: [],
        deals: [],
        lineItems: [],
        error: err.message
      });
    }
  });

  // accept quote: POST /api/accept-quote { email, dealId }
  app.post("/api/accept-quote", async (req: Request, res: Response) => {
    try {
      const email = (req.body?.email as string | undefined)?.trim().toLowerCase();
      const dealId = (req.body?.dealId as string | undefined)?.trim();
      
      if (!email || !dealId) {
        return res.status(400).json({ message: "email en dealId zijn verplicht" });
      }

      // Update deal status naar "Gewonnen" (id = 2705156301)
      await updateHubSpotDealStage(dealId, "2705156301");
      
      return res.json({ 
        ok: true, 
        message: "Offerte succesvol geaccepteerd en deal status bijgewerkt"
      });
    } catch (err: any) {
      console.error("Accept quote API error:", err);
      return res.status(500).json({ 
        ok: false, 
        message: err.message ?? "Interne fout bij accepteren offerte"
      });
    }
  });

  // update deal stage: POST /api/update-deal-stage { email, dealId, stageId }
  app.post("/api/update-deal-stage", async (req: Request, res: Response) => {
    try {
      const email = (req.body?.email as string | undefined)?.trim().toLowerCase();
      const dealId = (req.body?.dealId as string | undefined)?.trim();
      const stageId = (req.body?.stageId as string | undefined)?.trim();
      
      if (!email || !dealId || !stageId) {
        return res.status(400).json({ message: "email, dealId en stageId zijn verplicht" });
      }

      // Update deal status naar de opgegeven stage
      await updateHubSpotDealStage(dealId, stageId);
      
      return res.json({ 
        ok: true, 
        message: "Deal status succesvol bijgewerkt"
      });
    } catch (err: any) {
      console.error("Update deal stage API error:", err);
      return res.status(500).json({ 
        ok: false, 
        message: err.message ?? "Interne fout bij bijwerken deal status"
      });
    }
  });

  // update deal installation dates: POST /api/update-installation-dates { dealId, installationDates }
  app.post("/api/update-installation-dates", async (req: Request, res: Response) => {
    try {
      const dealId = (req.body?.dealId as string | undefined)?.trim();
      const installationDates = req.body?.installationDates as string[] | undefined;

      if (!dealId || !installationDates || !Array.isArray(installationDates)) {
        return res.status(400).json({ message: "dealId en installationDates array zijn verplicht" });
      }

      // Update de installatie datums in HubSpot
      await updateHubSpotDealInstallationDates(dealId, installationDates);

      return res.json({
        ok: true,
        message: "Installatie datums succesvol bijgewerkt in HubSpot"
      });
    } catch (err: any) {
      console.error("Update installation dates API error:", err);
      return res.status(500).json({
        ok: false,
        message: err.message ?? "Interne fout bij bijwerken installatie datums"
      });
    }
  });

  // Schedule appointment request: POST /api/schedule-request
  // This endpoint calls the n8n workflow to find the best appointment slot
  app.post("/api/schedule-request", async (req: Request, res: Response) => {
    try {
      const dealId = (req.body?.dealId as string | undefined)?.trim();
      const contactEmail = (req.body?.contactEmail as string | undefined)?.trim().toLowerCase();
      const customerAddress = (req.body?.customerAddress as string | undefined)?.trim() || 'Adres niet beschikbaar';
      const preferences = req.body?.preferences as Array<{
        date: string;
        timeSlot: string;
        period?: string;
      }> | undefined;

      console.log('[Schedule] Received request:', { dealId, contactEmail, customerAddress, preferencesCount: preferences?.length });

      if (!dealId || !contactEmail || !preferences || preferences.length === 0) {
        console.log('[Schedule] Validation failed:', { dealId: !!dealId, contactEmail: !!contactEmail, preferences: preferences?.length });
        return res.status(400).json({
          ok: false,
          message: "dealId, contactEmail en preferences zijn verplicht"
        });
      }

      // Check if n8n webhook URL is configured
      const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;

      // Use mock mode if no n8n webhook URL is configured or MOCK_VERIFICATION=true
      if (process.env.MOCK_VERIFICATION === "true" || !n8nWebhookUrl) {
        console.log(`[Schedule] Mock mode: Planning request for deal ${dealId}`);
        console.log(`[Schedule] Preferences:`, JSON.stringify(preferences));

        // Simulate a successful booking (first preference)
        const firstPref = preferences[0];
        const mockMonteur = {
          id: "mock-monteur-1",
          naam: "Jan van der Berg",
          email: "jan@hollandelectric.nl"
        };

        // For testing: always return success in mock mode
        // Change to Math.random() > 0.3 for 70% success rate
        const isSuccess = true;

        if (isSuccess) {
          const response = {
            ok: true,
            status: "success",
            confirmedAppointment: {
              date: firstPref.date,
              timeSlot: firstPref.timeSlot,
              period: firstPref.period || "ochtend",
              monteur: mockMonteur,
              endTime: calculateEndTime(firstPref.timeSlot, 180) // 3 uur default
            },
            message: "Afspraak succesvol ingepland"
          };
          console.log(`[Schedule] Mock success response:`, JSON.stringify(response));
          return res.json(response);
        } else {
          // Return alternatives
          const alternatives = generateMockAlternatives(preferences);
          const response = {
            ok: true,
            status: "alternatives",
            alternatives,
            message: "Geen exacte match gevonden, kies een alternatief"
          };
          console.log(`[Schedule] Mock alternatives response:`, JSON.stringify(response));
          return res.json(response);
        }
      }

      // Call the n8n workflow webhook
      console.log(`[Schedule] Calling n8n webhook for deal ${dealId}`);

      const webhookPayload = {
        dealId,
        contactEmail,
        customerAddress,
        preferences: preferences.map(p => ({
          date: p.date,
          timeSlot: p.timeSlot,
          period: p.period || (parseInt(p.timeSlot.split(':')[0]) < 12 ? 'ochtend' : 'middag')
        }))
      };

      const webhookRes = await fetch(n8nWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookPayload),
      });

      if (!webhookRes.ok) {
        const errorText = await webhookRes.text();
        console.error(`[Schedule] n8n webhook error: ${webhookRes.status} ${errorText}`);

        // Return manual review status if webhook fails
        return res.json({
          ok: true,
          status: "manual",
          message: "We konden de planning niet automatisch verwerken. Ons team neemt binnen 24 uur contact met je op."
        });
      }

      const webhookResult = await webhookRes.json();
      console.log(`[Schedule] n8n webhook result:`, webhookResult);

      // Transform n8n response to frontend format
      // n8n V2 returns: { status: "suggestions", suggestions: [...] } or { status: "manual", message: "..." }
      // n8n V1 returns: { success: true, booking: {...} } or { success: false, hasAlternatives: true, alternatives: [...] }

      // Handle V2 format (new 2-phase flow)
      if (webhookResult.status === 'suggestions' && webhookResult.suggestions) {
        return res.json({
          ok: true,
          status: 'suggestions',
          suggestions: webhookResult.suggestions,
          message: webhookResult.message,
          deal: webhookResult.deal,
          installatieDuurMinuten: webhookResult.installatieDuurMinuten
        });
      }

      // Handle V2 manual status
      if (webhookResult.status === 'manual') {
        return res.json({
          ok: true,
          status: 'manual',
          message: webhookResult.message || 'Ons team neemt binnen 24 uur contact met je op.'
        });
      }

      // Handle legacy V1 format for backwards compatibility
      if (webhookResult.success === true && webhookResult.booking) {
        return res.json({
          ok: true,
          status: 'success',
          confirmedAppointment: {
            date: webhookResult.booking.date,
            timeSlot: webhookResult.booking.time,
            endTime: webhookResult.booking.endTime,
            period: parseInt(webhookResult.booking.time?.split(':')[0]) < 12 ? 'ochtend' : 'middag',
            monteur: {
              id: 'legacy',
              naam: webhookResult.booking.monteur
            }
          }
        });
      }

      if (webhookResult.success === false && webhookResult.hasAlternatives && webhookResult.alternatives) {
        return res.json({
          ok: true,
          status: 'alternatives',
          alternatives: webhookResult.alternatives.map((alt: any) => ({
            date: alt.date,
            timeSlot: alt.time,
            period: parseInt(alt.time?.split(':')[0]) < 12 ? 'ochtend' : 'middag',
            monteur: {
              id: alt.monteurId || 'unknown',
              naam: alt.monteur
            }
          }))
        });
      }

      // Fallback - return as-is with ok flag
      return res.json({
        ok: true,
        ...webhookResult
      });

    } catch (err: any) {
      console.error("Schedule request API error:", err);

      // Return manual review status on error
      return res.json({
        ok: true,
        status: "manual",
        message: "Er is een fout opgetreden. Ons team neemt binnen 24 uur contact met je op."
      });
    }
  });

  // Confirm appointment (2-phase flow): POST /api/confirm-alternative
  // Also used for confirming the selected suggestion from phase 1
  // Or for requesting manual contact when contactMe=true
  app.post("/api/confirm-alternative", async (req: Request, res: Response) => {
    try {
      const dealId = (req.body?.dealId as string | undefined)?.trim();
      const contactEmail = (req.body?.contactEmail as string | undefined)?.trim();
      const customerAddress = (req.body?.customerAddress as string | undefined)?.trim();
      const contactMe = req.body?.contactMe as boolean | undefined;
      const preferences = req.body?.preferences as Array<{date: string; timeSlot: string}> | undefined;
      const selectedSlot = req.body?.selectedSlot as {
        date: string;
        timeSlot: string;
        monteurId: string;
        period?: string;
        calendarId?: string;
        endTime?: string;
      } | undefined;
      const installatieDuurMinuten = req.body?.installatieDuurMinuten as number | undefined;

      // Allow either selectedSlot OR contactMe
      if (!dealId || (!selectedSlot && !contactMe)) {
        return res.status(400).json({ ok: false, message: "dealId en (selectedSlot of contactMe) zijn verplicht" });
      }

      // Use the confirm webhook URL (separate endpoint in n8n V2)
      const n8nConfirmUrl = process.env.N8N_CONFIRM_WEBHOOK_URL;
      const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;

      // Use mock mode if no n8n webhook URL is configured or MOCK_VERIFICATION=true
      if (process.env.MOCK_VERIFICATION === "true" || (!n8nConfirmUrl && !n8nWebhookUrl)) {
        console.log(`[Confirm] Mock mode: ${contactMe ? 'Manual contact request' : 'Confirming appointment'} for deal ${dealId}`);

        if (contactMe) {
          console.log(`[Confirm] Mock manual mode - preferences:`, preferences);
          return res.json({
            ok: true,
            status: "manual_confirmed",
            message: "Uw verzoek is ontvangen. Ons team neemt contact met u op."
          });
        }

        console.log(`[Confirm] Selected slot:`, selectedSlot);

        // Simulate booking delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        return res.json({
          ok: true,
          status: "success",
          confirmedAppointment: {
            date: selectedSlot!.date,
            timeSlot: selectedSlot!.timeSlot,
            endTime: selectedSlot!.endTime || calculateEndTime(selectedSlot!.timeSlot, installatieDuurMinuten || 180),
            period: selectedSlot!.period || (parseInt(selectedSlot!.timeSlot.split(':')[0]) < 12 ? 'ochtend' : 'middag'),
            monteur: {
              id: selectedSlot!.monteurId,
              naam: "Jan van der Berg"
            }
          },
          message: "Afspraak succesvol ingepland!"
        });
      }

      // Determine which webhook to call
      const webhookUrl = n8nConfirmUrl || n8nWebhookUrl;
      console.log(`[Confirm] Calling n8n confirm webhook for deal ${dealId} (contactMe: ${contactMe})`);

      // Build the confirm payload for n8n V2
      const confirmPayload = contactMe ? {
        dealId,
        contactEmail: contactEmail || '',
        customerAddress: customerAddress || '',
        contactMe: true,
        preferences: preferences || []
      } : {
        dealId,
        contactEmail: contactEmail || '',
        customerAddress: customerAddress || '',
        confirmedSlot: {
          date: selectedSlot!.date,
          timeSlot: selectedSlot!.timeSlot,
          monteurId: selectedSlot!.monteurId,
          period: selectedSlot!.period,
          calendarId: selectedSlot!.calendarId
        },
        installatieDuurMinuten: installatieDuurMinuten || 180
      };

      console.log(`[Confirm] Payload:`, JSON.stringify(confirmPayload));

      const confirmRes = await fetch(webhookUrl!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(confirmPayload),
      });

      if (!confirmRes.ok) {
        const errorText = await confirmRes.text();
        console.error(`[Confirm] n8n webhook error: ${confirmRes.status} ${errorText}`);
        throw new Error("Bevestiging mislukt");
      }

      const confirmResult = await confirmRes.json();
      console.log(`[Confirm] n8n result:`, confirmResult);

      // Transform response to frontend format if needed
      if (confirmResult.status === 'success' && confirmResult.confirmedAppointment) {
        return res.json({
          ok: true,
          status: 'success',
          confirmedAppointment: confirmResult.confirmedAppointment,
          message: confirmResult.message || 'Afspraak succesvol ingepland!'
        });
      }

      // Return as-is if already in correct format
      return res.json({
        ok: true,
        ...confirmResult
      });

    } catch (err: any) {
      console.error("Confirm appointment API error:", err);
      return res.status(500).json({
        ok: false,
        message: err.message ?? "Interne fout bij bevestigen afspraak"
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
