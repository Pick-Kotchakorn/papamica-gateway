// ========================================
// 📱 LINEAPI.GS - LINE API WRAPPER (V2.0 FINAL)
// ========================================
// ไฟล์นี้จัดการการเชื่อมต่อกับ LINE API

/**
 * Send Loading Animation (จากโค้ดเดิม)
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
    
    if (response.getResponseCode() === 200) {
      Logger.log('⏳ Loading animation started');
      return true;
    } else {
      Logger.log(`⚠️ Loading animation failed: ${response.getResponseCode()}`);
      return false;
    }
  } catch (error) {
    Logger.log(`⚠️ Loading animation error: ${error.message}`);
    return false;
  }
}

/**
 * Push Simple Text Message (Fallback)
 */
function pushSimpleMessage(userId, text) {
  // โค้ดที่ใช้ใน LineAPI.gs ต้นฉบับ (มีอยู่แล้ว)
  try {
    if (!userId || !text) {
      Logger.log('⚠️ Missing userId or text');
      return false;
    }
    
    const url = LINE_CONFIG.API_ENDPOINTS.PUSH_MESSAGE;
    const payload = {
      to: userId,
      messages: [{ type: 'text', text: text }]
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
    
    Logger.log(`📬 Push message status: ${response.getResponseCode()}`);
    return response.getResponseCode() === 200;
  } catch (error) {
    Logger.log(`❌ Error in pushSimpleMessage: ${error.message}`);
    return false;
  }
}

/**
 * Send LINE Messages (Dialogflow Fulfillment)
 * **รวม Logic การส่งจากโค้ด loading-animation.js เดิม**
 */
function sendLineMessages(userId, dialogflowResponse) {
  const messages = dialogflowResponse.messages;
  if (!messages || messages.length === 0) {
    Logger.log('⚠️ No messages to send.');
    return;
  }

  // ✅ Validate messages (ใช้ logic การกรองของโค้ดเดิมของคุณ)
  const validMessages = messages.slice(0, 5).filter(msg => {
    // (ใช้โค้ด validation ที่คุณมีอยู่แล้ว)
    if (!msg.type) return false;
    if (msg.type === 'text' && (!msg.text || msg.text.trim() === '')) return false;
    if (msg.type === 'flex' && (!msg.altText || !msg.contents)) return false;
    return true;
  });

  if (validMessages.length === 0) {
    Logger.log('⚠️ No valid messages after filtering');
    pushSimpleMessage(userId, 'ขออภัยครับ เกิดข้อผิดพลาดในการส่งข้อความ');
    return;
  }

  const payload = {
    to: userId,
    messages: validMessages
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

  const response = UrlFetchApp.fetch(LINE_CONFIG.API_ENDPOINTS.PUSH_MESSAGE, options);
  Logger.log('📬 LINE API Response Code: ' + response.getResponseCode());

  if (response.getResponseCode() !== 200) {
    Logger.log('❌ LINE API Error: ' + response.getContentText());
  }
}

/**
 * Get User Profile (สำคัญสำหรับ FollowerService - มีอยู่ใน LineAPI.gs ต้นฉบับแล้ว)
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
    return profile;
  } catch (error) {
    Logger.log(`❌ Error getting profile: ${error.message}`);
    // ใช้ Fallback ตาม SYSTEM_CONFIG ที่ถูกกำหนดไว้ใน Config.gs
    return {
      displayName: SYSTEM_CONFIG.DEFAULTS.UNKNOWN_DISPLAY_NAME || 'Unknown',
      pictureUrl: '',
      statusMessage: '',
      language: SYSTEM_CONFIG.DEFAULTS.UNKNOWN_LANGUAGE || 'unknown'
    };
  }
}

// NOTE: ฟังก์ชันอื่น ๆ เช่น replyMessage, pushMessages, validateMessage, filterValidMessages 
// มีอยู่ใน LineAPI.gs ต้นฉบับที่คุณมีอยู่แล้ว (อ้างอิงจากไฟล์ที่ส่งมา) และสามารถคงไว้ได้