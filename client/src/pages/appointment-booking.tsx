import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
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

// Generate time slots for 3 weeks
const generateTimeSlots = (): TimeSlot[] => {
  const timeSlots: TimeSlot[] = [];
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() + 1); // Start from tomorrow
  
  const availableTimes = ["09:00", "10:30", "11:00", "14:30", "16:00"];
  const dayNames = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"];
  const months = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
  
  let id = 1;
  
  // Generate slots for 3 weeks (21 days)
  for (let week = 0; week < 3; week++) {
    for (let day = 0; day < 7; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + (week * 7) + day);
      
      // Skip weekends for appointments
      if (currentDate.getDay() === 0 || currentDate.getDay() === 6) continue;
      
      // Generate 2-3 random time slots per day
      const numSlots = Math.floor(Math.random() * 2) + 2; // 2-3 slots
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

const ProgressIndicator = ({ currentStep }: { currentStep: number }) => (
  <div className="text-center mb-8">
    <div className="flex items-center justify-center space-x-2 mb-6">
      <div className="flex items-center">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shadow-soft transition-colors",
          currentStep >= 1 ? "bg-primary text-primary-foreground" : "bg-gray-200 text-gray-500"
        )}>
          1
        </div>
        <div className="w-12 h-0.5 bg-gray-200 ml-2"></div>
      </div>
      <div className="flex items-center">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors",
          currentStep >= 2 ? "bg-primary text-primary-foreground" : "bg-gray-200 text-gray-500"
        )}>
          2
        </div>
        <div className="w-12 h-0.5 bg-gray-200 ml-2"></div>
      </div>
      <div className="flex items-center">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors",
          currentStep >= 3 ? "bg-primary text-primary-foreground" : "bg-gray-200 text-gray-500"
        )}>
          3
        </div>
        <div className="w-12 h-0.5 bg-gray-200 ml-2"></div>
      </div>
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors",
        currentStep >= 4 ? "bg-primary text-primary-foreground" : "bg-gray-200 text-gray-500"
      )}>
        4
      </div>
    </div>
    <p className="text-sm text-muted-foreground font-medium">
      {currentStep <= 4 ? `Stap ${currentStep} van 4` : "Voltooid"}
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
        <p className="text-muted-foreground">Vul je email adres in om een afspraak in te plannen</p>
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
          Verificatie starten
        </Button>
        
        <p className="text-xs text-muted-foreground text-center">
          Je ontvangt een code via WhatsApp voor verificatie
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

const Step3AppointmentSelection = ({ 
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
            onClick={() => setCurrentWeek(Math.min(3, currentWeek + 1))}
            disabled={currentWeek === 3}
            className="h-8 w-8 p-0 hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
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
      </CardContent>
    </Card>
  );
};

const Step4AddressVerification = ({ 
  customerData, 
  setCustomerData, 
  handleAddressSubmit,
  onGoBack
}: {
  customerData: CustomerData;
  setCustomerData: React.Dispatch<React.SetStateAction<CustomerData>>;
  handleAddressSubmit: (e: React.FormEvent) => void;
  onGoBack: () => void;
}) => (
  <Card className="shadow-medium border-gray-100">
    <CardContent className="p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Adresgegevens</h2>
        <p className="text-muted-foreground">Vul je adres in voor de afspraak</p>
      </div>
      
      <form onSubmit={handleAddressSubmit} className="space-y-6">
        <div>
          <Label htmlFor="address" className="text-sm font-semibold text-foreground mb-2 block">
            Straatnaam en huisnummer
          </Label>
          <Input
            id="address"
            type="text"
            placeholder="Bijv. Hoofdstraat 123"
            value={customerData.address || ""}
            onChange={(e) => {
              setCustomerData(prev => ({ ...prev, address: e.target.value }));
            }}
            className="shadow-soft rounded-xl border-gray-200 focus:ring-2 focus:ring-primary focus:border-primary h-12"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="postcode" className="text-sm font-semibold text-foreground mb-2 block">
            Postcode
          </Label>
          <Input
            id="postcode"
            type="text"
            placeholder="Bijv. 1234 AB"
            value={customerData.phoneNumber || ""}
            onChange={(e) => {
              setCustomerData(prev => ({ ...prev, phoneNumber: e.target.value }));
            }}
            className="shadow-soft rounded-xl border-gray-200 focus:ring-2 focus:ring-primary focus:border-primary h-12"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="location" className="text-sm font-semibold text-foreground mb-2 block">
            Plaats
          </Label>
          <Input
            id="location"
            type="text"
            placeholder="Bijv. Amsterdam"
            value={customerData.location || ""}
            onChange={(e) => {
              setCustomerData(prev => ({ ...prev, location: e.target.value }));
            }}
            className="shadow-soft rounded-xl border-gray-200 focus:ring-2 focus:ring-primary focus:border-primary h-12"
            required
          />
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
            type="submit"
            className="h-14 rounded-xl text-lg font-semibold flex-1 shadow-medium hover:shadow-large transition-all duration-200 hover:-translate-y-0.5"
          >
            Bevestig gegevens
          </Button>
        </div>
      </form>
    </CardContent>
  </Card>
);

const ConfirmationScreen = ({ 
  selectedTimeSlot, 
  customerData, 
  handleReset 
}: {
  selectedTimeSlot: TimeSlot | null;
  customerData: CustomerData;
  handleReset: () => void;
}) => (
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
  const [currentWeek, setCurrentWeek] = useState(1);

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

  const handleTimeSlotSelect = (timeSlot: TimeSlot) => {
    setSelectedTimeSlot(timeSlot);
  };

  const handleConfirmAppointment = () => {
    if (selectedTimeSlot) {
      setCurrentStep(4);
    }
  };

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customerData.address?.trim() && customerData.phoneNumber?.trim() && customerData.location?.trim()) {
      setCurrentStep(5);
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setCustomerData({ 
      email: "",
      name: "",
      location: "",
      address: "",
      phoneNumber: ""
    });
    setVerificationCode("");
    setVerificationError(false);
    setSelectedTimeSlot(null);
    setCurrentWeek(1);
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
          <h1 className="text-3xl font-bold text-foreground">Afspraak inplannen</h1>
          <p className="text-muted-foreground mt-2">Plan eenvoudig een afspraak met onze elektriciens</p>
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
          <Step3AppointmentSelection 
            selectedTimeSlot={selectedTimeSlot}
            handleTimeSlotSelect={handleTimeSlotSelect}
            handleConfirmAppointment={handleConfirmAppointment}
            currentWeek={currentWeek}
            setCurrentWeek={setCurrentWeek}
            onGoBack={handleGoBack}
          />
        )}
        {currentStep === 4 && (
          <Step4AddressVerification 
            customerData={customerData}
            setCustomerData={setCustomerData}
            handleAddressSubmit={handleAddressSubmit}
            onGoBack={handleGoBack}
          />
        )}
        {currentStep === 5 && (
          <ConfirmationScreen 
            selectedTimeSlot={selectedTimeSlot}
            customerData={customerData}
            handleReset={handleReset}
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