// ========================================
// 🛠️ UTILS.GS - UTILITY FUNCTIONS
// ========================================
// ไฟล์นี้เก็บฟังก์ชันช่วยเหลือทั่วไป
// ที่ใช้ร่วมกันในหลายส่วนของระบบ

/**
 * Format Date to Thai
 * แปลง Date เป็นรูปแบบภาษาไทย
 * * @param {Date} date - Date object
 * @param {boolean} includeTime - Include time (default: false)
 * @return {string} Formatted date string
 */
function formatDateThai(date, includeTime = false) {
  try {
    if (!(date instanceof Date)) {
      date = new Date(date);
    }
    
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Bangkok'
    };
    
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    
    return date.toLocaleDateString('th-TH', options);
    
  } catch (error) {
    Logger.log(`❌ Error formatting date: ${error.message}`);
    return date.toString();
  }
}

/**
 * Format Number with Commas
 * จัดรูปแบบตัวเลขให้มีคอมม่า
 * * @param {number} num - Number to format
 * @return {string} Formatted number string
 */
function formatNumber(num) {
  try {
    if (isNaN(num)) return '0';
    return num.toLocaleString('en-US');
  } catch (error) {
    Logger.log(`❌ Error formatting number: ${error.message}`);
    return num.toString();
  }
}

/**
 * Calculate Percentage
 * คำนวณเปอร์เซ็นต์
 * * @param {number} part - Part value
 * @param {number} total - Total value
 * @param {number} decimals - Decimal places (default: 2)
 * @return {number} Percentage
 */
function calculatePercentage(part, total, decimals = 2) {
  try {
    if (total === 0) return 0;
    const percentage = (part / total) * 100;
    return parseFloat(percentage.toFixed(decimals));
  } catch (error) {
    Logger.log(`❌ Error calculating percentage: ${error.message}`);
    return 0;
  }
}

/**
 * Truncate Text
 * ตัดข้อความให้สั้นลง
 * * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length (default: 100)
 * @param {string} suffix - Suffix to add (default: '...')
 * @return {string} Truncated text
 */
function truncateText(text, maxLength = 100, suffix = '...') {
  try {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
  } catch (error) {
    Logger.log(`❌ Error truncating text: ${error.message}`);
    return text;
  }
}

/**
 * Generate Random ID
 * สร้าง Random ID
 * * @param {number} length - ID length (default: 8)
 * @return {string} Random ID
 */
function generateRandomId(length = 8) {
  try {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  } catch (error) {
    Logger.log(`❌ Error generating ID: ${error.message}`);
    return Date.now().toString();
  }
}

/**
 * Sleep/Wait Function
 * หยุดการทำงานชั่วคราว
 * * @param {number} milliseconds - Time to wait in milliseconds
 */
function sleep(milliseconds) {
  Utilities.sleep(milliseconds);
}

/**
 * Retry Function
 * ลองทำงานซ้ำถ้าเกิด error
 * * @param {Function} func - Function to retry
 * @param {number} maxRetries - Maximum retries (default: 3)
 * @param {number} delay - Delay between retries in ms (default: 1000)
 * @return {*} Function result or null
 */
function retry(func, maxRetries = 3, delay = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      Logger.log(`🔄 Attempt ${attempt}/${maxRetries}...`);
      return func();
    } catch (error) {
      lastError = error;
      Logger.log(`⚠️ Attempt ${attempt} failed: ${error.message}`);
      
      if (attempt < maxRetries) {
        sleep(delay);
      }
    }
  }
  
  Logger.log(`❌ All ${maxRetries} attempts failed`);
  throw lastError;
}

/**
 * Safe Parse Float
 * แปลงเป็น Float อย่างปลอดภัย โดยรองรับการลบคอมม่า
 * * @param {*} value - Value to parse
 * @param {number} defaultValue - Default value (default: 0)
 * @return {number} Parsed number
 */
function safeParseFloat(value, defaultValue = 0) {
  try {
    // 1. แปลงค่าที่ได้รับมาเป็น String และจัดการค่าว่าง
    let strValue = String(value || 0);

    // 2. 💡 FIX: ลบคอมม่า (,) ออกจาก String และ Trim ช่องว่าง
    strValue = strValue.replace(/,/g, '').trim(); 
    
    // 3. ทำการแปลงเป็น Float
    const parsed = parseFloat(strValue);
    
    // 4. ส่งคืนค่า หรือค่าเริ่มต้นถ้าแปลงไม่ได้
    return isNaN(parsed) ? defaultValue : parsed;
  } catch (error) {
    Logger.log(`⚠️ safeParseFloat Error: ${error.message} for value: ${value}`);
    return defaultValue;
  }
}

/**
 * Safe Parse Int
 * แปลงเป็น Integer อย่างปลอดภัย
 * * @param {*} value - Value to parse
 * @param {number} defaultValue - Default value (default: 0)
 * @return {number} Parsed number
 */
function safeParseInt(value, defaultValue = 0) {
  try {
    const parsed = parseInt(value);
    return isNaN(parsed) ? defaultValue : parsed;
  } catch (error) {
    return defaultValue;
  }
}

/**
 * Is Valid Email
 * ตรวจสอบว่าเป็น Email ที่ถูกต้องหรือไม่
 * * @param {string} email - Email address
 * @return {boolean} Valid or not
 */
function isValidEmail(email) {
  try {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  } catch (error) {
    return false;
  }
}

/**
 * Is Valid URL
 * ตรวจสอบว่าเป็น URL ที่ถูกต้องหรือไม่
 * * @param {string} url - URL string
 * @return {boolean} Valid or not
 */
function isValidUrl(url) {
  try {
    const regex = /^https?:\/\/.+/;
    return regex.test(url);
  } catch (error) {
    return false;
  }
}

/**
 * Sanitize String
 * ทำความสะอาดข้อความ (ลบอักขระพิเศษ)
 * * @param {string} str - String to sanitize
 * @return {string} Sanitized string
 */
function sanitizeString(str) {
  try {
    if (!str) return '';
    
    // Remove special characters, keep only alphanumeric, spaces, and basic punctuation
    return str.replace(/[^\w\s\u0E00-\u0E7F.,!?-]/g, '').trim();
  } catch (error) {
    Logger.log(`❌ Error sanitizing string: ${error.message}`);
    return str;
  }
}

/**
 * Get Date Range
 * สร้างช่วงวันที่
 * * @param {number} days - Number of days
 * @param {Date} endDate - End date (default: today)
 * @return {Object} Object with startDate and endDate
 */
function getDateRange(days, endDate = new Date()) {
  try {
    const end = new Date(endDate);
    const start = new Date(end);
    start.setDate(start.getDate() - days);
    
    return {
      startDate: start,
      endDate: end
    };
  } catch (error) {
    Logger.log(`❌ Error getting date range: ${error.message}`);
    return {
      startDate: new Date(),
      endDate: new Date()
    };
  }
}

/**
 * Deep Clone Object
 * สำเนา Object แบบ Deep Copy
 * * @param {Object} obj - Object to clone
 * @return {Object} Cloned object
 */
function deepClone(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (error) {
    Logger.log(`❌ Error cloning object: ${error.message}`);
    return obj;
  }
}

/**
 * Merge Objects
 * รวม Objects เข้าด้วยกัน
 * * @param {...Object} objects - Objects to merge
 * @return {Object} Merged object
 */
function mergeObjects(...objects) {
  try {
    return Object.assign({}, ...objects);
  } catch (error) {
    Logger.log(`❌ Error merging objects: ${error.message}`);
    return {};
  }
}

/**
 * Log with Timestamp
 * Log พร้อมเวลา
 * * @param {string} message - Log message
 * @param {string} level - Log level (INFO/WARN/ERROR)
 */
function logWithTimestamp(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const emoji = {
    'INFO': 'ℹ️',
    'WARN': '⚠️',
    'ERROR': '❌'
  };
  
  Logger.log(`${emoji[level] || 'ℹ️'} [${timestamp}] [${level}] ${message}`);
}

/**
 * Create Error Response
 * สร้าง Error Response Object
 * * @param {string} message - Error message
 * @param {string} code - Error code
 * @param {Object} details - Additional details
 * @return {Object} Error response object
 */
function createErrorResponse(message, code = 'UNKNOWN_ERROR', details = {}) {
  return {
    success: false,
    error: {
      message: message,
      code: code,
      details: details,
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Create Success Response
 * สร้าง Success Response Object
 * * @param {*} data - Response data
 * @param {string} message - Success message
 * @return {Object} Success response object
 */
function createSuccessResponse(data, message = 'Success') {
  return {
    success: true,
    message: message,
    data: data,
    timestamp: new Date().toISOString()
  };
}

/**
 * Batch Process Array
 * ประมวลผล Array เป็นชุดๆ
 * * @param {Array} array - Array to process
 * @param {number} batchSize - Batch size
 * @param {Function} processor - Processor function
 */
function batchProcess(array, batchSize, processor) {
  try {
    Logger.log(`🔄 Batch processing ${array.length} items (batch size: ${batchSize})`);
    
    for (let i = 0; i < array.length; i += batchSize) {
      const batch = array.slice(i, i + batchSize);
      Logger.log(`   Processing batch ${Math.floor(i / batchSize) + 1}...`);
      processor(batch);
    }
    
    Logger.log('✅ Batch processing completed');
    
  } catch (error) {
    Logger.log(`❌ Error in batch processing: ${error.message}`);
    throw error;
  }
}

// ========================================
// 📦 EVENT QUEUE UTILITIES (สำหรับ Asynchronous Processing)
// ========================================

const EVENT_QUEUE_KEY = 'ASYNC_EVENT_QUEUE';
const QUEUE_CACHE = CacheService.getScriptCache();

/**
 * Enqueue an event for asynchronous processing.
 * @param {Object} event - LINE Webhook Event object
 */
function enqueueEvent(event) {
  try {
    // 1. ดึงคิวปัจจุบัน (ถ้ามี)
    let queueString = QUEUE_CACHE.get(EVENT_QUEUE_KEY);
    let queue = queueString ? JSON.parse(queueString) : [];
    
    // 2. เพิ่ม Event ใหม่เข้าไปในคิว
    // เราเก็บ event.timestamp และ event.source.userId ไว้ด้วยเพื่อเป็น reference
    const eventLog = {
      timestamp: new Date().toISOString(),
      eventType: event.type,
      event: event // เก็บ Object event จริง
    };
    
    queue.push(JSON.stringify(eventLog));
    
    // 3. บันทึกคิวกลับเข้า Cache (TTL 1 ชั่วโมง)
    QUEUE_CACHE.put(EVENT_QUEUE_KEY, JSON.stringify(queue), 3600);
    Logger.log(`✅ Event enqueued. Queue size: ${queue.length}`);
    
  } catch (error) {
    Logger.log(`❌ Error enqueueing event: ${error.message}`);
  }
}

/**
 * Dequeue all events for processing and clear the queue.
 * @return {Array<Object>} Array of LINE Webhook Event objects
 */
function dequeueAllEvents() {
  try {
    const queueString = QUEUE_CACHE.get(EVENT_QUEUE_KEY);
    
    if (!queueString) {
      return [];
    }
    
    // ล้างคิวทันทีเพื่อป้องกันการประมวลผลซ้ำ
    QUEUE_CACHE.remove(EVENT_QUEUE_KEY);
    Logger.log('🗑️ Cleared event queue.');
    
    // แปลงข้อมูลจาก String Array กลับเป็น Object Array
    const rawEvents = JSON.parse(queueString);
    const events = rawEvents.map(e => JSON.parse(e));
    
    Logger.log(`📥 Dequeued ${events.length} events for processing.`);
    // คืนค่า event object จริง (.event)
    return events.map(e => e.event);
    
  } catch (error) {
    Logger.log(`❌ Error dequeueing events: ${error.message}`);
    return [];
  }
}


/**
 * Test Utility Functions
 * ทดสอบฟังก์ชันต่างๆ
 */
function testUtilityFunctions() {
  Logger.log('🧪 Testing Utility Functions...');
  Logger.log('=' .repeat(60));
  
  // Test 1: Date Formatting
  Logger.log('\n1️⃣ Date Formatting:');
  Logger.log(`   Thai: ${formatDateThai(new Date())}`);
  Logger.log(`   With time: ${formatDateThai(new Date(), true)}`);
  
  // Test 2: Number Formatting
  Logger.log('\n2️⃣ Number Formatting:');
  Logger.log(`   ${formatNumber(1234567)}`);
  
  // Test 3: Percentage
  Logger.log('\n3️⃣ Percentage Calculation:');
  Logger.log(`   75/100 = ${calculatePercentage(75, 100)}%`);
  
  // Test 4: Text Truncation
  Logger.log('\n4️⃣ Text Truncation:');
  Logger.log(`   ${truncateText('This is a very long text that needs to be truncated', 30)}`);
  
  // Test 5: Random ID
  Logger.log('\n5️⃣ Random ID:');
  Logger.log(`   ${generateRandomId()}`);
  
  // Test 6: Validation
  Logger.log('\n6️⃣ Validation:');
  Logger.log(`   Email (test@example.com): ${isValidEmail('test@example.com')}`);
  Logger.log(`   URL (https://example.com): ${isValidUrl('https://example.com')}`);
  
  // Test 7: Date Range
  Logger.log('\n7️⃣ Date Range:');
  const range = getDateRange(7);
  Logger.log(`   7 days: ${formatDateThai(range.startDate)} - ${formatDateThai(range.endDate)}`);
  
  Logger.log('=' .repeat(60));
  Logger.log('✅ Utility Functions test completed!');
}

/**
 * 💾 Save Image from LINE to Google Drive
 * @param {string} messageId - ID ของข้อความรูปภาพ
 * @param {string} fileName - ชื่อไฟล์ที่ต้องการตั้ง
 */
function saveImageToDrive(messageId, fileName) {
  try {
    const token = LINE_CONFIG.CHANNEL_ACCESS_TOKEN; // ดึง Token จาก Config
    const url = `https://api-data.line.me/v2/bot/message/${messageId}/content`;
    
    // ดึงรูปภาพจาก LINE Server
    const response = UrlFetchApp.fetch(url, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    // ระบุ Folder ID ที่คุณสร้างไว้
    const FOLDER_ID = '10Zq_oPIBIUL491F88vGZ5MA7FPvuEJZB'; // <--- ⚠️ ใส่รหัส Folder ID ตรงนี้
    const folder = DriveApp.getFolderById(FOLDER_ID);
    
    // สร้างไฟล์ใน Drive
    const blob = response.getBlob();
    const file = folder.createFile(blob);
    file.setName(fileName + '.jpg'); 
    
    // เปิดสิทธิ์ให้ดูได้ (เพื่อให้แสดงใน Sheet หรือ App อื่นได้ง่าย)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return file.getUrl(); // ส่ง Link กลับไปบันทึก
  } catch (error) {
    Logger.log('❌ Error saving image to Drive: ' + error.message);
    return 'Error: ' + error.message;
  }
}

/**
 * Safe Parse Float
 * แปลงค่าเป็นตัวเลขทศนิยม ป้องกัน Error กรณีค่าเป็น null หรือ empty
 * @param {any} value - ค่าที่ต้องการแปลง
 * @return {number} ตัวเลขทศนิยม (ถ้าแปลงไม่ได้จะได้ 0)
 */
function safeParseFloat(value) {
  if (value === undefined || value === null || value === '') {
    return 0;
  }
  // ลบ comma ออกก่อนแปลง (เช่น "1,000.50" -> 1000.50)
  const cleanValue = String(value).replace(/,/g, '');
  const number = parseFloat(cleanValue);
  
  return isNaN(number) ? 0 : number;
}
