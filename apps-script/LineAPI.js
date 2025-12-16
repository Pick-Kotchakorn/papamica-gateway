// ========================================
// 📱 LINEAPI.GS - LINE API WRAPPER (V2.5 - Full Feature)
// ========================================
// ไฟล์นี้จัดการการเชื่อมต่อกับ LINE API ทั้งหมด
// รวมฟังก์ชัน: Reply/Push, MarkAsRead, Profile, Loading Animation, Media Content

// 💡 Note: PROPERTIES ต้องถูกประกาศใน Config.js และโหลดก่อน LineAPI.gs

/**
 * 1. Send Loading Animation
 * แสดง Animation ระหว่างรอประมวลผล
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
      headers: { 'Authorization': 'Bearer ' + LINE_CONFIG.CHANNEL_ACCESS_TOKEN },
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
 * 2. Push Simple Text Message (Fallback)
 * ส่งข้อความแบบ Push (เสียเงิน/โควต้า) ใช้เมื่อไม่มี ReplyToken
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
      messages: [{ type: 'text', text: text }]
    };
    
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + LINE_CONFIG.CHANNEL_ACCESS_TOKEN },
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
 * 3. Send LINE Messages (Smart Handler)
 * รองรับทั้ง Reply (ฟรี) และ Push (เสียเงิน) อัตโนมัติ
 * @param {string} userId - User ID
 * @param {object} data - Dialogflow Response Object
 * @param {string|null} replyToken - Reply Token (ถ้ามี)
 */
function sendLineMessages(userId, data, replyToken = null) {
  const messages = data.messages || [];
  
  // กรองข้อความที่ไม่มีเนื้อหา
  const validMessages = messages.filter(msg => {
     if (msg.type === 'text' && (!msg.text || msg.text.trim() === '')) return false;
     if (msg.type === 'flex' && (!msg.altText || !msg.contents)) return false;
     return true;
  });

  if (validMessages.length === 0) {
    Logger.log('⚠️ No valid messages to send.');
    return;
  }

  // --------------------------------------------------
  // 🟢 CASE 1: ใช้ Reply Message (ประหยัด, เร็ว, ฟรี)
  // --------------------------------------------------
  if (replyToken) {
    try {
        const url = LINE_CONFIG.API_ENDPOINTS.REPLY_MESSAGE;
        const payload = {
          replyToken: replyToken,
          messages: validMessages
        };

        const options = {
          method: 'post',
          contentType: 'application/json',
          headers: { 'Authorization': 'Bearer ' + LINE_CONFIG.CHANNEL_ACCESS_TOKEN },
          payload: JSON.stringify(payload),
          muteHttpExceptions: true
        };

        const response = UrlFetchApp.fetch(url, options);
        if (response.getResponseCode() === 200) {
          Logger.log(`✅ Reply sent successfully.`);
          return; 
        } else {
          Logger.log(`⚠️ Reply failed (Code: ${response.getResponseCode()}). Trying Push...`);
        }
    } catch (e) {
        Logger.log(`⚠️ Reply error: ${e.message}. Trying Push...`);
    }
  }

  // --------------------------------------------------
  // 🟠 CASE 2: ใช้ Push Message (Fallback)
  // --------------------------------------------------
  try {
      const pushUrl = LINE_CONFIG.API_ENDPOINTS.PUSH_MESSAGE;
      const pushPayload = {
        to: userId,
        messages: validMessages
      };

      const pushOptions = {
        method: 'post',
        contentType: 'application/json',
        headers: { 'Authorization': 'Bearer ' + LINE_CONFIG.CHANNEL_ACCESS_TOKEN },
        payload: JSON.stringify(pushPayload),
        muteHttpExceptions: true
      };

      const pushResponse = UrlFetchApp.fetch(pushUrl, pushOptions);
      if (pushResponse.getResponseCode() !== 200) {
        Logger.log(`❌ Push failed: ${pushResponse.getContentText()}`);
      } else {
        Logger.log(`✅ Push sent successfully.`);
      }
  } catch (error) {
      Logger.log(`❌ Critical Error in sendLineMessages: ${error.message}`);
  }
}

/**
 * 4. Get User Profile
 * ดึงข้อมูลโปรไฟล์ผู้ใช้ (ชื่อ, รูป, สถานะ)
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
      headers: { 'Authorization': 'Bearer ' + LINE_CONFIG.CHANNEL_ACCESS_TOKEN },
      muteHttpExceptions: true
    };
    const response = UrlFetchApp.fetch(url, options);
    
    if (response.getResponseCode() !== 200) {
      Logger.log(`❌ Failed to get profile: ${response.getResponseCode()}`);
      return null;
    }
    
    const profile = JSON.parse(response.getContentText());
    Logger.log(`✅ Profile retrieved: ${profile.displayName}`);
    return profile;
  } catch (error) {
    Logger.log(`❌ Error getting profile: ${error.message}`);
    return {
      displayName: SYSTEM_CONFIG.DEFAULTS.UNKNOWN_DISPLAY_NAME || 'Unknown',
      pictureUrl: '',
      statusMessage: '',
      language: SYSTEM_CONFIG.DEFAULTS.UNKNOWN_LANGUAGE || 'unknown'
    };
  }
}

// ========================================
// 💡 NEW FUNCTION: Mark as Read
// ========================================

/**
 * Mark messages from a user as read (displaying the 'Read' indicator).
 * @param {string} readToken - The markAsReadToken from the webhook event.
 * @return {boolean} Success status
 */
function markAsRead(readToken) {
  try {
    if (!readToken) {
      Logger.log('⚠️ Missing markAsReadToken, skipping markAsRead.');
      return false;
    }
    
    // ใช้ retry ครอบ Logic การเรียก API ทั้งหมด
    return retry(() => {
        const url = LINE_CONFIG.API_ENDPOINTS.MARK_AS_READ;
        const payload = { markAsReadToken: readToken };

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
        
        if (statusCode !== 200) {
            // Throw เพื่อให้ retry function ทำงานซ้ำ
            throw new Error(`MarkAsRead API failed: ${statusCode} - ${response.getContentText()}`);
        }
        
        Logger.log('✅ MarkAsRead successful.');
        return true;
        
    }, 3, 500); // Retry 3 ครั้งด้วย 500ms delay

  } catch (error) {
    Logger.log(`❌ Error in markAsRead after retries: ${error.message}`);
    return false;
  }
}

// ========================================
// 💡 NEW FUNCTION: Get Media Content (สำหรับ Oil Report)
// ========================================

/**
 * Get Media Content (Image/Video/Audio) from LINE
 * ดึงเนื้อหาสื่อ (เช่น รูปบิล) บันทึกใน Google Drive และส่งคืน URL
 * @param {string} messageId - ID ของ message ที่ต้องการดึงเนื้อหา
 * @return {string} URL ของรูปภาพที่ถูกบันทึกใน Google Drive
 */
function getMediaContent(messageId) {
  // 💡 Note: ฟังก์ชันนี้ต้องเปิดใช้งาน Drive API ใน GAS Services
  try {
    // ใช้ retry ครอบ Logic ทั้งหมดเพื่อจัดการความล้มเหลวของ Network I/O
    return retry(() => {
        Logger.log(`🔎 Attempting to fetch media content for ID: ${messageId}`);

        const url = `https://api-data.line.me/v2/bot/message/${messageId}/content`;
        const options = {
          method: 'get',
          headers: {
            'Authorization': 'Bearer ' + LINE_CONFIG.CHANNEL_ACCESS_TOKEN,
          },
          muteHttpExceptions: true,
        };

        const response = UrlFetchApp.fetch(url, options);
        const statusCode = response.getResponseCode();

        if (statusCode !== 200) {
          Logger.log(`❌ Failed to get media content: ${statusCode} - ${response.getContentText()}`);
          // Throw error เพื่อให้ retry function ทำงานซ้ำ
          throw new Error(`LINE Media API error: ${statusCode}`);
        }

        // 1. Get Blob
        const blob = response.getBlob();
        const fileName = `oil_report_bill_${messageId}_${new Date().getTime()}.jpg`;
        blob.setName(fileName);
        
        // 2. Determine Folder ID
        const FOLDER_ID = PROPERTIES.getProperty('OIL_REPORT_DRIVE_FOLDER_ID') || 'root'; 

        // 3. Save to Google Drive
        const folder = DriveApp.getFolderById(FOLDER_ID);
        const file = folder.createFile(blob);
        
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

        Logger.log(`✅ Saved image to Drive: ${file.getUrl()}`);
        return file.getUrl();

    }, 3, 2000); // Retry 3 ครั้ง, หน่วงเวลา 2 วินาที

  } catch (error) {
    Logger.log(`❌ Fatal Error in getMediaContent after retries: ${error.message}`);
    // ส่ง Error กลับไปเพื่อให้ Flow ใน EventHandler หยุดทำงาน
    throw error;
  }
}