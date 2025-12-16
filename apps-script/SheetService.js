// ========================================
// 📊 SHEETSERVICE.GS - GOOGLE SHEETS OPERATIONS
// ========================================

/**
 * Get or Create Sheet (คงไว้ตามเดิม)
 */
function getOrCreateSheet(sheetName, headers = null) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_CONFIG.SPREADSHEET_ID);
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      Logger.log(`📄 Creating sheet: ${sheetName}`);
      sheet = ss.insertSheet(sheetName);
      if (headers && headers.length > 0) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      }
    }
    return sheet;
  } catch (error) {
    Logger.log(`❌ Error in getOrCreateSheet: ${error.message}`);
    throw error;
  }
}

/**
 * Save Oil Report (คงไว้ตามเดิม - สำหรับฟังก์ชันรายงานน้ำมัน)
 */
function saveOilReport(data) {
  // ... (Code เดิมของคุณสำหรับ Oil Report) ...
  // เพื่อความกระชับ ผมขอละส่วนนี้ไว้ (ใช้โค้ดเดิมได้เลย)
  const ss = SpreadsheetApp.openById(SHEET_CONFIG.SPREADSHEET_ID);
  const sheet = getOrCreateSheet('Oil_Reports', ['Timestamp', 'User ID', 'Branch', 'Amount', 'Type', 'Image URL', 'Month Key']);
  
  const timestamp = new Date();
  const monthKey = Utilities.formatDate(timestamp, 'Asia/Bangkok', 'yyyy-MM');
  
  sheet.appendRow([
    timestamp,
    data.userId,
    data.branch,
    data.amount,
    data.type,
    data.imageUrl,
    monthKey
  ]);
  
  // คำนวณยอดสะสม (Logic เดิม)
  const allData = sheet.getDataRange().getValues();
  const headers = allData.shift();
  const reportData = allData.map(row => {
    let obj = {};
    headers.forEach((header, i) => obj[header.toLowerCase().replace(/ /g, '_')] = row[i]);
    return obj;
  });

  const currentMonthData = reportData.filter(row => {
    const rowBranch = String(row['branch']);
    const rowMonthKey = String(row['month_key']);
    return rowBranch === String(data.branch) && rowMonthKey === monthKey;
  });

  const totalAccumulated = currentMonthData.reduce((sum, row) => {
    const amount = safeParseFloat(row['amount']); 
    const type = String(row['type'] || 'deposit'); 
    return type === 'deposit' ? sum + amount : sum - amount;
  }, 0); 
  
  const goal = SYSTEM_CONFIG.DEFAULTS.OIL_REPORT_GOAL || 10000;
  
  return {
    branch: data.branch,
    latest: data.amount,
    accumulated: totalAccumulated,
    goal: goal
  };
}


// ======================================================
// 🟢 NEW FUNCTIONS ADAPTED FROM YOUR EXAMPLE CODE
// ======================================================

/**
 * Save to Google Sheet (Conversations)
 * ปรับใช้จากโค้ดตัวอย่าง: saveToSheet
 */
function saveConversation(data) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_CONFIG.SPREADSHEET_ID);
    // ใช้ชื่อ Sheet จาก Config หรือ Default 'Conversations'
    const sheetName = INSIGHT_CONFIG.SHEETS.CONVERSATIONS || 'Conversations';
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(['Timestamp', 'User ID', 'Display Name', 'User Message', 'Response Format', 'Intent']);
      
      // จัดรูปแบบหัวตาราง (ตามตัวอย่าง)
      const headerRange = sheet.getRange(1, 1, 1, 6);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4285f4');
      headerRange.setFontColor('#ffffff');
    }
    
    sheet.appendRow([
      data.timestamp, 
      data.userId, 
      data.displayName || 'Unknown', 
      data.userMessage, 
      data.aiResponse, 
      data.intent
    ]);
    Logger.log('💾 Saved conversation to Google Sheets');
  } catch (error) {
    Logger.log('⚠️ Sheets Error (Conversation): ' + error);
  }
}

/**
 * Save Follower to Sheet
 * ปรับใช้จากโค้ดตัวอย่าง: saveFollowerToSheet
 */
function saveFollower(data) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_CONFIG.SPREADSHEET_ID);
    const sheetName = INSIGHT_CONFIG.SHEETS.FOLLOWERS || 'Followers';
    let sheet = ss.getSheetByName(sheetName);
    
    // สร้าง Sheet ใหม่ถ้ายังไม่มี
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow([
        'User ID', 'Display Name', 'Picture URL', 'Language', 'Status Message',
        'First Follow Date', 'Last Follow Date', 'Follow Count', 'Status',
        'Source Channel', 'Tags', 'Last Interaction', 'Total Messages'
      ]);
      
      // จัดรูปแบบหัวตาราง
      const headerRange = sheet.getRange(1, 1, 1, 13);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4285f4');
      headerRange.setFontColor('#ffffff');
    }
    
    // ตรวจสอบว่ามี User นี้อยู่แล้วหรือไม่
    const existingRow = findUserRow(sheet, data.userId);
    
    if (existingRow > 0) {
      // อัพเดทข้อมูลเดิม
      sheet.getRange(existingRow, 1, 1, 13).setValues([[
        data.userId,
        data.displayName,
        data.pictureUrl,
        data.language,
        data.statusMessage,
        data.firstFollowDate,
        data.lastFollowDate,
        data.followCount,
        data.status,
        data.sourceChannel,
        data.tags,
        data.lastInteraction,
        data.totalMessages
      ]]);
      Logger.log('✅ Updated follower data in row: ' + existingRow);
    } else {
      // เพิ่มข้อมูลใหม่
      sheet.appendRow([
        data.userId,
        data.displayName,
        data.pictureUrl,
        data.language,
        data.statusMessage,
        data.firstFollowDate,
        data.lastFollowDate,
        data.followCount,
        data.status,
        data.sourceChannel,
        data.tags,
        data.lastInteraction,
        data.totalMessages
      ]);
      Logger.log('✅ Added new follower');
    }
  } catch (error) {
    Logger.log('❌ Error saving follower: ' + error);
  }
}

/**
 * Update Follower Status
 * ปรับใช้จากโค้ดตัวอย่าง: updateFollowerStatus
 */
function updateFollowerStatus(userId, status, timestamp) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_CONFIG.SPREADSHEET_ID);
    const sheetName = INSIGHT_CONFIG.SHEETS.FOLLOWERS || 'Followers';
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) return;
    
    const row = findUserRow(sheet, userId);
    if (row === 0) return;
    
    // อัพเดทสถานะและเวลา (Column 9 = Status, 12 = Last Interaction)
    sheet.getRange(row, 9).setValue(status); 
    sheet.getRange(row, 12).setValue(timestamp); 
    
    Logger.log(`✅ Updated user ${userId} status to: ${status}`);
  } catch (error) {
    Logger.log('❌ Error updating follower status: ' + error);
  }
}

/**
 * Update Follower Interaction
 * ปรับใช้จากโค้ดตัวอย่าง: updateFollowerInteraction
 */
function updateFollowerInteraction(userId) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_CONFIG.SPREADSHEET_ID);
    const sheetName = INSIGHT_CONFIG.SHEETS.FOLLOWERS || 'Followers';
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) return;
    
    const row = findUserRow(sheet, userId);
    if (row === 0) return;
    
    const currentMessages = sheet.getRange(row, 13).getValue() || 0;
    
    // อัพเดทเวลาและจำนวนข้อความ (Column 12 = Last Interaction, 13 = Total Messages)
    sheet.getRange(row, 12).setValue(new Date()); 
    sheet.getRange(row, 13).setValue(currentMessages + 1); 
    
    Logger.log(`✅ Updated interaction for user: ${userId}`);
  } catch (error) {
    Logger.log('❌ Error updating follower interaction: ' + error);
  }
}

/**
 * Get Follower Data (Helper from Example)
 * ใช้สำหรับดึงข้อมูลเพื่อนับ followCount
 */
function getFollowerDataSheet(userId) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_CONFIG.SPREADSHEET_ID);
    const sheetName = INSIGHT_CONFIG.SHEETS.FOLLOWERS || 'Followers';
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) return null;
    
    const row = findUserRow(sheet, userId);
    if (row === 0) return null;
    
    const data = sheet.getRange(row, 1, 1, 13).getValues()[0];
    
    return {
      userId: data[0],
      displayName: data[1],
      firstFollowDate: data[5],
      followCount: data[7],
      totalMessages: data[12]
    };
  } catch (error) {
    Logger.log('❌ Error getting follower data: ' + error);
    return null;
  }
}

/**
 * Find User Row in Sheet
 * ปรับใช้จากโค้ดตัวอย่าง: findUserRow
 */
function findUserRow(sheet, userId) {
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userId) {
      return i + 1; // คืนค่าเป็นเลขแถว (เริ่มที่ 1)
    }
  }
  
  return 0; // ไม่พบ
}