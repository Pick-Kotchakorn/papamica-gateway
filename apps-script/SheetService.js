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
 */
function saveOilReport(data) {
  try {
    Logger.log('💾 Starting saveOilReport...');
    Logger.log(`Data received: ${JSON.stringify(data)}`);
    
    // 1. เปิด Spreadsheet และ Sheet
    const ss = SpreadsheetApp.openById(SHEET_CONFIG.SPREADSHEET_ID);
    if (!ss) {
      throw new Error('Cannot open spreadsheet. Check SPREADSHEET_ID in Config.');
    }
    
    const sheetName = SHEET_CONFIG.SHEETS.OIL_REPORTS || 'Oil_Reports';
    let sheet = ss.getSheetByName(sheetName);
    
    // 2. สร้าง Sheet ถ้ายังไม่มี
    if (!sheet) {
      Logger.log(`Creating new sheet: ${sheetName}`);
      sheet = ss.insertSheet(sheetName);
      
      // สร้าง Header
      const headers = ['Timestamp', 'User ID', 'Branch', 'Amount', 'Type', 'Image URL', 'Month Key'];
      sheet.appendRow(headers);
      
      // จัดรูปแบบ Header
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4285f4');
      headerRange.setFontColor('#ffffff');
    }
    
    // 3. เตรียมข้อมูลสำหรับบันทึก
    const timestamp = new Date();
    const monthKey = Utilities.formatDate(timestamp, 'Asia/Bangkok', 'yyyy-MM');
    
    const rowData = [
      timestamp,
      data.userId,
      data.branch,
      data.amount,
      data.type || 'deposit',
      data.imageUrl,
      monthKey
    ];
    
    Logger.log(`Appending row: ${JSON.stringify(rowData)}`);
    
    // 4. บันทึกข้อมูล
    sheet.appendRow(rowData);
    Logger.log('✅ Row appended successfully');
    
    // 5. คำนวณยอดสะสม
    Logger.log('Calculating accumulated amount...');
    
    const allData = sheet.getDataRange().getValues();
    const headers = allData.shift(); // ลบ header row
    
    // แปลงเป็น Object Array
    const reportData = allData.map(row => {
      let obj = {};
      headers.forEach((header, i) => {
        const key = header.toLowerCase().replace(/ /g, '_');
        obj[key] = row[i];
      });
      return obj;
    });
    
    // Filter ข้อมูลของสาขาและเดือนปัจจุบัน
    const currentMonthData = reportData.filter(row => {
      const rowBranch = String(row['branch'] || '').trim();
      const rowMonthKey = String(row['month_key'] || '').trim();
      const dataBranch = String(data.branch || '').trim();
      
      return rowBranch === dataBranch && rowMonthKey === monthKey;
    });
    
    Logger.log(`Found ${currentMonthData.length} records for ${data.branch} in ${monthKey}`);
    
    // คำนวณยอดรวม
    const totalAccumulated = currentMonthData.reduce((sum, row) => {
      const amount = safeParseFloat(row['amount']); 
      const type = String(row['type'] || 'deposit').toLowerCase(); 
      return type === 'deposit' ? sum + amount : sum - amount;
    }, 0);
    
    Logger.log(`Total accumulated: ${totalAccumulated}`);
    
    // 6. เตรียมผลลัพธ์
    const goal = SYSTEM_CONFIG.DEFAULTS.OIL_REPORT_GOAL || 10000;
    
    const result = {
      branch: data.branch,
      latest: data.amount,
      accumulated: totalAccumulated,
      goal: goal
    };
    
    Logger.log('✅ saveOilReport completed successfully');
    Logger.log(`Result: ${JSON.stringify(result)}`);
    
    return result;
    
  } catch (error) {
    Logger.log(`❌ Error in saveOilReport: ${error.message}`);
    Logger.log(`Stack trace: ${error.stack}`);
    throw new Error(`Sheet Save Error: ${error.message}`);
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