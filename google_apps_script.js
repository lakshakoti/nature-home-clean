/**
 * Nature Home Clean Services - Database Proxy Script
 * 
 * Paste this script into script.google.com as a standalone script,
 * or go to Extensions -> Apps Script inside a Google Sheet.
 * 
 * Click "Deploy" -> "New Deployment".
 * - Select Type: "Web App"
 * - Execute as: "Me"
 * - Who has access: "Anyone" (so the web app can record bookings)
 * - Copy the Web App URL and paste it in the Nature Home Clean Settings page.
 */

// Target Google Sheet ID (from your spreadsheet link - optional)
// Leave empty ("") if you want the script to automatically find or create a database sheet inside your Google Drive
const SPREADSHEET_ID = "";
// Target Google Drive Folder ID to store database Spreadsheet (optional)
// Leave empty ("") if you want the sheet to be stored in your main Google Drive root directory
const FOLDER_ID = "";
const DATABASE_NAME = "Nature Home Clean Services Database";

// Helper to open or create Spreadsheet database in the target folder/ID
function getSpreadsheet() {
  // Option 1: Open specific Spreadsheet by ID if configured
  if (typeof SPREADSHEET_ID !== 'undefined' && SPREADSHEET_ID && SPREADSHEET_ID.trim() !== "") {
    try {
      return SpreadsheetApp.openById(SPREADSHEET_ID);
    } catch (e) {
      console.warn("Spreadsheet ID access failed, falling back to folder search:", e);
    }
  }

  // Option 2: Search or Create inside specified Folder
  if (typeof FOLDER_ID !== 'undefined' && FOLDER_ID && FOLDER_ID.trim() !== "") {
    try {
      const folder = DriveApp.getFolderById(FOLDER_ID);
      const files = folder.getFilesByName(DATABASE_NAME);
      if (files.hasNext()) {
        const file = files.next();
        return SpreadsheetApp.openById(file.getId());
      } else {
        // Create new spreadsheet inside the specified folder
        const ss = SpreadsheetApp.create(DATABASE_NAME);
        const file = DriveApp.getFileById(ss.getId());
        folder.addFile(file);
        
        // Remove from root folder so it only exists inside the target folder
        try {
          DriveApp.getRootFolder().removeFile(file);
        } catch (removeErr) {
          // Ignore if root removal fails
        }
        return ss;
      }
    } catch (e) {
      console.warn("Folder ID access failed, falling back to bound spreadsheet:", e);
    }
  }
  
  // Option 3: Use spreadsheet the script is bound to (if bound)
  try {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (err) {
    // Ignore bound errors and try auto-creation in Google Drive Root
  }

  // Option 4: Auto-create or find database inside the user's main Google Drive root directory
  try {
    const files = DriveApp.getRootFolder().getFilesByName(DATABASE_NAME);
    if (files.hasNext()) {
      const file = files.next();
      return SpreadsheetApp.openById(file.getId());
    } else {
      return SpreadsheetApp.create(DATABASE_NAME);
    }
  } catch (e) {
    throw new Error("Could not access or create Google Sheets database: " + e.toString());
  }
}

// Handle GET requests (Read data)
function doGet(e) {
  try {
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    
    initializeSheets();
    
    const db = getAllData();
    
    lock.releaseLock();
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: db }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader('Access-Control-Allow-Origin', '*');
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader('Access-Control-Allow-Origin', '*');
  }
}

// Handle POST requests (Write / Update data)
function doPost(e) {
  try {
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    
    initializeSheets();
    
    let requestData;
    try {
      requestData = JSON.parse(e.postData.contents);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Invalid JSON post content" }))
        .setMimeType(ContentService.MimeType.JSON)
        .setHeader('Access-Control-Allow-Origin', '*');
    }
    
    const action = requestData.action;
    const ss = getSpreadsheet();
    let result = { success: false };
    
    if (action === "createBooking") {
      result = createBooking(ss, requestData.booking);
    } else if (action === "updateBooking") {
      result = updateBooking(ss, requestData.bookingId, requestData.updates);
    } else if (action === "updateSettings") {
      result = updateSettings(ss, requestData.settings);
    } else if (action === "test") {
      result = { success: true, message: "Connection successful!" };
    } else {
      result = { success: false, error: "Unknown action: " + action };
    }
    
    lock.releaseLock();
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader('Access-Control-Allow-Origin', '*');
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader('Access-Control-Allow-Origin', '*');
  }
}

// Initialize tables if they do not exist
function initializeSheets() {
  const ss = getSpreadsheet();
  
  // 1. Bookings Sheet
  let bookingsSheet = ss.getSheetByName("Bookings");
  if (!bookingsSheet) {
    bookingsSheet = ss.insertSheet("Bookings");
    bookingsSheet.appendRow([
      "Booking ID", "Date", "Time Slot", "Service Name", "Home Size", 
      "Total Price", "Customer Name", "Customer Email", "Customer Phone", 
      "Customer Address", "Status", "Cleaner Assigned", "Admin Notes", "Created At"
    ]);
    bookingsSheet.getRange(1, 1, 1, 14).setFontWeight("bold").setBackground("#d1e7dd");
  }
  
  // 2. Services Sheet
  let servicesSheet = ss.getSheetByName("Services");
  if (!servicesSheet) {
    servicesSheet = ss.insertSheet("Services");
    servicesSheet.appendRow(["ID", "Name", "Description", "Base Price", "Price Per Bedroom", "Price Per Bathroom", "Icon"]);
    servicesSheet.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#e2e3e5");
    
    // Seed default services
    const defaultServices = [
      ["regular", "Regular Home Clean", "Standard cleaning including dusting, mopping, vacuuming, kitchen countertops, and bathroom surfaces.", "1200", "250", "150", "Sparkles"],
      ["deep", "Deep Home Clean", "Intensive clean targeting hidden dirt, behind appliances, interior windows, and detailed bathroom scrubbing.", "2500", "400", "250", "ShieldCheck"],
      ["eco", "Eco-Green Clean", "100% biodegradable, organic, and non-toxic cleaning products. Safe for babies and pets.", "1800", "300", "200", "Leaf"],
      ["carpet", "Carpet & Sofa Deep Clean", "Hot water extraction and organic shampoo cleaning for carpets, area rugs, and upholstered furniture.", "1500", "200", "200", "Wind"],
      ["kitchen", "Detailed Kitchen Clean", "Thorough cleaning of oven, microwave, stovetop, cupboards inside/out, fridge, and cabinet fronts.", "1600", "150", "150", "Flame"],
      ["pest", "Natural Pest & Sanitization", "Eco-friendly natural pest deterrence combined with hospital-grade non-toxic sanitization.", "2000", "300", "300", "Zap"]
    ];
    
    defaultServices.forEach(row => servicesSheet.appendRow(row));
  }
  
  // 3. Settings Sheet
  let settingsSheet = ss.getSheetByName("Settings");
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet("Settings");
    settingsSheet.appendRow(["Key", "Value"]);
    settingsSheet.getRange(1, 1, 1, 2).setFontWeight("bold").setBackground("#f8d7da");
    
    // Seed default settings
    const defaultSettings = [
      ["companyName", "Nature Home Clean Services"],
      ["companyPhone", "+91 96763 28206"],
      ["companyEmail", "info@naturehomeclean.com"],
      ["adminPasscode", "admin123"],
      ["currencySymbol", "₹"]
    ];
    
    defaultSettings.forEach(row => settingsSheet.appendRow(row));
  }
}

// Helper to fetch all rows as structured objects
function getSheetDataAsObjects(sheet) {
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  
  const headers = rows[0];
  const data = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const obj = {};
    headers.forEach((header, index) => {
      // Map header strings to camelCase or simple keys
      const key = toCamelCase(header);
      obj[key] = row[index];
    });
    data.push(obj);
  }
  
  return data;
}

// Convert header text to camelCase keys
function toCamelCase(str) {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => index === 0 ? word.toLowerCase() : word.toUpperCase())
    .replace(/\s+/g, '');
}

// Fetch all database tables
function getAllData() {
  const ss = getSpreadsheet();
  return {
    bookings: getSheetDataAsObjects(ss.getSheetByName("Bookings")),
    services: getSheetDataAsObjects(ss.getSheetByName("Services")),
    settings: getSheetDataAsObjects(ss.getSheetByName("Settings"))
  };
}

// Create a booking
function createBooking(ss, booking) {
  const sheet = ss.getSheetByName("Bookings");
  
  // Auto-generate booking ID (NHC-XXXX)
  const randNum = Math.floor(1000 + Math.random() * 9000);
  const bookingId = "NHC-" + randNum;
  
  const newRow = [
    bookingId,
    booking.date,
    booking.timeSlot,
    booking.serviceName,
    booking.homeSize || "",
    booking.totalPrice,
    booking.customerName,
    booking.customerEmail,
    booking.customerPhone,
    booking.customerAddress,
    booking.status || "Pending",
    booking.cleanerAssigned || "Unassigned",
    booking.adminNotes || "",
    new Date().toISOString()
  ];
  
  sheet.appendRow(newRow);
  
  return { success: true, bookingId: bookingId, booking: booking };
}

// Update a booking row
function updateBooking(ss, bookingId, updates) {
  const sheet = ss.getSheetByName("Bookings");
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  let targetRowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === bookingId) {
      targetRowIndex = i + 1; // 1-indexed for sheets
      break;
    }
  }
  
  if (targetRowIndex === -1) {
    return { success: false, error: "Booking ID not found: " + bookingId };
  }
  
  // Apply updates
  for (let key in updates) {
    const columnName = fromCamelCase(key);
    const colIndex = headers.indexOf(columnName);
    if (colIndex !== -1) {
      sheet.getRange(targetRowIndex, colIndex + 1).setValue(updates[key]);
    }
  }
  
  return { success: true, message: "Booking updated successfully" };
}

// Update company settings
function updateSettings(ss, settingsObj) {
  const sheet = ss.getSheetByName("Settings");
  const data = sheet.getDataRange().getValues();
  
  for (let key in settingsObj) {
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        sheet.getRange(i + 1, 2).setValue(settingsObj[key]);
        found = true;
        break;
      }
    }
    if (!found) {
      sheet.appendRow([key, settingsObj[key]]);
    }
  }
  
  return { success: true, message: "Settings updated successfully" };
}

// Map camelCase keys back to Sheet Header names
function fromCamelCase(key) {
  const mapping = {
    bookingId: "Booking ID",
    date: "Date",
    timeSlot: "Time Slot",
    serviceName: "Service Name",
    homeSize: "Home Size",
    totalPrice: "Total Price",
    customerName: "Customer Name",
    customerEmail: "Customer Email",
    customerPhone: "Customer Phone",
    customerAddress: "Customer Address",
    status: "Status",
    cleanerAssigned: "Cleaner Assigned",
    adminNotes: "Admin Notes",
    createdAt: "Created At"
  };
  return mapping[key] || key;
}
