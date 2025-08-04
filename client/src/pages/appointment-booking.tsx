import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, AlertCircle, ChevronLeft, ChevronRight, FileText, Clock, Euro, ChevronDown, ChevronUp, AlertTriangle, CheckSquare, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import logoPath from "@assets/HollandElectric-logo.png (1)_1753019272215.webp";

interface CustomerData {
  email: string;
  name?: string;
  location?: string;
  address?: string;
  phoneNumber?: string;
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

// Generate time slots for 2 weeks
const generateTimeSlots = (): TimeSlot[] => {
  const timeSlots: TimeSlot[] = [];
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() + 1);
  
  const availableTimes = ["09:00", "10:30", "11:00", "14:30", "16:00"];
  const dayNames = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"];
  const months = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
  
  let id = 1;
  
  for (let week = 0; week < 2; week++) {
    for (let day = 0; day < 7; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + (week * 7) + day);
      
      if (currentDate.getDay() === 0 || currentDate.getDay() === 6) continue;
      
      const numSlots = Math.floor(Math.random() * 2) + 2;
      const shuffledTimes = [...availableTimes].sort(() => 0.5 - Math.random()).slice(0, numSlots);
      
      shuffledTimes.forEach(time => {
        timeSlots.push({
          id: id++,
          date: `${currentDate.getDate()} ${months[currentDate.getMonth()]}`,
          time: time,
          dayName: dayNames[currentDate.getDay()],
          weekNumber: week + 1,
          fullDate: new Date(currentDate)
        });
      });
    }
  }
  
  return timeSlots.sort((a, b) => a.fullDate.getTime() - b.fullDate.getTime());
};

const allTimeSlots = generateTimeSlots();

const sampleQuote: Quote = {
  id: "20250803-212659251",
  service: "HEP 3 fase groepenkast 10 groepen B220xH330",
  description: "Complete elektrische installatie inclusief groepenkast, inductie groep, en alle benodigde kabelroutes voor keukenapparatuur. Inclusief voorrij- en montagekosten met 10 jaar garantie.",
  price: 2448.36,
  duration: "1-2 dagen",
  validUntil: "1 november 2025"
};

const ProgressIndicator = ({ currentStep }: { currentStep: number }) => (
  <div className="mb-6">
    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
      <div 
        className="bg-amber-500 h-2 rounded-full transition-all duration-300 ease-out"
        style={{ width: `${(currentStep / 6) * 100}%` }}
      ></div>
    </div>
    <p className="text-xs text-muted-foreground text-center">
      {currentStep <= 6 ? `Stap ${currentStep} van 6` : "Voltooid"}
    </p>
  </div>
);

const Step1CustomerDetails = ({ 
  customerData, 
  setCustomerData, 
  handleCustomerSubmit 
}: {
  customerData: CustomerData;
  setCustomerData: React.Dispatch<React.SetStateAction<CustomerData>>;
  handleCustomerSubmit: (e: React.FormEvent) => void;
}) => (
  <Card className="shadow-medium border-gray-100">
    <CardContent className="p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Email adres</h2>
        <p className="text-muted-foreground">Vul je email adres in om een offerte te ontvangen</p>
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
          className="w-full h-14 rounded-xl text-lg font-semibold shadow-medium hover:shadow-large transition-all duration-200 hover:-translate-y-0.5"
        >
          Offerte aanvragen
        </Button>
        
        <p className="text-xs text-muted-foreground text-center">
          Je ontvangt een persoonlijke offerte voor je elektrische werkzaamheden
        </p>
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
  onGoBack
}: {
  verificationCode: string;
  setVerificationCode: React.Dispatch<React.SetStateAction<string>>;
  verificationError: boolean;
  setVerificationError: React.Dispatch<React.SetStateAction<boolean>>;
  handleVerificationSubmit: (e: React.FormEvent) => void;
  onGoBack: () => void;
}) => (
  <Card className="shadow-medium border-gray-100">
    <CardContent className="p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Verificatie</h2>
        <p className="text-muted-foreground">Voer de 6-cijferige code in die je via WhatsApp hebt ontvangen</p>
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
            className="h-14 rounded-xl text-lg font-semibold flex-1 shadow-medium hover:shadow-large transition-all duration-200 hover:-translate-y-0.5"
          >
            Bevestig code
          </Button>
        </div>
        
        <div className="text-center">
          <Button 
            variant="link" 
            type="button"
            className="text-primary text-sm font-medium hover:text-primary/80"
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
  onGoBack
}: {
  quote: Quote;
  handleQuoteAccept: () => void;
  onGoBack: () => void;
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
    handleQuoteAccept();
  };

  const handleCancelAccept = () => {
    setShowConfirmation(false);
  };

  const quoteItems = [
    {
      title: "HEP 3 fase groepenkast",
      price: "€ 2.023,44",
      description: "10 groepen B220xH330 + installatie",
      details: [
        "10x Installatieautomaat B16",
        "1x Fornuisgroep 2-fase 2-nul", 
        "3x Aardlekschakelaar 2P 40A",
        "1x Hoofdschakelaar 4P 40A",
        "Inclusief voorrij- en montagekosten",
        "Inclusief 10 jaar garantie",
        "Oplevering conform NEN1010"
      ]
    },
    {
      title: "Inductie groep aanleg",
      price: "€ 150,00",
      description: "Aanleg via kruipruimte",
      details: [
        "Kabelroute via kruipruimte",
        "Aanleg kabel 5x2,5mm2",
        "Montage Perilex WCD",
        "10 meter kabel inbegrepen"
      ]
    },
    {
      title: "4x Kabelroutes keuken",
      price: "€ 300,00",
      description: "Oven, vaatwasser, Quooker, koelkast",
      details: [
        "Aanleg kabel 3x2,5mm2",
        "Montage WCD",
        "10 meter kabel inbegrepen"
      ]
    },
    {
      title: "2x Kabelroutes wasmachine",
      price: "€ 150,00",
      description: "Wasmachine en droger",
      details: [
        "Aanleg kabel 3x2,5mm2",
        "Montage WCD",
        "10 meter kabel inbegrepen"
      ]
    }
  ];

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
          <p className="font-semibold text-white">Niels Boswinkel</p>
          <p className="text-green-100">Hoofdstraat 123</p>
          <p className="text-green-100">1234 AB Amsterdam</p>
          <div className="mt-2 space-y-1">
            <p className="text-green-100">niels@boswinkelaudio.nl</p>
            <p className="text-green-100">0621145123</p>
          </div>
        </div>
        <div>
          <p className="text-green-200 text-xs">Vervalt: {quote.validUntil}</p>
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
                <div className="flex justify-between items-center mb-1">
                  <p className="font-semibold text-gray-800 text-sm">{item.title}</p>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-green-600 text-sm">{item.price}</span>
                    {expandedItems.has(index) ? (
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-600">{item.description}</p>
              </div>
            </button>
            
            {expandedItems.has(index) && (
              <div className="px-3 pb-3 border-t border-gray-100">
                <div className="pt-2 space-y-1">
                  {item.details.map((detail, detailIndex) => (
                    <div key={detailIndex} className="flex items-start">
                      <div className="w-1 h-1 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                      <p className="text-xs text-gray-600">{detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Totaal */}
      <div className="border-t border-gray-200 pt-3">
        <div className="flex justify-between text-sm mb-1">
          <span>Subtotaal</span>
          <span>€ 2.023,44</span>
        </div>
        <div className="flex justify-between text-sm mb-2">
          <span>BTW (21%)</span>
          <span>€ 424,92</span>
        </div>
        <div className="flex justify-between text-lg font-bold text-green-700 border-t border-gray-200 pt-2">
          <span>Totaal</span>
          <span>€ 2.448,36</span>
        </div>
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
            Door te accepteren ga je akkoord met onze algemene voorwaarden en privacybeleid
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
              Weet je zeker dat je deze offerte wilt accepteren voor €{quote.price.toFixed(2)}?
            </p>
          </div>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-800">
              <strong>Let op:</strong> Door te accepteren ga je akkoord met de voorwaarden en wordt je afspraak ingepland.
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
  const [tempAddress, setTempAddress] = useState({
    address: customerData.address || "Hoofdstraat 123",
    location: customerData.location || "Amsterdam",
    phoneNumber: customerData.phoneNumber || "1234 AB"
  });

  const handleSaveAddress = () => {
    setCustomerData(prev => ({
      ...prev,
      address: tempAddress.address,
      location: tempAddress.location,
      phoneNumber: tempAddress.phoneNumber
    }));
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setTempAddress({
      address: customerData.address || "Hoofdstraat 123",
      location: customerData.location || "Amsterdam", 
      phoneNumber: customerData.phoneNumber || "1234 AB"
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
            <p className="text-gray-600">Niels Boswinkel</p>
            <p className="text-gray-800 font-medium">{customerData.address || "Hoofdstraat 123"}</p>
            <p className="text-gray-800 font-medium">{customerData.phoneNumber || "1234 AB"} {customerData.location || "Amsterdam"}</p>
            <p className="text-gray-600">niels@boswinkelaudio.nl</p>
            <p className="text-gray-600">0621145123</p>
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
                placeholder="Bijv. Hoofdstraat 123"
              />
            </div>
            <div>
              <Label htmlFor="edit-postcode" className="text-sm font-medium text-gray-700 mb-1 block">
                Postcode
              </Label>
              <Input
                id="edit-postcode"
                type="text"
                value={tempAddress.phoneNumber}
                onChange={(e) => setTempAddress(prev => ({ ...prev, phoneNumber: e.target.value }))}
                className="h-10 text-sm"
                placeholder="Bijv. 1234 AB"
              />
            </div>
            <div>
              <Label htmlFor="edit-location" className="text-sm font-medium text-gray-700 mb-1 block">
                Plaats
              </Label>
              <Input
                id="edit-location"
                type="text"
                value={tempAddress.location}
                onChange={(e) => setTempAddress(prev => ({ ...prev, location: e.target.value }))}
                className="h-10 text-sm"
                placeholder="Bijv. Amsterdam"
              />
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveAddress}
                className="w-full h-8 text-sm bg-green-600 hover:bg-green-700 border-2 border-green-600 text-white font-medium rounded-lg transition-colors"
              >
                Opslaan
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
        <h4 className="font-semibold text-green-900 mb-2">Klopt dit adres?</h4>
        <p className="text-sm text-green-800">
          Controleer of dit het juiste adres is waar de elektricien naartoe moet komen. 
          Onze elektricien zal contact opnemen voor de afspraak.
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
  selectedTimeSlot, 
  handleTimeSlotSelect, 
  handleConfirmAppointment,
  currentWeek,
  setCurrentWeek,
  onGoBack
}: {
  selectedTimeSlot: TimeSlot | null;
  handleTimeSlotSelect: (timeSlot: TimeSlot) => void;
  handleConfirmAppointment: () => void;
  currentWeek: number;
  setCurrentWeek: (week: number) => void;
  onGoBack: () => void;
}) => {
  const currentWeekSlots = allTimeSlots.filter(slot => slot.weekNumber === currentWeek);
  
  const getWeekDateRange = (weekNumber: number) => {
    const weekSlots = allTimeSlots.filter(slot => slot.weekNumber === weekNumber);
    if (weekSlots.length === 0) return "";
    
    const firstSlot = weekSlots[0];
    const lastSlot = weekSlots[weekSlots.length - 1];
    return `${firstSlot.date} - ${lastSlot.date}`;
  };

  return (
    <Card className="shadow-medium border-gray-100">
      <CardContent className="p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">Beschikbare tijden</h2>
          <p className="text-muted-foreground">Kies een datum en tijd die het beste uitkomt</p>
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
            <p className="text-sm font-medium text-foreground">Week {currentWeek}</p>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentWeek(Math.min(2, currentWeek + 1))}
            disabled={currentWeek === 2}
            className="h-8 w-8 p-0 hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Telefonisch contact melding */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h4 className="font-semibold text-amber-900 mb-1">Geen geschikte tijd gevonden?</h4>
              <p className="text-sm text-amber-800">
                Kunnen we geen geschikte tijd vinden in de komende 2 weken? 
                Neem dan telefonisch contact op via <strong>020-1234567</strong> voor een persoonlijke afspraak.
              </p>
            </div>
          </div>
        </div>
        
        {/* Time Slots */}
        <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
          {currentWeekSlots.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Geen beschikbare tijden deze week</p>
            </div>
          ) : (
            currentWeekSlots.map((timeSlot) => (
              <div
                key={timeSlot.id}
                onClick={() => handleTimeSlotSelect(timeSlot)}
                className={cn(
                  "border rounded-xl p-4 transition-all duration-200 cursor-pointer shadow-soft hover:shadow-medium",
                  selectedTimeSlot?.id === timeSlot.id
                    ? "border-primary bg-amber-50 ring-2 ring-primary/20"
                    : "border-gray-200 hover:border-primary/50 hover:bg-amber-50/30"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-center min-w-[60px]">
                      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        {timeSlot.dayName.slice(0, 3)}
                      </p>
                      <p className="text-lg font-bold text-foreground">
                        {timeSlot.date}
                      </p>
                    </div>
                    <div className="h-8 w-px bg-gray-200"></div>
                    <div>
                      <p className="text-xl font-bold text-foreground">{timeSlot.time}</p>
                      <p className="text-sm text-muted-foreground">{timeSlot.dayName}</p>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
                    {selectedTimeSlot?.id === timeSlot.id && (
                      <div className="w-3 h-3 rounded-full bg-primary"></div>
                    )}
                  </div>
                </div>
              </div>
            ))
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
            onClick={handleConfirmAppointment}
            disabled={!selectedTimeSlot}
            className={cn(
              "h-14 rounded-xl text-lg font-semibold flex-1 transition-all duration-200",
              selectedTimeSlot 
                ? "shadow-medium hover:shadow-large hover:-translate-y-0.5" 
                : "bg-gray-300 text-gray-500 cursor-not-allowed hover:bg-gray-300 hover:translate-y-0"
            )}
          >
            Bevestig afspraak
          </Button>
        </div>
        
        {/* Telefonisch contact toggle */}
        <div className="mt-4">
          <details className="group">
            <summary className="flex items-center justify-center cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
              <span className="mr-1">Geen geschikte tijd gevonden?</span>
              <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-700">
                    Kunnen we geen geschikte tijd vinden in de komende 2 weken? 
                    Neem dan telefonisch contact op via <strong>020-1234567</strong> voor een persoonlijke afspraak.
                  </p>
                </div>
              </div>
            </div>
          </details>
        </div>
      </CardContent>
    </Card>
  );
};

const Step6AddressVerification = ({ 
  customerData, 
  setCustomerData, 
  handleAddressSubmit,
  onGoBack,
  selectedTimeSlot,
  quote
}: {
  customerData: CustomerData;
  setCustomerData: React.Dispatch<React.SetStateAction<CustomerData>>;
  handleAddressSubmit: (e: React.FormEvent) => void;
  onGoBack: () => void;
  selectedTimeSlot: TimeSlot | null;
  quote: Quote;
}) => {
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleConfirmClick = () => {
    setShowConfirmation(true);
  };

  const handleConfirmSubmit = () => {
    setShowConfirmation(false);
    handleAddressSubmit(new Event('submit') as any);
  };

  const handleCancelSubmit = () => {
    setShowConfirmation(false);
  };

  return (
    <Card className="shadow-medium border-gray-100">
      <CardContent className="p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">Definitieve bevestiging</h2>
          <p className="text-muted-foreground">Controleer alle gegevens voordat je je afspraak definitief maakt</p>
        </div>
        
        {/* Samenvatting */}
        <div className="space-y-4 mb-6">
          {/* Services Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-soft">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <FileText className="w-4 h-4 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-800">Services</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">HEP 3 fase groepenkast</span>
                <span className="font-semibold text-green-600">€ 2.023,44</span>
              </div>
              <div className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Inductie groep aanleg</span>
                <span className="font-semibold text-green-600">€ 150,00</span>
              </div>
              <div className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">4x Kabelroutes keuken</span>
                <span className="font-semibold text-green-600">€ 300,00</span>
              </div>
              <div className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">2x Kabelroutes wasmachine</span>
                <span className="font-semibold text-green-600">€ 150,00</span>
              </div>
              
              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="flex justify-between items-center py-2 px-3 bg-green-50 rounded-lg">
                  <span className="font-semibold text-gray-800">Totaal</span>
                  <span className="font-bold text-green-700 text-lg">€ 2.448,36</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Afspraak Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-soft">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center mr-3">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <h3 className="font-semibold text-gray-800">Afspraak</h3>
            </div>
            <div className="bg-amber-50 rounded-lg p-3">
              <p className="text-sm font-medium text-amber-800">
                {selectedTimeSlot?.dayName}, {selectedTimeSlot?.date} om {selectedTimeSlot?.time}
              </p>
            </div>
          </div>
          
          {/* Contact & Adres Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-soft">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <Check className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-800">Contact & Adres</h3>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs font-medium text-blue-700 mb-1">Contact</p>
                <p className="text-sm text-blue-800">{customerData.email}</p>
                <p className="text-sm text-blue-800">0621145123</p>
              </div>
              
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xs font-medium text-green-700 mb-1">Adres</p>
                <p className="text-sm text-green-800">
                  Hoofdstraat 123<br />
                  1234 AB Amsterdam
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
        
        {/* Confirmation Modal */}
        {showConfirmation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Bevestig je afspraak</h3>
                <p className="text-gray-600">
                  Weet je zeker dat je je afspraak definitief wilt maken?
                </p>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-green-800">
                      <strong>Let op:</strong> Door te bevestigen wordt je afspraak definitief ingepland en ontvang je een bevestiging via WhatsApp.
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
                  Ja, maak definitief
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
  selectedTimeSlot, 
  customerData, 
  quote,
  handleReset 
}: {
  selectedTimeSlot: TimeSlot | null;
  customerData: CustomerData;
  quote: Quote;
  handleReset: () => void;
}) => {
  return (
    <Card className="shadow-medium border-gray-100">
      <CardContent className="p-8 text-center">
        <div className="mb-8">
          <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-large">
            <Check className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Bedankt, je afspraak is ingepland!</h2>
          <p className="text-muted-foreground">Je ontvangt een bevestiging via WhatsApp</p>
        </div>
        
        <div className="bg-gray-50 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-foreground mb-4">Volledige afspraak overzicht</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service:</span>
              <span className="font-medium text-foreground">{quote.service}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Prijs:</span>
              <span className="font-medium text-foreground">€{quote.price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Datum:</span>
              <span className="font-medium text-foreground">{selectedTimeSlot?.dayName}, {selectedTimeSlot?.date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tijd:</span>
              <span className="font-medium text-foreground">{selectedTimeSlot?.time}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium text-foreground">{customerData.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Adres:</span>
              <span className="font-medium text-foreground">{customerData.address}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Postcode:</span>
              <span className="font-medium text-foreground">{customerData.phoneNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plaats:</span>
              <span className="font-medium text-foreground">{customerData.location}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-800">
            <strong>Belangrijk:</strong> Onze elektricien zal voor de afspraak contact opnemen.
          </p>
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
    location: "",
    address: "",
    phoneNumber: ""
  });
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationError, setVerificationError] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [quote] = useState<Quote>(sampleQuote);
  const [currentWeek, setCurrentWeek] = useState(1); // State for week selection

  const handleCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customerData.email.trim()) {
      setCurrentStep(2);
    }
  };

  const handleVerificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Show error for demo code "111111"
    if (verificationCode === "111111") {
      setVerificationError(true);
      return;
    }
    
    setVerificationError(false);
    if (verificationCode.length === 6) {
      setCurrentStep(3);
    }
  };

  const handleAddressConfirm = () => {
    setCurrentStep(5);
  };

  const handleTimeSlotSelect = (timeSlot: TimeSlot) => {
    setSelectedTimeSlot(timeSlot);
  };

  const handleConfirmAppointment = () => {
    setCurrentStep(6);
  };

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentStep(7);
  };

  const handleGoBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
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
          <h1 className="text-3xl font-bold text-foreground">Offerte & Afspraak</h1>
          <p className="text-muted-foreground mt-2">Ontvang een offerte en plan direct je afspraak</p>
        </div>
        
        <ProgressIndicator currentStep={currentStep} />
        
        {currentStep === 1 && (
          <Step1CustomerDetails 
            customerData={customerData}
            setCustomerData={setCustomerData}
            handleCustomerSubmit={handleCustomerSubmit}
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
          />
        )}
        {currentStep === 3 && (
          <Step3QuoteConfirmation 
            quote={quote}
            handleQuoteAccept={() => setCurrentStep(4)}
            onGoBack={handleGoBack}
          />
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
            selectedTimeSlot={selectedTimeSlot}
            handleTimeSlotSelect={handleTimeSlotSelect}
            handleConfirmAppointment={handleConfirmAppointment}
            currentWeek={currentWeek}
            setCurrentWeek={setCurrentWeek}
            onGoBack={handleGoBack}
          />
        )}
        {currentStep === 6 && (
          <Step6AddressVerification 
            customerData={customerData}
            setCustomerData={setCustomerData}
            handleAddressSubmit={handleAddressSubmit}
            onGoBack={handleGoBack}
            selectedTimeSlot={selectedTimeSlot}
            quote={quote}
          />
        )}
        
        {currentStep === 7 && (
          <ConfirmationScreen 
            selectedTimeSlot={selectedTimeSlot}
            customerData={customerData}
            quote={quote}
            handleReset={() => setCurrentStep(1)}
          />
        )}
        
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            © 2024 Holland Electric - Betrouwbare elektriciens
          </p>
        </div>
      </div>
    </div>
  );
} 