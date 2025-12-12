// ========================================
// 📨 EVENTHANDLER.GS - EVENT PROCESSING (V2.0 FINAL)
// ========================================
// ไฟล์นี้จัดการ Events ต่างๆ จาก LINE
// Note: ต้องพึ่งพา LineAPI.gs, SheetService.gs, FollowerService.gs, DialogflowService.gs

// ========================================
// 1. Message Router (ใช้ใน Main.gs)
// ========================================

/**
 * Handle Message Event (จัดการตามประเภทข้อความ)
 */
function handleMessageEvent(event) {
  try {
    const messageType = event.message?.type;
    if (!messageType) return;
    
    Logger.log(`📨 Message type: ${messageType}`);

    switch (messageType) {
      case 'text':
        handleTextMessage(event);
        break;
        
      case 'image':
        handleImageMessage(event);
        break;
        
      case 'video':
        handleVideoMessage(event);
        break;
        
      case 'audio':
        handleAudioMessage(event);
        break;
        
      case 'file':
        handleFileMessage(event);
        break;
        
      case 'location':
        handleLocationMessage(event);
        break;
        
      case 'sticker':
        handleStickerMessage(event);
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
 * Handle Text Message (Logic หลัก Dialogflow/Maintenance)
 */
function handleTextMessage(event) {
  const userId = event.source?.userId;
  const userMessage = event.message?.text?.trim();

  if (!userId || !userMessage) return;

  try {
    sendLoadingAnimation(userId);
    let aiResponseText = '';
    let intentName = 'N/A';
    
    // ตรวจสอบสถานะ DIALOGFLOW_ENABLED (จาก SYSTEM_CONFIG.FEATURES)
    if (SYSTEM_CONFIG.FEATURES.DIALOGFLOW_ENABLED) {
      // 🟢 เปิดใช้งาน Dialogflow / Hybrid AI
      const dialogflowResponse = queryDialogflow(userMessage, userId); // จาก DialogflowService.gs

      if (dialogflowResponse && dialogflowResponse.messages) {
          
          // 🧠 HYBRID AI LOGIC START
          const confidence = dialogflowResponse.confidence || 0;
          
          // ⚠️ Note: DIALOGFLOW_CONFIDENCE_THRESHOLD ต้องถูกตั้งค่าใน Config.gs (เช่น 0.65)
          const CONFIDENCE_THRESHOLD = SYSTEM_CONFIG.DEFAULTS.DIALOGFLOW_CONFIDENCE_THRESHOLD || 0.65; 
          
          if (confidence < CONFIDENCE_THRESHOLD) {
              // ➡️ Confidence ต่ำ: ใช้ External AI เป็น Fallback
              Logger.log(`🧠 Dialogflow confidence (${confidence}) is low. Calling External AI.`);
              
              aiResponseText = queryExternalAI(userMessage); // ⬅️ เรียก AIService.gs
              
              // ส่งคำตอบที่ได้จาก External AI (LLM) กลับไป
              sendLineMessages(userId, { messages: [{ type: 'text', text: aiResponseText }] });
              
              intentName = 'ai.external.fallback';
              
          } else {
              // ➡️ Confidence สูง: ใช้ Dialogflow ตอบกลับ
              Logger.log(`🤖 Dialogflow confidence (${confidence}) is high. Using Fulfillment.`);
              
              sendLineMessages(userId, dialogflowResponse);
              aiResponseText = formatResponseForSheet(dialogflowResponse.messages);
              intentName = dialogflowResponse.intent;
          }
          // 🧠 HYBRID AI LOGIC END
          
    } else {
        // Dialogflow ล้มเหลวในการเชื่อมต่อหรือตอบกลับ
        // ⚠️ NEW LOGIC: ใช้ External AI เป็น Fallback/Error Handler
        aiResponseText = queryExternalAI(userMessage); // ⬅️ ลองเรียก AI แทน Error
        sendLineMessages(userId, { messages: [{ type: 'text', text: aiResponseText }] });
        intentName = 'ai.external.fallback';
    }
      
    } else {
      // 🔴 ปิดใช้งาน Dialogflow (Maintenance Mode / Manual Chat Mode)
      Logger.log('📵 Dialogflow DISABLED - Maintenance Mode');
      
      if (SYSTEM_CONFIG.FEATURES.AUTO_RESPONSE) {
          const echoMessage = SYSTEM_CONFIG.MESSAGES.ECHO_TEMPLATE
                .replace('{message}', userMessage);
          pushSimpleMessage(userId, echoMessage);
          aiResponseText = `[ECHO] ${userMessage}`;
      } else {
          aiResponseText = '[NO REPLY - Manual Chat Mode]';
      }
      intentName = 'manual.mode';
    }
    
    // ✅ อัปเดตสถิติผู้ติดตาม (ต้องรันเสมอ)
    updateFollowerInteraction(userId); // จาก FollowerService.gs

    // ✅ บันทึกข้อมูลลง Sheet
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
 * Handle Postback Event (Logic หลัก Dialogflow/Maintenance)
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
        } else {
            pushSimpleMessage(userId, SYSTEM_CONFIG.MESSAGES.ERROR);
        }
    } else {
        // Maintenance Mode
        pushSimpleMessage(userId, SYSTEM_CONFIG.MESSAGES.MAINTENANCE);
        saveConversation({
            userId: userId,
            userMessage: '[Postback] ' + postbackData,
            aiResponse: '[SYSTEM MAINTENANCE]',
            intent: 'manual.mode',
            timestamp: new Date()
        });
    }

    // ✅ อัปเดตสถิติผู้ติดตาม (ต้องรันเสมอ)
    updateFollowerInteraction(userId); // จาก FollowerService.gs

  } catch (error) {
    Logger.log(`❌ Error in handlePostbackEvent: ${error.message}`);
    pushSimpleMessage(userId, SYSTEM_CONFIG.MESSAGES.ERROR);
  }
}


// ========================================
// 3. Follower Management Handlers - FINAL (รวม Logic)
// ========================================

/**
 * Handle Follow Event (เพิ่มเพื่อน)
 */
function handleFollowEvent(event) {
  try {
    const userId = event.source?.userId;
    const timestamp = new Date(event.timestamp);
    
    if (!userId) return;
    
    Logger.log(`👤 New Follower: ${userId}`);
    
    // 1. Get user profile (จาก LineAPI.gs)
    const profile = getUserProfile(userId); 
    
    // 2. Check if user followed before (จาก FollowerService.gs)
    const existingData = getFollowerData(userId);
    const followCount = existingData ? existingData.followCount + 1 : 1;
    const firstFollowDate = existingData ? existingData.firstFollowDate : timestamp;
    
    // 3. Save follower data (จาก FollowerService.gs)
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
    
    // 4. บันทึก Follow Event ลง Conversation
    saveConversation({
      userId: userId,
      userMessage: '[Follow Event]',
      aiResponse: '[SYSTEM] Follower saved.',
      intent: 'system.follow',
      timestamp: timestamp
    });
    Logger.log('✅ Follow event processed');
  } catch (error) {
    Logger.log(`❌ Error in handleFollowEvent: ${error.message}`);
  }
}

/**
 * Handle Unfollow Event (บล็อก/ลบเพื่อน)
 */
function handleUnfollowEvent(event) {
  try {
    const userId = event.source?.userId;
    const timestamp = new Date(event.timestamp);
    
    if (!userId) return;
    
    Logger.log(`👋 User Unfollowed: ${userId}`);
    
    // Update follower status to blocked (จาก FollowerService.gs)
    updateFollowerStatus(userId, 'blocked', timestamp);
    
    Logger.log('✅ Unfollow event processed');
  } catch (error) {
    Logger.log(`❌ Error in handleUnfollowEvent: ${error.message}`);
  }
}

// ========================================
// 4. Media Handling Handlers - DIALOGFLOW CENTRIC
// ========================================

/**
 * Handle Media Message (Image, Video, Audio, File, Location, Sticker)
 * Note: ลบ pushSimpleMessage() และให้ Dialogflow/WebHook จัดการคำตอบ
 */
function handleMediaMessage(event, mediaType, intentPrefix, aiResponseText) {
  const userId = event.source?.userId;
  Logger.log(`🖼️ ${mediaType} message received`);
  if (userId) {
    sendLoadingAnimation(userId); 
    
    // 1. **NO PUSH MESSAGE HERE**

    // 2. บันทึก Event ลง Conversation
    saveConversation({
      userId: userId,
      userMessage: `[${mediaType} Message]`,
      aiResponse: aiResponseText,
      intent: intentPrefix,
      timestamp: new Date()
    });
    
    // 3. อัปเดตสถิติผู้ติดตาม
    updateFollowerInteraction(userId);
    
    // 4. (Optional) Query Dialogflow ด้วย Text Fallback สำหรับ Media
    // ถ้าต้องการให้ Dialogflow ตอบกลับโดยอัตโนมัติ ให้เพิ่ม Logic นี้:
    // 
    // if (SYSTEM_CONFIG.FEATURES.DIALOGFLOW_ENABLED) {
    //     // ส่ง Text Query ไปที่ Dialogflow (เช่น "[MEDIA_IMAGE]")
    //     const dialogflowResponse = queryDialogflow(`[${intentPrefix}]`, userId);
    //     if (dialogflowResponse && dialogflowResponse.messages) {
    //         sendLineMessages(userId, dialogflowResponse);
    //     }
    // }
  }
}

function handleImageMessage(event) {
  handleMediaMessage(event, 'Image', 'media.image', 'Image received');
}

function handleVideoMessage(event) {
  handleMediaMessage(event, 'Video', 'media.video', 'Video received');
}

function handleAudioMessage(event) {
  handleMediaMessage(event, 'Audio', 'media.audio', 'Audio received');
}

function handleFileMessage(event) {
  handleMediaMessage(event, 'File', 'media.file', 'File received');
}

function handleLocationMessage(event) {
  const userId = event.source?.userId;
  const location = event.message;
  if (userId && location) {
    const address = location.address || 'Unknown location';
    
    handleMediaMessage(event, 'Location', 'media.location', `Location received: ${address}`);
  }
}

function handleStickerMessage(event) {
  handleMediaMessage(event, 'Sticker', 'media.sticker', 'Sticker received');
}


// ========================================
// 5. Helper Function (ย้ายจาก loading-animation.js)
// ========================================

/**
 * Format Response for Google Sheet (คอลัม D)
 */
function formatResponseForSheet(messages) {
  if (!messages || messages.length === 0) return 'No response';
  
  const responses = [];
  
  messages.forEach((msg, index) => {
    // ใช้ Logic การ format เดิม
    if (msg.type === 'text') {
      responses.push(`[Text] ${msg.text}`);
      if (msg.quickReply && msg.quickReply.items) {
        const quickReplies = msg.quickReply.items.map(item => item.action.label).join(', ');
        responses.push(`  └─ Quick Reply: ${quickReplies}`);
      }
    } 
    else if (msg.type === 'image') { responses.push(`[Image] ${msg.originalContentUrl}`); }
    else if (msg.type === 'flex') {
      const altText = msg.altText || 'Flex Message';
      responses.push(`[Flex] ${altText}`);
      if (msg.contents && msg.contents.type === 'carousel') {
        const bubbleCount = msg.contents.contents ? msg.contents.contents.length : 0;
        responses.push(`  └─ Carousel: ${bubbleCount} items`);
      }
    }
    else if (msg.type === 'template') { responses.push(`[Template] ${msg.template.type}`); }
    else { responses.push(`[${msg.type}] Unknown format`); }
  });
  
  return responses.join('\n');
}