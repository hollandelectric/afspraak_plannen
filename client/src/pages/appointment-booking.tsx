import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerData {
  name: string;
  location: string;
}

interface Appointment {
  id: number;
  time: string;
  technician: string;
  distance: string;
  avatar: string;
}

const mockAppointments: Appointment[] = [
  {
    id: 1,
    time: "13:00",
    technician: "Jan Bakker",
    distance: "2.3 km",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=150&h=150"
  },
  {
    id: 2,
    time: "15:30",
    technician: "Peter de Vries",
    distance: "3.1 km",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=150&h=150"
  },
  {
    id: 3,
    time: "17:00",
    technician: "Mark Jansen",
    distance: "4.2 km",
    avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=150&h=150"
  }
];

export default function AppointmentBooking() {
  const [currentStep, setCurrentStep] = useState(1);
  const [customerData, setCustomerData] = useState<CustomerData>({ name: "", location: "" });
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationError, setVerificationError] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

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

  const handleAppointmentSelect = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
  };

  const handleConfirmAppointment = () => {
    if (selectedAppointment) {
      setCurrentStep(4);
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setCustomerData({ name: "", location: "" });
    setVerificationCode("");
    setVerificationError(false);
    setSelectedAppointment(null);
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
              onChange={(e) => setCustomerData(prev => ({ ...prev, name: e.target.value }))}
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
              onChange={(e) => setCustomerData(prev => ({ ...prev, location: e.target.value }))}
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
          <h2 className="text-2xl font-bold text-foreground mb-2">Afspraak kiezen</h2>
          <p className="text-muted-foreground">Selecteer een beschikbaar tijdslot bij een monteur in de buurt</p>
        </div>
        
        <div className="space-y-4 mb-6">
          {mockAppointments.map((appointment) => (
            <div
              key={appointment.id}
              onClick={() => handleAppointmentSelect(appointment)}
              className={cn(
                "border rounded-xl p-4 transition-all duration-200 cursor-pointer",
                selectedAppointment?.id === appointment.id
                  ? "border-primary bg-blue-50"
                  : "border-gray-200 hover:border-primary hover:bg-blue-50"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <img 
                    src={appointment.avatar} 
                    alt={`Monteur ${appointment.technician}`}
                    className="w-12 h-12 rounded-full object-cover shadow-soft"
                  />
                  <div>
                    <p className="font-semibold text-foreground">{appointment.time}</p>
                    <p className="text-sm text-muted-foreground">{appointment.technician}</p>
                    <p className="text-xs text-green-600 font-medium">{appointment.distance}</p>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
                  {selectedAppointment?.id === appointment.id && (
                    <div className="w-3 h-3 rounded-full bg-primary"></div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <Button 
          onClick={handleConfirmAppointment}
          disabled={!selectedAppointment}
          className={cn(
            "w-full h-14 rounded-xl text-lg font-semibold transition-all duration-200",
            selectedAppointment 
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
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-large">
            <Check className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Bedankt, je afspraak is ingepland!</h2>
          <p className="text-muted-foreground">Je ontvangt een bevestiging via WhatsApp</p>
        </div>
        
        <div className="bg-gray-50 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-foreground mb-4">Afspraak Details</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tijd:</span>
              <span className="font-medium text-foreground">{selectedAppointment?.time}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monteur:</span>
              <span className="font-medium text-foreground">{selectedAppointment?.technician}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Afstand:</span>
              <span className="font-medium text-green-600">{selectedAppointment?.distance}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Datum:</span>
              <span className="font-medium text-foreground">Vandaag</span>
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <ProgressIndicator />
        
        {currentStep === 1 && <Step1CustomerDetails />}
        {currentStep === 2 && <Step2Verification />}
        {currentStep === 3 && <Step3AppointmentSelection />}
        {currentStep === 4 && <ConfirmationScreen />}
      </div>
    </div>
  );
}
