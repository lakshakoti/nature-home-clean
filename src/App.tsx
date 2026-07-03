import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { GoogleSheetsBridge } from './utils/GoogleSheetsBridge';
import type { Booking, Service, CompanySettings } from './utils/GoogleSheetsBridge';

// Helper to render Lucide icons dynamically from string names
const renderIcon = (name: string, className = "w-5 h-5") => {
  const IconComponent = (Icons as any)[name] || Icons.HelpCircle;
  return <IconComponent className={className} />;
};

// Helper to extract YouTube Video ID from any standard YouTube URL
const extractYoutubeId = (url: string): string | null => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.trim().match(regExp);
  return (match && match[2].length === 11) ? match[2] : url.trim();
};

function App() {
  // App views: "home" | "booking" | "track" | "admin" | "settings"
  const [view, setView] = useState<"home" | "booking" | "track" | "admin" | "settings">("home");
  
  // Database States
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<CompanySettings>({
    companyName: "Nature Home Clean Services",
    companyPhone: "+91 96763 28206",
    companyEmail: "info@naturehomeclean.com",
    adminPasscode: "admin123",
    currencySymbol: "₹"
  });
  const [isLoading, setIsLoading] = useState(true);
  const [syncMessage, setSyncMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Booking Wizard States
  const [bookingStep, setBookingStep] = useState(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [bedrooms, setBedrooms] = useState(1);
  const [bathrooms, setBathrooms] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTimeSlot, setBookingTimeSlot] = useState("");
  const [custName, setCustName] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custAddress, setCustAddress] = useState("");
  const [custNotes, setCustNotes] = useState("");
  
  // Wizard flow results
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

  // Track Booking States
  const [trackQuery, setTrackQuery] = useState("");
  const [trackResult, setTrackResult] = useState<Booking[] | null>(null);

  // Admin Dashboard States
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPassInput, setAdminPassInput] = useState("");
  const [adminAuthError, setAdminAuthError] = useState("");
  const [adminFilter, setAdminFilter] = useState<string>("All");
  const [adminSearch, setAdminSearch] = useState("");
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editStatus, setEditStatus] = useState<string>("");
  const [editCleaner, setEditCleaner] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [isSavingAdminEdit, setIsSavingAdminEdit] = useState(false);

  // Settings Screen States
  const [settingsUrlInput, setSettingsUrlInput] = useState("");
  const [settingsNameInput, setSettingsNameInput] = useState("");
  const [settingsPhoneInput, setSettingsPhoneInput] = useState("");
  const [settingsEmailInput, setSettingsEmailInput] = useState("");
  const [settingsPassInput, setSettingsPassInput] = useState("");
  const [settingsCurrencyInput, setSettingsCurrencyInput] = useState("");
  const [settingsRecoveryQuestionInput, setSettingsRecoveryQuestionInput] = useState("");
  const [settingsRecoveryAnswerInput, setSettingsRecoveryAnswerInput] = useState("");
  const [settingsVideosInput, setSettingsVideosInput] = useState("");
  const [settingsTwilioSidInput, setSettingsTwilioSidInput] = useState("");
  const [settingsTwilioTokenInput, setSettingsTwilioTokenInput] = useState("");
  const [settingsTwilioFromInput, setSettingsTwilioFromInput] = useState("");
  const [settingsTwilioWhatsAppInput, setSettingsTwilioWhatsAppInput] = useState("");
  const [settingsCleanersInput, setSettingsCleanersInput] = useState("");
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);

  // Passcode Recovery Modal States
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [recoveryAnswerInput, setRecoveryAnswerInput] = useState("");
  const [recoveryError, setRecoveryError] = useState("");
  const [isPasscodeResetEligible, setIsPasscodeResetEligible] = useState(false);
  const [newPasscodeInput, setNewPasscodeInput] = useState("");
  const [newPasscodeConfirmInput, setNewPasscodeConfirmInput] = useState("");
  const [recoverySuccessMessage, setRecoverySuccessMessage] = useState("");

  // Service Pricing Addons Definition
  const addonsList = [
    { id: "fridge", name: "Deep Clean Fridge", price: 400, icon: "IceCream" },
    { id: "oven", name: "Deep Clean Oven", price: 400, icon: "Flame" },
    { id: "windows", name: "Interior Windows", price: 500, icon: "Grid" },
    { id: "pet", name: "Pet-Safe Aromatherapy", price: 300, icon: "Heart" },
  ];

  // Load all data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const data = await GoogleSheetsBridge.fetchData();
      setBookings(data.bookings);
      setServices(data.services);
      // Auto-migrate old dollar symbol and phone number from cache if present
      let needsSave = false;
      if (data.settings.currencySymbol === "$") {
        data.settings.currencySymbol = "₹";
        needsSave = true;
      }
      if (data.settings.companyPhone.includes("(555)")) {
        data.settings.companyPhone = "+91 96763 28206";
        needsSave = true;
      }
      if (needsSave) {
        GoogleSheetsBridge.saveSettingsLocally(data.settings);
      }
      setSettings(data.settings);
      
      // Seed settings inputs
      setSettingsUrlInput(data.settings.googleAppsScriptUrl || "");
      setSettingsNameInput(data.settings.companyName);
      setSettingsPhoneInput(data.settings.companyPhone);
      setSettingsEmailInput(data.settings.companyEmail);
      setSettingsPassInput(data.settings.adminPasscode);
      setSettingsCurrencyInput(data.settings.currencySymbol);
      setSettingsRecoveryQuestionInput(data.settings.recoveryQuestion || "What was the name of your first school?");
      setSettingsRecoveryAnswerInput(data.settings.recoveryAnswer || "primary");
      setSettingsVideosInput(data.settings.feedbackVideos || "");
      setSettingsTwilioSidInput(data.settings.twilioAccountSid || "");
      setSettingsTwilioTokenInput(data.settings.twilioAuthToken || "");
      setSettingsTwilioFromInput(data.settings.twilioFromNumber || "");
      setSettingsTwilioWhatsAppInput(data.settings.twilioWhatsAppNumber || "");
      setSettingsCleanersInput(data.settings.cleanersList || "Jane Smith (+91 98765 43210)\nJohn Doe (+91 87654 32109)\nAlice Johnson (+91 76543 21098)");
    } catch (error) {
      console.error("Error loading initial data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get current date string for date limits (min tomorrow)
  const getMinBookingDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  };

  // Calculate pricing in booking step
  const calculateTotalPrice = () => {
    if (!selectedService) return 0;
    let base = selectedService.basePrice;
    
    // Add bedroom cost (subtract 1 bedroom which is included in base)
    const extraBeds = Math.max(0, bedrooms - 1);
    base += extraBeds * selectedService.pricePerBedroom;
    
    // Add bathroom cost (subtract 1 bathroom which is included in base)
    const extraBaths = Math.max(0, bathrooms - 1);
    base += extraBaths * selectedService.pricePerBathroom;

    // Add selected addons
    selectedAddons.forEach(addonId => {
      const addon = addonsList.find(a => a.id === addonId);
      if (addon) base += addon.price;
    });

    return base;
  };

  // Trigger Booking Submission
  const handleConfirmBooking = async () => {
    if (!selectedService) return;
    
    setIsSubmittingBooking(true);
    
    const formattedHomeSize = `${bedrooms} Bed, ${bathrooms} Bath${
      selectedAddons.length > 0 
        ? ` + Addons (${selectedAddons.map(id => addonsList.find(a => a.id === id)?.name).join(", ")})` 
        : ""
    }`;
    
    const newBooking: Booking = {
      date: bookingDate,
      timeSlot: bookingTimeSlot,
      serviceName: selectedService.name,
      homeSize: formattedHomeSize,
      totalPrice: calculateTotalPrice(),
      customerName: custName,
      customerEmail: custEmail,
      customerPhone: custPhone,
      customerAddress: custAddress,
      adminNotes: custNotes ? `Customer Notes: ${custNotes}` : "",
      status: "Pending"
    };

    try {
      const result = await GoogleSheetsBridge.createBooking(newBooking);
      if (result.success && result.bookingId) {
        setCreatedBookingId(result.bookingId);
        setBookingStep(5); // Show success splash
        
        // Refresh local listings
        const data = await GoogleSheetsBridge.fetchData();
        setBookings(data.bookings);
      } else {
        alert("Could not process booking. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("Error booking service.");
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  // Start Booking Flow
  const startBooking = (service: Service) => {
    setSelectedService(service);
    setBedrooms(1);
    setBathrooms(1);
    setSelectedAddons([]);
    setBookingDate("");
    setBookingTimeSlot("");
    setBookingStep(1);
    setView("booking");
  };

  // Reset Booking Wizard
  const resetBookingForm = () => {
    setSelectedService(null);
    setBedrooms(1);
    setBathrooms(1);
    setSelectedAddons([]);
    setBookingDate("");
    setBookingTimeSlot("");
    setCustName("");
    setCustEmail("");
    setCustPhone("");
    setCustAddress("");
    setCustNotes("");
    setCreatedBookingId(null);
    setBookingStep(1);
  };

  // Search Bookings (Customer Tracker)
  const handleTrackSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackQuery.trim()) return;
    
    const query = trackQuery.toLowerCase().trim();
    const matches = bookings.filter(
      b => 
        (b.bookingId && b.bookingId.toLowerCase().includes(query)) ||
        b.customerEmail.toLowerCase().includes(query) ||
        b.customerPhone.includes(query)
    );
    
    // Sort so newest are on top
    matches.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    
    setTrackResult(matches);
  };

  // Admin Passcode authentication
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassInput === settings.adminPasscode) {
      setIsAdminAuthenticated(true);
      setAdminAuthError("");
    } else {
      setAdminAuthError("Invalid passcode. Please check Settings or try again.");
    }
  };

  // Passcode Recovery handlers
  const handleVerifyRecoveryAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    const correctAnswer = (settings.recoveryAnswer || "primary").toLowerCase().trim();
    const inputAnswer = recoveryAnswerInput.toLowerCase().trim();
    
    if (inputAnswer === correctAnswer) {
      setIsPasscodeResetEligible(true);
      setRecoveryError("");
    } else {
      setRecoveryError("Incorrect answer. Please try again or check your Google Sheet.");
    }
  };

  const handleResetPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasscodeInput.trim()) {
      setRecoveryError("Passcode cannot be empty.");
      return;
    }
    if (newPasscodeInput !== newPasscodeConfirmInput) {
      setRecoveryError("Passcodes do not match.");
      return;
    }

    const updatedSettings = {
      ...settings,
      adminPasscode: newPasscodeInput
    };

    GoogleSheetsBridge.saveSettingsLocally(updatedSettings);
    setSettings(updatedSettings);
    setSettingsPassInput(newPasscodeInput);

    setRecoverySuccessMessage("Passcode reset successfully! You can now log in.");
    setRecoveryError("");
    
    // Clear recovery states after a brief delay
    setTimeout(() => {
      setIsRecoveryOpen(false);
      setIsPasscodeResetEligible(false);
      setRecoveryAnswerInput("");
      setNewPasscodeInput("");
      setNewPasscodeConfirmInput("");
      setRecoverySuccessMessage("");
    }, 2500);
  };

  // Admin edit actions
  const startEditingBooking = (booking: Booking) => {
    setEditingBooking(booking);
    setEditStatus(booking.status || "Pending");
    setEditCleaner(booking.cleanerAssigned || "Unassigned");
    setEditNotes(booking.adminNotes || "");
  };

  const handleSaveAdminEdit = async () => {
    if (!editingBooking || !editingBooking.bookingId) return;
    setIsSavingAdminEdit(true);

    try {
      const updates = {
        status: editStatus as any,
        cleanerAssigned: editCleaner,
        adminNotes: editNotes
      };

      const result = await GoogleSheetsBridge.updateBooking(editingBooking.bookingId, updates);
      if (result.success) {
        setEditingBooking(null);
        // Reload data
        const data = await GoogleSheetsBridge.fetchData();
        setBookings(data.bookings);
      } else {
        alert("Failed to update booking on Google Sheets: " + result.error);
      }
    } catch (err) {
      console.error(err);
      alert("Error saving booking edits.");
    } finally {
      setIsSavingAdminEdit(false);
    }
  };

  const handleAutoSaveOnNotify = async () => {
    if (!editingBooking || !editingBooking.bookingId) return;
    try {
      const updates = {
        status: editStatus as any,
        cleanerAssigned: editCleaner,
        adminNotes: editNotes
      };
      await GoogleSheetsBridge.updateBooking(editingBooking.bookingId, updates);
      const data = await GoogleSheetsBridge.fetchData();
      setBookings(data.bookings);
    } catch (err) {
      console.error("Auto-save on notification click failed:", err);
    }
  };

  // Save Settings from settings panel
  const handleSaveSettings = () => {
    const updatedSettings: CompanySettings = {
      companyName: settingsNameInput,
      companyPhone: settingsPhoneInput,
      companyEmail: settingsEmailInput,
      adminPasscode: settingsPassInput,
      currencySymbol: settingsCurrencyInput,
      googleAppsScriptUrl: settingsUrlInput,
      recoveryQuestion: settingsRecoveryQuestionInput,
      recoveryAnswer: settingsRecoveryAnswerInput,
      feedbackVideos: settingsVideosInput,
      twilioAccountSid: settingsTwilioSidInput,
      twilioAuthToken: settingsTwilioTokenInput,
      twilioFromNumber: settingsTwilioFromInput,
      twilioWhatsAppNumber: settingsTwilioWhatsAppInput,
      cleanersList: settingsCleanersInput
    };
    
    GoogleSheetsBridge.saveSettingsLocally(updatedSettings);
    setSettings(updatedSettings);
    setSyncMessage({ type: "success", text: "Settings saved successfully locally! Connecting database..." });
    
    // Automatically trigger test connection if URL is set
    if (updatedSettings.googleAppsScriptUrl) {
      testConnectionUrl(updatedSettings.googleAppsScriptUrl);
    }
    
    setTimeout(() => setSyncMessage(null), 5000);
  };

  // Test connection to Google Apps Script
  const testConnectionUrl = async (url: string) => {
    setIsTestingConnection(true);
    setSyncMessage(null);
    try {
      const result = await GoogleSheetsBridge.testConnection(url);
      if (result.success) {
        setSyncMessage({ type: "success", text: "Connected to Google Drive database successfully!" });
        // Reload data from live sheet
        loadAllData();
      } else {
        setSyncMessage({ type: "error", text: "Connection failed: " + result.error });
      }
    } catch (err: any) {
      setSyncMessage({ type: "error", text: "HTTP Request error: Make sure sheet Apps Script is deployed as Web App for Anyone." });
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Sync Offline Bookings to newly connected sheet
  const handleSyncOfflineData = async () => {
    if (!settings.googleAppsScriptUrl) {
      alert("Please configure a Google Apps Script URL in settings first.");
      return;
    }
    setIsSyncingOffline(true);
    setSyncMessage(null);
    try {
      const count = await GoogleSheetsBridge.syncLocalToSheets(settings.googleAppsScriptUrl);
      setSyncMessage({ type: "success", text: `Successfully synced ${count} local bookings to your Google Sheet!` });
      loadAllData();
    } catch (err: any) {
      setSyncMessage({ type: "error", text: "Sync failed: " + err.message });
    } finally {
      setIsSyncingOffline(false);
    }
  };

  // Calculate statistics for Admin View
  const getAdminStats = () => {
    const pending = bookings.filter(b => b.status === "Pending").length;
    const completed = bookings.filter(b => b.status === "Completed").length;
    const active = bookings.filter(b => b.status === "Confirmed" || b.status === "In Progress").length;
    
    const revenue = bookings
      .filter(b => b.status === "Completed" || b.status === "Confirmed" || b.status === "In Progress")
      .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

    return { pending, completed, active, revenue };
  };

  // Admin filter calculation
  const filteredBookings = bookings.filter(b => {
    const matchesSearch = 
      b.customerName.toLowerCase().includes(adminSearch.toLowerCase()) ||
      (b.bookingId && b.bookingId.toLowerCase().includes(adminSearch.toLowerCase())) ||
      b.serviceName.toLowerCase().includes(adminSearch.toLowerCase());
    
    if (adminFilter === "All") return matchesSearch;
    return b.status === adminFilter && matchesSearch;
  });

  return (
    <div className="app-container">
      {/* HEADER NAVBAR */}
      <header className="app-header">
        <h1>
          {renderIcon("Sparkles", "w-5 h-5 text-accent animate-pulse")}
          <span>{settings.companyName}</span>
        </h1>
        {settings.googleAppsScriptUrl ? (
          <span className="sync-indicator synced" title="Google Sheet Connected">
            {renderIcon("CloudCheck", "w-4 h-4")}
            <span>Cloud</span>
          </span>
        ) : (
          <span className="sync-indicator local" title="LocalStorage Mode">
            {renderIcon("Database", "w-4 h-4")}
            <span>Local</span>
          </span>
        )}
      </header>

      {/* MAIN CONTENT VIEW */}
      <main className="app-content">
        
        {/* LOADING INDICATOR */}
        {isLoading && (
          <div className="text-center py-10 animate-fade-in">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-primary border-t-transparent"></div>
            <p className="mt-4 text-sm text-muted">Refreshing details...</p>
          </div>
        )}

        {!isLoading && (
          <>
            {/* VIEW: HOME LANDING */}
            {view === "home" && (
              <div className="animate-fade-in">
                {/* Hero Banner */}
                <div className="hero-banner">
                  <h2>Breathe Fresh.<br />Live Nature Clean.</h2>
                  <p>Professional eco-friendly cleaning services booked instantly to your doorstep.</p>
                  <button onClick={() => startBooking(services[0] || { id: "regular", name: "Regular Home Clean", basePrice: 80 } as Service)} className="btn btn-accent w-auto text-sm px-6">
                    Book Service Now
                  </button>
                </div>

                {/* Team Uniform Showcase */}
                <div className="premium-card text-left p-0 overflow-hidden mb-4 bg-white border border-gray-150">
                  <img src="/cleaner_team.png" alt="Nature Home Cleaning Services Team" className="w-full h-64 object-cover object-top" />
                  <div className="p-4">
                    <h4 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                      {renderIcon("UserCheck", "w-4 h-4 text-primary")}
                      Meet Our Certified Cleaning Crew
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Our professionals are fully vetted, trained, and dress in brand emerald-green uniforms with standard safety gear for every clean.
                    </p>
                  </div>
                </div>

                {/* Subtitle */}
                <h3 className="text-md font-bold mb-4 flex items-center gap-2" style={{color: "var(--primary)"}}>
                  {renderIcon("Leaf", "w-4 h-4")}
                  Select Eco Cleaning Service
                </h3>

                {/* Service Cards Grid */}
                <div className="services-grid">
                  {services.map((service) => (
                    <button
                      key={service.id}
                      onClick={() => startBooking(service)}
                      className="service-card"
                    >
                      <div className="service-icon-wrapper">
                        {renderIcon(service.icon, "w-5 h-5")}
                      </div>
                      <h3>{service.name}</h3>
                      <span className="price-tag">From {settings.currencySymbol}{service.basePrice}</span>
                    </button>
                  ))}
                </div>

                {/* Customer Feedback Videos */}
                {(() => {
                  const videoUrls = (settings.feedbackVideos || "").split("\n").map(line => line.trim()).filter(Boolean);
                  const videoIds = videoUrls.map(url => extractYoutubeId(url)).filter(Boolean) as string[];

                  if (videoIds.length === 0) return null;

                  return (
                    <div className="premium-card text-left p-0 overflow-hidden mb-4 bg-white border border-gray-150">
                      <div className="p-4 border-b border-gray-100 bg-slate-50/50">
                        <h4 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                          {renderIcon("Video", "w-4 h-4 text-primary")}
                          Watch Real Customer Feedback
                        </h4>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Hear what our customers in the community say about our eco-friendly cleaning services.
                        </p>
                      </div>
                      
                      <div className="p-4">
                        <div className="flex gap-4 overflow-x-auto pb-2 snap-x scrollbar-thin">
                          {videoIds.map((id, index) => (
                            <div key={id} className="w-[280px] flex-shrink-0 snap-start bg-slate-50 rounded-lg overflow-hidden border border-slate-100 shadow-sm">
                              <div className="relative aspect-video">
                                <iframe
                                  src={`https://www.youtube.com/embed/${id}`}
                                  title={`Customer Review Video ${index + 1}`}
                                  className="absolute inset-0 w-full h-full border-0"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                ></iframe>
                              </div>
                              <div className="p-2 text-center bg-white border-t border-slate-100">
                                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                                  Customer Review #{index + 1}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Customer Status Checking Shortcut */}
                <div className="premium-card bg-emerald-50 border-emerald-100 flex items-center justify-between">
                  <div className="text-left">
                    <h4 className="text-sm font-bold text-emerald-900">Already booked?</h4>
                    <p className="text-xs text-emerald-700">Check the schedule and cleaner assignment details.</p>
                  </div>
                  <button onClick={() => setView("track")} className="btn btn-primary w-auto text-xs py-2 px-4">
                    Track Status
                  </button>
                </div>

                {/* Promo Banner / Trust Badge */}
                <div className="premium-card text-left mt-4 bg-white">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Our Quality Guarantee</h4>
                  <div className="flex gap-4 items-center mb-2">
                    <div className="bg-amber-100 p-2 rounded-full text-amber-600">
                      {renderIcon("ShieldCheck", "w-5 h-5")}
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-gray-700">100% Satisfaction Checked</h5>
                      <p className="text-xs text-gray-500">If you are not fully satisfied, we will re-clean for free!</p>
                    </div>
                  </div>
                  <div className="flex gap-4 items-center">
                    <div className="bg-green-100 p-2 rounded-full text-green-600">
                      {renderIcon("Leaf", "w-5 h-5")}
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-gray-700">Certified Organic Products</h5>
                      <p className="text-xs text-gray-500">Zero toxins, eco-labeled detergents, baby & pet friendly.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW: BOOKING WIZARD */}
            {view === "booking" && selectedService && (
              <div className="animate-fade-in">
                {/* Back button */}
                <button 
                  onClick={() => {
                    if (bookingStep > 1 && bookingStep < 5) {
                      setBookingStep(bookingStep - 1);
                    } else {
                      setView("home");
                    }
                  }} 
                  className="btn btn-outline py-2 mb-4 w-auto flex items-center gap-1 text-xs"
                >
                  {renderIcon("ChevronLeft", "w-3 h-3")} Back
                </button>

                {/* Progress Indicators */}
                <div className="wizard-progress">
                  <div 
                    className="progress-line-active" 
                    style={{ width: `${((bookingStep - 1) / 3) * 100}%` }}
                  ></div>
                  <div className={`wizard-step-node ${bookingStep >= 1 ? "active" : ""} ${bookingStep > 1 ? "completed" : ""}`}>1</div>
                  <div className={`wizard-step-node ${bookingStep >= 2 ? "active" : ""} ${bookingStep > 2 ? "completed" : ""}`}>2</div>
                  <div className={`wizard-step-node ${bookingStep >= 3 ? "active" : ""} ${bookingStep > 3 ? "completed" : ""}`}>3</div>
                  <div className={`wizard-step-node ${bookingStep >= 4 ? "active" : ""} ${bookingStep > 4 ? "completed" : ""}`}>4</div>
                </div>

                <div className="premium-card text-left">
                  {/* Step Header Title */}
                  <div className="border-b pb-3 mb-4 flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-primary uppercase tracking-wide">Step {bookingStep} of 4</span>
                      <h2 className="text-lg font-extrabold text-gray-800">
                        {bookingStep === 1 && "Configure Cleaning Size"}
                        {bookingStep === 2 && "Pick Date & Schedule"}
                        {bookingStep === 3 && "Customer Address Details"}
                        {bookingStep === 4 && "Review Details & Book"}
                        {bookingStep === 5 && "Booking Successful!"}
                      </h2>
                    </div>
                    {bookingStep < 5 && (
                      <span className="text-sm font-bold text-secondary">
                        Est: {settings.currencySymbol}{calculateTotalPrice()}
                      </span>
                    )}
                  </div>

                  {/* STEP 1: HOME SIZE & DETAILS */}
                  {bookingStep === 1 && (
                    <div>
                      {/* Service Illustration */}
                      <div className="mb-4 rounded-lg overflow-hidden border">
                        <img 
                          src={
                            selectedService.id === "carpet" 
                              ? "/sofa_cleaning.png" 
                              : "/kitchen_cleaning.png"
                          } 
                          alt={selectedService.name} 
                          className="w-full h-32 object-cover" 
                        />
                      </div>

                      <div className="mb-4">
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Service Type</label>
                        <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg flex items-center gap-3">
                          <div className="bg-primary-light text-primary p-2 rounded-lg">
                            {renderIcon(selectedService.icon, "w-5 h-5")}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-gray-800">{selectedService.name}</h4>
                            <p className="text-xs text-gray-600">{selectedService.description}</p>
                          </div>
                        </div>
                      </div>

                      {/* Bedroom Incrementer */}
                      <div className="form-group">
                        <label>Number of Bedrooms</label>
                        <div className="incrementer-container">
                          <span className="text-sm font-bold text-gray-700">{bedrooms} Bedroom(s)</span>
                          <div className="incrementer-controls">
                            <button onClick={() => setBedrooms(Math.max(1, bedrooms - 1))} className="incrementer-btn" type="button">-</button>
                            <span className="text-sm font-bold">{bedrooms}</span>
                            <button onClick={() => setBedrooms(bedrooms + 1)} className="incrementer-btn" type="button">+</button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">+{settings.currencySymbol}{selectedService.pricePerBedroom} per extra bedroom</p>
                      </div>

                      {/* Bathroom Incrementer */}
                      <div className="form-group">
                        <label>Number of Bathrooms</label>
                        <div className="incrementer-container">
                          <span className="text-sm font-bold text-gray-700">{bathrooms} Bathroom(s)</span>
                          <div className="incrementer-controls">
                            <button onClick={() => setBathrooms(Math.max(1, bathrooms - 1))} className="incrementer-btn" type="button">-</button>
                            <span className="text-sm font-bold">{bathrooms}</span>
                            <button onClick={() => setBathrooms(bathrooms + 1)} className="incrementer-btn" type="button">+</button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">+{settings.currencySymbol}{selectedService.pricePerBathroom} per extra bathroom</p>
                      </div>

                      {/* Addon checkboxes */}
                      <div className="form-group">
                        <label className="mb-2 block">Optional Addons</label>
                        <div className="grid grid-cols-1 gap-2">
                          {addonsList.map(addon => (
                            <label 
                              key={addon.id} 
                              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                                selectedAddons.includes(addon.id) 
                                  ? "border-primary bg-emerald-50/50" 
                                  : "border-gray-200"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input 
                                  type="checkbox" 
                                  checked={selectedAddons.includes(addon.id)}
                                  onChange={() => {
                                    if (selectedAddons.includes(addon.id)) {
                                      setSelectedAddons(selectedAddons.filter(id => id !== addon.id));
                                    } else {
                                      setSelectedAddons([...selectedAddons, addon.id]);
                                    }
                                  }}
                                  className="accent-emerald-700 w-4 h-4"
                                />
                                <div className="text-left">
                                  <span className="text-xs font-bold text-gray-700">{addon.name}</span>
                                </div>
                              </div>
                              <span className="text-xs font-bold text-secondary">+{settings.currencySymbol}{addon.price}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <button 
                        onClick={() => setBookingStep(2)} 
                        className="btn btn-primary mt-4"
                      >
                        Next: Schedule Appointment
                      </button>
                    </div>
                  )}

                  {/* STEP 2: SCHEDULE */}
                  {bookingStep === 2 && (
                    <div>
                      {/* Date Picker */}
                      <div className="form-group">
                        <label htmlFor="booking-date">Choose Appointment Date</label>
                        <input
                          id="booking-date"
                          type="date"
                          min={getMinBookingDate()}
                          value={bookingDate}
                          onChange={(e) => setBookingDate(e.target.value)}
                          className="form-control"
                        />
                      </div>

                      {/* Time Slots */}
                      <div className="form-group">
                        <label>Preferred Time Slot</label>
                        <div className="slots-grid">
                          {[
                            "Morning (8AM - 12PM)",
                            "Afternoon (12PM - 4PM)",
                            "Evening (4PM - 8PM)"
                          ].map(slot => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setBookingTimeSlot(slot)}
                              className={`slot-btn ${bookingTimeSlot === slot ? "selected" : ""}`}
                            >
                              {slot.split(" ")[0]}
                              <span className="block text-[10px] opacity-75">{slot.substring(slot.indexOf("("))}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <button 
                        onClick={() => setBookingStep(3)} 
                        disabled={!bookingDate || !bookingTimeSlot}
                        className="btn btn-primary mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next: Customer Details
                      </button>
                    </div>
                  )}

                  {/* STEP 3: CONTACT INFORMATION */}
                  {bookingStep === 3 && (
                    <div>
                      <div className="form-group">
                        <label htmlFor="cust-name">Full Name</label>
                        <input
                          id="cust-name"
                          type="text"
                          required
                          placeholder="e.g. John Doe"
                          value={custName}
                          onChange={(e) => setCustName(e.target.value)}
                          className="form-control"
                        />
                      </div>

                      <div className="form-row-2">
                        <div className="form-group">
                          <label htmlFor="cust-email">Email Address</label>
                          <input
                            id="cust-email"
                            type="email"
                            required
                            placeholder="john@example.com"
                            value={custEmail}
                            onChange={(e) => setCustEmail(e.target.value)}
                            className="form-control"
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="cust-phone">Phone Number</label>
                          <input
                            id="cust-phone"
                            type="tel"
                            required
                            placeholder="(555) 000-0000"
                            value={custPhone}
                            onChange={(e) => setCustPhone(e.target.value)}
                            className="form-control"
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label htmlFor="cust-address">Home Address</label>
                        <input
                          id="cust-address"
                          type="text"
                          required
                          placeholder="Street Address, City, ZIP Code"
                          value={custAddress}
                          onChange={(e) => setCustAddress(e.target.value)}
                          className="form-control"
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="cust-notes">Special Instructions (Optional)</label>
                        <textarea
                          id="cust-notes"
                          rows={3}
                          placeholder="Key under mat, friendly dog, focus areas, etc..."
                          value={custNotes}
                          onChange={(e) => setCustNotes(e.target.value)}
                          className="form-control"
                        ></textarea>
                      </div>

                      <button 
                        onClick={() => setBookingStep(4)} 
                        disabled={!custName || !custEmail || !custPhone || !custAddress}
                        className="btn btn-primary mt-2 disabled:opacity-50"
                      >
                        Next: Review Summary
                      </button>
                    </div>
                  )}

                  {/* STEP 4: REVIEW & CONFIRM */}
                  {bookingStep === 4 && (
                    <div className="text-left text-sm">
                      <div className="space-y-3 bg-slate-50 p-4 rounded-lg border mb-4">
                        <div className="flex justify-between border-b pb-2">
                          <span className="text-muted">Selected Service:</span>
                          <span className="font-bold text-gray-800">{selectedService.name}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                          <span className="text-muted">Home Size / Extras:</span>
                          <span className="font-bold text-gray-800 text-right">{bedrooms} Bed, {bathrooms} Bath</span>
                        </div>
                        {selectedAddons.length > 0 && (
                          <div className="flex justify-between border-b pb-2">
                            <span className="text-muted">Selected Addons:</span>
                            <span className="font-bold text-gray-800 text-right">
                              {selectedAddons.map(id => addonsList.find(a => a.id === id)?.name).join(", ")}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between border-b pb-2">
                          <span className="text-muted">Date & Time Slot:</span>
                          <span className="font-bold text-gray-800">{bookingDate} @ {bookingTimeSlot.split(" ")[0]}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                          <span className="text-muted">Contact Person:</span>
                          <span className="font-bold text-gray-800">{custName}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                          <span className="text-muted">Phone / Email:</span>
                          <span className="font-bold text-gray-800 text-right">{custPhone} / {custEmail}</span>
                        </div>
                        <div className="flex justify-between pb-1">
                          <span className="text-muted">Address:</span>
                          <span className="font-bold text-gray-800 text-right max-w-[200px] break-words">{custAddress}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center bg-emerald-50 p-4 rounded-lg border border-emerald-100 mb-6">
                        <span className="font-bold text-primary text-md">Total Price Due:</span>
                        <span className="font-extrabold text-emerald-950 text-xl">
                          {settings.currencySymbol}{calculateTotalPrice()}
                        </span>
                      </div>

                      <button
                        onClick={handleConfirmBooking}
                        disabled={isSubmittingBooking}
                        className="btn btn-accent flex items-center justify-center gap-2"
                      >
                        {isSubmittingBooking ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-solid border-gray-900 border-t-transparent"></div>
                            <span>Recording Booking...</span>
                          </>
                        ) : (
                          <>
                            {renderIcon("CheckCircle", "w-5 h-5")}
                            <span>Confirm & Schedule Clean</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* STEP 5: SUCCESS SPLASH */}
                  {bookingStep === 5 && (
                    <div className="text-center py-6">
                      <div className="inline-flex bg-emerald-100 text-emerald-600 p-4 rounded-full mb-4 animate-bounce">
                        {renderIcon("CheckCircle", "w-10 h-10")}
                      </div>
                      <h3 className="text-xl font-bold text-emerald-900 mb-1">Booking Confirmed!</h3>
                      <p className="text-xs text-muted mb-4">Your request has been successfully registered.</p>
                      
                      <div className="bg-gray-50 border p-4 rounded-lg mb-6">
                        <span className="text-xs text-gray-400 block uppercase font-bold">Your Booking Reference ID</span>
                        <span className="text-xl font-extrabold text-primary tracking-widest">{createdBookingId}</span>
                      </div>

                      <div className="text-xs text-left bg-emerald-50 text-emerald-900 p-3 rounded-lg border border-emerald-100 mb-6 space-y-1">
                        <p className="font-bold">What happens next?</p>
                        <p>1. Our team will review the appointment schedule.</p>
                        <p>2. A professional cleaner will be assigned to your home.</p>
                        <p>3. You can track this booking ID in the **Track** tab for real-time updates.</p>
                      </div>

                      <button 
                        onClick={() => {
                          resetBookingForm();
                          setView("home");
                        }} 
                        className="btn btn-primary"
                      >
                        Return to Home Screen
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW: TRACK STATUS */}
            {view === "track" && (
              <div className="animate-fade-in text-left">
                <h2 className="text-lg font-extrabold text-primary mb-2">Track Cleaning Status</h2>
                <p className="text-xs text-muted mb-4">Enter your Reference Booking ID or Email address to search details.</p>

                <form onSubmit={handleTrackSearch} className="search-container">
                  <input
                    type="text"
                    required
                    placeholder="e.g. NHC-1234 or email@domain.com"
                    value={trackQuery}
                    onChange={(e) => setTrackQuery(e.target.value)}
                    className="search-input"
                  />
                  <span className="search-icon">{renderIcon("Search", "w-4 h-4")}</span>
                  <button type="submit" className="hidden"></button>
                </form>

                {trackResult !== null && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Search Matches ({trackResult.length})
                    </h3>

                    {trackResult.length === 0 ? (
                      <div className="premium-card text-center text-muted py-6">
                        {renderIcon("ShieldAlert", "w-8 h-8 text-amber-500 mx-auto mb-2")}
                        <p className="text-sm font-bold">No bookings found</p>
                        <p className="text-xs">Check spelling or create a new booking.</p>
                      </div>
                    ) : (
                      trackResult.map(booking => (
                        <div key={booking.bookingId} className="premium-card bg-white border border-gray-150 relative">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="text-xs font-bold text-gray-400 block">ID: {booking.bookingId}</span>
                              <h4 className="text-md font-bold text-gray-800">{booking.serviceName}</h4>
                            </div>
                            <span className={`badge ${
                              booking.status === "Completed" ? "badge-completed" :
                              booking.status === "In Progress" ? "badge-progress" :
                              booking.status === "Confirmed" ? "badge-confirmed" :
                              booking.status === "Cancelled" ? "badge-cancelled" :
                              "badge-pending"
                            }`}>
                              {booking.status || "Pending"}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-y-2 gap-x-4 border-t pt-3 mt-3 text-xs text-gray-600">
                            <div>
                              <span className="block text-gray-400 font-bold">Date & Time</span>
                              <span>{booking.date} @ {booking.timeSlot.split(" ")[0]}</span>
                            </div>
                            <div>
                              <span className="block text-gray-400 font-bold">Price</span>
                              <span className="font-bold text-emerald-700">{settings.currencySymbol}{booking.totalPrice}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="block text-gray-400 font-bold">Home Size</span>
                              <span>{booking.homeSize}</span>
                            </div>
                            <div>
                              <span className="block text-gray-400 font-bold">Cleaner Assigned</span>
                              <span className="font-semibold text-gray-800">{booking.cleanerAssigned || "Unassigned"}</span>
                            </div>
                            {booking.adminNotes && (
                              <div className="col-span-2 bg-slate-50 p-2 rounded border border-gray-100 text-[11px] italic">
                                <span className="font-bold text-gray-500 block not-italic">Notes:</span>
                                {booking.adminNotes}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* VIEW: ADMIN DASHBOARD */}
            {view === "admin" && (
              <div className="animate-fade-in text-left">
                {!isAdminAuthenticated ? (
                  /* Admin Password Lock Screen */
                  <div className="premium-card text-center max-w-sm mx-auto my-8">
                    <div className="inline-block bg-emerald-50 text-primary p-3 rounded-full mb-3">
                      {renderIcon("Key", "w-8 h-8")}
                    </div>
                    <h3 className="text-md font-bold text-gray-800 mb-1">Owner Admin Dashboard</h3>
                    <p className="text-xs text-muted mb-4">Access restricted. Enter company security passcode.</p>

                    <form onSubmit={handleAdminLogin} className="space-y-4">
                      <div className="form-group text-left">
                        <label htmlFor="admin-passcode">Security Passcode</label>
                        <input
                          id="admin-passcode"
                          type="password"
                          placeholder="e.g. admin123"
                          value={adminPassInput}
                          onChange={(e) => setAdminPassInput(e.target.value)}
                          className="form-control text-center"
                        />
                      </div>
                      
                      <div className="flex justify-between items-center text-xs mt-1 mb-2">
                        <span></span>
                        <button 
                          type="button" 
                          onClick={() => {
                            setIsRecoveryOpen(true);
                            setRecoveryError("");
                            setRecoveryAnswerInput("");
                            setIsPasscodeResetEligible(false);
                          }}
                          className="text-primary hover:underline font-semibold focus:outline-none"
                        >
                          Forgot passcode?
                        </button>
                      </div>
                      
                      {adminAuthError && (
                        <p className="text-xs font-semibold text-red-600">{adminAuthError}</p>
                      )}

                      <button type="submit" className="btn btn-primary">
                        Verify & Unlock
                      </button>
                    </form>
                  </div>
                ) : (
                  /* Admin Interface */
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-extrabold text-primary">Booking Administration</h2>
                      <button 
                        onClick={() => setIsAdminAuthenticated(false)} 
                        className="btn btn-outline py-1 px-3 w-auto text-xs"
                      >
                        Lock Panel
                      </button>
                    </div>

                    {/* Stats Widget Row */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="premium-card p-3 mb-0">
                        <span className="text-xs text-gray-400 block">Pending Reviews</span>
                        <span className="text-2xl font-black text-amber-500">{getAdminStats().pending}</span>
                      </div>
                      <div className="premium-card p-3 mb-0">
                        <span className="text-xs text-gray-400 block">Estimated Revenue</span>
                        <span className="text-2xl font-black text-emerald-700">
                          {settings.currencySymbol}{getAdminStats().revenue}
                        </span>
                      </div>
                      <div className="premium-card p-3 mb-0">
                        <span className="text-xs text-gray-400 block">Active Contracts</span>
                        <span className="text-xl font-bold text-primary">{getAdminStats().active}</span>
                      </div>
                      <div className="premium-card p-3 mb-0">
                        <span className="text-xs text-gray-400 block">Completed Jobs</span>
                        <span className="text-xl font-bold text-gray-500">{getAdminStats().completed}</span>
                      </div>
                    </div>

                    {/* Booking Manager Section */}
                    <div className="premium-card mb-4 bg-white">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bookings List</h3>
                        
                        {/* Status Filter */}
                        <select 
                          value={adminFilter} 
                          onChange={(e) => setAdminFilter(e.target.value)}
                          className="text-xs p-1 border rounded outline-none"
                        >
                          <option value="All">All Statuses</option>
                          <option value="Pending">Pending</option>
                          <option value="Confirmed">Confirmed</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>

                      {/* Admin Search Bar */}
                      <div className="search-container mb-3">
                        <input
                          type="text"
                          placeholder="Search customer, ID, service..."
                          value={adminSearch}
                          onChange={(e) => setAdminSearch(e.target.value)}
                          className="search-input py-2 pl-9 text-xs"
                        />
                        <span className="search-icon">{renderIcon("Search", "w-3 h-3")}</span>
                      </div>

                      {/* Bookings Card List (optimized for mobile size layout) */}
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                        {filteredBookings.length === 0 ? (
                          <p className="text-center text-xs text-muted py-6">No bookings match the criteria.</p>
                        ) : (
                          filteredBookings.map(b => (
                            <div 
                              key={b.bookingId} 
                              onClick={() => startEditingBooking(b)}
                              className="border p-3 rounded-lg hover:border-primary cursor-pointer transition-all bg-slate-50 flex justify-between items-center text-xs"
                            >
                              <div className="text-left space-y-1">
                                <div className="flex gap-2 items-center">
                                  <span className="font-extrabold text-gray-800">{b.bookingId}</span>
                                  <span className="text-muted">|</span>
                                  <span className="font-bold text-primary">{b.serviceName}</span>
                                </div>
                                <p className="text-gray-600 font-semibold">{b.customerName} - {b.customerPhone}</p>
                                <p className="text-gray-400 text-[10px]">{b.date} @ {b.timeSlot.split(" ")[0]}</p>
                              </div>
                              <div className="text-right flex flex-col items-end gap-1">
                                <span className={`badge py-0.5 px-2 text-[10px] ${
                                  b.status === "Completed" ? "badge-completed" :
                                  b.status === "In Progress" ? "badge-progress" :
                                  b.status === "Confirmed" ? "badge-confirmed" :
                                  b.status === "Cancelled" ? "badge-cancelled" :
                                  "badge-pending"
                                }`}>
                                  {b.status}
                                </span>
                                <span className="font-bold text-gray-800">{settings.currencySymbol}{b.totalPrice}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* MODAL / EDIT PANEL FOR ACTIVE BOOKING */}
                    {editingBooking && (
                      <div className="premium-card bg-emerald-50 border border-emerald-200 mt-4 animate-fade-in">
                        <div className="flex justify-between items-center border-b pb-2 mb-3">
                          <h4 className="text-sm font-bold text-emerald-950">Update Booking: {editingBooking.bookingId}</h4>
                          <button onClick={() => setEditingBooking(null)} className="text-xs text-emerald-900 font-bold hover:underline">Close</button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs text-gray-700 mb-4">
                          <div><span className="font-bold block text-gray-400">Customer:</span> {editingBooking.customerName}</div>
                          <div><span className="font-bold block text-gray-400">Contact:</span> {editingBooking.customerPhone}</div>
                          <div className="col-span-2"><span className="font-bold block text-gray-400">Address:</span> {editingBooking.customerAddress}</div>
                        </div>

                        {/* Status Select */}
                        <div className="form-group">
                          <label>Status Update</label>
                          <select 
                            value={editStatus} 
                            onChange={(e) => setEditStatus(e.target.value)}
                            className="form-control"
                          >
                            <option value="Pending">Pending Approval</option>
                            <option value="Confirmed">Confirmed (Scheduled)</option>
                            <option value="In Progress">Cleaner In Progress</option>
                            <option value="Completed">Job Completed</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </div>

                        {/* Cleaner Field */}
                        {(() => {
                          const cleaners = settings.cleanersList
                            ? settings.cleanersList
                                .split("\n")
                                .map(c => c.trim())
                                .filter(c => c.length > 0)
                            : [];
                          
                          return (
                            <div className="form-group text-left">
                              <label>Assign Cleaner</label>
                              {cleaners.length > 0 ? (
                                <>
                                  <select
                                    value={
                                      cleaners.includes(editCleaner) || editCleaner === "Unassigned"
                                        ? editCleaner
                                        : "Other"
                                    }
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === "Other") {
                                        setEditCleaner("");
                                      } else {
                                        setEditCleaner(val);
                                        if (val !== "Unassigned" && editStatus === "Pending") {
                                          setEditStatus("Confirmed");
                                        }
                                      }
                                    }}
                                    className="form-control"
                                  >
                                    <option value="Unassigned">Unassigned</option>
                                    {cleaners.map((cleanerName, idx) => (
                                      <option key={idx} value={cleanerName}>
                                        {cleanerName}
                                      </option>
                                    ))}
                                    <option value="Other">Custom Name / Type Manually...</option>
                                  </select>
                                  
                                  {(!cleaners.includes(editCleaner) && editCleaner !== "Unassigned") && (
                                    <div className="mt-2 animate-fade-in">
                                      <input 
                                        type="text" 
                                        placeholder="Enter custom cleaner name..."
                                        value={editCleaner} 
                                        onChange={(e) => {
                                          setEditCleaner(e.target.value);
                                          if (e.target.value.trim().length > 0 && editStatus === "Pending") {
                                            setEditStatus("Confirmed");
                                          }
                                        }}
                                        className="form-control"
                                      />
                                    </div>
                                  )}
                                </>
                              ) : (
                                <input 
                                  type="text" 
                                  placeholder="e.g. Jane Smith"
                                  value={editCleaner} 
                                  onChange={(e) => {
                                    setEditCleaner(e.target.value);
                                    if (e.target.value.trim().length > 0 && editStatus === "Pending") {
                                      setEditStatus("Confirmed");
                                    }
                                  }}
                                  className="form-control"
                                />
                              )}
                            </div>
                          );
                        })()}

                        {/* Automated/Manual Mobile Notifications */}
                        <div className="mb-4">
                          <label className="block text-gray-400 font-bold mb-1.5">Share Mobile Alerts</label>
                          <div className="grid grid-cols-2 gap-2">
                            <a
                              href={`https://wa.me/${editingBooking.customerPhone.replace(/[\s\-\(\)\+]/g, '').length === 10 ? '91' : ''}${editingBooking.customerPhone.replace(/[\s\-\(\)\+]/g, '')}?text=${encodeURIComponent(
                                `Hi ${editingBooking.customerName}, your booking ${editingBooking.bookingId} for ${editingBooking.serviceName} on ${editingBooking.date} @ ${editingBooking.timeSlot} is updated to status: ${editStatus}. Assigned cleaner: ${editCleaner}. Total: ${settings.currencySymbol}${editingBooking.totalPrice}. Thank you! - ${settings.companyName}`
                              )}`}
                              onClick={handleAutoSaveOnNotify}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-outline py-2 text-xs flex items-center justify-center gap-1.5 border-emerald-500 text-emerald-700 hover:bg-emerald-50/50"
                            >
                              {renderIcon("MessageSquare", "w-4 h-4 text-emerald-600")}
                              <span>WhatsApp Cust</span>
                            </a>

                            <a
                              href={`https://wa.me/?text=${encodeURIComponent(
                                `Hi, you are assigned to booking ${editingBooking.bookingId} for ${editingBooking.customerName} (${editingBooking.customerPhone}) on ${editingBooking.date} @ ${editingBooking.timeSlot}. Service: ${editingBooking.serviceName}. Address: ${editingBooking.customerAddress}. Notes: ${editNotes || 'None'}`
                              )}`}
                              onClick={handleAutoSaveOnNotify}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-outline py-2 text-xs flex items-center justify-center gap-1.5 border-blue-500 text-blue-700 hover:bg-blue-50/50"
                            >
                              {renderIcon("UserCheck", "w-4 h-4 text-blue-600")}
                              <span>WhatsApp Crew</span>
                            </a>
                          </div>
                        </div>

                        {/* Admin Notes */}
                        <div className="form-group">
                          <label>Admin & Cleaner Notes</label>
                          <textarea 
                            rows={2} 
                            placeholder="Add cleaning logs, gate codes, etc..."
                            value={editNotes} 
                            onChange={(e) => setEditNotes(e.target.value)}
                            className="form-control"
                          ></textarea>
                        </div>

                        <button 
                          onClick={handleSaveAdminEdit}
                          disabled={isSavingAdminEdit}
                          className="btn btn-primary"
                        >
                          {isSavingAdminEdit ? "Saving updates..." : "Save Booking Changes"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* VIEW: SETTINGS */}
            {view === "settings" && (
              <div className="animate-fade-in text-left">
                {!isAdminAuthenticated ? (
                  /* Admin Password Lock Screen for Settings */
                  <div className="premium-card text-center max-w-sm mx-auto my-8">
                    <div className="inline-block bg-emerald-50 text-primary p-3 rounded-full mb-3">
                      {renderIcon("Key", "w-8 h-8")}
                    </div>
                    <h3 className="text-md font-bold text-gray-800 mb-1">Owner Admin Settings</h3>
                    <p className="text-xs text-muted mb-4">Access restricted. Enter company security passcode to configure settings.</p>

                    <form onSubmit={handleAdminLogin} className="space-y-4">
                      <div className="form-group text-left">
                        <label htmlFor="admin-settings-passcode">Security Passcode</label>
                        <input
                          id="admin-settings-passcode"
                          type="password"
                          placeholder="e.g. admin123"
                          value={adminPassInput}
                          onChange={(e) => setAdminPassInput(e.target.value)}
                          className="form-control text-center"
                        />
                      </div>
                      
                      <div className="flex justify-between items-center text-xs mt-1 mb-2">
                        <span></span>
                        <button 
                          type="button" 
                          onClick={() => {
                            setIsRecoveryOpen(true);
                            setRecoveryError("");
                            setRecoveryAnswerInput("");
                            setIsPasscodeResetEligible(false);
                          }}
                          className="text-primary hover:underline font-semibold focus:outline-none"
                        >
                          Forgot passcode?
                        </button>
                      </div>
                      
                      {adminAuthError && (
                        <p className="text-xs font-semibold text-red-600">{adminAuthError}</p>
                      )}

                      <button type="submit" className="btn btn-primary">
                        Verify & Unlock
                      </button>
                    </form>
                  </div>
                ) : (
                  <>
                    <h2 className="text-lg font-extrabold text-primary mb-2">App Settings</h2>
                    <p className="text-xs text-muted mb-4">Configure cleaning packages, currencies, and Google Sheets database URL.</p>

                {/* Database Connectivity Status Alert Box */}
                {syncMessage && (
                  <div className={`alert ${syncMessage.type === "success" ? "alert-success" : "alert-info"}`}>
                    {renderIcon(syncMessage.type === "success" ? "CheckCircle" : "ShieldAlert", "w-5 h-5 flex-shrink-0")}
                    <span className="text-xs">{syncMessage.text}</span>
                  </div>
                )}

                {/* Section 1: Company Profile details */}
                <div className="premium-card">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Company Profile</h3>
                  
                  <div className="form-group">
                    <label>Business Name</label>
                    <input 
                      type="text" 
                      value={settingsNameInput} 
                      onChange={(e) => setSettingsNameInput(e.target.value)}
                      className="form-control"
                    />
                  </div>

                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Phone Number</label>
                      <input 
                        type="text" 
                        value={settingsPhoneInput} 
                        onChange={(e) => setSettingsPhoneInput(e.target.value)}
                        className="form-control"
                      />
                    </div>
                    <div className="form-group">
                      <label>Currency Symbol</label>
                      <input 
                        type="text" 
                        value={settingsCurrencyInput} 
                        onChange={(e) => setSettingsCurrencyInput(e.target.value)}
                        className="form-control"
                      />
                    </div>
                  </div>

                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Business Email</label>
                      <input 
                        type="email" 
                        value={settingsEmailInput} 
                        onChange={(e) => setSettingsEmailInput(e.target.value)}
                        className="form-control"
                      />
                    </div>
                    <div className="form-group">
                      <label>Admin Passcode</label>
                      <input 
                        type="text" 
                        value={settingsPassInput} 
                        onChange={(e) => setSettingsPassInput(e.target.value)}
                        className="form-control"
                      />
                    </div>
                  </div>
                </div>

                {/* Passcode Security Recovery Card */}
                <div className="premium-card">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Passcode Recovery Settings</h3>
                  
                  <div className="form-group">
                    <label>Forgot Passcode Security Question</label>
                    <input 
                      type="text" 
                      placeholder="e.g. What was the name of your first school?"
                      value={settingsRecoveryQuestionInput} 
                      onChange={(e) => setSettingsRecoveryQuestionInput(e.target.value)}
                      className="form-control"
                    />
                  </div>
                  
                  <div className="form-group mt-2">
                    <label>Security Answer (case-insensitive)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. primary"
                      value={settingsRecoveryAnswerInput} 
                      onChange={(e) => setSettingsRecoveryAnswerInput(e.target.value)}
                      className="form-control"
                    />
                  </div>
                </div>

                {/* Section 2: Google Sheets Sync URL */}
                <div className="premium-card bg-emerald-50/50 border-emerald-100">
                  <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-1">
                    {renderIcon("Database", "w-4 h-4")} Google Drive Sheet Integration
                  </h3>
                  <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
                    Connect this app directly to a spreadsheet inside your Google Drive so that all booking information is stored in your private cloud document.
                  </p>

                  <div className="form-group">
                    <label>Google Apps Script Web App URL</label>
                    <input 
                      type="url" 
                      placeholder="https://script.google.com/macros/s/.../exec"
                      value={settingsUrlInput} 
                      onChange={(e) => setSettingsUrlInput(e.target.value)}
                      className="form-control"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <button 
                      onClick={() => testConnectionUrl(settingsUrlInput)}
                      disabled={!settingsUrlInput.trim() || isTestingConnection}
                      className="btn btn-outline py-2 text-xs flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      {isTestingConnection ? "Testing..." : "Test Connection"}
                    </button>
                    <button 
                      onClick={handleSyncOfflineData}
                      disabled={!settings.googleAppsScriptUrl || isSyncingOffline}
                      className="btn btn-primary py-2 text-xs flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      {isSyncingOffline ? "Syncing..." : "Sync Offline Data"}
                    </button>
                  </div>
                </div>

                {/* Section: Twilio SMS & WhatsApp Settings */}
                <div className="premium-card">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    {renderIcon("MessageSquare", "w-4 h-4 text-primary")} Automated Twilio Alerts (Optional)
                  </h3>
                  <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
                    Enter your Twilio API credentials to automatically send SMS or WhatsApp confirmations. Leave empty to use manual WhatsApp triggers on bookings instead.
                  </p>
                  
                  <div className="form-group text-left">
                    <label>Twilio Account SID</label>
                    <input 
                      type="text" 
                      placeholder="e.g. ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                      value={settingsTwilioSidInput} 
                      onChange={(e) => setSettingsTwilioSidInput(e.target.value)}
                      className="form-control"
                    />
                  </div>

                  <div className="form-group text-left">
                    <label>Twilio Auth Token</label>
                    <input 
                      type="password" 
                      placeholder="Auth Token"
                      value={settingsTwilioTokenInput} 
                      onChange={(e) => setSettingsTwilioTokenInput(e.target.value)}
                      className="form-control"
                    />
                  </div>

                  <div className="form-row-2 text-left">
                    <div className="form-group">
                      <label>SMS Sender Number</label>
                      <input 
                        type="text" 
                        placeholder="e.g. +14155552671"
                        value={settingsTwilioFromInput} 
                        onChange={(e) => setSettingsTwilioFromInput(e.target.value)}
                        className="form-control"
                      />
                    </div>
                    <div className="form-group">
                      <label>WhatsApp Sender Number</label>
                      <input 
                        type="text" 
                        placeholder="e.g. +14155238886"
                        value={settingsTwilioWhatsAppInput} 
                        onChange={(e) => setSettingsTwilioWhatsAppInput(e.target.value)}
                        className="form-control"
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Cleaner List Configuration */}
                <div className="premium-card">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    {renderIcon("UserCheck", "w-4 h-4 text-primary")} Cleaners & Service Staff List
                  </h3>
                  <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
                    Add the names of your cleaning staff (one per line). These will populate a wowed selection dropdown in your Admin dashboard to quickly assign them to bookings. You can optionally add their phone numbers in brackets.
                  </p>
                  
                  <div className="form-group text-left">
                    <label htmlFor="settings-cleaners-list">Cleaner Names (one per line)</label>
                    <textarea 
                      id="settings-cleaners-list"
                      rows={4}
                      placeholder="e.g.&#10;Jane Smith (+91 98765 43210)&#10;John Doe (+91 87654 32109)"
                      value={settingsCleanersInput} 
                      onChange={(e) => setSettingsCleanersInput(e.target.value)}
                      className="form-control text-left"
                      style={{ fontFamily: "monospace", fontSize: "12px", lineHeight: "1.5" }}
                    />
                  </div>
                </div>

                {/* Section: Feedback & Testimonial Videos */}
                <div className="premium-card">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    {renderIcon("Video", "w-4 h-4")} Customer Feedback Videos (YouTube)
                  </h3>
                  <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
                    Paste YouTube video links or IDs (one per line) below. These videos will be embedded in a beautiful carousel on the home page so users can watch real customer reviews!
                  </p>
                  
                  <div className="form-group text-left">
                    <label htmlFor="settings-feedback-videos">YouTube Links / IDs (one per line)</label>
                    <textarea 
                      id="settings-feedback-videos"
                      rows={4}
                      placeholder="e.g.&#10;https://www.youtube.com/watch?v=1s9S4N5h-3A&#10;https://youtu.be/wX-y0K43o1k"
                      value={settingsVideosInput} 
                      onChange={(e) => setSettingsVideosInput(e.target.value)}
                      className="form-control text-left"
                      style={{ fontFamily: "monospace", fontSize: "12px", lineHeight: "1.5" }}
                    />
                  </div>
                </div>

                {/* Section 3: Step-by-Step copy-paste guides */}
                <div className="premium-card bg-slate-50">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    {renderIcon("HelpCircle", "w-4 h-4")} How to setup Google Drive Storage
                  </h3>
                  <div className="text-xs text-gray-600 space-y-2 leading-relaxed">
                    <p>1. Open Google Sheets and create a new blank spreadsheet.</p>
                    <p>2. Open **Extensions** &gt; **Apps Script**.</p>
                    <p>3. Paste the contents of the code from the file `google_apps_script.js` located at the root of your project.</p>
                    <p>4. Click **Deploy** &gt; **New Deployment**.</p>
                    <p>5. Choose type **Web App**, set *Execute as* to **Me**, and set *Who has access* to **Anyone**.</p>
                    <p>6. Click **Deploy**, authorize permissions, copy the Web App URL, and paste it in the field above.</p>
                  </div>
                </div>

                {/* Save Configurations */}
                <button 
                  onClick={handleSaveSettings} 
                  className="btn btn-accent mt-2"
                >
                  Save App Configurations
                </button>
                  </>
                )}
              </div>
            )}
          </>
        )}

      </main>

      {/* NAVIGATION BAR TAB BUTTONS */}
      <nav className="app-navigation">
        <button 
          onClick={() => {
            setView("home");
            resetBookingForm();
          }} 
          className={`nav-item ${view === "home" || view === "booking" ? "active" : ""}`}
        >
          {renderIcon("Sparkles")}
          <span>Services</span>
        </button>
        <button 
          onClick={() => {
            setView("track");
            setTrackResult(null);
          }} 
          className={`nav-item ${view === "track" ? "active" : ""}`}
        >
          {renderIcon("Search")}
          <span>Track</span>
        </button>
        <button 
          onClick={() => setView("admin")} 
          className={`nav-item ${view === "admin" ? "active" : ""}`}
        >
          {renderIcon("UserCheck")}
          <span>Admin</span>
        </button>
        <button 
          onClick={() => setView("settings")} 
          className={`nav-item ${view === "settings" ? "active" : ""}`}
        >
          {renderIcon("Settings")}
          <span>Settings</span>
        </button>
      </nav>

      {/* PASSCODE RECOVERY MODAL */}
      {isRecoveryOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-scale-in text-left">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-3 flex justify-between items-center">
              <h3 className="font-bold text-sm">Reset Admin Passcode</h3>
              <button 
                onClick={() => setIsRecoveryOpen(false)}
                className="text-white hover:text-gray-200 focus:outline-none"
              >
                {renderIcon("X", "w-5 h-5")}
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {recoverySuccessMessage ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-center space-y-2">
                  <div className="inline-block text-primary p-2 bg-white rounded-full">
                    {renderIcon("CheckCircle", "w-6 h-6")}
                  </div>
                  <p className="text-xs font-semibold text-emerald-800">{recoverySuccessMessage}</p>
                </div>
              ) : !isPasscodeResetEligible ? (
                /* Verification Step */
                <form onSubmit={handleVerifyRecoveryAnswer} className="space-y-3">
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs text-muted mb-2">
                    <span className="font-bold text-gray-700 block mb-1">Spreadsheet Recovery Tip:</span>
                    Since your database is stored on your Google Drive, you can always find or edit your passcode directly in your spreadsheet! Open your Google Sheet, click the <b>settings</b> tab, and your passcode will be in the table.
                  </div>
                  
                  <div className="form-group">
                    <label className="text-xs font-bold text-gray-700">Security Question</label>
                    <div className="text-xs bg-emerald-50/50 border border-emerald-100/50 p-3 rounded-lg text-gray-800 font-medium italic mt-1">
                      "{settings.recoveryQuestion || "What was the name of your first school?"}"
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="recovery-answer">Your Answer</label>
                    <input 
                      type="text" 
                      id="recovery-answer"
                      placeholder="Type the answer you configured..."
                      value={recoveryAnswerInput}
                      onChange={(e) => setRecoveryAnswerInput(e.target.value)}
                      className="form-control"
                      required
                    />
                  </div>
                  
                  {recoveryError && (
                    <p className="text-xs font-semibold text-red-600">{recoveryError}</p>
                  )}
                  
                  <button type="submit" className="btn btn-primary w-full mt-2">
                    Verify Answer
                  </button>
                </form>
              ) : (
                /* Passcode Reset Step */
                <form onSubmit={handleResetPasscode} className="space-y-3">
                  <p className="text-xs text-muted mb-2">Security verified! Enter your new admin passcode below.</p>
                  
                  <div className="form-group">
                    <label htmlFor="new-passcode">New Passcode</label>
                    <input 
                      type="password" 
                      id="new-passcode"
                      placeholder="e.g. admin987"
                      value={newPasscodeInput}
                      onChange={(e) => setNewPasscodeInput(e.target.value)}
                      className="form-control"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="new-passcode-confirm">Confirm Passcode</label>
                    <input 
                      type="password" 
                      id="new-passcode-confirm"
                      placeholder="Re-type new passcode..."
                      value={newPasscodeConfirmInput}
                      onChange={(e) => setNewPasscodeConfirmInput(e.target.value)}
                      className="form-control"
                      required
                    />
                  </div>
                  
                  {recoveryError && (
                    <p className="text-xs font-semibold text-red-600">{recoveryError}</p>
                  )}
                  
                  <button type="submit" className="btn btn-primary w-full mt-2">
                    Save New Passcode
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
