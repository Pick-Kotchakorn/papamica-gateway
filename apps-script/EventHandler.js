// ========================================
// 📨 EVENTHANDLER.GS - CHAT FLOW EDITION (V2.5 - MarkAsRead Ready)
// ========================================
// ไฟล์นี้จัดการ Events ต่างๆ จาก LINE
// ปรับปรุง: แยก Logic เป็น SYNC (ตอบกลับ) และ ASYNC (บันทึกข้อมูล) เพื่อประสิทธิภาพ

// Note: ต้องพึ่งพา LineAPI.gs, SheetService.gs, FollowerService.gs, 
// DialogflowService.gs, ReportStateService.js, Utils.js

// ========================================
// 1. Message Router (ใช้ใน Main.js)
// ========================================

/**
 * Handle Message Event (จัดการตามประเภทข้อความ)
 * SYNC PHASE: เน้นการตอบกลับ LINE เท่านั้น!
 */
function handleMessageEvent(event) {
  try {
    const userId = event.source?.userId;
    const messageType = event.message?.type;
    // 💡 NEW: ดึง Read Token จาก Event Object
    const readToken = event.message?.markAsReadToken; 
    
    if (!messageType || !userId) return;

    // ----------------------------------------------------
    // 💡 NEW: MARK AS READ (ทำงานเร็วที่สุด, ก่อน Loading Animation)
    // ----------------------------------------------------
    if (readToken && typeof markAsRead === 'function') {
      // เรียก Mark as Read (จะใช้ retry ภายใน LineAPI.js)
      markAsRead(readToken);
    }
    // ----------------------------------------------------
    
    // ----------------------------------------------------
    // 🟢 CHAT FLOW INTERCEPTOR
    // ตรวจสอบก่อนว่า User อยู่ในระหว่างขั้นตอนรายงานหรือไม่?
    // ----------------------------------------------------
    if (typeof getReportState === 'function') {
      const currentState = getReportState(userId); // จาก ReportStateService.js
      
      if (currentState) {
        Logger.log(`🔄 User ${userId} is in state: ${currentState.step} (Sync Intercept)`);
        handleOilReportFlow(event, currentState); // Oil Report Flow ถูกคงไว้ใน SYNC เพราะต้องจบ Flow ด้วยคำตอบสุดท้าย
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
      case 'video':
      case 'audio':
      case 'file':
      case 'location':
      case 'sticker':
        // ไม่ต้องตอบกลับ/บันทึกใน SYNC PHASE - งานบันทึกถูกย้ายไป ASYNC
        Logger.log(`ℹ️ Media/Sticker received. Response/Save deferred to ASYNC.`);
        break;
        
      default:
        Logger.log(`⚠️ Unsupported message type: ${messageType}`);
        pushSimpleMessage(event.source?.userId, SYSTEM_CONFIG.MESSAGES.ERROR);
        break;
    }
    
  } catch (error) {
    Logger.log(`❌ Error in handleMessageEvent (Sync): ${error.message}`);
    pushSimpleMessage(event.source?.userId, SYSTEM_CONFIG.MESSAGES.ERROR);
  }
}

// ========================================
// 2. Core Handlers (Text & Postback - SYNC)
// ========================================

/**
 * Handle Text Message (Logic หลัก: Trigger Chat Flow / Dialogflow / Maintenance)
 * SYNC PHASE: เน้นการตอบกลับ LINE เท่านั้น! (ลบ Sheet Write ออก)
 */
function handleTextMessage(event) {
  const userId = event.source?.userId;
  const userMessage = event.message?.text?.trim();

  if (!userId || !userMessage) return;

  try {
    sendLoadingAnimation(userId);
    
    // ====================================================
    // 🟢 CHAT FLOW TRIGGER (Sync - ตอบกลับเพื่อขอข้อมูลขั้นถัดไป)
    // ====================================================
    const branchMap = {
        'kingsquare': 'KSQ', 'ksq': 'KSQ',
        'emquartier': 'EMQ', 'emq': 'EMQ',
        'one bangkok': 'ONB', 'onb': 'ONB'
    };

    const userMessageLower = userMessage.toLowerCase();
    const selectedBranchCode = branchMap[userMessageLower];

    if (selectedBranchCode) {
        Logger.log(`🚀 Starting Oil Report Flow for branch: ${selectedBranchCode} (Sync Phase)`);
        
        // 1. ตั้งสถานะเป็น "รอรับยอดเงิน"
        setReportState(userId, 'AWAITING_AMOUNT', { branch: selectedBranchCode });
        
        // 2. ตอบกลับเพื่อขอข้อมูลขั้นถัดไป
        const replyText = `📍 สาขา: ${selectedBranchCode}\n💰 กรุณาพิมพ์ "ยอดขาย" (เฉพาะตัวเลข) ส่งมาได้เลยครับ`;
        pushSimpleMessage(userId, replyText);
        
        // 🛑 จบการทำงานที่นี่ (งานบันทึกจะถูกทำใน ASYNC)
        return; 
    }
    // ====================================================
        
    // ----------------------------------------------------
    // LOGIC เดิม: Dialogflow / Hybrid AI (SYNC)
    // ----------------------------------------------------
    if (SYSTEM_CONFIG.FEATURES.DIALOGFLOW_ENABLED) {
        const dialogflowResponse = queryDialogflow(userMessage, userId);

        if (dialogflowResponse && dialogflowResponse.messages) {
            
            const fulfillmentText = dialogflowResponse.fulfillmentText?.trim() || '';
            
            if (fulfillmentText === 'TRIGGER_BOOKING_TEMPLATE') {
                if (typeof getBookingTemplate === 'function') {
                   const bookingMessages = getBookingTemplate();
                   sendLineMessages(userId, { messages: bookingMessages });
                }
            } else {
                const confidence = dialogflowResponse.confidence || 0;
                const CONFIDENCE_THRESHOLD = SYSTEM_CONFIG.DEFAULTS.DIALOGFLOW_CONFIDENCE_THRESHOLD || 0.65; 
                
                if (confidence < CONFIDENCE_THRESHOLD) {
                    const aiResponseText = queryExternalAI(userMessage); 
                    sendLineMessages(userId, { messages: [{ type: 'text', text: aiResponseText }] });
                } else {
                    sendLineMessages(userId, dialogflowResponse);
                }
            }
            
        } else {
            const aiResponseText = queryExternalAI(userMessage); 
            sendLineMessages(userId, { messages: [{ type: 'text', text: aiResponseText }] });
        }
        
    } else {
      // Manual Mode Logic (SYNC)
      if (SYSTEM_CONFIG.FEATURES.AUTO_RESPONSE) {
          const echoMessage = SYSTEM_CONFIG.MESSAGES.ECHO_TEMPLATE.replace('{message}', userMessage);
          pushSimpleMessage(userId, echoMessage);
      }
    }
    
  } catch (error) {
    Logger.log(`❌ Error in handleTextMessage (Sync): ${error.message}`);
    pushSimpleMessage(userId, SYSTEM_CONFIG.MESSAGES.ERROR);
  }
}

/**
 * Handle Postback Event
 * SYNC PHASE: เน้นการตอบกลับ LINE เท่านั้น! (ลบ Sheet Write ออก)
 */
function handlePostbackEvent(event) {
  const userId = event.source?.userId;
  const postbackData = event.postback?.data;

  if (!userId || !postbackData) return;

  try {
    sendLoadingAnimation(userId);
    
    // Note: Postback event ไม่มี markAsReadToken อยู่ใน Event Object จึงไม่สามารถเรียก MarkAsRead ได้โดยตรง
    
    if (SYSTEM_CONFIG.FEATURES.DIALOGFLOW_ENABLED) {
        const dialogflowResponse = queryDialogflow(postbackData, userId);
        if (dialogflowResponse && dialogflowResponse.messages) {
            sendLineMessages(userId, dialogflowResponse);
        }
    } else {
        pushSimpleMessage(userId, SYSTEM_CONFIG.MESSAGES.MAINTENANCE);
    }
    
  } catch (error) {
    Logger.log(`❌ Error in handlePostbackEvent (Sync): ${error.message}`);
    pushSimpleMessage(userId, SYSTEM_CONFIG.MESSAGES.ERROR);
  }
}

/**
 * Handle Follow Event
 * SYNC PHASE: เน้นการส่ง Welcome Message ทันที! (ลบ Profile Fetch & Sheet Write ออก)
 */
function handleFollowEvent(event) {
  try {
    const userId = event.source?.userId;
    if (!userId) return;
    
    Logger.log(`👤 New Follower: ${userId} (Sync Phase - Send Welcome)`);
    
    // 💡 ส่ง Welcome Message ทันที!
    const welcomeMessage = '🎉 ยินดีต้อนรับสู่ Papamica Bot ค่ะ! หากต้องการรายงานยอดขาย กรุณาพิมพ์ชื่อสาขา Kingsquare, Emquartier หรือ One Bangkok';
    pushSimpleMessage(userId, welcomeMessage);
    
    // 🛑 ลบ: Profile Fetch, saveFollower, saveConversation (ย้ายไป ASYNC)

  } catch (error) {
    Logger.log(`❌ Error in handleFollowEvent (Sync): ${error.message}`);
  }
}

/**
 * Handle Unfollow Event (SYNC)
 * ไม่ต้องทำอะไรใน SYNC PHASE
 */
function handleUnfollowEvent(event) {
  Logger.log('👋 Unfollow event received. Processing deferred to ASYNC.');
}


// ========================================
// 3. Media Handling (Sync)
// ========================================

/**
 * ⚙️ Handle Oil Report Flow (ฟังก์ชันสำหรับจัดการ Flow)
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
        // บันทึกรูปและข้อมูล (Heavy I/O: LINE API Fetch + Drive Write + Sheet Write)
        
        const imageUrl = getMediaContent(msg.id); // <-- Line API Fetch + Drive Write (มี retry แล้ว)
        const finalData = {
          userId: userId,
          branch: state.data.branch,
          amount: state.data.amount,
          imageUrl: imageUrl
        };

        const summary = saveOilReport(finalData); // <-- Sheet Write

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

function handleMediaMessage(event, mediaType, intentPrefix, aiResponseText) {
  const userId = event.source?.userId;
  if (userId) {
    sendLoadingAnimation(userId); 
  }
}

function handleVideoMessage(event) { handleMediaMessage(event, 'Video', 'media.video', 'Video received'); }
function handleAudioMessage(event) { handleMediaMessage(event, 'Audio', 'media.audio', 'Audio received'); }
function handleFileMessage(event) { handleMediaMessage(event, 'File', 'media.file', 'File received'); }
function handleLocationMessage(event) { handleMediaMessage(event, 'Location', 'media.location', 'Location received'); }
function handleStickerMessage(event) { handleMediaMessage(event, 'Sticker', 'media.sticker', 'Sticker received'); }

// ========================================
// 4. ASYNCHRONOUS HANDLERS (Unchanged)
// ========================================

/**
 * ASYNC: Handles saving conversation and updating interaction for message events.
 * @param {Object} event - The full event object
 */
function asyncHandleMessage(event) {
    const userId = event.source?.userId;
    const messageType = event.message?.type;
    const userMessage = event.message?.text?.trim() || `[${messageType} Message]`;
    
    if (!userId) return;

    let intentName = 'async.message';
    let aiResponseText = '[Async Save: Response Sent in Sync Phase]';

    if (messageType === 'text') {
        const branchMap = {
            'kingsquare': 'KSQ', 'ksq': 'KSQ',
            'emquartier': 'EMQ', 'emq': 'EMQ',
            'one bangkok': 'ONB', 'onb': 'ONB'
        };
        const userMessageLower = userMessage.toLowerCase();
        if (branchMap[userMessageLower]) {
            intentName = 'oil_report.start';
            aiResponseText = '[Async Save: Oil Flow Initiated]';
        } else {
            intentName = 'chat.message';
        }
    } else if (messageType === 'image') {
        intentName = 'media.image';
        aiResponseText = 'Image received (Async Save)';
    } else if (messageType === 'video') {
        intentName = 'media.video';
        aiResponseText = 'Video received (Async Save)';
    } else if (messageType === 'sticker') {
        intentName = 'media.sticker';
        aiResponseText = 'Sticker received (Async Save)';
    }

    // 1. บันทึก Conversation
    saveConversation({ 
        userId: userId,
        userMessage: userMessage, 
        aiResponse: aiResponseText, 
        intent: intentName,
        timestamp: new Date(event.timestamp)
    });

    // 2. อัปเดต Follower Interaction
    updateFollowerInteraction(userId);
}

/**
 * ASYNC: Handles saving conversation for postback events.
 * @param {Object} event - The full event object
 */
function asyncHandlePostback(event) {
    const userId = event.source?.userId;
    const postbackData = event.postback?.data;

    if (!userId || !postbackData) return;

    // 1. บันทึก Conversation
    saveConversation({
        userId: userId,
        userMessage: '[Postback] ' + postbackData,
        aiResponse: '[Async Save: Response Sent in Sync Phase]',
        intent: 'postback.async.save', 
        timestamp: new Date(event.timestamp)
    });

    // 2. อัปเดต Follower Interaction
    updateFollowerInteraction(userId);
}


/**
 * ASYNC: Handles the heavy part of Follow Event (Profile Fetch & Sheet Save)
 * @param {Object} event - The full event object
 */
function asyncHandleFollow(event) {
    const userId = event.source?.userId;
    const timestamp = new Date(event.timestamp);
    if (!userId) return;
    
    Logger.log(`👤 Processing Follower Profile/Save for ${userId} (Async Phase)`);
    
    // 1. Fetch Profile (Network I/O)
    const profile = getUserProfile(userId); 
    
    // 2. Load Existing Data (Sheet I/O / Cache)
    const existingData = getFollowerData(userId); 
    
    // 3. Prepare data and Save (Sheet I/O)
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
    
    // 4. บันทึก Conversation
    saveConversation({ 
      userId: userId,
      userMessage: '[Follow Event]',
      aiResponse: '[SYSTEM] Follower saved (Async).',
      intent: 'system.follow',
      timestamp: timestamp
    });
}

/**
 * ASYNC: Handles the heavy part of Unfollow Event (Status Update)
 * @param {Object} event - The full event object
 */
function asyncHandleUnfollow(event) {
    const userId = event.source?.userId;
    const timestamp = new Date(event.timestamp);
    if (!userId) return;
    
    Logger.log(`👋 Processing Unfollow for ${userId} (Async Phase)`);
    // Update status (Sheet I/O)
    updateFollowerStatus(userId, 'blocked', timestamp); 
}

// ========================================
// 5. Helper Function (Unchanged)
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