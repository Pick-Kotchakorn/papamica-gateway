// ========================================
// 📨 EVENTHANDLER.GS - CHAT FLOW EDITION (V2.3)
// ========================================
// ไฟล์นี้จัดการ Events ต่างๆ จาก LINE
// ปรับปรุง: เปลี่ยนจาก Web Form เป็น Interactive Chat Flow
// Note: ต้องพึ่งพา LineAPI.gs, SheetService.gs, FollowerService.gs, DialogflowService.gs, ReportStateService.gs

// ========================================
// 1. Message Router (ใช้ใน Main.js)
// ========================================

/**
 * Handle Message Event (จัดการตามประเภทข้อความ)
 */
function handleMessageEvent(event) {
  try {
    const userId = event.source?.userId;
    const messageType = event.message?.type;
    
    if (!messageType || !userId) return;

    // ----------------------------------------------------
    // 🟢 CHAT FLOW INTERCEPTOR
    // ตรวจสอบก่อนว่า User อยู่ในระหว่างขั้นตอนรายงานหรือไม่?
    // ----------------------------------------------------
    if (typeof getReportState === 'function') {
      const currentState = getReportState(userId); // จาก ReportStateService.js
      
      if (currentState) {
        Logger.log(`🔄 User ${userId} is in state: ${currentState.step}`);
        // ถ้ามีสถานะค้างอยู่ ให้ส่งไปเข้า Flow รายงานทันที (ตัดบท Dialogflow)
        handleOilReportFlow(event, currentState);
        return;
      }
    }
    // ----------------------------------------------------

    Logger.log(`📨 Message type: ${messageType}`);

    switch (messageType) {
      case 'text':
        handleTextMessage(event);
        break;
        
      case 'image':
        // ถ้าไม่ได้อยู่ใน Flow รายงาน ให้จัดการแบบ Media ปกติ
        handleMediaMessage(event, 'Image', 'media.image', 'Image received');
        break;
        
      case 'video':
        handleMediaMessage(event, 'Video', 'media.video', 'Video received');
        break;
        
      case 'audio':
        handleMediaMessage(event, 'Audio', 'media.audio', 'Audio received');
        break;
        
      case 'file':
        handleMediaMessage(event, 'File', 'media.file', 'File received');
        break;
        
      case 'location':
        handleMediaMessage(event, 'Location', 'media.location', 'Location received');
        break;
        
      case 'sticker':
        handleMediaMessage(event, 'Sticker', 'media.sticker', 'Sticker received');
        break;
        
      default:
        Logger.log(`⚠️ Unsupported message type: ${messageType}`);
        pushSimpleMessage(event.source?.userId, SYSTEM_CONFIG.MESSAGES.ERROR);
        break;
    }
    
  } catch (error) {
    Logger.log(`❌ Error in handleMessageEvent: ${error.message}`);
    pushSimpleMessage(event.source?.userId, SYSTEM_CONFIG.MESSAGES.ERROR);
  }
}

// ========================================
// 2. Core Handlers (Text & Postback)
// ========================================

/**
 * Handle Text Message (Logic หลัก: Trigger Chat Flow / Dialogflow / Maintenance)
 */
function handleTextMessage(event) {
  const userId = event.source?.userId;
  const userMessage = event.message?.text?.trim();

  if (!userId || !userMessage) return;

  try {
    // แสดง Loading Animation เฉพาะตอนเริ่ม
    sendLoadingAnimation(userId);
    
    let aiResponseText = '';
    let intentName = 'N/A';
    
    // ====================================================
    // 🟢 CHAT FLOW TRIGGER (Logic ใหม่: ไม่ส่งลิงก์ แต่เริ่มถามยอดเงิน)
    // ====================================================
    const branchMap = {
        'kingsquare': 'KSQ', 'ksq': 'KSQ',
        'emquartier': 'EMQ', 'emq': 'EMQ',
        'one bangkok': 'ONB', 'onb': 'ONB'
    };

    const userMessageLower = userMessage.toLowerCase();
    const selectedBranchCode = branchMap[userMessageLower];

    if (selectedBranchCode) {
        Logger.log(`🚀 Starting Oil Report Flow for branch: ${selectedBranchCode}`);
        
        // 1. ตั้งสถานะเป็น "รอรับยอดเงิน" (AWAITING_AMOUNT)
        setReportState(userId, 'AWAITING_AMOUNT', { branch: selectedBranchCode });
        
        // 2. ตอบกลับเพื่อขอข้อมูลขั้นถัดไป (แทนการส่งลิงก์)
        const replyText = `📍 สาขา: ${selectedBranchCode}\n💰 กรุณาพิมพ์ "ยอดขาย" (เฉพาะตัวเลข) ส่งมาได้เลยครับ`;
        pushSimpleMessage(userId, replyText);
        
        // 3. Log การเริ่ม Flow
        saveConversation({ 
          userId: userId,
          userMessage: userMessage, 
          aiResponse: replyText, 
          intent: 'oil_report.start',
          timestamp: new Date()
        });
        
        updateFollowerInteraction(userId);
        
        return; // 🛑 จบการทำงานที่นี่
    }
    // ====================================================
        
    // ----------------------------------------------------
    // LOGIC เดิม: Dialogflow / Hybrid AI
    // ----------------------------------------------------
    if (SYSTEM_CONFIG.FEATURES.DIALOGFLOW_ENABLED) {
      const dialogflowResponse = queryDialogflow(userMessage, userId);

      if (dialogflowResponse && dialogflowResponse.messages) {
          
          const fulfillmentText = dialogflowResponse.fulfillmentText?.trim() || '';
          
          if (fulfillmentText === 'TRIGGER_BOOKING_TEMPLATE') {
              Logger.log('📞 Intent Matched: Booking Template Triggered!');
              // (ตรวจสอบว่ามีฟังก์ชันนี้หรือไม่ ถ้าไม่มีให้ข้าม)
              if (typeof getBookingTemplate === 'function') {
                 const bookingMessages = getBookingTemplate();
                 sendLineMessages(userId, { messages: bookingMessages });
                 aiResponseText = formatResponseForSheet(bookingMessages);
              }
              intentName = 'booking.table';

          } else {
              // 🧠 HYBRID AI LOGIC
              const confidence = dialogflowResponse.confidence || 0;
              const CONFIDENCE_THRESHOLD = SYSTEM_CONFIG.DEFAULTS.DIALOGFLOW_CONFIDENCE_THRESHOLD || 0.65; 
              
              if (confidence < CONFIDENCE_THRESHOLD) {
                  Logger.log(`🧠 Dialogflow confidence (${confidence}) is low. Calling External AI.`);
                  aiResponseText = queryExternalAI(userMessage); 
                  sendLineMessages(userId, { messages: [{ type: 'text', text: aiResponseText }] });
                  intentName = 'ai.external.fallback';
              } else {
                  Logger.log(`🤖 Dialogflow confidence (${confidence}) is high. Using Fulfillment.`);
                  sendLineMessages(userId, dialogflowResponse);
                  aiResponseText = formatResponseForSheet(dialogflowResponse.messages);
                  intentName = dialogflowResponse.intent;
              }
          }
          
      } else {
          aiResponseText = queryExternalAI(userMessage); 
          sendLineMessages(userId, { messages: [{ type: 'text', text: aiResponseText }] });
          intentName = 'ai.external.fallback';
      }
      
    } else {
      // Manual Mode Logic
      if (SYSTEM_CONFIG.FEATURES.AUTO_RESPONSE) {
          const echoMessage = SYSTEM_CONFIG.MESSAGES.ECHO_TEMPLATE.replace('{message}', userMessage);
          pushSimpleMessage(userId, echoMessage);
          aiResponseText = `[ECHO] ${userMessage}`;
      } else {
          aiResponseText = '[NO REPLY - Manual Chat Mode]';
      }
      intentName = 'manual.mode';
    }
    
    updateFollowerInteraction(userId); 
    saveConversation({ 
      userId: userId,
      userMessage: userMessage,
      aiResponse: aiResponseText, 
      intent: intentName,
      timestamp: new Date()
    });
    
  } catch (error) {
    Logger.log(`❌ Error in handleTextMessage: ${error.message}`);
    pushSimpleMessage(userId, SYSTEM_CONFIG.MESSAGES.ERROR);
  }
}

/**
 * ⚙️ Handle Oil Report Flow (ฟังก์ชันใหม่สำหรับจัดการ Flow)
 */
function handleOilReportFlow(event, state) {
  const userId = event.source.userId;
  const msg = event.message;

  // --- CASE: ยกเลิก ---
  if (msg.type === 'text' && msg.text.trim() === 'ยกเลิก') {
    clearReportState(userId);
    pushSimpleMessage(userId, '❌ ยกเลิกรายการเรียบร้อยครับ หากต้องการรายงานใหม่ กรุณาพิมพ์ชื่อสาขาอีกครั้ง');
    return;
  }

  // --- STEP 1: รอรับยอดเงิน ---
  if (state.step === 'AWAITING_AMOUNT') {
    if (msg.type === 'text') {
      const amountText = msg.text.replace(/,/g, '').trim(); 
      const amount = parseFloat(amountText);

      if (!isNaN(amount) && amount > 0) {
        const nextData = { ...state.data, amount: amount };
        setReportState(userId, 'AWAITING_IMAGE', nextData);
        pushSimpleMessage(userId, `✅ รับยอด ${formatNumber(amount)} บาท\n📸 กรุณา "ส่งรูปสลิป/บิล" เข้ามาเพื่อยืนยันครับ\n(พิมพ์ "ยกเลิก" เพื่อเริ่มใหม่)`);
      } else {
        pushSimpleMessage(userId, '⚠️ กรุณาพิมพ์เฉพาะ "ตัวเลข" เท่านั้นครับ (เช่น 500 หรือ 1250.50)');
      }
    } else {
      pushSimpleMessage(userId, '⚠️ กรุณาพิมพ์ยอดเงินเป็นตัวเลขครับ');
    }
    return;
  }

  // --- STEP 2: รอรับรูปภาพ ---
  if (state.step === 'AWAITING_IMAGE') {
    if (msg.type === 'image') {
      try {
        // บันทึกรูปและข้อมูล
        const imageUrl = getMediaContent(msg.id); 
        const finalData = {
          userId: userId,
          branch: state.data.branch,
          amount: state.data.amount,
          imageUrl: imageUrl
        };

        const summary = saveOilReport(finalData);

        const replyText = `✅ บันทึกสำเร็จ!\n\n📍 สาขา: ${summary.branch}\n💰 ยอดครั้งนี้: ${formatNumber(summary.latest)} บ.\n📊 สะสมเดือนนี้: ${formatNumber(summary.accumulated)} บ.\n🎯 เป้าเดือนนี้: ${formatNumber(summary.goal)} บ.`;
        pushSimpleMessage(userId, replyText);
        clearReportState(userId);

      } catch (error) {
        Logger.log('Error in oil flow: ' + error.message);
        pushSimpleMessage(userId, '❌ เกิดข้อผิดพลาดในการบันทึก: ' + error.message + '\nกรุณาลองส่งรูปใหม่อีกครั้งครับ');
      }
    } else {
      pushSimpleMessage(userId, '⚠️ กรุณาส่งเป็น "รูปภาพ" เท่านั้นครับ 📸');
    }
    return;
  }
}

/**
 * Handle Postback Event
 */
function handlePostbackEvent(event) {
  const userId = event.source?.userId;
  const postbackData = event.postback?.data;

  if (!userId || !postbackData) return;

  try {
    sendLoadingAnimation(userId);
    
    if (SYSTEM_CONFIG.FEATURES.DIALOGFLOW_ENABLED) {
        const dialogflowResponse = queryDialogflow(postbackData, userId);
        if (dialogflowResponse && dialogflowResponse.messages) {
            sendLineMessages(userId, dialogflowResponse);
            saveConversation({
                userId: userId,
                userMessage: '[Postback] ' + postbackData,
                aiResponse: formatResponseForSheet(dialogflowResponse.messages),
                intent: dialogflowResponse.intent,
                timestamp: new Date()
            });
        }
    } else {
        pushSimpleMessage(userId, SYSTEM_CONFIG.MESSAGES.MAINTENANCE);
        saveConversation({
            userId: userId,
            userMessage: '[Postback] ' + postbackData,
            aiResponse: '[SYSTEM MAINTENANCE]',
            intent: 'manual.mode',
            timestamp: new Date()
        });
    }
    updateFollowerInteraction(userId);
  } catch (error) {
    Logger.log(`❌ Error in handlePostbackEvent: ${error.message}`);
    pushSimpleMessage(userId, SYSTEM_CONFIG.MESSAGES.ERROR);
  }
}

/**
 * Handle Follow Event
 */
function handleFollowEvent(event) {
  try {
    const userId = event.source?.userId;
    const timestamp = new Date(event.timestamp);
    if (!userId) return;
    
    Logger.log(`👤 New Follower: ${userId}`);
    const profile = getUserProfile(userId); 
    const existingData = getFollowerData(userId);
    const followCount = existingData ? existingData.followCount + 1 : 1;
    const firstFollowDate = existingData ? existingData.firstFollowDate : timestamp;
    
    saveFollower({
      userId: userId,
      displayName: profile.displayName || SYSTEM_CONFIG.DEFAULTS.UNKNOWN_DISPLAY_NAME,
      pictureUrl: profile.pictureUrl || '',
      language: profile.language || SYSTEM_CONFIG.DEFAULTS.UNKNOWN_LANGUAGE,
      statusMessage: profile.statusMessage || '',
      firstFollowDate: firstFollowDate,
      lastFollowDate: timestamp,
      followCount: followCount,
      status: SYSTEM_CONFIG.DEFAULTS.FOLLOWER_STATUS, 
      sourceChannel: SYSTEM_CONFIG.DEFAULTS.FOLLOWER_SOURCE,
      tags: SYSTEM_CONFIG.DEFAULTS.FOLLOWER_TAGS,
      lastInteraction: timestamp,
      totalMessages: 0
    });
    
    saveConversation({
      userId: userId,
      userMessage: '[Follow Event]',
      aiResponse: '[SYSTEM] Follower saved.',
      intent: 'system.follow',
      timestamp: timestamp
    });
  } catch (error) {
    Logger.log(`❌ Error in handleFollowEvent: ${error.message}`);
  }
}

/**
 * Handle Unfollow Event
 */
function handleUnfollowEvent(event) {
  try {
    const userId = event.source?.userId;
    const timestamp = new Date(event.timestamp);
    if (!userId) return;
    updateFollowerStatus(userId, 'blocked', timestamp);
  } catch (error) {
    Logger.log(`❌ Error in handleUnfollowEvent: ${error.message}`);
  }
}

// ========================================
// 4. Media Handling Handlers
// ========================================

function handleMediaMessage(event, mediaType, intentPrefix, aiResponseText) {
  const userId = event.source?.userId;
  if (userId) {
    sendLoadingAnimation(userId); 
    saveConversation({
      userId: userId,
      userMessage: `[${mediaType} Message]`,
      aiResponse: aiResponseText,
      intent: intentPrefix,
      timestamp: new Date()
    });
    updateFollowerInteraction(userId);
  }
}

function handleVideoMessage(event) { handleMediaMessage(event, 'Video', 'media.video', 'Video received'); }
function handleAudioMessage(event) { handleMediaMessage(event, 'Audio', 'media.audio', 'Audio received'); }
function handleFileMessage(event) { handleMediaMessage(event, 'File', 'media.file', 'File received'); }
function handleLocationMessage(event) { handleMediaMessage(event, 'Location', 'media.location', 'Location received'); }
function handleStickerMessage(event) { handleMediaMessage(event, 'Sticker', 'media.sticker', 'Sticker received'); }

// ========================================
// 5. Helper Function
// ========================================

function formatResponseForSheet(messages) {
  if (!messages || messages.length === 0) return 'No response';
  const responses = [];
  messages.forEach((msg) => {
    if (msg.type === 'text') responses.push(`[Text] ${msg.text}`);
    else if (msg.type === 'image') responses.push(`[Image] ${msg.originalContentUrl}`);
    else if (msg.type === 'flex') responses.push(`[Flex] ${msg.altText || 'Flex Message'}`);
    else responses.push(`[${msg.type}] Unknown format`);
  });
  return responses.join('\n');
}