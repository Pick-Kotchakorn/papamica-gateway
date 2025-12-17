// ========================================
// 📨 EVENTHANDLER.GS - FULL VERSION (Oil Report + Logging + Fix ReplyToken)
// ========================================

/**
 * 1. Message Router
 * ฟังก์ชันหลักในการแยกประเภทข้อความและส่งไปยัง Handler ที่เหมาะสม
 */
function handleMessageEvent(event) {
  try {
    const userId = event.source?.userId;
    const messageType = event.message?.type;
    const readToken = event.message?.markAsReadToken;
    
    if (!messageType || !userId) return;

    // ⚡ Fast Action: Mark as Read
    if (readToken && typeof markAsRead === 'function') {
      markAsRead(readToken);
    }

    Logger.log(`📨 Message type: ${messageType} from ${userId}`);

    switch (messageType) {
      case 'text':
        handleTextMessage(event);
        break;
        
      case 'image':
        // ✅ ตรวจสอบก่อนว่าเป็นรูปสำหรับรายงานน้ำมันหรือไม่?
        const isOilReport = handleOilReportImage(event);
        
        if (!isOilReport) {
           // ถ้าไม่ใช่รูปรายงานน้ำมัน ให้บันทึก Interaction ว่ามีการส่งรูปมา
           updateFollowerInteraction(userId);
           Logger.log(`ℹ️ General Image received.`);
        }
        break;
        
      default:
        Logger.log(`⚠️ Unsupported message type: ${messageType}`);
        break;
    }
    
  } catch (error) {
    Logger.log(`❌ Error in handleMessageEvent: ${error.message}`);
  }
}

/**
 * 2. Handle Text Message
 * จัดการข้อความตัวอักษร + Dialogflow + Logging
 */
function handleTextMessage(event) {
  const userId = event.source?.userId;
  const userMessage = event.message?.text?.trim();
  const replyToken = event.replyToken; // ✅ รับ Reply Token

  if (!userId || !userMessage) return;

  try {
    sendLoadingAnimation(userId);
    
    // ดึงข้อมูล Profile เพื่อใช้บันทึก Log
    const profile = getUserProfile(userId);
    const displayName = profile.displayName || 'Unknown';

    let aiResponse = '';
    let intent = 'N/A';

    // ----------------------------------------------------
    // 🧠 Dialogflow Processing
    // ----------------------------------------------------
    if (SYSTEM_CONFIG.FEATURES.DIALOGFLOW_ENABLED) {
      const dfResponse = queryDialogflow(userMessage, userId);
      const intentName = dfResponse.intent;
      const parameters = dfResponse.parameters;

      // ====================================================
      // 🟢 CASE 1: เริ่มต้น (เรียกเมนู Flex Message)
      // Intent: oil-report-start
      // ====================================================
      if (intentName === 'oil-report-start') {
        sendLineMessages(userId, dfResponse, replyToken); // ✅ ส่ง replyToken
        intent = intentName;
        aiResponse = '[Flex Message: Branch Selection Menu]';
      }

      // ====================================================
      // 🟢 CASE 2: เลือกสาขา (รับค่าจาก Entity @branch)
      // Intent: oil-report-select-branch
      // ====================================================
      else if (intentName === 'oil-report-select-branch' && parameters.branch) {
        const branchCode = parameters.branch;
        Logger.log(`📍 Selected Branch: ${branchCode}`);

        // ตั้งค่าสถานะ: รอรับยอดเงิน
        setReportState(userId, 'AWAITING_AMOUNT', { branch: branchCode });
        
        sendLineMessages(userId, dfResponse, replyToken); // ✅ ส่ง replyToken
        intent = intentName;
        aiResponse = `[Branch Selected: ${branchCode}]`;
      }

      // ====================================================
      // 🟢 CASE 3: ระบุยอดเงิน (รับตัวเลข) - (โค้ดที่ถูกปรับปรุง)
      // Intent: Oil Report - Amount
      // ====================================================
      else if (intentName === 'Oil Report - Amount' && parameters.amount) {
         const currentState = getReportState(userId);
         const rawAmount = parameters.amount;
         const amount = parseFloat(rawAmount); // ลองแปลงค่าเป็นตัวเลข

         if (currentState && currentState.step === 'AWAITING_AMOUNT') {
            
            // 1. ตรวจสอบความถูกต้องของตัวเลข (ต้องเป็นตัวเลขที่ถูกต้องและมากกว่า 0)
            if (isNaN(amount) || amount <= 0) {
                Logger.log(`⚠️ Invalid amount received (not positive number): ${rawAmount}. State kept at AWAITING_AMOUNT.`);
                
                // ส่งข้อความตอบกลับจาก Dialogflow (DF ควรตั้งค่าให้ตอบกลับข้อความเตือนว่ายอดเงินไม่ถูกต้อง)
                if (dfResponse.messages) {
                    sendLineMessages(userId, dfResponse, replyToken); 
                }
                intent = 'Oil Report - Invalid Amount';
                aiResponse = '[DF Response: Invalid Amount Alert]';

                // **สำคัญ: ไม่เปลี่ยนสถานะ (ผู้ใช้ต้องป้อนใหม่)**
                
            } else {
                // 2. ยอดเงินถูกต้อง: อัปเดตสถานะเป็นรอรูป พร้อมเก็บยอดเงิน
                setReportState(userId, 'AWAITING_IMAGE', { ...currentState.data, amount: amount });
                
                sendLineMessages(userId, dfResponse, replyToken); // ✅ ส่ง replyToken (ข้อความจาก DF ควรบอกให้ส่งรูป)
                intent = intentName;
                aiResponse = `[Amount Received & State AWAITING_IMAGE: ${amount}]`;
            }
         } else {
             // 3. กรณีพิมพ์ตัวเลขแต่ไม่ได้อยู่ใน Flow รายงาน (currentState ไม่ใช่ AWAITING_AMOUNT)
             Logger.log('ℹ️ Amount received outside of AWAITING_AMOUNT state. Sending DF response.');
             if (dfResponse.messages) {
               // ส่งข้อความตอบกลับจาก Dialogflow (DF ควรมี Fallback หรือข้อความทั่วไป)
               sendLineMessages(userId, dfResponse, replyToken);
             }
             intent = 'Oil Report - Out of Flow (Amount)';
             aiResponse = '[DF Response: Out of Flow]';
         }
      }
      
      // ====================================================
      // 🟢 Default Case: สนทนาทั่วไป
      // ====================================================
      else {
        if (dfResponse.messages) {
          sendLineMessages(userId, dfResponse, replyToken); // ✅ ส่ง replyToken
          intent = intentName || 'dialogflow.general';
          aiResponse = '[Dialogflow Response]';
        }
      }
      
    } else {
      // 🔴 Manual Mode (Dialogflow Disabled)
      pushSimpleMessage(userId, SYSTEM_CONFIG.MESSAGES.MAINTENANCE);
      intent = 'manual.maintenance';
      aiResponse = SYSTEM_CONFIG.MESSAGES.MAINTENANCE;
    }
    
    // ----------------------------------------------------
    // 📊 Logging System
    // ----------------------------------------------------
    
    // 1. อัปเดตสถิติการโต้ตอบของผู้ใช้ (Follower Interaction)
    updateFollowerInteraction(userId);

    // 2. บันทึกบทสนทนา (Conversation Log)
    saveConversation({
      userId: userId,
      displayName: displayName,
      userMessage: userMessage,
      aiResponse: aiResponse,
      intent: intent,
      timestamp: new Date()
    });
    
  } catch (error) {
    Logger.log(`❌ Error in handleTextMessage: ${error.message}`);
    pushSimpleMessage(userId, SYSTEM_CONFIG.MESSAGES.ERROR);
  }
}

/**
 * 3. Handle Oil Report Image
 * จัดการรูปภาพสลิป บันทึกลง Drive และ Sheet
 */
function handleOilReportImage(event) {
  const userId = event.source.userId;
  const messageId = event.message.id;
  
  // ตรวจสอบว่า User คนนี้กำลังทำรายการค้างอยู่ที่ขั้นตอน 'รอรูป' หรือไม่?
  const state = getReportState(userId);

  if (state && state.step === 'AWAITING_IMAGE') {
      try {
        pushSimpleMessage(userId, '⏳ กำลังบันทึกข้อมูลและอัปโหลดรูปภาพ...');

        // 1. บันทึกรูปภาพลง Drive
        const timestamp = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd_HHmm');
        const fileName = `SLIP_${state.data.branch}_${timestamp}`;
        const driveImageUrl = saveImageToDrive(messageId, fileName);

        // 2. เตรียมข้อมูลบันทึกลง Sheet
        const finalData = {
          userId: userId,
          branch: state.data.branch,
          amount: state.data.amount,
          imageUrl: driveImageUrl, 
          type: 'deposit'
        };

        // 3. บันทึกและคำนวณยอดสะสม
        const summary = saveOilReport(finalData);

        // 4. Helper Format Number
        const formatNum = (num) => {
             return Number(num).toLocaleString('th-TH', {minimumFractionDigits: 2});
        };

        // 5. แจ้งผลลัพธ์
        const replyText = `✅ บันทึกสำเร็จ!\n\n` +
                          `📍 สาขา: ${summary.branch}\n` +
                          `💰 ยอดครั้งนี้: ${formatNum(summary.latest)} บ.\n` +
                          `📊 สะสมเดือนนี้: ${formatNum(summary.accumulated)} บ.\n` + 
                          `🎯 เป้าหมาย: ${formatNum(summary.goal)} บ.\n` + 
                          `🖼️ หลักฐาน: บันทึกลง Drive เรียบร้อย`;
        
        pushSimpleMessage(userId, replyText);
        
        // 6. ล้างสถานะ & Logging
        clearReportState(userId);
        updateFollowerInteraction(userId);

      } catch (error) {
        Logger.log('Error processing image: ' + error.message);
        pushSimpleMessage(userId, '❌ เกิดข้อผิดพลาด: ' + error.message);
      }
      return true; // บอกว่า Process แล้ว
  }
  return false; // ไม่ใช่ Flow รายงาน
}

/**
 * 4. Handle Follow Event
 * บันทึกผู้ติดตามใหม่ (ไม่ต้องส่งข้อความต้อนรับ)
 */
function handleFollowEvent(event) {
  try {
    const userId = event.source?.userId;
    const timestamp = new Date(event.timestamp);
    if (!userId) return;
    
    Logger.log(`👤 New Follower: ${userId}`);
    
    // 1️⃣ ดึงข้อมูล Profile จาก LINE API
    const profile = getUserProfile(userId);
    
    // 2️⃣ ตรวจสอบข้อมูลเดิม (เพื่อดูว่าเป็นเพื่อนเก่ากลับมาใหม่หรือเปล่า)
    const existingData = getFollowerDataSheet(userId); // เรียกฟังก์ชัน helper จาก SheetService
    const followCount = existingData ? existingData.followCount + 1 : 1;
    const firstFollowDate = existingData ? existingData.firstFollowDate : timestamp;
    
    // 3️⃣ บันทึกข้อมูลลง Sheet Followers
    saveFollower({
      userId: userId,
      displayName: profile.displayName || 'Unknown',
      pictureUrl: profile.pictureUrl || '',
      language: profile.language || 'unknown',
      statusMessage: profile.statusMessage || '',
      firstFollowDate: firstFollowDate,
      lastFollowDate: timestamp,
      followCount: followCount,
      status: 'active',
      sourceChannel: 'unknown',
      tags: 'new-customer',
      lastInteraction: timestamp,
      totalMessages: 0
    });
    
    // ❌ ตัดส่วน welcomeMessage ออกตามคำสั่ง ❌
    // const welcomeMessage = '...';
    // pushSimpleMessage(userId, welcomeMessage);

    // 4️⃣ บันทึก Log ลง Conversations (ระบุว่าไม่ได้ส่งข้อความ)
    saveConversation({ 
      userId: userId,
      displayName: profile.displayName || 'Unknown',
      userMessage: '[Follow Event]',
      aiResponse: '[No Welcome Message]', // ปรับ Log ให้ตรงตามจริง
      intent: 'system.follow',
      timestamp: timestamp
    });

  } catch (error) {
    Logger.log(`❌ Error in handleFollowEvent: ${error.message}`);
  }
}

/**
 * 5. Handle Unfollow Event
 * อัปเดตสถานะเป็น Blocked
 */
function handleUnfollowEvent(event) {
    const userId = event.source?.userId;
    const timestamp = new Date(event.timestamp);
    if (!userId) return;
    
    Logger.log(`👋 User Unfollowed: ${userId}`);
    
    // อัปเดตสถานะใน Sheet Followers
    updateFollowerStatus(userId, 'blocked', timestamp);
}

/**
 * 6. Handle Postback Event
 * จัดการการกดปุ่ม (ถ้ามี)
 */
function handlePostbackEvent(event) {
  const userId = event.source?.userId;
  const postbackData = event.postback?.data;
  const replyToken = event.replyToken;

  if (!userId || !postbackData) return;

  try {
    sendLoadingAnimation(userId);
    
    // Log Postback
    saveConversation({
        userId: userId,
        displayName: 'User',
        userMessage: `[Postback] ${postbackData}`,
        aiResponse: 'Processing...',
        intent: 'postback',
        timestamp: new Date()
    });

    if (SYSTEM_CONFIG.FEATURES.DIALOGFLOW_ENABLED) {
        const dialogflowResponse = queryDialogflow(postbackData, userId);
        if (dialogflowResponse && dialogflowResponse.messages) {
            sendLineMessages(userId, dialogflowResponse, replyToken);
        }
    } else {
        pushSimpleMessage(userId, SYSTEM_CONFIG.MESSAGES.MAINTENANCE);
    }
    
    updateFollowerInteraction(userId);
    
  } catch (error) {
    Logger.log(`❌ Error in handlePostbackEvent: ${error.message}`);
    pushSimpleMessage(userId, SYSTEM_CONFIG.MESSAGES.ERROR);
  }
}