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
const SPREADSHEET_ID = "1pj4WTs-uZztay21V4b1dQ3ONWwT5BRDpZD3RbddvZg0";
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
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
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
        .setMimeType(ContentService.MimeType.JSON);
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
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
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
      "Customer Address", "Status", "Cleaner Assigned", "Admin Notes", "Payment Status", "Payment Method", "Created At"
    ]);
    bookingsSheet.getRange(1, 1, 1, 16).setFontWeight("bold").setBackground("#d1e7dd");
  } else {
    // Auto-upgrade schema for existing databases
    const lastCol = bookingsSheet.getLastColumn();
    if (lastCol > 0) {
      const headersRange = bookingsSheet.getRange(1, 1, 1, lastCol);
      const headers = headersRange.getValues()[0];
      if (headers.indexOf("Payment Method") === -1) {
        const createdAtIdx = headers.indexOf("Created At");
        if (createdAtIdx !== -1) {
          bookingsSheet.insertColumnBefore(createdAtIdx + 1);
          bookingsSheet.getRange(1, createdAtIdx + 1).setValue("Payment Method").setFontWeight("bold").setBackground("#d1e7dd");
        } else {
          bookingsSheet.getRange(1, lastCol + 1).setValue("Payment Method").setFontWeight("bold").setBackground("#d1e7dd");
        }
      }
    }
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
      ["adminUsername", "admin"],
      ["adminPasscode", "admin123"],
      ["currencySymbol", "₹"],
      ["twilioAccountSid", ""],
      ["twilioAuthToken", ""],
      ["twilioFromNumber", ""],
      ["twilioWhatsAppNumber", ""],
      ["cleanersList", "Jane Smith (+91 98765 43210)\nJohn Doe (+91 87654 32109)\nAlice Johnson (+91 76543 21098)"],
      ["upiId", "9676328206@ybl"],
      ["payeeName", "Nature Home Clean Services"]
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
    booking.paymentStatus || "Unpaid",
    booking.paymentMethod || "Pay After Work Done",
    new Date().toISOString()
  ];
  
  sheet.appendRow(newRow);
  
  // Format booking object for notifications
  const bookingObj = {
    bookingId: bookingId,
    date: booking.date,
    timeSlot: booking.timeSlot,
    serviceName: booking.serviceName,
    homeSize: booking.homeSize || "",
    totalPrice: booking.totalPrice,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    customerPhone: booking.customerPhone,
    customerAddress: booking.customerAddress,
    status: booking.status || "Pending",
    cleanerAssigned: booking.cleanerAssigned || "Unassigned",
    adminNotes: booking.adminNotes || "",
    paymentStatus: booking.paymentStatus || "Unpaid",
    paymentMethod: booking.paymentMethod || "Pay After Work Done",
    createdAt: new Date().toISOString()
  };
  
  sendNotifications(bookingObj, "create");
  
  return { success: true, bookingId: bookingId, booking: bookingObj };
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
  
  // Fetch updated booking row to send update notification
  try {
    const rowValues = sheet.getRange(targetRowIndex, 1, 1, headers.length).getValues()[0];
    const bookingObj = {};
    headers.forEach((header, index) => {
      bookingObj[toCamelCase(header)] = rowValues[index];
    });
    sendNotifications(bookingObj, "update");
  } catch (notificationErr) {
    console.error("Failed to trigger update notification:", notificationErr);
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
    paymentStatus: "Payment Status",
    paymentMethod: "Payment Method",
    createdAt: "Created At"
  };
  return mapping[key] || key;
}

// Send automated email and twilio mobile/whatsapp alerts
function sendNotifications(booking, type) {
  try {
    const ss = getSpreadsheet();
    // Load Settings
    const settings = {};
    const settingsRows = ss.getSheetByName("Settings").getDataRange().getValues();
    for (let i = 1; i < settingsRows.length; i++) {
      settings[settingsRows[i][0]] = settingsRows[i][1];
    }
    
    const companyName = settings.companyName || "Nature Home Clean Services";
    const companyPhone = settings.companyPhone || "";
    const companyEmail = settings.companyEmail || "";
    const currencySymbol = settings.currencySymbol || "₹";

    if (type === "create") {
      // 1. Send Email to Customer
      if (booking.customerEmail && booking.customerEmail.includes("@")) {
        const subject = "Booking Confirmed - " + booking.bookingId + " | " + companyName;
        const body = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #d1e7dd; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #0f5132; color: white; padding: 20px; text-align: center;">
              <h2 style="margin: 0;">${companyName}</h2>
              <p style="margin: 5px 0 0 0;">Eco-Green Cleaning Booking Confirmed!</p>
            </div>
            <div style="padding: 20px; color: #212529;">
              <p>Hi <strong>${booking.customerName}</strong>,</p>
              <p>Thank you for choosing ${companyName}! Your booking has been successfully scheduled. Here are your details:</p>
              
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr style="background-color: #f8f9fa;">
                  <td style="padding: 10px; border: 1px solid #dee2e6; font-weight: bold;">Reference ID</td>
                  <td style="padding: 10px; border: 1px solid #dee2e6; color: #0f5132; font-weight: bold;">${booking.bookingId}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #dee2e6; font-weight: bold;">Service Name</td>
                  <td style="padding: 10px; border: 1px solid #dee2e6;">${booking.serviceName}</td>
                </tr>
                <tr style="background-color: #f8f9fa;">
                  <td style="padding: 10px; border: 1px solid #dee2e6; font-weight: bold;">Home Size</td>
                  <td style="padding: 10px; border: 1px solid #dee2e6;">${booking.homeSize}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #dee2e6; font-weight: bold;">Date & Time</td>
                  <td style="padding: 10px; border: 1px solid #dee2e6;">${booking.date} @ ${booking.timeSlot}</td>
                </tr>
                <tr style="background-color: #f8f9fa;">
                  <td style="padding: 10px; border: 1px solid #dee2e6; font-weight: bold;">Total Price</td>
                  <td style="padding: 10px; border: 1px solid #dee2e6; font-weight: bold; color: #198754;">${currencySymbol}${booking.totalPrice}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #dee2e6; font-weight: bold;">Payment Mode</td>
                  <td style="padding: 10px; border: 1px solid #dee2e6;">${booking.paymentMethod || "Pay After Work Done"}</td>
                </tr>
                <tr style="background-color: #f8f9fa;">
                  <td style="padding: 10px; border: 1px solid #dee2e6; font-weight: bold;">Address</td>
                  <td style="padding: 10px; border: 1px solid #dee2e6;">${booking.customerAddress}</td>
                </tr>
              </table>
              
              <p>You can track the status of your booking inside the app using your reference ID: <strong>${booking.bookingId}</strong>.</p>
              
              <hr style="border: 0; border-top: 1px solid #dee2e6; margin: 20px 0;" />
              <p style="font-size: 12px; color: #6c757d; text-align: center;">
                Need help? Call us at ${companyPhone} or email ${companyEmail}.
              </p>
            </div>
          </div>
        `;
        MailApp.sendEmail({
          to: booking.customerEmail,
          subject: subject,
          htmlBody: body
        });
      }
      
      // 2. Send Email to Admin
      if (companyEmail && companyEmail.includes("@")) {
        const subject = "NEW BOOKING ALERT: " + booking.bookingId + " | " + booking.customerName;
        const body = `
          <h2>New Service Booking Form Received</h2>
          <p>A new cleaning service has been booked:</p>
          <ul>
            <li><strong>Booking ID:</strong> ${booking.bookingId}</li>
            <li><strong>Customer Name:</strong> ${booking.customerName}</li>
            <li><strong>Phone:</strong> ${booking.customerPhone}</li>
            <li><strong>Email:</strong> ${booking.customerEmail}</li>
            <li><strong>Service:</strong> ${booking.serviceName}</li>
            <li><strong>Home Size:</strong> ${booking.homeSize}</li>
            <li><strong>Date & Slot:</strong> ${booking.date} @ ${booking.timeSlot}</li>
            <li><strong>Price:</strong> ${currencySymbol}${booking.totalPrice}</li>
            <li><strong>Address:</strong> ${booking.customerAddress}</li>
            <li><strong>Notes:</strong> ${booking.adminNotes || "None"}</li>
          </ul>
          <p>Please log in to the admin dashboard to assign a cleaner and update the status.</p>
        `;
        MailApp.sendEmail({
          to: companyEmail,
          subject: subject,
          htmlBody: body
        });
      }

      // 3. Send Twilio Alerts
      if (settings.twilioAccountSid && settings.twilioAuthToken) {
        const msg = `Hi ${booking.customerName}, your booking ${booking.bookingId} for ${booking.serviceName} on ${booking.date} @ ${booking.timeSlot} is confirmed. Total: ${currencySymbol}${booking.totalPrice}. Track status at the app! Thank you - ${companyName}`;
        if (settings.twilioFromNumber) {
          sendTwilioMessage(settings, booking.customerPhone, msg, false);
        }
        if (settings.twilioWhatsAppNumber) {
          sendTwilioMessage(settings, booking.customerPhone, msg, true);
        }
        
        const adminMsg = `New Clean Booking ${booking.bookingId}: ${booking.customerName} (${booking.customerPhone}), Service: ${booking.serviceName}, Address: ${booking.customerAddress}, Date: ${booking.date} @ ${booking.timeSlot}.`;
        if (companyPhone) {
          if (settings.twilioFromNumber) {
            sendTwilioMessage(settings, companyPhone, adminMsg, false);
          }
          if (settings.twilioWhatsAppNumber) {
            sendTwilioMessage(settings, companyPhone, adminMsg, true);
          }
        }
      }
    } else if (type === "update") {
      // 1. Send Email to Customer on update
      if (booking.customerEmail && booking.customerEmail.includes("@")) {
        const subject = "Booking Status Updated - " + booking.bookingId + " | " + companyName;
        const body = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #cee3f8; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #0b5ed7; color: white; padding: 20px; text-align: center;">
              <h2 style="margin: 0;">Booking Update</h2>
              <p style="margin: 5px 0 0 0;">Reference ID: ${booking.bookingId}</p>
            </div>
            <div style="padding: 20px; color: #212529;">
              <p>Hi <strong>${booking.customerName}</strong>,</p>
              <p>Your booking status has been updated by the administrator:</p>
              
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; border: 1px solid #dee2e6; margin: 15px 0; text-align: center;">
                <span style="font-size: 14px; text-transform: uppercase; color: #6c757d; font-weight: bold; display: block;">New Status</span>
                <strong style="font-size: 20px; color: #0b5ed7;">${booking.status}</strong>
              </div>
              
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                  <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold;">Assigned Cleaner</td>
                  <td style="padding: 8px; border: 1px solid #dee2e6;">${booking.cleanerAssigned || "Unassigned"}</td>
                </tr>
                <tr style="background-color: #f8f9fa;">
                  <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold;">Date & Time</td>
                  <td style="padding: 8px; border: 1px solid #dee2e6;">${booking.date} @ ${booking.timeSlot}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold;">Total Price</td>
                  <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold;">${currencySymbol}${booking.totalPrice}</td>
                </tr>
              </table>
              
              <p>You can track real-time status updates inside the app using your ID: <strong>${booking.bookingId}</strong>.</p>
              
              <hr style="border: 0; border-top: 1px solid #dee2e6; margin: 20px 0;" />
              <p style="font-size: 12px; color: #6c757d; text-align: center;">
                Need help? Call us at ${companyPhone} or email ${companyEmail}.
              </p>
            </div>
          </div>
        `;
        MailApp.sendEmail({
          to: booking.customerEmail,
          subject: subject,
          htmlBody: body
        });
      }

      // 2. Send Twilio Alerts on update
      if (settings.twilioAccountSid && settings.twilioAuthToken) {
        const cleanerStr = booking.cleanerAssigned && booking.cleanerAssigned !== "Unassigned" ? `, Cleaner: ${booking.cleanerAssigned}` : "";
        const msg = `Hi ${booking.customerName}, your booking ${booking.bookingId} status is updated to: ${booking.status}${cleanerStr}. Track status at the app. - ${companyName}`;
        
        if (settings.twilioFromNumber) {
          sendTwilioMessage(settings, booking.customerPhone, msg, false);
        }
        if (settings.twilioWhatsAppNumber) {
          sendTwilioMessage(settings, booking.customerPhone, msg, true);
        }
        
        // If a cleaner was newly assigned, send details to their phone if cleanerAssigned has a phone number
        const phoneMatch = booking.cleanerAssigned.match(/\+?\d[\d\s\-\(\)]{8,}\d/);
        if (phoneMatch) {
          const cleanerPhone = phoneMatch[0];
          const cleanerMsg = `Hi, you are assigned to booking ${booking.bookingId} for ${booking.customerName} (${booking.customerPhone}) on ${booking.date} @ ${booking.timeSlot}. Address: ${booking.customerAddress}. Notes: ${booking.adminNotes}`;
          if (settings.twilioFromNumber) {
            sendTwilioMessage(settings, cleanerPhone, cleanerMsg, false);
          }
          if (settings.twilioWhatsAppNumber) {
            sendTwilioMessage(settings, cleanerPhone, cleanerMsg, true);
          }
        }
      }
    }
  } catch (err) {
    console.error("Notification failed: ", err);
  }
}

// Twilio API Fetch helper
function sendTwilioMessage(settings, to, body, isWhatsApp) {
  try {
    const sid = settings.twilioAccountSid;
    const token = settings.twilioAuthToken;
    let fromNum = isWhatsApp ? settings.twilioWhatsAppNumber : settings.twilioFromNumber;
    
    if (!sid || !token || !fromNum) return;
    
    let formattedTo = to.trim().replace(/[\s\-\(\)]/g, "");
    if (!formattedTo.startsWith("+") && !formattedTo.startsWith("whatsapp:")) {
      formattedTo = "+91" + formattedTo; // India default prefix
    }
    
    let formattedFrom = fromNum.trim();
    if (isWhatsApp) {
      if (!formattedFrom.startsWith("whatsapp:")) {
        formattedFrom = "whatsapp:" + formattedFrom;
      }
      if (!formattedTo.startsWith("whatsapp:")) {
        formattedTo = "whatsapp:" + formattedTo;
      }
    }
    
    const url = "https://api.twilio.com/2010-04-01/Accounts/" + sid + "/Messages.json";
    const payload = {
      "To": formattedTo,
      "From": formattedFrom,
      "Body": body
    };
    
    const options = {
      "method": "post",
      "headers": {
        "Authorization": "Basic " + Utilities.base64Encode(sid + ":" + token)
      },
      "payload": payload,
      "muteHttpExceptions": true
    };
    
    UrlFetchApp.fetch(url, options);
  } catch (e) {
    console.error("Twilio send failed: " + e.toString());
  }
}
