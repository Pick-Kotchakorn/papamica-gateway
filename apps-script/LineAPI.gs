// ========================================
// 📱 LINEAPI.GS - LINE API WRAPPER
// ========================================
// ไฟล์นี้จัดการการเชื่อมต่อกับ LINE API
// ครอบคลุม Push Message, Reply, Profile, Loading Animation

/**
 * Send Loading Animation
 * แสดง Loading Animation ให้ผู้ใช้เห็น
 * 
 * @param {string} userId - LINE User ID
 * @return {boolean} Success status
 */
function sendLoadingAnimation(userId) {
  try {
    const url = LINE_CONFIG.API_ENDPOINTS.LOADING_ANIMATION;
    
    const payload = {
      chatId: userId,
      loadingSeconds: LINE_CONFIG.LOADING_SECONDS
    };
    
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': 'Bearer ' + LINE_CONFIG.CHANNEL_ACCESS_TOKEN
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();
    
    if (statusCode === 200) {
      Logger.log('⏳ Loading animation started');
      return true;
    } else {
      Logger.log(`⚠️ Loading animation failed: ${statusCode}`);
      return false;
    }
    
  } catch (error) {
    Logger.log(`⚠️ Loading animation error: ${error.message}`);
    return false;
  }
}

/**
 * Push Simple Text Message
 * ส่งข้อความข้อความธรรมดาไปยังผู้ใช้
 * 
 * @param {string} userId - LINE User ID
 * @param {string} text - Message text
 * @return {boolean} Success status
 */
function pushSimpleMessage(userId, text) {
  try {
    if (!userId || !text) {
      Logger.log('⚠️ Missing userId or text');
      return false;
    }
    
    const url = LINE_CONFIG.API_ENDPOINTS.PUSH_MESSAGE;
    
    const payload = {
      to: userId,
      messages: [
        {
          type: 'text',
          text: text
        }
      ]
    };
    
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': 'Bearer ' + LINE_CONFIG.CHANNEL_ACCESS_TOKEN
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    Logger.log(`📬 Push message status: ${statusCode}`);
    
    if (statusCode !== 200) {
      Logger.log(`❌ LINE API Error: ${responseText}`);
      return false;
    }
    
    Logger.log('✅ Message sent successfully');
    return true;
    
  } catch (error) {
    Logger.log(`❌ Error in pushSimpleMessage: ${error.message}`);
    return false;
  }
}

/**
 * Push Multiple Messages
 * ส่งหลายข้อความพร้อมกัน (สูงสุด 5 ข้อความ)
 * 
 * @param {string} userId - LINE User ID
 * @param {Array<Object>} messages - Array of message objects
 * @return {boolean} Success status
 */
function pushMessages(userId, messages) {
  try {
    if (!userId || !messages || messages.length === 0) {
      Logger.log('⚠️ Missing userId or messages');
      return false;
    }
    
    // LINE allows max 5 messages per request
    const limitedMessages = messages.slice(0, 5);
    
    if (messages.length > 5) {
      Logger.log(`⚠️ Limited to 5 messages (${messages.length} provided)`);
    }
    
    const url = LINE_CONFIG.API_ENDPOINTS.PUSH_MESSAGE;
    
    const payload = {
      to: userId,
      messages: limitedMessages
    };
    
    Logger.log(`📤 Sending ${limitedMessages.length} message(s)`);
    Logger.log(`📦 Payload: ${JSON.stringify(payload)}`);
    
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': 'Bearer ' + LINE_CONFIG.CHANNEL_ACCESS_TOKEN
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    Logger.log(`📬 Push messages status: ${statusCode}`);
    Logger.log(`📬 Response: ${responseText}`);
    
    if (statusCode !== 200) {
      Logger.log(`❌ LINE API Error: ${responseText}`);
      return false;
    }
    
    Logger.log('✅ Messages sent successfully');
    return true;
    
  } catch (error) {
    Logger.log(`❌ Error in pushMessages: ${error.message}`);
    return false;
  }
}

/**
 * Reply Message
 * ตอบกลับข้อความโดยใช้ Reply Token (ใช้ได้ครั้งเดียว)
 * 
 * @param {string} replyToken - Reply token from event
 * @param {Array<Object>} messages - Array of message objects
 * @return {boolean} Success status
 */
function replyMessage(replyToken, messages) {
  try {
    if (!replyToken || !messages || messages.length === 0) {
      Logger.log('⚠️ Missing replyToken or messages');
      return false;
    }
    
    const limitedMessages = messages.slice(0, 5);
    const url = LINE_CONFIG.API_ENDPOINTS.REPLY_MESSAGE;
    
    const payload = {
      replyToken: replyToken,
      messages: limitedMessages
    };
    
    Logger.log(`📤 Replying with ${limitedMessages.length} message(s)`);
    
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': 'Bearer ' + LINE_CONFIG.CHANNEL_ACCESS_TOKEN
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    Logger.log(`📬 Reply status: ${statusCode}`);
    
    if (statusCode !== 200) {
      Logger.log(`❌ LINE API Error: ${responseText}`);
      return false;
    }
    
    Logger.log('✅ Reply sent successfully');
    return true;
    
  } catch (error) {
    Logger.log(`❌ Error in replyMessage: ${error.message}`);
    return false;
  }
}

/**
 * Get User Profile
 * ดึงข้อมูล Profile ของผู้ใช้
 * 
 * @param {string} userId - LINE User ID
 * @return {Object|null} User profile object or null
 */
function getUserProfile(userId) {
  try {
    if (!userId) {
      Logger.log('⚠️ No userId provided');
      return null;
    }
    
    const url = `${LINE_CONFIG.API_ENDPOINTS.GET_PROFILE}/${userId}`;
    
    const options = {
      method: 'get',
      headers: {
        'Authorization': 'Bearer ' + LINE_CONFIG.CHANNEL_ACCESS_TOKEN
      },
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();
    
    if (statusCode !== 200) {
      Logger.log(`❌ Failed to get profile: ${statusCode}`);
      return null;
    }
    
    const profile = JSON.parse(response.getContentText());
    
    Logger.log(`✅ Profile retrieved: ${profile.displayName}`);
    Logger.log(`   Display Name: ${profile.displayName}`);
    Logger.log(`   Language: ${profile.language || 'unknown'}`);
    
    return profile;
    
  } catch (error) {
    Logger.log(`❌ Error getting profile: ${error.message}`);
    return {
      displayName: SYSTEM_CONFIG.DEFAULTS.UNKNOWN_DISPLAY_NAME,
      pictureUrl: '',
      statusMessage: '',
      language: SYSTEM_CONFIG.DEFAULTS.UNKNOWN_LANGUAGE
    };
  }
}

/**
 * Validate Message Structure
 * ตรวจสอบความถูกต้องของ message object
 * 
 * @param {Object} message - Message object to validate
 * @return {boolean} Valid or not
 */
function validateMessage(message) {
  try {
    if (!message || !message.type) {
      Logger.log('⚠️ Invalid message: missing type');
      return false;
    }
    
    // Validate based on message type
    switch (message.type) {
      case 'text':
        if (!message.text || message.text.trim() === '') {
          Logger.log('⚠️ Invalid text message: empty text');
          return false;
        }
        break;
        
      case 'flex':
        if (!message.altText || !message.contents) {
          Logger.log('⚠️ Invalid flex message: missing altText or contents');
          return false;
        }
        break;
        
      case 'template':
        if (!message.altText || !message.template) {
          Logger.log('⚠️ Invalid template message: missing altText or template');
          return false;
        }
        break;
        
      case 'image':
        if (!message.originalContentUrl || !message.previewImageUrl) {
          Logger.log('⚠️ Invalid image message: missing URLs');
          return false;
        }
        break;
        
      default:
        // Other types - basic validation
        break;
    }
    
    return true;
    
  } catch (error) {
    Logger.log(`❌ Error validating message: ${error.message}`);
    return false;
  }
}

/**
 * Filter Valid Messages
 * กรองเฉพาะข้อความที่ถูกต้อง
 * 
 * @param {Array<Object>} messages - Array of message objects
 * @return {Array<Object>} Filtered valid messages
 */
function filterValidMessages(messages) {
  if (!Array.isArray(messages)) {
    Logger.log('⚠️ Messages is not an array');
    return [];
  }
  
  const validMessages = messages.filter(msg => validateMessage(msg));
  
  Logger.log(`📊 Filtered: ${validMessages.length}/${messages.length} valid messages`);
  
  return validMessages;
}

/**
 * Test LINE API Connection
 * ทดสอบการเชื่อมต่อกับ LINE API
 */
function testLineAPI() {
  Logger.log('🧪 Testing LINE API...');
  Logger.log('=' .repeat(60));
  
  // Test User ID (ใช้ User ID จริงในการทดสอบ)
  const testUserId = 'U1234567890abcdef1234567890abcdef'; // เปลี่ยนเป็น User ID จริง
  
  Logger.log('\n1️⃣ Testing Loading Animation...');
  const loadingResult = sendLoadingAnimation(testUserId);
  Logger.log(`   Result: ${loadingResult ? '✅' : '❌'}`);
  
  Logger.log('\n2️⃣ Testing Simple Message...');
  const messageResult = pushSimpleMessage(testUserId, '🧪 Test message from GAS');
  Logger.log(`   Result: ${messageResult ? '✅' : '❌'}`);
  
  Logger.log('\n3️⃣ Testing Get Profile...');
  const profile = getUserProfile(testUserId);
  Logger.log(`   Result: ${profile ? '✅' : '❌'}`);
  if (profile) {
    Logger.log(`   Name: ${profile.displayName}`);
  }
  
  Logger.log('\n4️⃣ Testing Message Validation...');
  const testMessages = [
    { type: 'text', text: 'Valid message' },
    { type: 'text', text: '' }, // Invalid
    { type: 'flex', altText: 'Test' }, // Invalid - missing contents
    { type: 'flex', altText: 'Test', contents: {} } // Valid
  ];
  
  const validMessages = filterValidMessages(testMessages);
  Logger.log(`   Valid: ${validMessages.length}/4 messages`);
  
  Logger.log('=' .repeat(60));
  Logger.log('✅ LINE API test completed!');
}
