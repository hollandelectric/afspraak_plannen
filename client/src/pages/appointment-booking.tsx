import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import logoPath from "@assets/HollandElectric-logo.png (1)_1753019272215.webp";

interface CustomerData {
  name: string;
  location: string;
}

interface TimeSlot {
  id: number;
  date: string;
  time: string;
  dayName: string;
}

const mockTimeSlots: TimeSlot[] = [
  {
    id: 1,
    date: "21 jul",
    time: "09:00",
    dayName: "Maandag"
  },
  {
    id: 2,
    date: "21 jul", 
    time: "14:30",
    dayName: "Maandag"
  },
  {
    id: 3,
    date: "22 jul",
    time: "11:00", 
    dayName: "Dinsdag"
  },
  {
    id: 4,
    date: "23 jul",
    time: "16:00",
    dayName: "Woensdag"
  },
  {
    id: 5,
    date: "24 jul",
    time: "10:30",
    dayName: "Donderdag"
  }
];

export default function AppointmentBooking() {
  const [currentStep, setCurrentStep] = useState(1);
  const [customerData, setCustomerData] = useState<CustomerData>({ name: "", location: "" });
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationError, setVerificationError] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);

  const handleCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customerData.name.trim() && customerData.location.trim()) {
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

  const handleReset = () => {
    setCurrentStep(1);
    setCustomerData({ name: "", location: "" });
    setVerificationCode("");
    setVerificationError(false);
    setSelectedTimeSlot(null);
  };

  const ProgressIndicator = () => (
    <div className="text-center mb-8">
      <div className="flex items-center justify-center space-x-4 mb-6">
        <div className="flex items-center">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shadow-soft transition-colors",
            currentStep >= 1 ? "bg-primary text-primary-foreground" : "bg-gray-200 text-gray-500"
          )}>
            1
          </div>
          <div className="w-16 h-0.5 bg-gray-200 ml-4"></div>
        </div>
        <div className="flex items-center">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors",
            currentStep >= 2 ? "bg-primary text-primary-foreground" : "bg-gray-200 text-gray-500"
          )}>
            2
          </div>
          <div className="w-16 h-0.5 bg-gray-200 ml-4"></div>
        </div>
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors",
          currentStep >= 3 ? "bg-primary text-primary-foreground" : "bg-gray-200 text-gray-500"
        )}>
          3
        </div>
      </div>
      <p className="text-sm text-muted-foreground font-medium">
        {currentStep <= 3 ? `Stap ${currentStep} van 3` : "Voltooid"}
      </p>
    </div>
  );

  const Step1CustomerDetails = () => (
    <Card className="shadow-medium border-gray-100">
      <CardContent className="p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">Klantgegevens</h2>
          <p className="text-muted-foreground">Vul je gegevens in om een afspraak in te plannen</p>
        </div>
        
        <form onSubmit={handleCustomerSubmit} className="space-y-6">
          <div>
            <Label htmlFor="name" className="text-sm font-semibold text-foreground mb-2 block">
              Naam
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Voer je volledige naam in"
              value={customerData.name}
              onChange={(e) => {
                setCustomerData(prev => ({ ...prev, name: e.target.value }));
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
              placeholder="Bijv. Amsterdam, Utrecht"
              value={customerData.location}
              onChange={handleLocationChange}
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

  const Step2Verification = () => (
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
              onChange={handleVerificationChange}
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
          
          <Button 
            type="submit"
            className="w-full h-14 rounded-xl text-lg font-semibold shadow-medium hover:shadow-large transition-all duration-200 hover:-translate-y-0.5"
          >
            Bevestig code
          </Button>
          
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

  const Step3AppointmentSelection = () => (
    <Card className="shadow-medium border-gray-100">
      <CardContent className="p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">Beschikbare tijden</h2>
          <p className="text-muted-foreground">Kies een datum en tijd die het beste uitkomt</p>
        </div>
        
        <div className="space-y-3 mb-6">
          {mockTimeSlots.map((timeSlot) => (
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
          ))}
        </div>
        
        <Button 
          onClick={handleConfirmAppointment}
          disabled={!selectedTimeSlot}
          className={cn(
            "w-full h-14 rounded-xl text-lg font-semibold transition-all duration-200",
            selectedTimeSlot 
              ? "shadow-medium hover:shadow-large hover:-translate-y-0.5" 
              : "bg-gray-300 text-gray-500 cursor-not-allowed hover:bg-gray-300 hover:translate-y-0"
          )}
        >
          Bevestig afspraak
        </Button>
      </CardContent>
    </Card>
  );

  const ConfirmationScreen = () => (
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
          <h3 className="font-semibold text-foreground mb-4">Afspraak Details</h3>
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
              <span className="text-muted-foreground">Naam:</span>
              <span className="font-medium text-foreground">{customerData.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Locatie:</span>
              <span className="font-medium text-foreground">{customerData.location}</span>
            </div>
          </div>
        </div>
        
        <Button 
          onClick={handleReset}
          className="w-full h-14 rounded-xl text-lg font-semibold shadow-medium hover:shadow-large transition-all duration-200 hover:-translate-y-0.5"
        >
          Nieuwe afspraak plannen
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-green-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center mb-8">
          <img 
            src={logoPath} 
            alt="Holland Electric Logo" 
            className="mx-auto h-16 w-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-foreground">Afspraak inplannen</h1>
          <p className="text-muted-foreground mt-2">Plan eenvoudig een afspraak met onze elektriciens</p>
        </div>
        
        <ProgressIndicator />
        
        {currentStep === 1 && <Step1CustomerDetails />}
        {currentStep === 2 && <Step2Verification />}
        {currentStep === 3 && <Step3AppointmentSelection />}
        {currentStep === 4 && <ConfirmationScreen />}
        
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            © 2024 Holland Electric - Betrouwbare elektriciens
          </p>
        </div>
      </div>
    </div>
  );
}
