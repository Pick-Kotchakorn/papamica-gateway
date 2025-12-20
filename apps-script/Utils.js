// ========================================
// 🛠️ UTILS.GS - UTILITY FUNCTIONS (V2.4 - Optimized)
// ========================================
// ไฟล์นี้เก็บฟังก์ชันช่วยเหลือทั่วไปที่ใช้ร่วมกันในหลายส่วนของระบบ

/**
 * Format Date to Thai
 * แปลง Date เป็นรูปแบบภาษาไทย
 * @param {Date} date - Date object
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
 * @param {number} num - Number to format
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
 * Safe Parse Float
 * แปลงเป็น Float อย่างปลอดภัย โดยรองรับการลบคอมม่าและจัดการค่าว่าง
 * @param {*} value - Value to parse
 * @param {number} defaultValue - Default value (default: 0)
 * @return {number} Parsed number
 */
function safeParseFloat(value, defaultValue = 0) {
  try {
    if (value === undefined || value === null || value === '') return defaultValue;
    
    // 1. แปลงเป็น String และลบคอมม่า (,) พร้อม Trim ช่องว่าง
    let strValue = String(value).replace(/,/g, '').trim(); 
    
    // 2. ทำการแปลงเป็น Float
    const parsed = parseFloat(strValue);
    
    // 3. ส่งคืนค่า หรือค่าเริ่มต้นถ้าไม่ใช่ตัวเลข
    return isNaN(parsed) ? defaultValue : parsed;
  } catch (error) {
    Logger.log(`⚠️ safeParseFloat Error: ${error.message} for value: ${value}`);
    return defaultValue;
  }
}

/**
 * Safe Parse Int
 * แปลงเป็น Integer อย่างปลอดภัย
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
 * Calculate Percentage
 * คำนวณเปอร์เซ็นต์
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
 */
function sleep(milliseconds) {
  Utilities.sleep(milliseconds);
}

/**
 * Retry Function
 * ลองทำงานซ้ำถ้าเกิด error (ใช้ในงานเชื่อมต่อ Network/API)
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
 * Is Valid Email
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
 */
function sanitizeString(str) {
  try {
    if (!str) return '';
    return str.replace(/[^\w\s\u0E00-\u0E7F.,!?-]/g, '').trim();
  } catch (error) {
    Logger.log(`❌ Error sanitizing string: ${error.message}`);
    return str;
  }
}

/**
 * Get Date Range
 */
function getDateRange(days, endDate = new Date()) {
  try {
    const end = new Date(endDate);
    const start = new Date(end);
    start.setDate(start.getDate() - days);
    
    return { startDate: start, endDate: end };
  } catch (error) {
    Logger.log(`❌ Error getting date range: ${error.message}`);
    return { startDate: new Date(), endDate: new Date() };
  }
}

/**
 * Deep Clone Object
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
 */
function logWithTimestamp(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const emoji = { 'INFO': 'ℹ️', 'WARN': '⚠️', 'ERROR': '❌' };
  Logger.log(`${emoji[level] || 'ℹ️'} [${timestamp}] [${level}] ${message}`);
}

/**
 * Create API-style Responses
 */
function createErrorResponse(message, code = 'UNKNOWN_ERROR', details = {}) {
  return { success: false, error: { message, code, details, timestamp: new Date().toISOString() } };
}

function createSuccessResponse(data, message = 'Success') {
  return { success: true, message, data, timestamp: new Date().toISOString() };
}

/**
 * Batch Process Array
 */
function batchProcess(array, batchSize, processor) {
  try {
    Logger.log(`🔄 Batch processing ${array.length} items (batch size: ${batchSize})`);
    for (let i = 0; i < array.length; i += batchSize) {
      const batch = array.slice(i, i + batchSize);
      processor(batch);
    }
  } catch (error) {
    Logger.log(`❌ Error in batch processing: ${error.message}`);
    throw error;
  }
}

// ========================================
// 📦 EVENT QUEUE UTILITIES
// ========================================

const EVENT_QUEUE_KEY = 'ASYNC_EVENT_QUEUE';
const QUEUE_CACHE = CacheService.getScriptCache();

function enqueueEvent(event) {
  try {
    let queueString = QUEUE_CACHE.get(EVENT_QUEUE_KEY);
    let queue = queueString ? JSON.parse(queueString) : [];
    const eventLog = { timestamp: new Date().toISOString(), event: event };
    queue.push(JSON.stringify(eventLog));
    QUEUE_CACHE.put(EVENT_QUEUE_KEY, JSON.stringify(queue), 3600);
  } catch (error) {
    Logger.log(`❌ Error enqueueing event: ${error.message}`);
  }
}

function dequeueAllEvents() {
  try {
    const queueString = QUEUE_CACHE.get(EVENT_QUEUE_KEY);
    if (!queueString) return [];
    QUEUE_CACHE.remove(EVENT_QUEUE_KEY);
    const rawEvents = JSON.parse(queueString);
    return rawEvents.map(e => JSON.parse(e).event);
  } catch (error) {
    Logger.log(`❌ Error dequeueing events: ${error.message}`);
    return [];
  }
}