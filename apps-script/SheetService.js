// ========================================
// 📊 SHEETSERVICE.GS - GOOGLE SHEETS OPERATIONS
// ========================================

/**
 * Get or Create Sheet
 * สร้าง Sheet ใหม่ถ้ายังไม่มี พร้อม Headers
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
        
        // จัดรูปแบบ Header
        const headerRange = sheet.getRange(1, 1, 1, headers.length);
        headerRange.setFontWeight('bold');
        headerRange.setBackground('#4285f4');
        headerRange.setFontColor('#ffffff');
      }
    }
    return sheet;
  } catch (error) {
    Logger.log(`❌ Error in getOrCreateSheet: ${error.message}`);
    throw error;
  }
}


// ========================================
// 🛢️ OIL REPORT FUNCTIONS
// ========================================

/**
 * Save Oil Report
 * บันทึกรายงานน้ำมันลง Sheet พร้อมคำนวณยอดสะสม
 * (เวอร์ชันปรับปรุง: เพิ่ม Flush และจัดการ Month Key ให้แม่นยำ)
 */
function saveOilReport(data) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_CONFIG.SPREADSHEET_ID);
    const sheetName = SHEET_CONFIG.SHEETS.OIL_REPORTS || 'Oil_Reports';
    let sheet = ss.getSheetByName(sheetName);
    
    const configHeaders = SHEET_CONFIG.COLUMNS.OIL_REPORTS; 
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(configHeaders);
      sheet.getRange(1, 1, 1, configHeaders.length).setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');
    } else {
      const currentHeaders = sheet.getRange(1, 1, 1, configHeaders.length).getValues()[0];
      const isHeaderMatch = currentHeaders.every((h, i) => String(h).toLowerCase() === configHeaders[i].toLowerCase());
      
      if (!isHeaderMatch) {
        Logger.log('⚠️ Header mismatch detected. Updating headers to match Config...');
        sheet.getRange(1, 1, 1, configHeaders.length).setValues([configHeaders]);
      }
    }
    
    const timestamp = new Date();
    const monthKey = Utilities.formatDate(timestamp, 'Asia/Bangkok', 'yyyy-MM');
    
    // เตรียมข้อมูล: timestamp, branch, amount, type, image_url, staff_user_id, month_key
    const rowData = [timestamp, data.branch, data.amount, data.type || 'deposit', data.imageUrl, data.userId, monthKey];
    
    sheet.appendRow(rowData);
    
    // 💡 เพิ่มการตั้งค่า Format ของคอลัมน์ Month Key (คอลัมน์ที่ 7) ให้เป็น Plain Text เพื่อป้องกัน Sheets แปลงเป็น Date
    sheet.getRange(sheet.getLastRow(), 7).setNumberFormat('@');
    
    // 💡 สำคัญ: สั่งให้ Google Sheets อัปเดตข้อมูลทันที
    SpreadsheetApp.flush();
    
    const allData = sheet.getDataRange().getValues();
    const headers = allData.shift(); 
    
    const reportData = allData.map(row => {
      let obj = {};
      headers.forEach((h, i) => {
        if (h) {
          const key = String(h).toLowerCase().trim().replace(/\s+/g, '_');
          obj[key] = row[i];
        }
      });
      return obj;
    });
    
    // กรองข้อมูลด้วย Logic ที่รองรับทั้ง String และ Date Object
    const currentMonthData = reportData.filter(row => {
      // เปรียบเทียบสาขา (แบบไม่สน Case)
      const branchMatch = String(row['branch'] || '').trim().toLowerCase() === String(data.branch).trim().toLowerCase();

      // เปรียบเทียบ Month Key (จัดการกรณี Sheets แปลงเป็น Date Object)
      let rowMonthKey = row['month_key'];
      if (rowMonthKey instanceof Date) {
        rowMonthKey = Utilities.formatDate(rowMonthKey, 'Asia/Bangkok', 'yyyy-MM');
      } else {
        rowMonthKey = String(rowMonthKey || '').trim();
      }
      
      return branchMatch && (rowMonthKey === monthKey);
    });
    
    const totalAccumulated = currentMonthData.reduce((sum, row) => {
      const amt = safeParseFloat(row['amount']); 
      const type = String(row['type'] || 'deposit').toLowerCase();
      return type === 'deposit' ? sum + amt : sum - amt;
    }, 0);
    
    return {
      branch: data.branch,
      latest: data.amount,
      accumulated: totalAccumulated,
      goal: SYSTEM_CONFIG.DEFAULTS.OIL_REPORT_GOAL || 10000
    };
    
  } catch (error) {
    Logger.log(`❌ Error in saveOilReport: ${error.message}`);
    throw error;
  }
}

// ========================================
// 👥 FOLLOWER & CONVERSATION FUNCTIONS
// ========================================

/**
 * Save Conversation to Sheet
 * บันทึกบทสนทนาระหว่าง User และ Bot
 */
function saveConversation(data) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_CONFIG.SPREADSHEET_ID);
    const sheetName = SHEET_CONFIG.SHEETS.CONVERSATIONS || 'Conversations';
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(['Timestamp', 'User ID', 'Display Name', 'User Message', 'Response Format', 'Intent']);
      
      // จัดรูปแบบหัวตาราง
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
 * บันทึกหรืออัพเดทข้อมูลผู้ติดตาม
 */
function saveFollower(data) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_CONFIG.SPREADSHEET_ID);
    const sheetName = SHEET_CONFIG.SHEETS.FOLLOWERS || 'Followers';
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
 * อัพเดทสถานะของผู้ติดตาม (active/blocked)
 */
function updateFollowerStatus(userId, status, timestamp) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_CONFIG.SPREADSHEET_ID);
    const sheetName = SHEET_CONFIG.SHEETS.FOLLOWERS || 'Followers';
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
 * อัพเดทข้อมูลการโต้ตอบของผู้ติดตาม
 */
function updateFollowerInteraction(userId) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_CONFIG.SPREADSHEET_ID);
    const sheetName = SHEET_CONFIG.SHEETS.FOLLOWERS || 'Followers';
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
 * Get Follower Data from Sheet
 * ดึงข้อมูลผู้ติดตามเพื่อใช้ในการนับ followCount
 */
function getFollowerDataSheet(userId) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_CONFIG.SPREADSHEET_ID);
    const sheetName = SHEET_CONFIG.SHEETS.FOLLOWERS || 'Followers';
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


// ========================================
// 🛠️ HELPER FUNCTIONS
// ========================================

/**
 * Find User Row in Sheet
 * หาแถวของ User ในแผ่นงาน
 */
function findUserRow(sheet, userId) {
  try {
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        return i + 1; // คืนค่าเป็นเลขแถว (1-based)
      }
    }
    
    return 0; // ไม่พบ
  } catch (error) {
    Logger.log(`❌ Error finding user row: ${error.message}`);
    return 0;
  }
}

/**
 * Find Row By Value
 * หาแถวที่มีค่าตรงกับที่ต้องการในคอลัมน์ที่ระบุ
 */
function findRowByValue(sheet, column, value) {
  try {
    if (!sheet || sheet.getLastRow() < 2) return 0;
    
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][column - 1] === value) {
        return i + 1; // คืนค่าเป็นเลขแถว (1-based)
      }
    }
    
    return 0; // ไม่พบ
    
  } catch (error) {
    Logger.log(`❌ Error finding row: ${error.message}`);
    return 0;
  }
}

/**
 * Update Row
 * อัพเดทข้อมูลในแถวที่ระบุ
 */
function updateRow(sheet, rowNum, rowData) {
  try {
    if (!sheet || rowNum < 1) return false;
    
    sheet.getRange(rowNum, 1, 1, rowData.length).setValues([rowData]);
    return true;
    
  } catch (error) {
    Logger.log(`❌ Error updating row: ${error.message}`);
    return false;
  }
}

/**
 * Get Sheet Data As Array
 * ดึงข้อมูลจาก Sheet เป็น Array of Objects
 */
function getSheetDataAsArray(sheetName) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet || sheet.getLastRow() < 2) {
      return [];
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data.shift();
    
    return data.map(row => {
      let obj = {};
      headers.forEach((header, i) => {
        obj[header] = row[i];
      });
      return obj;
    });
    
  } catch (error) {
    Logger.log(`❌ Error getting sheet data: ${error.message}`);
    return [];
  }
}

/**
 * Is Duplicate Date
 * ตรวจสอบว่ามีวันที่นี้ในระบบแล้วหรือไม่ (ใช้ใน InsightService)
 */
function isDuplicateDate(sheet, date) {
  try {
    if (!sheet || sheet.getLastRow() < 2) return false;
    
    const data = sheet.getDataRange().getValues();
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    for (let i = 1; i < data.length; i++) {
      if (!data[i][0]) continue;
      
      const rowDate = new Date(data[i][0]);
      rowDate.setHours(0, 0, 0, 0);
      
      if (rowDate.getTime() === targetDate.getTime()) {
        return true;
      }
    }
    
    return false;
    
  } catch (error) {
    Logger.log(`❌ Error checking duplicate date: ${error.message}`);
    return false;
  }
}