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
 * (รองรับการแจ้งเบิกจ่าย Withdrawal)
 */
function saveOilReport(data) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_CONFIG.SPREADSHEET_ID);
    const sheetName = SHEET_CONFIG.SHEETS.OIL_REPORTS || 'Oil_Reports';
    let sheet = ss.getSheetByName(sheetName);
    
    // ดึง Header จาก Config (ต้องตรวจสอบว่าใน Config.js มีคอลัมน์ 'Type' หรือไม่)
    const configHeaders = SHEET_CONFIG.COLUMNS.OIL_REPORTS; 
    
    // สร้าง Sheet ใหม่ถ้ายังไม่มี
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(configHeaders);
      sheet.getRange(1, 1, 1, configHeaders.length).setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');
    } else {
      // ตรวจสอบ Header ว่าตรงกับ Config ไหม
      const currentHeaders = sheet.getRange(1, 1, 1, configHeaders.length).getValues()[0];
      const isHeaderMatch = currentHeaders.every((h, i) => String(h).toLowerCase() === configHeaders[i].toLowerCase());
      
      if (!isHeaderMatch) {
        Logger.log('⚠️ Header mismatch detected. Updating headers to match Config...');
        sheet.getRange(1, 1, 1, configHeaders.length).setValues([configHeaders]);
      }
    }
    
    const timestamp = new Date();
    const monthKey = Utilities.formatDate(timestamp, 'Asia/Bangkok', 'yyyy-MM');
    
    // ✅ จัดการค่า Type ให้เป็นตัวพิมพ์เล็กเสมอ (deposit / withdraw)
    const transactionType = (data.type || 'deposit').toLowerCase();

    // ✅ เตรียมข้อมูลลงแถว (ลำดับต้องตรงกับ Header ใน Config.js ของคุณ)
    // ลำดับจากโค้ดเดิมของคุณ: Timestamp, Branch, Amount, Type, Image, UserID, MonthKey
    const rowData = [
      timestamp, 
      data.branch, 
      data.amount, 
      transactionType, // บันทึกประเภทรายการ
      data.imageUrl, 
      data.userId, 
      monthKey
    ];
    
    sheet.appendRow(rowData);
    
    // ตั้งค่า Format ของคอลัมน์ Month Key (คอลัมน์ที่ 7) ให้เป็น Plain Text
    sheet.getRange(sheet.getLastRow(), 7).setNumberFormat('@');
    
    // สั่งให้ Google Sheets อัปเดตข้อมูลทันที
    SpreadsheetApp.flush();
    
    // --- ส่วนการคำนวณยอดสะสมกลับมาแสดงผล ---
    const allData = sheet.getDataRange().getValues();
    const headers = allData.shift(); 
    
    const reportData = allData.map(row => {
      let obj = {};
      headers.forEach((h, i) => {
        if (h) {
          // แปลง Header ให้เป็น Key ตัวพิมพ์เล็ก (เช่น 'Month Key' -> 'month_key')
          const key = String(h).toLowerCase().trim().replace(/\s+/g, '_');
          obj[key] = row[i];
        }
      });
      return obj;
    });
    
    // กรองข้อมูลเฉพาะสาขานี้ และ เดือนนี้
    const currentMonthData = reportData.filter(row => {
      const branchMatch = String(row['branch'] || '').trim().toLowerCase() === String(data.branch).trim().toLowerCase();

      let rowMonthKey = row['month_key'];
      if (rowMonthKey instanceof Date) {
        rowMonthKey = Utilities.formatDate(rowMonthKey, 'Asia/Bangkok', 'yyyy-MM');
      } else {
        rowMonthKey = String(rowMonthKey || '').trim();
      }
      
      return branchMatch && (rowMonthKey === monthKey);
    });
    
    // ✅ คำนวณยอดรวม (Logic: ถ้าเป็น withdraw ให้ลบ, ถ้าไม่ใช่ ให้บวก)
    const totalAccumulated = currentMonthData.reduce((sum, row) => {
      const amt = parseFloat(row['amount']) || 0; // ใช้ parseFloat เพื่อความชัวร์
      const type = String(row['type'] || 'deposit').trim().toLowerCase();
      
      if (type === 'withdraw') {
        return sum - amt; // 🔴 หักออก
      } else {
        return sum + amt; // 🟢 บวกเพิ่ม
      }
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

// ========================================
// 💰 BALANCE CHECK FUNCTION (NEW)
// ========================================

/**
 * Get Branch Summary
 * ดึงยอดสะสมรายสาขา ประจำเดือนปัจจุบัน
 * @param {string} branchName - รหัสสาขา เช่น EMQ, ONB
 */
function getBranchSummary(branchName) {
  try {
    // 1. ดึงข้อมูลทั้งหมดจาก Sheet Oil_Reports โดยใช้ Helper ที่มีอยู่แล้ว
    const allData = getSheetDataAsArray('Oil_Reports'); 
    
    // 2. หาเดือนปัจจุบัน (Format: yyyy-MM) เพื่อกรองเฉพาะยอดเดือนนี้
    const currentMonthKey = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM');
    
    // 3. กรองข้อมูลตามสาขา และ เดือน
    const filteredRows = allData.filter(row => {
      // แปลงชื่อ Key ให้เป็นตัวพิมพ์เล็กหมดเพื่อความชัวร์ (ขึ้นอยู่กับ Header ใน Sheet)
      // ปกติ Helper getSheetDataAsArray จะ return Key ตาม Header เป๊ะๆ
      // เราจึงต้องเดาว่า Header คือ 'Branch', 'Month Key', 'Type'
      
      const rowBranch = String(row['Branch'] || row['branch'] || '').trim().toUpperCase();
      const rowMonth = String(row['Month Key'] || row['month key'] || row['month_key'] || '').trim();
      
      // เทียบสาขา (Input ก็ควร UpperCase)
      const isBranchMatch = rowBranch === branchName.toUpperCase();
      
      // เทียบเดือน
      const isMonthMatch = rowMonth === currentMonthKey;
      
      return isBranchMatch && isMonthMatch;
    });

    // 4. คำนวณยอดรวม (Deposit - Withdraw)
    let totalDeposit = 0;
    let totalWithdraw = 0;
    
    filteredRows.forEach(row => {
      const amount = parseFloat(row['Amount'] || row['amount'] || 0);
      const type = String(row['Type'] || row['type'] || 'deposit').toLowerCase();
      
      if (type === 'withdraw') {
        totalWithdraw += amount;
      } else {
        totalDeposit += amount;
      }
    });

    const netBalance = totalDeposit - totalWithdraw;

    return {
      branch: branchName.toUpperCase(),
      month: currentMonthKey,
      totalDeposit: totalDeposit,
      totalWithdraw: totalWithdraw,
      netBalance: netBalance,
      transactionCount: filteredRows.length
    };

  } catch (error) {
    Logger.log(`❌ Error in getBranchSummary: ${error.message}`);
    // Return ค่า 0 กัน Error
    return { 
      branch: branchName, 
      month: 'N/A', 
      netBalance: 0, 
      count: 0 
    };
  }
}