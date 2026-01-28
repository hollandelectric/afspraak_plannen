// server/index.ts
import "dotenv/config";
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
var MemStorage = class {
  users;
  currentId;
  verifications;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.currentId = 1;
    this.verifications = /* @__PURE__ */ new Map();
  }
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async createUser(insertUser) {
    const id = this.currentId++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  async setVerification(record) {
    this.verifications.set(record.email.toLowerCase(), record);
  }
  async getVerification(email) {
    return this.verifications.get(email.toLowerCase());
  }
  async deleteVerification(email) {
    this.verifications.delete(email.toLowerCase());
  }
};
var storage = new MemStorage();

// server/routes.ts
function randomSixDigitCode() {
  return Math.floor(1e5 + Math.random() * 9e5).toString();
}
function toE164(nlNumber) {
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
async function findHubSpotPhoneByEmail(email) {
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
              value: email
            }
          ]
        }
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
      limit: 1
    };
    const res = await fetch(searchUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`HubSpot API error: ${res.status} ${text}`);
      throw new Error(`HubSpot zoeken mislukt: ${res.status} - Controleer je API key en rechten`);
    }
    const json = await res.json();
    const contact = json.results?.[0];
    if (!contact?.properties) {
      return void 0;
    }
    const first = contact.properties.firstname ?? "";
    const last = contact.properties.lastname ?? "";
    const selectedPhone = contact.properties.mobilephone || contact.properties.phone || void 0;
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
async function findHubSpotQuotesByEmail(email) {
  if (process.env.MOCK_VERIFICATION === "true" || !process.env.HUBSPOT_API_KEY) {
    return {
      deals: [{
        id: "gewonnen-deal-mock-1",
        properties: {
          dealname: "Elektrische installatie keuken",
          amount: "2448.36",
          dealstage: "2705156301",
          // Gewonnen status voor testen
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
    const contactSearchUrl = "https://api.hubapi.com/crm/v3/objects/contacts/search";
    const contactBody = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: "email",
              operator: "EQ",
              value: email
            }
          ]
        }
      ],
      properties: ["email", "firstname", "lastname"],
      limit: 1
    };
    const contactRes = await fetch(contactSearchUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(contactBody)
    });
    if (!contactRes.ok) {
      const text = await contactRes.text();
      throw new Error(`HubSpot contact zoeken mislukt: ${contactRes.status} ${text}`);
    }
    const contactJson = await contactRes.json();
    const contact = contactJson.results?.[0];
    if (!contact?.id) {
      return void 0;
    }
    const dealsSearchUrl = "https://api.hubapi.com/crm/v3/objects/deals/search";
    const dealsBody = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: "associations.contact",
              operator: "EQ",
              value: contact.id
            },
            {
              propertyName: "dealstage",
              operator: "IN",
              values: ["2705156300", "2705156301"]
              // offerte uitgebracht EN gewonnen
            }
          ]
        }
      ],
      properties: ["dealname", "amount", "dealstage", "closedate"],
      limit: 10
    };
    const dealsRes = await fetch(dealsSearchUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(dealsBody)
    });
    if (!dealsRes.ok) {
      const text = await dealsRes.text();
      throw new Error(`HubSpot deals zoeken mislukt: ${dealsRes.status} ${text}`);
    }
    const dealsJson = await dealsRes.json();
    const deals = dealsJson.results || [];
    const lineItemsSearchUrl = "https://api.hubapi.com/crm/v3/objects/line_items/search";
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
              values: deals.map((deal) => deal.id)
            }
          ]
        }
      ],
      properties: [
        // Naam en beschrijving
        "hs_name",
        "hs_description",
        "name",
        "description",
        // Hoeveelheid en prijs per stuk
        "hs_quantity",
        "hs_rate",
        "quantity",
        "price",
        // Bedragen (netto / bruto)
        "hs_amount",
        "amount",
        // Korting varianten
        "hs_discount_amount",
        "discount_amount",
        "hs_discount",
        "discount",
        "hs_discount_percentage",
        "discount_percentage"
      ],
      limit: 50
    };
    const lineItemsRes = await fetch(lineItemsSearchUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(lineItemsBody)
    });
    if (!lineItemsRes.ok) {
      const text = await lineItemsRes.text();
      throw new Error(`HubSpot line items zoeken mislukt: ${lineItemsRes.status} ${text}`);
    }
    const lineItemsJson = await lineItemsRes.json();
    const lineItems = lineItemsJson.results || [];
    return { deals, quotes: [], lineItems };
  } catch (error) {
    console.error("HubSpot quotes API error:", error);
    throw error;
  }
}
async function sendWhatsappCodeViaUltraMsg(phoneE164, code) {
  if (process.env.MOCK_VERIFICATION === "true" || !process.env.ULTRAMSG_INSTANCE_ID || !process.env.ULTRAMSG_TOKEN) {
    console.log(`[DEV MOCK] WhatsApp code ${code} naar ${phoneE164}`);
    return;
  }
  const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
  const token = process.env.ULTRAMSG_TOKEN;
  const url = `https://api.ultramsg.com/${instanceId}/messages/chat`;
  const params = {
    token
  };
  const message = `Je verificatiecode is ${code}. Deze code verloopt over 10 minuten.`;
  const form = new URLSearchParams();
  form.append("to", phoneE164);
  form.append("body", message);
  const res = await fetch(`${url}?token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString()
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
async function updateHubSpotContactAddress(email, address, zip, city) {
  if (process.env.MOCK_VERIFICATION === "true" || !process.env.HUBSPOT_API_KEY) {
    console.log(`[HubSpot] Mock: Adres zou bijgewerkt worden voor ${email}: ${address}, ${zip} ${city}`);
    return;
  }
  const apiKey = process.env.HUBSPOT_API_KEY;
  try {
    const searchUrl = "https://api.hubapi.com/crm/v3/objects/contacts/search";
    const searchBody = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: "email",
              operator: "EQ",
              value: email
            }
          ]
        }
      ],
      properties: ["email"],
      limit: 1
    };
    const searchRes = await fetch(searchUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(searchBody)
    });
    if (!searchRes.ok) {
      const text = await searchRes.text();
      console.error(`HubSpot zoeken error: ${searchRes.status} ${text}`);
      throw new Error(`Contact zoeken mislukt: ${searchRes.status}`);
    }
    const searchJson = await searchRes.json();
    const contact = searchJson.results?.[0];
    if (!contact?.id) {
      throw new Error("Contact niet gevonden");
    }
    const updateUrl = `https://api.hubapi.com/crm/v3/objects/contacts/${contact.id}`;
    const updateBody = {
      properties: {
        address,
        zip,
        city
      }
    };
    const updateRes = await fetch(updateUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(updateBody)
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
async function updateHubSpotDealStage(dealId, newStage) {
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
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`HubSpot API error response:`, text);
      try {
        const errorJson = JSON.parse(text);
        throw new Error(`HubSpot deal update mislukt: ${res.status} - ${errorJson.message || errorJson.status || "Onbekende fout"}`);
      } catch {
        throw new Error(`HubSpot deal update mislukt: ${res.status} - ${text.substring(0, 200)}`);
      }
    }
    console.log(`Deal ${dealId} status succesvol bijgewerkt naar ${newStage}`);
  } catch (error) {
    console.error("Error updating HubSpot deal stage:", error);
    throw error;
  }
}
async function updateHubSpotDealInstallationDates(dealId, installationDates) {
  if (process.env.MOCK_VERIFICATION === "true" || !process.env.HUBSPOT_API_KEY) {
    console.log(`Mock: Deal ${dealId} installatie datums bijgewerkt: ${installationDates.join(", ")}`);
    return;
  }
  const apiKey = process.env.HUBSPOT_API_KEY;
  if (!apiKey) {
    throw new Error("HUBSPOT_API_KEY ontbreekt in je .env bestand");
  }
  try {
    const updateUrl = `https://api.hubapi.com/crm/v3/objects/deals/${dealId}`;
    const formattedDates = installationDates.map((dateStr) => {
      const date = new Date(dateStr);
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      return `${day}-${month}-${year} ${hours}:${minutes}`;
    });
    const body = {
      properties: {
        datum_weken_installatie: formattedDates.join(", ")
      }
    };
    const res = await fetch(updateUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`HubSpot API error response:`, text);
      try {
        const errorJson = JSON.parse(text);
        throw new Error(`HubSpot deal installatie datums update mislukt: ${res.status} - ${errorJson.message || errorJson.status || "Onbekende fout"}`);
      } catch {
        throw new Error(`HubSpot deal installatie datums update mislukt: ${res.status} - ${text.substring(0, 200)}`);
      }
    }
    console.log(`Deal ${dealId} installatie datums succesvol bijgewerkt: ${formattedDates.join(", ")}`);
  } catch (error) {
    console.error("Error updating HubSpot deal installation dates:", error);
    throw error;
  }
}
async function registerRoutes(app2) {
  app2.post("/api/verify/start", async (req, res) => {
    try {
      const email = req.body?.email?.trim().toLowerCase();
      if (!email) return res.status(400).json({ message: "email verplicht" });
      const found = await findHubSpotPhoneByEmail(email);
      if (!found?.phone) {
        return res.status(404).json({ message: "Geen telefoonnummer gevonden voor dit emailadres" });
      }
      const phoneE164 = toE164(found.phone);
      const code = randomSixDigitCode();
      const expiresAtMs = Date.now() + 10 * 60 * 1e3;
      await storage.setVerification({
        email,
        phoneNumber: phoneE164,
        code,
        expiresAtMs,
        attempts: 0,
        lastSentAtMs: Date.now(),
        verified: false
      });
      await sendWhatsappCodeViaUltraMsg(phoneE164, code);
      return res.json({
        ok: true,
        maskedPhone: phoneE164,
        // Volledig telefoonnummer zonder maskering
        fullPhone: found.phone,
        // Volledig telefoonnummer voor weergave
        contactName: found.name ?? null,
        contactInfo: {
          address: found.address,
          zip: found.zip,
          city: found.city
        }
      });
    } catch (err) {
      return res.status(500).json({ message: err.message ?? "Interne fout" });
    }
  });
  app2.post("/api/verify/confirm", async (req, res) => {
    try {
      const email = req.body?.email?.trim().toLowerCase();
      const code = req.body?.code?.trim();
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
    } catch (err) {
      return res.status(500).json({ message: err.message ?? "Interne fout" });
    }
  });
  app2.post("/api/verify/resend", async (req, res) => {
    try {
      const email = req.body?.email?.trim().toLowerCase();
      const phoneRaw = req.body?.phone?.trim();
      if (!email) return res.status(400).json({ message: "email verplicht" });
      const record = await storage.getVerification(email);
      if (!record) return res.status(400).json({ message: "Geen actieve verificatie" });
      const code = randomSixDigitCode();
      record.code = code;
      record.expiresAtMs = Date.now() + 10 * 60 * 1e3;
      record.attempts = 0;
      record.verified = false;
      if (phoneRaw) {
        record.phoneNumber = toE164(phoneRaw);
      }
      await storage.setVerification(record);
      await sendWhatsappCodeViaUltraMsg(record.phoneNumber, code);
      return res.json({ ok: true, maskedPhone: record.phoneNumber });
    } catch (err) {
      return res.status(500).json({ message: err.message ?? "Interne fout" });
    }
  });
  app2.get("/api/test-hubspot-objects", async (req, res) => {
    try {
      const apiKey = process.env.HUBSPOT_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "HUBSPOT_API_KEY ontbreekt" });
      }
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
      const results = {};
      for (const objectType of possibleObjectTypes) {
        try {
          const url = `https://api.hubapi.com/crm/v3/objects/${objectType}`;
          const response = await fetch(url, {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json"
            }
          });
          if (response.ok) {
            const data = await response.json();
            results[objectType] = {
              status: "success",
              data: {
                name: data.name,
                labels: data.labels,
                properties: data.properties?.slice(0, 5)
                // Eerste 5 properties
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
    } catch (err) {
      return res.status(500).json({
        ok: false,
        message: err.message ?? "Interne fout",
        results: {}
      });
    }
  });
  app2.get("/api/test-deal-properties", async (req, res) => {
    try {
      const apiKey = process.env.HUBSPOT_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "HUBSPOT_API_KEY ontbreekt" });
      }
      const testDealId = req.query.dealId;
      if (!testDealId) {
        return res.status(400).json({ message: "dealId query parameter is verplicht" });
      }
      const testDates = [
        new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString(),
        // morgen
        new Date(Date.now() + 2 * 24 * 60 * 60 * 1e3).toISOString()
        // overmorgen
      ];
      await updateHubSpotDealInstallationDates(testDealId, testDates);
      return res.json({
        ok: true,
        message: "Test datum_weken_installatie property update succesvol",
        testDates,
        dealId: testDealId
      });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        message: err.message ?? "Interne fout bij testen deal properties"
      });
    }
  });
  app2.post("/api/update-address", async (req, res) => {
    try {
      const email = req.body?.email?.trim().toLowerCase();
      const address = req.body?.address?.trim();
      const zip = req.body?.zip?.trim();
      const city = req.body?.city?.trim();
      if (!email || !address || !zip || !city) {
        return res.status(400).json({ message: "email, address, zip en city zijn verplicht" });
      }
      await updateHubSpotContactAddress(email, address, zip, city);
      return res.json({
        ok: true,
        message: "Adres succesvol bijgewerkt in HubSpot"
      });
    } catch (err) {
      console.error("Update address API error:", err);
      return res.status(500).json({
        ok: false,
        message: err.message ?? "Interne fout bij bijwerken adres"
      });
    }
  });
  app2.get("/api/quotes", async (req, res) => {
    try {
      const email = req.query?.email?.trim().toLowerCase();
      if (!email) return res.status(400).json({ message: "email parameter verplicht" });
      const quotes = await findHubSpotQuotesByEmail(email);
      return res.json({
        ok: true,
        quotes: quotes?.quotes || [],
        deals: quotes?.deals || [],
        lineItems: quotes?.lineItems || []
      });
    } catch (err) {
      console.error("Quotes API error:", err);
      return res.json({
        ok: false,
        quotes: [],
        deals: [],
        lineItems: [],
        error: err.message
      });
    }
  });
  app2.post("/api/accept-quote", async (req, res) => {
    try {
      const email = req.body?.email?.trim().toLowerCase();
      const dealId = req.body?.dealId?.trim();
      if (!email || !dealId) {
        return res.status(400).json({ message: "email en dealId zijn verplicht" });
      }
      await updateHubSpotDealStage(dealId, "2705156301");
      return res.json({
        ok: true,
        message: "Offerte succesvol geaccepteerd en deal status bijgewerkt"
      });
    } catch (err) {
      console.error("Accept quote API error:", err);
      return res.status(500).json({
        ok: false,
        message: err.message ?? "Interne fout bij accepteren offerte"
      });
    }
  });
  app2.post("/api/update-deal-stage", async (req, res) => {
    try {
      const email = req.body?.email?.trim().toLowerCase();
      const dealId = req.body?.dealId?.trim();
      const stageId = req.body?.stageId?.trim();
      if (!email || !dealId || !stageId) {
        return res.status(400).json({ message: "email, dealId en stageId zijn verplicht" });
      }
      await updateHubSpotDealStage(dealId, stageId);
      return res.json({
        ok: true,
        message: "Deal status succesvol bijgewerkt"
      });
    } catch (err) {
      console.error("Update deal stage API error:", err);
      return res.status(500).json({
        ok: false,
        message: err.message ?? "Interne fout bij bijwerken deal status"
      });
    }
  });
  app2.post("/api/update-installation-dates", async (req, res) => {
    try {
      const dealId = req.body?.dealId?.trim();
      const installationDates = req.body?.installationDates;
      if (!dealId || !installationDates || !Array.isArray(installationDates)) {
        return res.status(400).json({ message: "dealId en installationDates array zijn verplicht" });
      }
      await updateHubSpotDealInstallationDates(dealId, installationDates);
      return res.json({
        ok: true,
        message: "Installatie datums succesvol bijgewerkt in HubSpot"
      });
    } catch (err) {
      console.error("Update installation dates API error:", err);
      return res.status(500).json({
        ok: false,
        message: err.message ?? "Interne fout bij bijwerken installatie datums"
      });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets")
    }
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var __dirname2 = path2.dirname(fileURLToPath2(import.meta.url));
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        __dirname2,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(__dirname2, "..", "dist", "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  console.log("NODE_ENV:", process.env.NODE_ENV);
  if (process.env.NODE_ENV === "development") {
    console.log("Setting up Vite development server");
    await setupVite(app, server);
  } else {
    console.log("Setting up static file serving for production");
    serveStatic(app);
  }
  const port = Number(process.env.PORT) || 3e3;
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
