import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, AlertCircle, ChevronLeft, ChevronRight, FileText, Clock, Euro, ChevronDown, ChevronUp, AlertTriangle, CheckSquare, Square, Calendar } from "lucide-react";
import { cn, getApiBaseUrl } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import logoPath from "@assets/HollandElectric-logo.png (1)_1753019272215.webp";

// Helpers voor bedragen, korting en btw
const parseNum = (value: unknown): number => {
  const n = parseFloat(String(value ?? "NaN"));
  return Number.isFinite(n) ? n : 0;
};

const formatEuro = (n: number): string => `€ ${n.toFixed(2).replace(".", ",")}`;

// Beschrijving parsen: behoudt markers (- en +) en regels, verwijder lege regels en dubbele spaties
type ParsedDescLine = { marker: '-' | '+' | null; text: string };
const parseDescriptionLines = (desc?: string | null): ParsedDescLine[] => {
  if (!desc) return [];
  const normalized = String(desc)
    .replace(/\r\n/g, "\n")
    .replace(/\s-\s/g, "\n- ")
    .replace(/\s\+\s/g, "\n+ ");

  const rawLines = normalized.split(/\n/);
  return rawLines
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const marker: '-' | '+' | null = line.startsWith('- ')
        ? '-'
        : line.startsWith('+ ')
          ? '+'
          : null;
      const text = marker ? line.slice(2).trim() : line;
      return { marker, text };
    });
};

type LineAmounts = {
  quantity: number;
  unitPrice: number;
  gross: number; // voor korting
  discountEuro: number; // toegepaste korting in euro's
  discountPct: number; // 0..100, toegepaste korting
  hasExplicitDiscount: boolean; // alleen true als HubSpot expliciet korting heeft meegestuurd
  netAmount: number; // na korting
  taxRatePct: number; // 0..100
  taxAmount: number;
};

const computeLineAmounts = (p: any, fallbackTaxPct: number = 21): LineAmounts => {
  const quantity = parseNum(p?.hs_quantity ?? p?.quantity ?? 1);
  const unitPrice = parseNum(p?.hs_rate ?? p?.price ?? 0);
  const amountProp = parseNum(p?.hs_amount ?? p?.amount);

  const gross = quantity > 0 && unitPrice > 0 ? quantity * unitPrice : amountProp;

  // Korting: alleen tonen/markeren als HubSpot dit expliciet meestuurt
  const discountEuroExplicit = parseNum(
    p?.hs_discount_amount ?? p?.discount_amount ?? p?.hs_discount ?? p?.discount
  );
  const discountPctExplicit = parseNum(p?.hs_discount_percentage ?? p?.discount_percentage);
  const hasExplicitDiscount = discountEuroExplicit > 0 || discountPctExplicit > 0;
  const discountEuro = hasExplicitDiscount
    ? (discountEuroExplicit > 0
        ? discountEuroExplicit
        : gross * (discountPctExplicit / 100))
    : 0;
  const discountPct = hasExplicitDiscount
    ? (discountPctExplicit > 0
        ? discountPctExplicit
        : (gross > 0 ? (discountEuro / gross) * 100 : 0))
    : 0;

  const netAmount = amountProp > 0
    ? amountProp
    : Math.max(0, gross - discountEuro);

  // BTW (gebruik expliciet bedrag indien aanwezig; anders tarief)
  const defaultRatePct = fallbackTaxPct;
  const taxRateRaw = parseNum(p?.hs_tax_rate ?? p?.tax_rate ?? defaultRatePct);
  const taxRatePct = taxRateRaw > 1 ? taxRateRaw : taxRateRaw * 100; // normaliseer
  const taxAmountExplicit = parseNum(p?.hs_tax_amount ?? p?.tax_amount);
  const taxAmount = taxAmountExplicit > 0 ? taxAmountExplicit : (netAmount * (taxRatePct / 100));

  return { quantity, unitPrice, gross, discountEuro, discountPct, hasExplicitDiscount, netAmount, taxRatePct, taxAmount };
};

interface CustomerData {
  email: string;
  name?: string;
  phone?: string;
  location?: string;
  address?: string;
  phoneNumber?: string;
  zip?: string;
  city?: string;
  preferences?: DatePreference[];
  selectedDate?: string;
}

interface DatePreference {
  id: string;
  date: string;
  dayName: string;
  timeSlot: {
    time: string;
    period: string;
  };
  fullDate: Date;
}

interface TimeSlot {
  id: number;
  date: string;
  time: string;
  dayName: string;
  weekNumber: number;
  fullDate: Date;
}

interface Quote {
  id: string;
  service: string;
  description: string;
  price: number;
  duration: string;
  validUntil: string;
}

interface HubSpotQuoteLineItem {
  id: string;
  properties?: {
    hs_name?: string;
    hs_description?: string;
    hs_quantity?: string;
    hs_rate?: string;
    hs_amount?: string;
    // alternatieve/aanvullende property-namen
    name?: string;
    description?: string;
    quantity?: string;
    price?: string;
    amount?: string;
    hs_discount_amount?: string;
    discount_amount?: string;
    hs_discount?: string;
    discount?: string;
    hs_discount_percentage?: string;
    discount_percentage?: string;
    hs_tax_amount?: string;
    tax_amount?: string;
    hs_tax_rate?: string;
    tax_rate?: string;
  };
}

interface HubSpotQuote {
  id: string;
  properties?: {
    hs_title?: string;
    hs_amount?: string;
    hs_expiration_date?: string;
    hs_quote_number?: string;
    hs_deal_stage?: string;
    hs_quote_status?: string;
  };
}

interface HubSpotData {
  quotes: HubSpotQuote[];
  deals: any[];
  lineItems: HubSpotQuoteLineItem[];
}

// Generate time slots for 2 weeks
const generateAvailableDates = (): DatePreference[] => {
  const dates: DatePreference[] = [];
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() + 2); // Start vanaf overmorgen (2 dagen vanaf vandaag)
  
  const dayNames = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"];
  const months = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
  const timeSlots = [
    { time: "08:00", period: "ochtend" },
    { time: "12:00", period: "middag" }
  ];
  
  let id = 1;
  
  // Genereer beschikbare datums voor de komende 4 weken
  for (let week = 0; week < 4; week++) {
    for (let day = 0; day < 7; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + (week * 7) + day);
      
      // Skip weekenden (zondag = 0, zaterdag = 6)
      if (currentDate.getDay() === 0 || currentDate.getDay() === 6) continue;
      
      // Voeg alle dagdelen toe voor werkdagen
      timeSlots.forEach(timeSlot => {
        // Maak een nieuwe datum met de juiste tijd
        const dateWithTime = new Date(currentDate);
        const [hours, minutes] = timeSlot.time.split(':').map(Number);
        dateWithTime.setHours(hours, minutes, 0, 0);
        
        dates.push({
          id: `${id++}`,
          date: `${currentDate.getDate()} ${months[currentDate.getMonth()]}`,
          dayName: dayNames[currentDate.getDay()],
          timeSlot: timeSlot,
          fullDate: dateWithTime
        });
      });
    }
  }
  
  // Als er geen datums zijn gegenereerd, voeg dan een fallback toe
  if (dates.length === 0) {
    const fallbackDate = new Date(startDate);
    fallbackDate.setDate(startDate.getDate() + 1);
    
    // Zoek naar de eerstvolgende werkdag
    while (fallbackDate.getDay() === 0 || fallbackDate.getDay() === 6) {
      fallbackDate.setDate(fallbackDate.getDate() + 1);
    }
    
    timeSlots.forEach(timeSlot => {
      // Maak een nieuwe datum met de juiste tijd
      const dateWithTime = new Date(fallbackDate);
      const [hours, minutes] = timeSlot.time.split(':').map(Number);
      dateWithTime.setHours(hours, minutes, 0, 0);
      
      dates.push({
        id: `${id++}`,
        date: `${fallbackDate.getDate()} ${months[fallbackDate.getMonth()]}`,
        dayName: dayNames[fallbackDate.getDay()],
        timeSlot: timeSlot,
        fullDate: dateWithTime
      });
    });
  }
  
  return dates.sort((a, b) => a.fullDate.getTime() - b.fullDate.getTime());
};

const availableDates = generateAvailableDates();

const sampleQuote: Quote = {
  id: "20250803-212659251",
  service: "HEP 3 fase groepenkast 10 groepen B220xH330",
  description: "Complete elektrische installatie inclusief groepenkast, inductie groep, en alle benodigde kabelroutes voor keukenapparatuur. Inclusief voorrij- en montagekosten met 10 jaar garantie.",
  price: 2448.36,
  duration: "1-2 dagen",
  validUntil: "1 november 2025"
};

const ProgressIndicator = ({ currentStep }: { currentStep: number }) => {
  // Totaal 8 stappen na toevoegen van Planning Resultaat stap
  const totalSteps = 8;
  
  return (
    <div className="mb-6">
      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
        <div 
          className="bg-amber-500 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        ></div>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        {currentStep <= totalSteps ? `Stap ${currentStep} van ${totalSteps}` : "Voltooid"}
      </p>
    </div>
  );
};

const Step1CustomerDetails = ({ 
  customerData, 
  setCustomerData, 
  handleCustomerSubmit,
  isSubmitting,
}: {
  customerData: CustomerData;
  setCustomerData: React.Dispatch<React.SetStateAction<CustomerData>>;
  handleCustomerSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}) => (
  <Card className="shadow-medium border-gray-100">
    <CardContent className="p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Email adres</h2>
        <p className="text-muted-foreground">Vul je email adres in om je offerte in te zien</p>
      </div>
      
      <form onSubmit={handleCustomerSubmit} className="space-y-6">
        <div>
          <Label htmlFor="email" className="text-sm font-semibold text-foreground mb-2 block">
            Email adres
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="bijv. naam@email.com"
            value={customerData.email}
            onChange={(e) => {
              setCustomerData(prev => ({ ...prev, email: e.target.value }));
            }}
            className="shadow-soft rounded-xl border-gray-200 focus:ring-2 focus:ring-primary focus:border-primary h-12"
            required
          />
        </div>
        
        <Button 
          type="submit"
          disabled={isSubmitting}
          className="w-full h-14 rounded-xl text-lg font-semibold shadow-medium hover:shadow-large transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60"
        >
          {isSubmitting ? "Versturen…" : "Offerte aanvragen"}
        </Button>
      </form>
    </CardContent>
  </Card>
);

const Step2Verification = ({ 
  verificationCode, 
  setVerificationCode, 
  verificationError, 
  setVerificationError, 
  handleVerificationSubmit,
  onGoBack,
  onResend,
  onResendToNumber,
  maskedPhone,
  isVerifying,
  contactName
}: {
  verificationCode: string;
  setVerificationCode: React.Dispatch<React.SetStateAction<string>>;
  verificationError: boolean;
  setVerificationError: React.Dispatch<React.SetStateAction<boolean>>;
  handleVerificationSubmit: (e: React.FormEvent) => void;
  onGoBack: () => void;
  onResend: () => void;
  onResendToNumber: (phone?: string) => void;
  maskedPhone?: string | null;
  isVerifying: boolean;
  contactName?: string | null;
}) => (
  <Card className="shadow-medium border-gray-100">
    <CardContent className="p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Verificatie</h2>
        <p className="text-muted-foreground">Voer de 6-cijferige code in die je via WhatsApp hebt ontvangen</p>
        <br />
        {maskedPhone && (
          <p className="text-xs text-muted-foreground mt-2">
            Code verzonden naar {maskedPhone ? maskedPhone.replace(/(\+\d{2})?(\d{4})\d{4}(\d{2})/, '$1$2****$3') : '3168****75'}{contactName ? ` voor ${contactName}` : ""}
          </p>
        )}
      </div>
      
      <form onSubmit={handleVerificationSubmit} className="space-y-6">
        <div>
          <Label htmlFor="verification-code" className="text-sm font-semibold text-foreground mb-2 block">
            Verificatiecode
          </Label>
          <Input
            id="verification-code"
            type="text"
            placeholder="123456"
            maxLength={6}
            value={verificationCode}
            onChange={(e) => {
              setVerificationCode(e.target.value);
              setVerificationError(false);
            }}
            className="shadow-soft rounded-xl border-gray-200 focus:ring-2 focus:ring-primary focus:border-primary h-16 text-center text-2xl font-mono tracking-widest"
            required
            disabled={isVerifying}
          />
        </div>
        
        {verificationError && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-700">
              Ongeldige code. Probeer het opnieuw.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex gap-3">
          <Button 
            type="button"
            variant="ghost"
            onClick={onGoBack}
            className="h-14 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-gray-50 transition-all duration-200"
          >
            ← Vorige
          </Button>
          <Button 
            type="submit"
            disabled={isVerifying}
            className="h-14 rounded-xl text-lg font-semibold flex-1 shadow-medium hover:shadow-large transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60"
          >
            {isVerifying ? "Controleren…" : "Bevestig code"}
          </Button>
        </div>
        
        <div className="text-center">
          <Button 
            variant="link" 
            type="button"
            className="text-primary text-sm font-medium hover:text-primary/80"
            onClick={onResend}
          >
            Geen code ontvangen? Stuur opnieuw
          </Button>
        </div>
      </form>
    </CardContent>
  </Card>
);

const Step3QuoteConfirmation = ({ 
  quote, 
  handleQuoteAccept,
  onGoBack,
  customerData,
  hubSpotData,
}: {
  quote: Quote;
  handleQuoteAccept: (dealId?: string) => void;
  onGoBack: () => void;
  customerData: CustomerData;
  hubSpotData: HubSpotData | null;
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const toggleItem = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const handleAcceptClick = () => {
    if (!acceptedTerms) {
      return;
    }
    setShowConfirmation(true);
  };

  const handleConfirmAccept = () => {
    setShowConfirmation(false);
    // Geef de deal ID door als deze beschikbaar is
    const dealId = hubSpotData?.deals?.[0]?.id;
    handleQuoteAccept(dealId);
  };

  const handleCancelAccept = () => {
    setShowConfirmation(false);
  };

  // Controleer of we HubSpot data hebben, anders toon een foutmelding
  if (!hubSpotData?.lineItems || hubSpotData.lineItems.length === 0) {
    return (
      <div className="w-full max-w-lg mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-2">Geen offerte gevonden</h2>
          <p className="text-muted-foreground">Er is geen actieve offerte gevonden voor dit emailadres</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
          <p className="text-yellow-800">
            Neem contact op met Holland Electric om een nieuwe offerte aan te vragen.
          </p>
        </div>
        <button
          onClick={onGoBack}
          className="w-full mt-4 bg-primary text-white py-3 px-4 rounded-xl hover:bg-primary/90 transition-all duration-200 hover:-translate-y-0.5 shadow-medium hover:shadow-large"
        >
          Terug naar stap 2
        </button>
      </div>
    );
  }

  const quoteItems = hubSpotData.lineItems.map(item => {
    const p = item.properties || {};
    const amounts = computeLineAmounts(p);
    const descriptionLines = parseDescriptionLines(p?.hs_description || p?.description || null);
    return {
      title: p?.hs_name || p?.name || "Onbekende service",
      price: formatEuro(amounts.netAmount),
      descriptionLines,
      discountEuro: amounts.discountEuro,
      discountPct: amounts.discountPct,
      hasExplicitDiscount: amounts.hasExplicitDiscount,
      details: [
        `Aantal: ${Number.isFinite(amounts.quantity) ? amounts.quantity : 1}`,
        `Prijs per stuk: ${formatEuro(Number.isFinite(amounts.unitPrice) ? amounts.unitPrice : 0)}`,
        `Korting: ${formatEuro(amounts.discountEuro)} (${amounts.discountPct.toFixed(1)}%)`,
        `Totaal: ${formatEuro(amounts.netAmount)}`
      ]
    } as const;
  });

  return (
  <div className="w-full max-w-lg mx-auto">
    <div className="text-center mb-6">
      <h2 className="text-2xl font-bold text-foreground mb-2">Je offerte</h2>
      <p className="text-muted-foreground">Bekijk en accepteer je persoonlijke offerte</p>
    </div>
    
    {/* Klantgegevens */}
    <div className="bg-gradient-to-r from-green-700 to-green-800 rounded-xl p-4 mb-4 text-white">
      <div className="grid grid-cols-1 gap-3 text-sm">
        <div>
          <p className="font-semibold text-white">{customerData.name || "—"}</p>
          {customerData.address && (
            <p className="text-green-100">{customerData.address}</p>
          )}
          {customerData.zip && customerData.city && (
            <p className="text-green-100">{customerData.zip} {customerData.city}</p>
          )}
          <div className="mt-2 space-y-1">
            <p className="text-green-100">{customerData.email || "—"}</p>
            <p className="text-green-100">{customerData.phone || "—"}</p>
          </div>
        </div>
        <div>
          <p className="text-green-200 text-xs">Door: Bas Janssen</p>
        </div>
      </div>
    </div>
    
    {/* Offerte Content */}
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
      <h3 className="font-semibold text-gray-700 mb-3">Samenvatting</h3>
      
      {/* Quote items met toggles */}
      <div className="space-y-2 mb-4">
        {quoteItems.map((item, index) => (
          <div key={index} className="border border-gray-100 rounded-lg">
            <button
              onClick={() => toggleItem(index)}
              className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center mb-1">
                  <p className="font-semibold text-gray-800 text-sm pr-2 flex-1">{item.title}</p>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-green-600 text-sm">{item.price}</span>
                      {expandedItems.has(index) ? (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                    {item.hasExplicitDiscount && item.discountEuro > 0 && (
                      <span className="text-xs text-gray-500 leading-4 whitespace-nowrap">na {formatEuro(item.discountEuro)} korting</span>
                    )}
                  </div>
                </div>
                {/* Beschrijving is verplaatst naar de toggle details */}
              </div>
            </button>
            
            {expandedItems.has(index) && (
              <div className="px-3 pb-3 border-t border-gray-100">
                <div className="pt-2 space-y-3">
                  {item.descriptionLines && item.descriptionLines.length > 0 && (
                    <div className="space-y-1">
                      {item.descriptionLines.map((l, i) => (
                        <div key={i} className="flex items-start">
                          <span className={`w-4 mr-2 text-center text-xs ${l.marker === '-' ? 'text-gray-500' : l.marker === '+' ? 'text-green-600' : 'text-transparent'}`}>
                            {l.marker ?? ''}
                          </span>
                          <p className="text-xs text-gray-700 leading-relaxed">{l.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-1">
                    {item.details.map((detail, detailIndex) => (
                      <div key={detailIndex} className="flex items-start">
                        <p className="text-xs text-gray-700 leading-relaxed">{detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Totaal */}
      <div className="border-t border-gray-200 pt-3">
        {(() => {
          // Gebruik de centrale helper zodat korting correct wordt meegenomen
          const lineAmounts = hubSpotData.lineItems.map(li => computeLineAmounts(li.properties, 21));
          const subtotal = lineAmounts.reduce((s, la) => s + la.netAmount, 0);
          const vat = lineAmounts.reduce((s, la) => s + la.taxAmount, 0);
          const discountTotal = lineAmounts.reduce((s, la) => s + (la.hasExplicitDiscount ? la.discountEuro : 0), 0);
          const effectivePct = subtotal > 0 ? (vat / subtotal) * 100 : 21;
          const total = Math.max(0, subtotal + vat);

          return (
            <>
              <div className="flex justify-between text-sm mb-1">
                <span>Subtotaal</span>
                <span>{formatEuro(subtotal)}</span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between text-sm mb-1 text-gray-600">
                  <span>Korting</span>
                  <span>-{formatEuro(discountTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm mb-2">
                <span>BTW ({effectivePct.toFixed(0)}%)</span>
                <span>{formatEuro(vat)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-green-700 border-t border-gray-200 pt-2">
                <span>Totaal</span>
                <span>{formatEuro(total)}</span>
              </div>
            </>
          );
        })()}
      </div>
    </div>
    
    {/* Terms and conditions checkbox */}
    <div className="mb-4">
      <button
        onClick={() => setAcceptedTerms(!acceptedTerms)}
        className="flex items-center space-x-3 w-full p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
      >
        <div className="flex-shrink-0">
          {acceptedTerms ? (
            <CheckSquare className="w-5 h-5 text-green-600" />
          ) : (
            <Square className="w-5 h-5 text-gray-400" />
          )}
        </div>
        <div className="text-left">
          <p className="text-sm font-medium text-gray-900">
            Ik ga akkoord met de voorwaarden
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Door te accepteren ga je akkoord met onze{' '}
            <a 
              href="https://www.hollandelectric.nl/wp-content/uploads/Algemene-Voorwaarden-Holland-Electric-2025.pdf" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              algemene voorwaarden
            </a>
            {' '}en{' '}
            <a 
              href="https://www.hollandelectric.nl/privacy-policy/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              privacybeleid
            </a>
          </p>
        </div>
      </button>
    </div>

    {/* Action buttons */}
    <div className="flex gap-3">
      <Button 
        type="button"
        variant="ghost"
        onClick={onGoBack}
        className="h-12 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-gray-50 transition-all duration-200"
      >
        ← Vorige
      </Button>
      <Button 
        onClick={handleAcceptClick}
        disabled={!acceptedTerms}
        className={cn(
          "h-12 rounded-xl text-base font-semibold flex-1 transition-all duration-200",
          acceptedTerms 
            ? "shadow-medium hover:shadow-large hover:-translate-y-0.5 bg-green-600 hover:bg-green-700" 
            : "bg-gray-300 text-gray-500 cursor-not-allowed hover:bg-gray-300 hover:translate-y-0"
        )}
      >
        Accepteer & plan afspraak
      </Button>
    </div>

    {/* Confirmation Modal */}
    {showConfirmation && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Bevestig acceptatie</h3>
                <p className="text-gray-600">
                  Weet je zeker dat je deze offerte wilt accepteren voor {(() => {
                    const la = hubSpotData.lineItems.map(li => computeLineAmounts(li.properties, 21));
                    const subtotal = la.reduce((s, it) => s + it.netAmount, 0);
                    const vat = la.reduce((s, it) => s + it.taxAmount, 0);
                    return formatEuro(subtotal + vat);
                  })()}?
                </p>
          </div>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-800">
              <strong>Let op:</strong> Door te accepteren ga je akkoord met de{' '}
              <a 
                href="https://www.hollandelectric.nl/wp-content/uploads/Algemene-Voorwaarden-Holland-Electric-2025.pdf" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                voorwaarden
              </a>
              {' '}en wordt je afspraak ingepland.
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={handleCancelAccept}
              variant="ghost"
              className="flex-1 h-12 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50"
            >
              Annuleren
            </Button>
            <Button
              onClick={handleConfirmAccept}
              className="flex-1 h-12 rounded-xl text-base font-semibold bg-green-600 hover:bg-green-700 shadow-medium hover:shadow-large transition-all duration-200"
            >
              Ja, accepteer offerte
            </Button>
          </div>
        </div>
      </div>
    )}
  </div>
  );
};

const Step3DealSelection = ({ 
  hubSpotData, 
  handleDealSelect,
  onGoBack,
  customerData
}: {
  hubSpotData: HubSpotData;
  handleDealSelect: (dealId: string) => void;
  onGoBack: () => void;
  customerData: CustomerData;
}) => {
  const [selectedDealId, setSelectedDealId] = useState<string>("");

  const handleContinue = () => {
    if (selectedDealId) {
      handleDealSelect(selectedDealId);
    }
  };

  return (
    <Card className="shadow-medium border-gray-100">
      <CardContent className="p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">Kies je offerte</h2>
          <p className="text-muted-foreground">Je hebt meerdere offertes. Kies degene die je wilt accepteren</p>
        </div>
        
        <div className="space-y-4 mb-6">
          {hubSpotData.deals.map((deal, index) => {
            const isSelected = selectedDealId === deal.id;
            const dealAmount = parseFloat(deal.properties?.amount || "0");
            
            return (
              <div
                key={deal.id}
                onClick={() => setSelectedDealId(deal.id)}
                className={cn(
                  "border rounded-xl p-4 transition-all duration-200 cursor-pointer shadow-soft",
                  isSelected
                    ? "border-green-500 bg-green-50 ring-2 ring-green-500/20"
                    : "border-gray-200 hover:border-green-500/50 hover:bg-green-50/30"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 text-lg mb-2">
                      {deal.properties?.dealname || `Offerte ${index + 1}`}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Euro className="w-4 h-4" />
                        <span>{dealAmount > 0 ? `€ ${dealAmount.toFixed(2).replace(".", ",")}` : "Prijs op aanvraag"}</span>
                      </div>
                      {deal.properties?.closedate && (
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4" />
                          <span>Vervalt: {new Date(deal.properties.closedate).toLocaleDateString('nl-NL')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center ml-4">
                    {isSelected && (
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <h4 className="font-semibold text-blue-900 mb-2">Meerdere offertes?</h4>
          <p className="text-sm text-blue-800">
            Je hebt meerdere offertes ontvangen. Selecteer de offerte die je wilt accepteren om door te gaan met het plannen van je afspraak.
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button 
            type="button"
            variant="ghost"
            onClick={onGoBack}
            className="h-14 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-gray-50 transition-all duration-200"
          >
            ← Vorige
          </Button>
          <Button 
            onClick={handleContinue}
            disabled={!selectedDealId}
            className={cn(
              "h-14 rounded-xl text-lg font-semibold flex-1 transition-all duration-200",
              selectedDealId
                ? "shadow-medium hover:shadow-large hover:-translate-y-0.5 bg-green-600 hover:bg-green-700" 
                : "bg-gray-300 text-gray-500 cursor-not-allowed hover:bg-gray-300 hover:translate-y-0"
            )}
          >
            Doorgaan met geselecteerde offerte
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const Step4AddressCheck = ({ 
  customerData, 
  setCustomerData, 
  handleAddressConfirm,
  onGoBack
}: {
  customerData: CustomerData;
  setCustomerData: React.Dispatch<React.SetStateAction<CustomerData>>;
  handleAddressConfirm: () => void;
  onGoBack: () => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [tempAddress, setTempAddress] = useState({
    address: customerData.address || "",
    zip: customerData.zip || "",
    city: customerData.city || ""
  });

  const handleSaveAddress = async () => {
    if (!customerData.email) return;
    
    setIsUpdating(true);
    try {
      // Update in HubSpot
      const response = await fetch(`${getApiBaseUrl()}/update-address`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: customerData.email,
          address: tempAddress.address,
          zip: tempAddress.zip,
          city: tempAddress.city
        }),
      });

      if (!response.ok) {
        throw new Error('Fout bij bijwerken adres in HubSpot');
      }

      // Update lokale state
      setCustomerData(prev => ({
        ...prev,
        address: tempAddress.address,
        zip: tempAddress.zip,
        city: tempAddress.city
      }));
      setIsEditing(false);
    } catch (error) {
      console.error('Fout bij bijwerken adres:', error);
      alert('Fout bij bijwerken adres. Probeer het opnieuw.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setTempAddress({
      address: customerData.address || "",
      zip: customerData.zip || "",
      city: customerData.city || ""
    });
    setIsEditing(false);
  };

  return (
  <Card className="shadow-medium border-gray-100">
    <CardContent className="p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Adres bevestiging</h2>
        <p className="text-muted-foreground">Controleer je adres voor de afspraak</p>
      </div>
      
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-6">
        <div className="mb-4">
          <h3 className="font-semibold text-gray-800">Huidig adres:</h3>
        </div>
        
        {!isEditing ? (
          <div className="space-y-2 text-sm">
            <p className="text-gray-800 font-normal">{customerData.name || "—"}</p>
            <p className="text-gray-800 font-normal">{customerData.address || "—"}</p>
            <p className="text-gray-800 font-normal">{customerData.zip || "—"} {customerData.city || "—"}</p>
            <div className="h-2"></div>
            <p className="text-gray-800 font-normal">{customerData.email || "—"}</p>
            <p className="text-gray-800 font-normal">{customerData.phone || "—"}</p>
            <div className="pt-3">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="w-full h-10 text-sm border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white font-normal rounded-lg transition-colors"
              >
                Adres wijzigen
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-address" className="text-sm font-medium text-gray-700 mb-1 block">
                Straatnaam en huisnummer
              </Label>
              <Input
                id="edit-address"
                type="text"
                value={tempAddress.address}
                onChange={(e) => setTempAddress(prev => ({ ...prev, address: e.target.value }))}
                className="h-10 text-sm"
                placeholder="Voer je adres in"
              />
            </div>
            <div>
              <Label htmlFor="edit-postcode" className="text-sm font-medium text-gray-700 mb-1 block">
                Postcode
              </Label>
              <Input
                id="edit-postcode"
                type="text"
                value={tempAddress.zip}
                onChange={(e) => setTempAddress(prev => ({ ...prev, zip: e.target.value }))}
                className="h-10 text-sm"
                placeholder="Voer je postcode in"
              />
            </div>
            <div>
              <Label htmlFor="edit-location" className="text-sm font-medium text-gray-700 mb-1 block">
                Plaats
              </Label>
              <Input
                id="edit-location"
                type="text"
                value={tempAddress.city}
                onChange={(e) => setTempAddress(prev => ({ ...prev, city: e.target.value }))}
                className="h-10 text-sm"
                placeholder="Voer je plaats in"
              />
            </div>
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="flex-1 h-10 text-sm bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                disabled={isUpdating}
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={handleSaveAddress}
                className="flex-1 h-10 text-sm bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                disabled={isUpdating}
              >
                {isUpdating ? "Bezig..." : "Opslaan"}
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
        <h4 className="font-semibold text-green-900 mb-2">Klopt dit adres?</h4>
        <p className="text-sm text-green-800">
          Controleer of dit het juiste adres is waar de elektricien naartoe moet komen.
        </p>
      </div>
      
      <div className="flex gap-3">
        <Button 
          type="button"
          variant="ghost"
          onClick={onGoBack}
          className="h-14 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-gray-50 transition-all duration-200"
        >
          ← Vorige
        </Button>
        <Button 
          onClick={handleAddressConfirm}
          className="h-14 rounded-xl text-lg font-semibold flex-1 shadow-medium hover:shadow-large transition-all duration-200 hover:-translate-y-0.5 bg-green-600 hover:bg-green-700"
        >
          Adres klopt, ga verder
        </Button>
      </div>
    </CardContent>
  </Card>
  );
};

const Step5AppointmentSelection = ({ 
  customerData,
  setCustomerData,
  handleConfirmAppointment,
  onGoBack,
  availableDates
}: {
  customerData: CustomerData;
  setCustomerData: React.Dispatch<React.SetStateAction<CustomerData>>;
  handleConfirmAppointment: (selectedPreferences: DatePreference[]) => void;
  onGoBack: () => void;
  availableDates: DatePreference[];
}) => {
  const [selectedPreferences, setSelectedPreferences] = useState<DatePreference[]>([]);
  const [currentWeek, setCurrentWeek] = useState(1);
  
  const currentWeekDates = availableDates.filter(date => {
    const weekDiff = Math.floor((date.fullDate.getTime() - new Date().getTime()) / (7 * 24 * 60 * 60 * 1000));
    return weekDiff === currentWeek - 1;
  });
  
  const getWeekDateRange = (weekNumber: number) => {
    const weekDates = availableDates.filter(date => {
      const weekDiff = Math.floor((date.fullDate.getTime() - new Date().getTime()) / (7 * 24 * 60 * 60 * 1000));
      return weekDiff === weekNumber - 1;
    });
    if (weekDates.length === 0) return "";
    
    const firstDate = weekDates[0];
    const lastDate = weekDates[weekDates.length - 1];
    return `${firstDate.date} - ${lastDate.date}`;
  };
  
  // Bereken het aantal beschikbare weken
  const maxWeeks = Math.max(1, Math.ceil(availableDates.length / 10)); // Gemiddeld 10 datums per week

  return (
    <Card className="shadow-medium border-gray-100">
      <CardContent className="p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">Selecteer voorkeuren</h2>
          <p className="text-muted-foreground">Geef je voorkeuren op voor je afspraak. Wij kiezen de beste datum en tijd uit op basis van beschikbaarheid.</p>
        </div>
        
        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentWeek(Math.max(1, currentWeek - 1))}
            disabled={currentWeek === 1}
            className="h-8 w-8 p-0 hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">{getWeekDateRange(currentWeek)}</p>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentWeek(Math.min(maxWeeks, currentWeek + 1))}
            disabled={currentWeek === maxWeeks}
            className="h-8 w-8 p-0 hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        

        
        {/* Voorkeuren uitleg */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <h4 className="font-semibold text-blue-900 mb-2">Hoe werkt het?</h4>
          <p className="text-sm text-blue-800">
            Selecteer 3-5 voorkeuren voor je afspraak. Wij kiezen de beste datum en tijd uit op basis van beschikbaarheid van onze monteurs.
          </p>
        </div>
        
        {/* Beschikbare datums */}
        <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
          {availableDates.length === 0 ? (
            <div className="text-center py-8">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <p className="text-yellow-800 font-medium mb-2">Geen beschikbare tijden</p>
                <p className="text-yellow-700 text-sm">Er zijn momenteel geen beschikbare tijden. Neem contact op met Holland Electric om een afspraak te maken.</p>
              </div>
            </div>
          ) : currentWeekDates.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Geen beschikbare datums deze week</p>
            </div>
          ) : (
            currentWeekDates.map((date) => {
              const isSelected = selectedPreferences.some(p => p.id === date.id);
              const isMaxReached = selectedPreferences.length >= 5;
              
              return (
                <div
                  key={date.id}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedPreferences(prev => prev.filter(p => p.id !== date.id));
                    } else if (!isMaxReached) {
                      setSelectedPreferences(prev => [...prev, date]);
                    }
                  }}
                  className={cn(
                    "border rounded-xl p-4 transition-all duration-200 cursor-pointer shadow-soft",
                    isSelected
                      ? "border-green-500 bg-green-50 ring-2 ring-green-500/20"
                      : isMaxReached && !isSelected
                      ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-50"
                      : "border-gray-200 hover:border-green-500/50 hover:bg-green-50/30"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-center min-w-[60px]">
                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                          {date.dayName.slice(0, 3)}
                        </p>
                        <p className="text-lg font-bold text-foreground">
                          {date.date}
                        </p>
                      </div>
                      <div className="h-8 w-px bg-gray-200"></div>
                      <div>
                        <p className="text-lg font-bold text-foreground">{date.timeSlot.time}</p>
                        <p className="text-sm text-muted-foreground">{date.dayName} {date.timeSlot.period}</p>
                      </div>
                    </div>
                    <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
                      {isSelected && (
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        <div className="flex gap-3 items-center">
          <Button 
            type="button"
            variant="ghost"
            onClick={onGoBack}
            className="h-14 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-gray-50 transition-all duration-200"
          >
            ← Vorige
          </Button>
          <Button 
            onClick={() => handleConfirmAppointment(selectedPreferences)}
            disabled={selectedPreferences.length < 3 || availableDates.length === 0}
            className={cn(
              "h-14 rounded-xl text-lg font-semibold flex-1 transition-all duration-200",
              selectedPreferences.length >= 3 && availableDates.length > 0
                ? "shadow-medium hover:shadow-large hover:-translate-y-0.5" 
                : "bg-gray-300 text-gray-500 cursor-not-allowed hover:bg-gray-300 hover:translate-y-0"
            )}
          >
            Voorkeuren bevestigen ({selectedPreferences.length}/3)
          </Button>
        </div>
        

      </CardContent>
    </Card>
  );
};

// Types for scheduling result (2-phase flow)
interface Suggestion {
  date: string;
  timeSlot: string;
  endTime?: string;
  period?: string;
  monteur?: {
    id: string;
    naam: string;
    calendarId?: string;
  };
  score?: number;
}

interface ScheduleResult {
  status: 'loading' | 'suggestions' | 'success' | 'alternatives' | 'manual';
  // New 2-phase flow: suggestions to choose from
  suggestions?: Suggestion[];
  // Legacy: direct booking result
  confirmedAppointment?: {
    date: string;
    timeSlot: string;
    period?: string;
    monteur?: {
      id: string;
      naam: string;
    };
    endTime?: string;
  };
  // Legacy: alternatives when preferred slots unavailable
  alternatives?: Suggestion[];
  message?: string;
  // Additional data from n8n
  deal?: { id: string; name: string };
  installatieDuurMinuten?: number;
}

const Step6PlanningResult = ({
  customerData,
  hubSpotData,
  onSuccess,
  onGoBack,
}: {
  customerData: CustomerData;
  hubSpotData: HubSpotData | null;
  onSuccess: (selectedSlot: Suggestion, installatieDuurMinuten?: number) => void;
  onGoBack: () => void;
}) => {
  const [result, setResult] = useState<ScheduleResult>({ status: 'loading' });
  const [selectedSuggestion, setSelectedSuggestion] = useState<number | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const { toast } = useToast();

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const dayNames = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
    const months = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
    return `${dayNames[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
  };

  // Call the scheduling API on mount
  useEffect(() => {
    const scheduleAppointment = async () => {
      try {
        const dealId = hubSpotData?.deals?.[0]?.id;
        if (!dealId || dealId.startsWith('gewonnen-deal-')) {
          // Skip API call for mock deals, simulate success
          await new Promise(resolve => setTimeout(resolve, 2000));
          setResult({
            status: 'success',
            confirmedAppointment: {
              date: customerData.preferences?.[0]?.date || new Date().toISOString().split('T')[0],
              timeSlot: customerData.preferences?.[0]?.timeSlot?.time || '09:00',
              period: customerData.preferences?.[0]?.timeSlot?.period || 'ochtend',
              monteur: { id: 'mock', naam: 'Jan van der Berg' }
            }
          });
          return;
        }

        const customerAddress = [customerData.address, customerData.zip, customerData.city]
          .filter(Boolean)
          .join(', ') || 'Adres niet beschikbaar';

        const preferences = customerData.preferences?.map(pref => ({
          date: pref.date,
          timeSlot: pref.timeSlot.time,
          period: pref.timeSlot.period
        })) || [];

        console.log('[Schedule] Sending request:', { dealId, email: customerData.email, customerAddress, preferences });

        const res = await fetch(`${getApiBaseUrl()}/schedule-request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dealId,
            contactEmail: customerData.email,
            customerAddress,
            preferences
          })
        });

        const data = await res.json();
        console.log('[Schedule] Response:', data);

        if (data.ok) {
          // Handle new 2-phase flow (suggestions)
          if (data.status === 'suggestions' && data.suggestions) {
            setResult({
              status: 'suggestions',
              suggestions: data.suggestions,
              message: data.message,
              deal: data.deal,
              installatieDuurMinuten: data.installatieDuurMinuten
            });
          }
          // Handle legacy success (direct booking - backwards compat)
          else if (data.status === 'success' && data.confirmedAppointment) {
            // Convert to suggestion format and auto-select
            const suggestion: Suggestion = {
              date: data.confirmedAppointment.date,
              timeSlot: data.confirmedAppointment.timeSlot,
              endTime: data.confirmedAppointment.endTime,
              period: data.confirmedAppointment.period,
              monteur: data.confirmedAppointment.monteur
            };
            setResult({
              status: 'suggestions',
              suggestions: [suggestion],
              message: 'We hebben een beschikbare tijd gevonden'
            });
            setSelectedSuggestion(0);
          }
          // Handle legacy alternatives
          else if (data.status === 'alternatives' && data.alternatives) {
            setResult({
              status: 'suggestions',
              suggestions: data.alternatives,
              message: 'Uw voorkeuren waren niet beschikbaar. Kies een alternatief:'
            });
          }
          // Handle manual review
          else {
            setResult({
              status: data.status || 'manual',
              message: data.message || 'Ons team neemt contact met je op.'
            });
          }
        } else {
          console.error('[Schedule] API returned error:', data);
          setResult({
            status: 'manual',
            message: data.message || 'Er is iets misgegaan. Ons team neemt contact met je op.'
          });
        }
      } catch (error) {
        console.error('[Schedule] Fetch error:', error);
        setResult({
          status: 'manual',
          message: 'Er is een fout opgetreden. Ons team neemt binnen 24 uur contact met je op.'
        });
      }
    };

    scheduleAppointment();
  }, [customerData, hubSpotData]);

  // Handle continue to next step with selected suggestion
  // NOTE: This does NOT book the appointment yet - that happens in Step 7 after final confirmation
  const handleContinue = () => {
    if (selectedSuggestion !== null && result.suggestions) {
      const selected = result.suggestions[selectedSuggestion];
      console.log('[Step6] Proceeding with selected suggestion:', selected);
      onSuccess(selected, result.installatieDuurMinuten);
    }
  };

  // Handle manual mode continue (no booking needed)
  const handleManualContinue = () => {
    // For manual mode, we pass a placeholder - the team will contact them
    onSuccess({
      date: '',
      timeSlot: '',
      period: '',
      monteur: undefined
    });
  };

  return (
    <Card className="shadow-medium border-gray-100">
      <CardContent className="p-8">
        {/* Loading State */}
        {result.status === 'loading' && (
          <div className="text-center py-8">
            <div className="mb-6">
              {/* Animated loading indicator */}
              <div className="relative w-24 h-24 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
                <div className="absolute inset-0 rounded-full border-4 border-green-500 border-t-transparent animate-spin"></div>
                <div className="absolute inset-3 rounded-full border-4 border-amber-400 border-b-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              We zoeken beschikbare tijden...
            </h2>
            <p className="text-muted-foreground">
              Even geduld, we controleren de agenda's van onze monteurs
            </p>
          </div>
        )}

        {/* Suggestions State - Customer chooses, NOT booked yet */}
        {result.status === 'suggestions' && result.suggestions && result.suggestions.length > 0 && (
          <div className="py-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Beschikbare tijden gevonden!
              </h2>
              <p className="text-muted-foreground">
                {result.message || 'Kies de datum en tijd die u het beste uitkomt'}
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {result.suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedSuggestion(index)}
                  className={cn(
                    "w-full p-4 rounded-xl border-2 text-left transition-all duration-200",
                    selectedSuggestion === index
                      ? "border-green-500 bg-green-50 ring-2 ring-green-500/20"
                      : "border-gray-200 hover:border-green-500/50 bg-white"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">
                        {formatDate(suggestion.date)}
                      </p>
                      <p className="text-muted-foreground">
                        {suggestion.timeSlot}
                        {suggestion.endTime && ` - ${suggestion.endTime}`}
                        {suggestion.period && ` (${suggestion.period})`}
                      </p>
                      {suggestion.monteur && (
                        <p className="text-sm text-muted-foreground">
                          Monteur: {suggestion.monteur.naam}
                        </p>
                      )}
                    </div>
                    <div className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                      selectedSuggestion === index
                        ? "border-green-500 bg-green-500"
                        : "border-gray-300"
                    )}>
                      {selectedSuggestion === index && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-amber-800">
                <strong>Let op:</strong> Uw keuze wordt pas definitief na bevestiging in de volgende stap.
              </p>
            </div>

            {/* Contact Me Option */}
            <div className="border-t border-gray-200 pt-4 mb-6">
              <button
                onClick={handleManualContinue}
                className="w-full p-4 rounded-xl border-2 border-blue-200 bg-blue-50 text-left hover:border-blue-400 transition-all"
              >
                <div className="flex items-center">
                  <Clock className="w-5 h-5 text-blue-600 mr-3" />
                  <div>
                    <p className="font-semibold text-blue-800">Geen van deze tijden past?</p>
                    <p className="text-sm text-blue-600">Ons team neemt contact met je op</p>
                  </div>
                </div>
              </button>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={onGoBack}
                variant="ghost"
                className="h-14 rounded-xl flex-1 text-lg"
              >
                <ChevronLeft className="mr-2 h-5 w-5" />
                Terug
              </Button>
              <Button
                onClick={handleContinue}
                disabled={selectedSuggestion === null}
                className={cn(
                  "h-14 rounded-xl text-lg font-semibold flex-1 transition-all duration-200",
                  selectedSuggestion !== null
                    ? "bg-green-600 hover:bg-green-700 shadow-medium hover:shadow-large"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                )}
              >
                Kies deze tijd
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Manual Review State */}
        {result.status === 'manual' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              We nemen contact met u op
            </h2>
            <p className="text-muted-foreground mb-6">
              {result.message || 'Ons team plant uw afspraak handmatig in en neemt binnen 24 uur contact met u op.'}
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Uw voorkeuren zijn geregistreerd:</strong>
              </p>
              <ul className="mt-2 space-y-1">
                {customerData.preferences?.slice(0, 3).map((pref, i) => (
                  <li key={i} className="text-sm text-blue-700">
                    • {formatDate(pref.date)} om {pref.timeSlot.time}
                  </li>
                ))}
              </ul>
            </div>

            <Button
              onClick={handleManualContinue}
              className="w-full h-14 rounded-xl text-lg font-semibold bg-blue-600 hover:bg-blue-700 shadow-medium hover:shadow-large transition-all duration-200"
            >
              Begrepen, doorgaan
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const Step7AddressVerification = ({
  customerData,
  setCustomerData,
  handleAddressSubmit,
  onGoBack,
  quote,
  hubSpotData,
  selectedAppointment
}: {
  customerData: CustomerData;
  setCustomerData: React.Dispatch<React.SetStateAction<CustomerData>>;
  handleAddressSubmit: (e: React.FormEvent) => void;
  onGoBack: () => void;
  quote: Quote;
  hubSpotData: HubSpotData | null;
  selectedAppointment: Suggestion | null;
}) => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const dayNames = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
    const months = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
    return `${dayNames[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const handleConfirmClick = () => {
    setShowConfirmation(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmation(false);
    setIsBooking(true);
    try {
      await handleAddressSubmit(new Event('submit') as any);
    } finally {
      setIsBooking(false);
    }
  };

  const handleCancelSubmit = () => {
    setShowConfirmation(false);
  };

  // Check if we have a real appointment or manual mode
  const hasRealAppointment = selectedAppointment && selectedAppointment.date && selectedAppointment.monteur;

  return (
    <Card className="shadow-medium border-gray-100">
      <CardContent className="p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">Definitieve bevestiging</h2>
          <p className="text-muted-foreground">
            {hasRealAppointment
              ? "Controleer alle gegevens en bevestig je afspraak definitief"
              : "Ons team neemt contact met je op voor de definitieve afspraak"}
          </p>
        </div>

        {/* Samenvatting */}
        <div className="space-y-4 mb-6">

          {/* Gekozen Afspraak Card */}
          <div className="bg-white border-2 border-green-200 rounded-xl p-5 shadow-soft">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <Calendar className="w-4 h-4 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-800">
                {hasRealAppointment ? "Gekozen afspraak" : "Afspraak"}
              </h3>
            </div>

            {hasRealAppointment ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-green-800 font-medium">Datum:</span>
                    <span className="text-green-900 font-bold">
                      {formatDate(selectedAppointment.date)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-green-800 font-medium">Tijd:</span>
                    <span className="text-green-900 font-bold">
                      {selectedAppointment.timeSlot}
                      {selectedAppointment.endTime && ` - ${selectedAppointment.endTime}`}
                    </span>
                  </div>
                  {selectedAppointment.monteur && (
                    <div className="flex justify-between items-center">
                      <span className="text-green-800 font-medium">Monteur:</span>
                      <span className="text-green-900 font-semibold">
                        {selectedAppointment.monteur.naam}
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-green-200">
                  <p className="text-xs text-green-700">
                    Na bevestiging wordt deze afspraak definitief ingepland.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Handmatige planning</strong><br />
                  Ons team neemt binnen 24 uur contact met je op om een afspraak in te plannen.
                </p>
                {customerData.preferences && customerData.preferences.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <p className="text-xs text-blue-700 font-medium mb-2">Jouw voorkeuren:</p>
                    <ul className="space-y-1">
                      {customerData.preferences.slice(0, 3).map((pref, i) => (
                        <li key={i} className="text-xs text-blue-600">
                          • {pref.dayName} {pref.date} om {pref.timeSlot.time}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Contact & Adres Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-soft">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                <Check className="w-4 h-4 text-gray-600" />
              </div>
              <h3 className="font-semibold text-gray-800">Contact & Adres</h3>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-700 mb-1">Contact</p>
                <p className="text-sm text-gray-800">{customerData.email}</p>
                <p className="text-sm text-gray-800">{customerData.phone || customerData.phoneNumber || "—"}</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-700 mb-1">Adres</p>
                <p className="text-sm text-gray-800">
                  {customerData.address || "—"}<br />
                  {customerData.zip || "—"} {customerData.city || "—"}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3 items-center">
          <Button 
            type="button"
            variant="ghost"
            onClick={onGoBack}
            className="h-14 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-gray-50 transition-all duration-200"
          >
            ← Vorige
          </Button>
          <Button 
            onClick={handleConfirmClick}
            className="h-14 rounded-xl text-lg font-semibold flex-1 shadow-medium hover:shadow-large transition-all duration-200 hover:-translate-y-0.5"
          >
            Maak afspraak definitief
          </Button>
        </div>
        
        {/* Booking in progress overlay */}
        {isBooking && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-xl text-center">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
                <div className="absolute inset-0 rounded-full border-4 border-green-500 border-t-transparent animate-spin"></div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Afspraak wordt geboekt...</h3>
              <p className="text-gray-600">
                Even geduld, we boeken je afspraak in de agenda.
              </p>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmation && !isBooking && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {hasRealAppointment ? "Bevestig je afspraak" : "Bevestig je voorkeuren"}
                </h3>
                <p className="text-gray-600">
                  {hasRealAppointment
                    ? "Weet je zeker dat je deze afspraak definitief wilt boeken?"
                    : "Weet je zeker dat je je voorkeuren wilt doorgeven?"}
                </p>
              </div>

              {hasRealAppointment && selectedAppointment && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="text-sm text-green-800">
                    <p><strong>Datum:</strong> {formatDate(selectedAppointment.date)}</p>
                    <p><strong>Tijd:</strong> {selectedAppointment.timeSlot}{selectedAppointment.endTime && ` - ${selectedAppointment.endTime}`}</p>
                    {selectedAppointment.monteur && (
                      <p><strong>Monteur:</strong> {selectedAppointment.monteur.naam}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-amber-800">
                      <strong>Let op:</strong> {hasRealAppointment
                        ? "Door te bevestigen wordt deze afspraak definitief ingepland in de agenda. Je ontvangt een bevestiging via e-mail."
                        : "Door te bevestigen worden je voorkeuren doorgegeven aan ons team."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleCancelSubmit}
                  variant="ghost"
                  className="flex-1 h-12 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                >
                  Annuleren
                </Button>
                <Button
                  onClick={handleConfirmSubmit}
                  className="flex-1 h-12 rounded-xl text-base font-semibold bg-green-600 hover:bg-green-700 shadow-medium hover:shadow-large transition-all duration-200"
                >
                  {hasRealAppointment ? "Ja, boek definitief" : "Ja, verstuur voorkeuren"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const ConfirmationScreen = ({
  customerData,
  quote,
  hubSpotData,
  handleReset,
  selectedAppointment
}: {
  customerData: CustomerData;
  quote: Quote;
  hubSpotData: HubSpotData | null;
  handleReset: () => void;
  selectedAppointment: Suggestion | null;
}) => {
  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const dayNames = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
    const months = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
    return `${dayNames[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const hasRealAppointment = selectedAppointment && selectedAppointment.date && selectedAppointment.monteur;

  return (
    <Card className="shadow-medium border-gray-100">
      <CardContent className="p-8 text-center">
        <div className="mb-8">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-large">
            <Check className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {hasRealAppointment ? "Je afspraak is bevestigd!" : "Bedankt, je voorkeuren zijn doorgegeven"}
          </h2>
          <p className="text-muted-foreground">
            {hasRealAppointment
              ? "Je ontvangt een bevestiging via e-mail en WhatsApp."
              : "Ons team neemt binnen 24 uur contact met je op om een afspraak in te plannen."}
          </p>
        </div>

        {/* Bevestigde afspraak */}
        {hasRealAppointment && selectedAppointment && (
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6 text-green-600 mr-2" />
              <h3 className="font-semibold text-green-800">Ingeplande afspraak</h3>
            </div>
            <div className="space-y-2 text-left">
              <div className="flex justify-between">
                <span className="text-green-700">Datum:</span>
                <span className="font-bold text-green-900">{formatDate(selectedAppointment.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Tijd:</span>
                <span className="font-bold text-green-900">
                  {selectedAppointment.timeSlot}
                  {selectedAppointment.endTime && ` - ${selectedAppointment.endTime}`}
                </span>
              </div>
              {selectedAppointment.monteur && (
                <div className="flex justify-between">
                  <span className="text-green-700">Monteur:</span>
                  <span className="font-bold text-green-900">{selectedAppointment.monteur.naam}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-gray-50 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-foreground mb-4">Overzicht</h3>
          <div className="space-y-3 text-sm text-left">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium text-foreground">{customerData.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Telefoon:</span>
              <span className="font-medium text-foreground">{customerData.phone || customerData.phoneNumber || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Adres:</span>
              <span className="font-medium text-foreground">{customerData.address || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Postcode:</span>
              <span className="font-medium text-foreground">{customerData.zip || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plaats:</span>
              <span className="font-medium text-foreground">{customerData.city || "—"}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function AppointmentBooking() {
  const [currentStep, setCurrentStep] = useState(1);
  const [customerData, setCustomerData] = useState<CustomerData>({ 
    email: "",
    name: "",
    phone: "",
    location: "",
    address: "",
    phoneNumber: "",
    zip: "",
    city: ""
  });
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationError, setVerificationError] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [hubSpotData, setHubSpotData] = useState<HubSpotData | null>(null);
  const [currentWeek, setCurrentWeek] = useState(1); // State for week selection
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const [maskedPhone, setMaskedPhone] = useState<string | null>(null);
  const [contactName, setContactName] = useState<string | null>(null);

  const startVerification = async (): Promise<void> => {
    const email = customerData.email.trim();
    if (!email) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/verify/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        let message = "Onbekende fout";
        try { const j = await res.json(); message = j?.message || message; } catch {}
        toast({ title: "Versturen mislukt", description: message });
        return;
      }
      const json = await res.json();
      setMaskedPhone(json.maskedPhone ?? null);
      setContactName(json.contactName ?? null);
      setCustomerData(prev => ({
        ...prev,
        name: json.contactName ?? prev.name,
        phone: json.fullPhone ?? prev.phone, // Gebruik volledig telefoonnummer
        phoneNumber: json.fullPhone ?? prev.phoneNumber,
        address: json.contactInfo?.address ?? prev.address,
        zip: json.contactInfo?.zip ?? prev.zip,
        city: json.contactInfo?.city ?? prev.city,
      }));
      setCurrentStep(2);
    } catch (err: any) {
      toast({ title: "Versturen mislukt", description: err?.message || String(err) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await startVerification();
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = customerData.email.trim();
    const code = verificationCode.trim();
    if (!email || code.length !== 6) return;
    setIsVerifying(true);
    setVerificationError(false);
    try {
      // 1) Bevestig WhatsApp code
      const confirmRes = await fetch(`${getApiBaseUrl()}/verify/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code })
      });
      if (!confirmRes.ok) {
        setVerificationError(true);
        return;
      }
      const confirmJson = await confirmRes.json();
      if (confirmJson?.phoneNumber) {
        setCustomerData(prev => ({ ...prev, phone: confirmJson.phoneNumber, phoneNumber: confirmJson.phoneNumber }));
      }

      // 2) Haal HubSpot quotes op en bepaal de volgende stap
      try {
        const quotesRes = await fetch(`${getApiBaseUrl()}/quotes?email=${encodeURIComponent(email)}`);
        if (quotesRes.ok) {
          const quotesData = await quotesRes.json();
          setHubSpotData(quotesData);
          
          // Controleer of er deals zijn en wat hun status is
          const hasWonDeals = quotesData.deals && quotesData.deals.some((deal: any) => 
            deal.properties?.dealstage === "2705156301" // Gewonnen stage
          );
          
          if (quotesData.lineItems && quotesData.lineItems.length > 0) {
            const totalAmount = quotesData.lineItems.reduce((sum: number, item: any) => {
              const am = computeLineAmounts(item.properties, 21);
              return sum + am.netAmount;
            }, 0);
            const dynamicQuote: Quote = {
              id: quotesData.quotes?.[0]?.properties?.hs_quote_number || "dynamisch",
              service: quotesData.quotes?.[0]?.properties?.hs_title || "Elektrische installatie",
              description: "Complete elektrische installatie op basis van je persoonlijke offerte",
              price: totalAmount,
              duration: "1-2 dagen",
              validUntil: quotesData.quotes?.[0]?.properties?.hs_expiration_date || "1 november 2025"
            };
            setQuote(dynamicQuote);
          } else {
            const fallbackQuote: Quote = {
              id: "standaard-offerte",
              service: "Elektrische installatie",
              description: "Complete elektrische installatie voor je woning",
              price: 0,
              duration: "1-2 dagen",
              validUntil: "1 november 2025"
            };
            setQuote(fallbackQuote);
          }
          
          // Als er gewonnen deals zijn, ga direct naar stap 4 (adres bevestiging)
          // Anders naar stap 3 (offerte bevestiging)
          if (hasWonDeals) {
            // Voor gewonnen deals moet er nog steeds een offerte zijn
            // Maak een offerte op basis van de gewonnen deal
            if (quotesData.deals && quotesData.deals.length > 0) {
              const wonDeal = quotesData.deals.find((deal: any) => 
                deal.properties?.dealstage === "2705156301"
              );
              if (wonDeal) {
                const wonDealQuote: Quote = {
                  id: wonDeal.id || "gewonnen-deal",
                  service: wonDeal.properties?.dealname || "Elektrische installatie",
                  description: "Je gewonnen deal - klaar voor afspraak plannen",
                  price: parseFloat(wonDeal.properties?.amount || "0"),
                  duration: "1-2 dagen",
                  validUntil: "1 november 2025"
                };
                setQuote(wonDealQuote);
              }
            }
            setCurrentStep(4);
          } else {
            setCurrentStep(3);
          }
        } else {
          const fallbackQuote: Quote = {
            id: "standaard-offerte",
            service: "Elektrische installatie",
            description: "Complete elektrische installatie voor je woning",
            price: 0,
            duration: "1-2 dagen",
            validUntil: "1 november 2025"
          };
          setQuote(fallbackQuote);
          setCurrentStep(3);
        }
      } catch {
        const fallbackQuote: Quote = {
          id: "standaard-offerte",
          service: "Elektrische installatie",
          description: "Complete elektrische installatie voor je woning",
          price: 0,
          duration: "1-2 dagen",
          validUntil: "1 november 2025"
        };
        setQuote(fallbackQuote);
        setCurrentStep(3);
      }
    } catch (err) {
      setVerificationError(true);
    } finally {
      setIsVerifying(false);
    }
  };

  // Step 2 helpers: code opnieuw sturen
  const handleResend = async (): Promise<void> => {
    if (!customerData.email) return;
    try {
      const res = await fetch(`${getApiBaseUrl()}/verify/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: customerData.email })
      });
      if (res.ok) {
        const j = await res.json();
        setMaskedPhone(j.maskedPhone ?? maskedPhone);
        toast({ title: "Code opnieuw verzonden", description: "Controleer WhatsApp" });
      } else {
        const j = await res.json().catch(() => ({}));
        toast({ title: "Versturen mislukt", description: j?.message || "Probeer later opnieuw" });
      }
    } catch (err: any) {
      toast({ title: "Versturen mislukt", description: err?.message || String(err) });
    }
  };

  const handleResendToNumber = async (phone?: string): Promise<void> => {
    if (!customerData.email) return;
    try {
      const res = await fetch(`${getApiBaseUrl()}/verify/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: customerData.email, phone })
      });
      if (res.ok) {
        const j = await res.json();
        setMaskedPhone(j.maskedPhone ?? maskedPhone);
        toast({ title: "Code verzonden", description: `Verzonden naar ${j.maskedPhone || "opgegeven nummer"}` });
      } else {
        const j = await res.json().catch(() => ({}));
        toast({ title: "Versturen mislukt", description: j?.message || "Probeer later opnieuw" });
      }
    } catch (err: any) {
      toast({ title: "Versturen mislukt", description: err?.message || String(err) });
    }
  };

  const handleAddressConfirm = () => {
    // Controleer of er beschikbare datums zijn
    if (availableDates.length === 0) {
      toast({ 
        title: "Geen beschikbare tijden", 
        description: "Er zijn momenteel geen beschikbare tijden. Neem contact op met Holland Electric." 
      });
      return;
    }
    setCurrentStep(5);
  };

  const handleTimeSlotSelect = (timeSlot: TimeSlot) => {
    setSelectedTimeSlot(timeSlot);
  };

  const handleConfirmAppointment = (selectedPreferences: DatePreference[]) => {
    // Sla de geselecteerde voorkeuren op in customerData
    setCustomerData(prev => ({ ...prev, preferences: selectedPreferences }));
    setCurrentStep(6);
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const dealId = hubSpotData?.deals?.[0]?.id;

    // Skip update als dit een mock deal ID is voor gewonnen deals
    if (!dealId || dealId.startsWith('gewonnen-deal-')) {
      console.log('Skipping booking for mock won deal');
      setCurrentStep(8);
      return;
    }

    try {
      // FASE 2: Book the appointment via confirm webhook (if we have a selected appointment)
      if (selectedAppointment && selectedAppointment.date && selectedAppointment.monteur?.id) {
        console.log('[Confirm] Booking appointment:', selectedAppointment);

        const customerAddress = [customerData.address, customerData.zip, customerData.city]
          .filter(Boolean)
          .join(', ') || 'Adres niet beschikbaar';

        const confirmRes = await fetch(`${getApiBaseUrl()}/confirm-alternative`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dealId: dealId,
            contactEmail: customerData.email.trim(),
            customerAddress,
            selectedSlot: {
              date: selectedAppointment.date,
              timeSlot: selectedAppointment.timeSlot,
              monteurId: selectedAppointment.monteur.id,
              period: selectedAppointment.period,
              calendarId: selectedAppointment.monteur.calendarId,
              endTime: selectedAppointment.endTime
            },
            installatieDuurMinuten
          }),
        });

        const confirmData = await confirmRes.json();
        console.log('[Confirm] Response:', confirmData);

        if (!confirmData.ok || confirmData.status !== 'success') {
          toast({
            title: "Fout bij boeken afspraak",
            description: confirmData?.message || "Er is een fout opgetreden bij het definitief boeken. Probeer later opnieuw."
          });
          return;
        }

        // Update the selected appointment with confirmed data
        if (confirmData.confirmedAppointment) {
          setSelectedAppointment({
            ...selectedAppointment,
            ...confirmData.confirmedAppointment
          });
        }

        toast({
          title: "Afspraak geboekt!",
          description: "Je afspraak is succesvol ingepland in de agenda."
        });
      } else {
        // Manual mode - call n8n for Discord notification and HubSpot update
        console.log('[Confirm] Manual mode - calling n8n for Discord notification');

        const customerAddress = [customerData.address, customerData.zip, customerData.city]
          .filter(Boolean)
          .join(', ') || 'Adres niet beschikbaar';

        const confirmRes = await fetch(`${getApiBaseUrl()}/confirm-alternative`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dealId: dealId,
            contactEmail: customerData.email.trim(),
            customerAddress,
            contactMe: true,
            preferences: customerData.preferences?.map(p => ({
              date: p.date,
              timeSlot: p.timeSlot.time
            })) || []
          }),
        });

        const confirmData = await confirmRes.json();
        console.log('[Confirm] Manual mode response:', confirmData);

        if (!confirmData.ok) {
          toast({
            title: "Fout bij doorgeven",
            description: confirmData?.message || "Er is een fout opgetreden. Probeer later opnieuw."
          });
          return;
        }

        toast({
          title: "Voorkeuren doorgegeven",
          description: "Ons team neemt contact met je op voor de definitieve afspraak."
        });
      }
    } catch (err: any) {
      console.error("Error in handleAddressSubmit:", err);
      toast({
        title: "Fout bij bevestigen",
        description: "Er is een fout opgetreden. Probeer later opnieuw."
      });
      return;
    }

    setCurrentStep(8);
  };

  // State for selected appointment suggestion (2-phase flow)
  const [selectedAppointment, setSelectedAppointment] = useState<Suggestion | null>(null);
  const [installatieDuurMinuten, setInstallatieDuurMinuten] = useState<number>(180);

  // Handle planning result success - store selected suggestion and go to final confirmation
  // NOTE: This does NOT book yet - booking happens in handleAddressSubmit
  const handlePlanningSuccess = (suggestion: Suggestion, duurMinuten?: number) => {
    console.log('[Main] Selected suggestion:', suggestion);
    setSelectedAppointment(suggestion);
    if (duurMinuten) {
      setInstallatieDuurMinuten(duurMinuten);
    }
    if (suggestion.date) {
      // Store the selected date in customerData for display
      setCustomerData(prev => ({
        ...prev,
        selectedDate: `${suggestion.date} ${suggestion.timeSlot}`
      }));
    }
    setCurrentStep(7);
  };

  const handleGoBack = () => {
    if (currentStep > 1) {
      // Als je in stap 4 bent en er zijn gewonnen deals, ga terug naar stap 1
      // Anders ga gewoon één stap terug
      if (currentStep === 4 && hubSpotData && hubSpotData.deals.some((deal: any) => 
        deal.properties?.dealstage === "2705156301" // Gewonnen stage
      )) {
        setCurrentStep(1);
      } else {
        setCurrentStep(currentStep - 1);
      }
    }
  };

  const handleDealSelect = async (dealId: string): Promise<void> => {
    // Filter de line items op basis van de geselecteerde deal
    if (hubSpotData) {
      // Voor nu gaan we door naar de volgende stap
      // In de toekomst kunnen we hier de line items filteren op basis van de geselecteerde deal
      setCurrentStep(4);
    }
  };

  const handleQuoteAccept = async (dealId?: string): Promise<void> => {
    if (dealId) {
      try {
        // Update deal status in HubSpot naar "Gewonnen"
        const acceptRes = await fetch(`${getApiBaseUrl()}/accept-quote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            email: customerData.email.trim(),
            dealId: dealId
          }),
        });

        if (!acceptRes.ok) {
          const errorData = await acceptRes.json().catch(() => ({}));
          toast({ 
            title: "Fout bij accepteren offerte", 
            description: errorData?.message || "Probeer later opnieuw" 
          });
          return;
        }

        const acceptData = await acceptRes.json();
        if (acceptData.ok) {
          toast({ 
            title: "Offerte geaccepteerd", 
            description: "Je offerte is succesvol geaccepteerd!" 
          });
        }
      } catch (err: any) {
        console.error("Error accepting quote:", err);
        toast({ 
          title: "Fout bij accepteren offerte", 
          description: "Er is een fout opgetreden. Probeer later opnieuw." 
        });
        return;
      }
    }

    // Ga naar de volgende stap
    setCurrentStep(4);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-green-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center mb-8">
          <img 
            src={logoPath} 
            alt="Holland Electric Logo" 
            className="mx-auto h-16 w-auto mb-8"
          />

        </div>
        
        <ProgressIndicator currentStep={currentStep} />
        
        {currentStep === 1 && (
          <Step1CustomerDetails 
            customerData={customerData}
            setCustomerData={setCustomerData}
            handleCustomerSubmit={handleCustomerSubmit}
            isSubmitting={isSubmitting}
          />
        )}
        {currentStep === 2 && (
          <Step2Verification
            verificationCode={verificationCode}
            setVerificationCode={setVerificationCode}
            verificationError={verificationError}
            setVerificationError={setVerificationError}
            handleVerificationSubmit={handleVerificationSubmit}
            onGoBack={handleGoBack}
            onResend={handleResend}
            onResendToNumber={handleResendToNumber}
            maskedPhone={maskedPhone}
            isVerifying={isVerifying}
            contactName={contactName}
          />
        )}
        {currentStep === 3 && (
          hubSpotData && hubSpotData.deals.length > 1 ? (
            <Step3DealSelection 
              hubSpotData={hubSpotData}
              handleDealSelect={handleDealSelect}
              onGoBack={handleGoBack}
              customerData={customerData}
            />
          ) : quote ? (
            <Step3QuoteConfirmation 
              quote={quote}
              handleQuoteAccept={handleQuoteAccept}
              onGoBack={handleGoBack}
              customerData={customerData}
              hubSpotData={hubSpotData}
            />
          ) : (
            <div className="w-full max-w-lg mx-auto">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">Laden...</h2>
                <p className="text-muted-foreground">Je offerte wordt opgehaald</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Even geduld, we halen je persoonlijke offerte op...</p>
              </div>
            </div>
          )
        )}
        {currentStep === 4 && (
          <Step4AddressCheck 
            customerData={customerData}
            setCustomerData={setCustomerData}
            handleAddressConfirm={handleAddressConfirm}
            onGoBack={handleGoBack}
          />
        )}

        {currentStep === 5 && (
          <Step5AppointmentSelection
            customerData={customerData}
            setCustomerData={setCustomerData}
            handleConfirmAppointment={handleConfirmAppointment}
            onGoBack={handleGoBack}
            availableDates={availableDates}
          />
        )}
        {currentStep === 6 && (
          <Step6PlanningResult
            customerData={customerData}
            hubSpotData={hubSpotData}
            onSuccess={handlePlanningSuccess}
            onGoBack={handleGoBack}
          />
        )}
        {currentStep === 7 && quote && (
          <Step7AddressVerification
            customerData={customerData}
            setCustomerData={setCustomerData}
            handleAddressSubmit={handleAddressSubmit}
            onGoBack={handleGoBack}
            quote={quote}
            hubSpotData={hubSpotData}
            selectedAppointment={selectedAppointment}
          />
        )}
        {currentStep === 8 && quote && (
          <ConfirmationScreen
            customerData={customerData}
            quote={quote}
            hubSpotData={hubSpotData}
            handleReset={() => setCurrentStep(1)}
            selectedAppointment={selectedAppointment}
          />
        )}
        

        
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Holland Electric - Betrouwbare elektriciens
          </p>
        </div>
      </div>
    </div>
  );
} 