// ========================================
// 📊 SHEETSERVICE.GS - GOOGLE SHEETS OPERATIONS (V2.0 FINAL)
// ========================================

/**
 * Get or Create Sheet (มีอยู่ใน SheetService.gs ต้นฉบับ)
 * (โค้ดนี้ถูกคงไว้ตามไฟล์ต้นฉบับของโปรเจกต์)
 */
function getOrCreateSheet(sheetName, headers = null) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_CONFIG.SPREADSHEET_ID);
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      Logger.log(`📄 Creating sheet: ${sheetName}`);
      sheet = ss.insertSheet(sheetName);
      if (headers && headers.length > 0) {
        sheet.appendRow(headers);
        // formatSheetHeader(sheet, 1); // ต้องเรียกใช้ถ้ามีฟังก์ชันนี้
        Logger.log(`✅ Added headers to ${sheetName}`);
      }
    } else {
      Logger.log(`📄 Sheet exists: ${sheetName}`);
    }
    
    return sheet;
  } catch (error) {
    Logger.log(`❌ Error in getOrCreateSheet: ${error.message}`);
    throw error;
  }
}

/**
 * Save Conversation to Sheet
 * **รวม Logic การบันทึกจากโค้ด loading-animation.js เดิม**
 */
function saveConversation(data) {
  try {
    // ใช้ getOrCreateSheet และอ้างอิงถึง Column Names จาก SHEET_CONFIG
    // เนื่องจากโค้ด Dialogflow เดิมของคุณใช้ชื่อ Sheet และ Column แบบง่าย
    // เราจะสร้าง Sheet "Conversations" ด้วย Headers ที่กำหนดไว้ใน V2.0
    
    // Header V2.0: ['Timestamp', 'User ID', 'User Message', 'Response Format', 'Intent']
    const sheet = getOrCreateSheet(
      SHEET_CONFIG.SHEETS.CONVERSATIONS, 
      SHEET_CONFIG.COLUMNS.CONVERSATIONS
    ); 
    
    sheet.appendRow([
      data.timestamp, 
      data.userId, 
      data.userMessage, 
      data.aiResponse, 
      data.intent
    ]);
    
    Logger.log('💾 Saved conversation to sheet');
    
  } catch (error) {
    Logger.log(`⚠️ Error saving conversation: ${error.message}`);
  }
}

/**
 * Find Row by Value (มีอยู่ใน SheetService.gs ต้นฉบับแล้ว)
 */
function findRowByValue(sheet, columnIndex, searchValue) {
  // โค้ดนี้ถูกคงไว้ตามไฟล์ต้นฉบับ
  try {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][columnIndex - 1] === searchValue) {
        return i + 1;
      }
    }
    return 0;
  } catch (error) {
    Logger.log(`❌ Error finding row: ${error.message}`);
    return 0;
  }
}

/**
 * Update Row (มีอยู่ใน SheetService.gs ต้นฉบับแล้ว)
 */
function updateRow(sheet, rowNumber, values) {
  // โค้ดนี้ถูกคงไว้ตามไฟล์ต้นฉบับ
  try {
    if (rowNumber < 1) return false;
    
    const numCols = values.length;
    sheet.getRange(rowNumber, 1, 1, numCols).setValues([values]);
    Logger.log(`✅ Updated row ${rowNumber}`);
    return true;
    
  } catch (error) {
    Logger.log(`❌ Error updating row: ${error.message}`);
    return false;
  }
}

// NOTE: ฟังก์ชันอื่น ๆ เช่น initializeSheets, formatSheetHeader, deleteRow, clearSheetData, 
// getSheetDataAsArray, getSheetStats มีอยู่ใน SheetService.gs ต้นฉบับแล้ว และสามารถคงไว้ได้