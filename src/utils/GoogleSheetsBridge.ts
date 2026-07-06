export interface Booking {
  bookingId?: string;
  date: string;
  timeSlot: string;
  serviceName: string;
  homeSize: string; // e.g. "2 Bed, 1 Bath"
  totalPrice: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  status?: "Pending" | "Confirmed" | "In Progress" | "Completed" | "Cancelled";
  cleanerAssigned?: string;
  adminNotes?: string;
  paymentStatus?: "Unpaid" | "Paid";
  createdAt?: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  pricePerBedroom: number;
  pricePerBathroom: number;
  icon: string;
}

export interface CompanySettings {
  companyName: string;
  companyPhone: string;
  companyEmail: string;
  adminUsername?: string;
  adminPasscode: string;
  currencySymbol: string;
  googleAppsScriptUrl?: string;
  recoveryQuestion?: string;
  recoveryAnswer?: string;
  feedbackVideos?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFromNumber?: string;
  twilioWhatsAppNumber?: string;
  cleanersList?: string;
  upiId?: string;
  payeeName?: string;
}

const DEFAULT_SERVICES: Service[] = [
  {
    id: "regular",
    name: "Regular Home Clean",
    description: "Standard cleaning including dusting, mopping, vacuuming, kitchen countertops, and bathroom surfaces.",
    basePrice: 1200,
    pricePerBedroom: 250,
    pricePerBathroom: 150,
    icon: "Sparkles"
  },
  {
    id: "deep",
    name: "Deep Home Clean",
    description: "Intensive clean targeting hidden dirt, behind appliances, interior windows, and detailed bathroom scrubbing.",
    basePrice: 2500,
    pricePerBedroom: 400,
    pricePerBathroom: 250,
    icon: "ShieldCheck"
  },
  {
    id: "eco",
    name: "Eco-Green Clean",
    description: "100% biodegradable, organic, and non-toxic cleaning products. Safe for babies and pets.",
    basePrice: 1800,
    pricePerBedroom: 300,
    pricePerBathroom: 200,
    icon: "Leaf"
  },
  {
    id: "carpet",
    name: "Carpet & Sofa Deep Clean",
    description: "Hot water extraction and organic shampoo cleaning for carpets, area rugs, and upholstered furniture.",
    basePrice: 1500,
    pricePerBedroom: 200,
    pricePerBathroom: 200,
    icon: "Wind"
  },
  {
    id: "kitchen",
    name: "Detailed Kitchen Clean",
    description: "Thorough cleaning of oven, microwave, stovetop, cupboards inside/out, fridge, and cabinet fronts.",
    basePrice: 1600,
    pricePerBedroom: 150,
    pricePerBathroom: 150,
    icon: "Flame"
  },
  {
    id: "pest",
    name: "Natural Pest & Sanitization",
    description: "Eco-friendly natural pest deterrence combined with hospital-grade non-toxic sanitization.",
    basePrice: 2000,
    pricePerBedroom: 300,
    pricePerBathroom: 300,
    icon: "Zap"
  }
];

const DEFAULT_SETTINGS: CompanySettings = {
  companyName: "Nature Home Clean Services",
  companyPhone: "+91 96763 28206",
  companyEmail: "info@naturehomeclean.com",
  adminUsername: "admin",
  adminPasscode: "admin123",
  currencySymbol: "₹",
  recoveryQuestion: "What was the name of your first school?",
  recoveryAnswer: "primary",
  feedbackVideos: "https://www.youtube.com/watch?v=1s9S4N5h-3A\nhttps://www.youtube.com/watch?v=wX-y0K43o1k",
  upiId: "9676328206@ybl",
  payeeName: "Nature Home Clean Services"
};

export class GoogleSheetsBridge {
  private static STORAGE_PREFIX = "nhc_";

  // Load settings (Local Settings cache)
  public static getSettings(): CompanySettings {
    const stored = localStorage.getItem(`${this.STORAGE_PREFIX}settings`);
    if (!stored) {
      localStorage.setItem(`${this.STORAGE_PREFIX}settings`, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  // Save settings locally
  public static saveSettingsLocally(settings: CompanySettings): void {
    localStorage.setItem(`${this.STORAGE_PREFIX}settings`, JSON.stringify(settings));
  }

  // Save settings locally and remotely to Google Sheets if connected
  public static async saveSettings(settings: CompanySettings): Promise<{ success: boolean; error?: string }> {
    // 1. Always save locally first
    this.saveSettingsLocally(settings);

    // 2. If Google Sheets URL is set, save remotely
    if (settings.googleAppsScriptUrl && settings.googleAppsScriptUrl.trim() !== "") {
      try {
        const response = await fetch(settings.googleAppsScriptUrl, {
          method: "POST",
          mode: "cors",
          headers: {
            "Content-Type": "text/plain"
          },
          body: JSON.stringify({
            action: "updateSettings",
            settings: settings
          })
        });
        const result = await response.json();
        if (result.success) {
          return { success: true };
        } else {
          return { success: false, error: result.error || "Failed to save settings remotely on Google Sheets." };
        }
      } catch (err: any) {
        return { success: false, error: err.message || "Failed to make HTTP request to Google Sheets." };
      }
    }

    return { success: true };
  }

  // Fetch all data (Bookings, Services, Settings)
  public static async fetchData(): Promise<{
    bookings: Booking[];
    services: Service[];
    settings: CompanySettings;
  }> {
    const settings = this.getSettings();
    
    // If Google Sheets Integration is set, attempt fetching
    if (settings.googleAppsScriptUrl && settings.googleAppsScriptUrl.trim() !== "") {
      try {
        const response = await fetch(settings.googleAppsScriptUrl, {
          method: "GET",
          mode: "cors"
        });
        const result = await response.json();
        
        if (result.success && result.data) {
          // Normalize formatting from Google Sheets
          const bookings = (result.data.bookings || []).map((b: any) => ({
            bookingId: b.bookingID || b.bookingId,
            date: String(b.date),
            timeSlot: String(b.timeSlot),
            serviceName: String(b.serviceName),
            homeSize: String(b.homeSize || ""),
            totalPrice: Number(b.totalPrice) || 0,
            customerName: String(b.customerName),
            customerEmail: String(b.customerEmail),
            customerPhone: String(b.customerPhone),
            customerAddress: String(b.customerAddress),
            status: b.status || "Pending",
            cleanerAssigned: b.cleanerAssigned || "Unassigned",
            adminNotes: b.adminNotes || "",
            createdAt: b.createdAt || ""
          }));

          const services = (result.data.services || []).map((s: any) => ({
            id: String(s.id),
            name: String(s.name),
            description: String(s.description),
            basePrice: Number(s.basePrice) || 0,
            pricePerBedroom: Number(s.pricePerBedroom) || 0,
            pricePerBathroom: Number(s.pricePerBathroom) || 0,
            icon: String(s.icon)
          }));

          // Merge loaded settings from Google Sheets with local overrides
          const sheetSettingsList = result.data.settings || [];
          const sheetSettingsObj: any = {};
          sheetSettingsList.forEach((item: any) => {
            sheetSettingsObj[item.key] = item.value;
          });

          const mergedSettings: CompanySettings = {
            companyName: sheetSettingsObj.companyName || settings.companyName,
            companyPhone: sheetSettingsObj.companyPhone || settings.companyPhone,
            companyEmail: sheetSettingsObj.companyEmail || settings.companyEmail,
            adminUsername: sheetSettingsObj.adminUsername || settings.adminUsername,
            adminPasscode: sheetSettingsObj.adminPasscode || settings.adminPasscode,
            currencySymbol: sheetSettingsObj.currencySymbol || settings.currencySymbol,
            googleAppsScriptUrl: settings.googleAppsScriptUrl,
            recoveryQuestion: sheetSettingsObj.recoveryQuestion || settings.recoveryQuestion,
            recoveryAnswer: sheetSettingsObj.recoveryAnswer || settings.recoveryAnswer,
            feedbackVideos: sheetSettingsObj.feedbackVideos || settings.feedbackVideos,
            twilioAccountSid: sheetSettingsObj.twilioAccountSid || settings.twilioAccountSid,
            twilioAuthToken: sheetSettingsObj.twilioAuthToken || settings.twilioAuthToken,
            twilioFromNumber: sheetSettingsObj.twilioFromNumber || settings.twilioFromNumber,
            twilioWhatsAppNumber: sheetSettingsObj.twilioWhatsAppNumber || settings.twilioWhatsAppNumber,
            cleanersList: sheetSettingsObj.cleanersList || settings.cleanersList,
            upiId: sheetSettingsObj.upiId || settings.upiId,
            payeeName: sheetSettingsObj.payeeName || settings.payeeName
          };

          // Save settings cache locally
          this.saveSettingsLocally(mergedSettings);

          // Update local bookings cache
          localStorage.setItem(`${this.STORAGE_PREFIX}bookings`, JSON.stringify(bookings));

          return { bookings, services, settings: mergedSettings };
        }
      } catch (err) {
        console.warn("Failed to fetch from Google Sheets, falling back to local cache:", err);
      }
    }

    // Fallback: local storage
    const bookingsStr = localStorage.getItem(`${this.STORAGE_PREFIX}bookings`);
    let bookings: Booking[] = [];
    if (bookingsStr) {
      try {
        bookings = JSON.parse(bookingsStr);
      } catch {
        bookings = [];
      }
    }

    return {
      bookings,
      services: DEFAULT_SERVICES,
      settings
    };
  }

  // Create a new booking
  public static async createBooking(booking: Booking): Promise<{ success: boolean; bookingId?: string; error?: string }> {
    const settings = this.getSettings();
    booking.status = booking.status || "Pending";
    booking.cleanerAssigned = booking.cleanerAssigned || "Unassigned";
    booking.adminNotes = booking.adminNotes || "";
    booking.createdAt = new Date().toISOString();

    // If Google Sheets url is connected, post directly to it
    if (settings.googleAppsScriptUrl && settings.googleAppsScriptUrl.trim() !== "") {
      try {
        const response = await fetch(settings.googleAppsScriptUrl, {
          method: "POST",
          mode: "cors",
          headers: {
            "Content-Type": "text/plain" // Prevents preflight request block in CORS for Google Apps Script
          },
          body: JSON.stringify({
            action: "createBooking",
            booking
          })
        });
        const result = await response.json();
        if (result.success) {
          // Sync local bookings cache with new data
          await this.fetchData();
          return { success: true, bookingId: result.bookingId };
        }
      } catch (err: any) {
        console.error("Failed to save to Google Sheets, using LocalStorage fallback:", err);
      }
    }

    // Local Storage save
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const bookingId = `NHC-${randNum}`;
    const newBooking: Booking = { ...booking, bookingId };

    const storedStr = localStorage.getItem(`${this.STORAGE_PREFIX}bookings`);
    let bookings: Booking[] = [];
    if (storedStr) {
      try {
        bookings = JSON.parse(storedStr);
      } catch {
        bookings = [];
      }
    }
    bookings.push(newBooking);
    localStorage.setItem(`${this.STORAGE_PREFIX}bookings`, JSON.stringify(bookings));

    return { success: true, bookingId };
  }

  // Update an existing booking
  public static async updateBooking(bookingId: string, updates: Partial<Booking>): Promise<{ success: boolean; error?: string }> {
    const settings = this.getSettings();

    if (settings.googleAppsScriptUrl && settings.googleAppsScriptUrl.trim() !== "") {
      try {
        const response = await fetch(settings.googleAppsScriptUrl, {
          method: "POST",
          mode: "cors",
          headers: {
            "Content-Type": "text/plain"
          },
          body: JSON.stringify({
            action: "updateBooking",
            bookingId,
            updates
          })
        });
        const result = await response.json();
        if (result.success) {
          await this.fetchData(); // Refresh local cache
          return { success: true };
        }
      } catch (err: any) {
        console.error("Failed to update on Google Sheets, updating LocalStorage:", err);
      }
    }

    // Local Storage update
    const storedStr = localStorage.getItem(`${this.STORAGE_PREFIX}bookings`);
    if (storedStr) {
      try {
        const bookings: Booking[] = JSON.parse(storedStr);
        const index = bookings.findIndex(b => b.bookingId === bookingId);
        if (index !== -1) {
          bookings[index] = { ...bookings[index], ...updates };
          localStorage.setItem(`${this.STORAGE_PREFIX}bookings`, JSON.stringify(bookings));
          return { success: true };
        }
      } catch {
        return { success: false, error: "Failed to parse local bookings database." };
      }
    }

    return { success: false, error: "Booking ID not found." };
  }

  // Test the Google Sheets connection URL
  public static async testConnection(url: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await fetch(url, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "text/plain"
        },
        body: JSON.stringify({
          action: "test"
        })
      });
      const result = await response.json();
      if (result.success) {
        return { success: true, message: result.message || "Connected successfully!" };
      } else {
        return { success: false, error: result.error || "Google Sheets returned failure status." };
      }
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to make HTTP request. Check CORS settings or URL validity." };
    }
  }

  // Sync any local bookings that aren't on the Sheet (run after a successful connection setup)
  public static async syncLocalToSheets(url: string): Promise<number> {
    const storedStr = localStorage.getItem(`${this.STORAGE_PREFIX}bookings`);
    if (!storedStr) return 0;
    
    let bookings: Booking[] = [];
    try {
      bookings = JSON.parse(storedStr);
    } catch {
      return 0;
    }

    let syncedCount = 0;
    for (const booking of bookings) {
      // If it doesn't have an ID or was created offline, push it to Google Sheets
      try {
        const response = await fetch(url, {
          method: "POST",
          mode: "cors",
          headers: {
            "Content-Type": "text/plain"
          },
          body: JSON.stringify({
            action: "createBooking",
            booking: {
              ...booking,
              status: booking.status || "Pending",
              cleanerAssigned: booking.cleanerAssigned || "Unassigned"
            }
          })
        });
        const result = await response.json();
        if (result.success) {
          syncedCount++;
        }
      } catch (err) {
        console.error("Failed to sync booking:", booking, err);
      }
    }

    return syncedCount;
  }
}
