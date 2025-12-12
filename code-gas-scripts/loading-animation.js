// ========================================
// Configuration
// ========================================

const CONFIG = {
  LINE_CHANNEL_ACCESS_TOKEN: 'wQl9rs+m1p0t5eyZRT+2vXMNzeZqDQauwOqH64IbX8mDcRo43tj5t7daBslKezp949cEi3lABOUARb6dEiO8HA0+5ufaoDvnP71DKMtBAYUn2XKDGwfWnoOkahgpnl9cWLIRNrjsSQNJ5dAo5Y6vgwdB04t89/1O/w1cDnyilFU=',
  DIALOGFLOW_PROJECT_ID: 'yondaimebot-dailogflow',
  DIALOGFLOW_LANGUAGE_CODE: 'th',
  SPREADSHEET_ID: '1KPqnRtL6MqaWMg0u_EG6Wmg2JCWkHmUyBBUvUcYq5Uo',
  SHEET_NAME: 'Conversations'
};

// ========================================
// Main Webhook Handler
// ========================================

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const events = body.events || [];

    events.forEach(event => {
      if (event.type === 'message' && event.message.type === 'text') {
        handleTextMessage(event);
      } else if (event.type === 'postback') {
        handlePostback(event);
      } else {
        Logger.log('⚠️ Unsupported event type: ' + event.type);
      }
    });

    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('❌ Error in doPost: ' + error);
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ========================================
// Handle Postback (for Quick Reply)
// ========================================

function handlePostback(event) {
  const userId = event.source && event.source.userId ? event.source.userId : null;
  const postbackData = event.postback && event.postback.data ? event.postback.data : '';

  if (!userId || !postbackData) {
    Logger.log('⚠️ Missing userId or postbackData');
    return;
  }

  Logger.log('🔘 Postback: ' + userId + ' | Data: ' + postbackData);

  try {
    sendLoadingAnimation(userId);
    const dialogflowResponse = queryDialogflow(postbackData, userId);

    if (!dialogflowResponse || !dialogflowResponse.messages) {
      Logger.log('⚠️ No Dialogflow response for postback');
      pushSimpleMessage(userId, 'ขออภัยครับ ไม่สามารถตอบกลับได้ในขณะนี้');
      return;
    }

    sendLineMessages(userId, dialogflowResponse);

    saveToSheet({
      userId: userId,
      userMessage: '[Postback] ' + postbackData,
      aiResponse: formatResponseForSheet(dialogflowResponse.messages),
      intent: dialogflowResponse.intent,
      timestamp: new Date()
    });

    Logger.log('✅ Postback processed successfully');
  } catch (error) {
    Logger.log('❌ Error in handlePostback: ' + error);
    pushSimpleMessage(userId, 'ขออภัยครับ ระบบขัดข้องชั่วคราว');
  }
}

// ========================================
// Handle Text Message
// ========================================

function handleTextMessage(event) {
  const userId = event.source && event.source.userId ? event.source.userId : null;
  const userMessage = event.message && event.message.text ? event.message.text.trim() : '';

  if (!userId || !userMessage) {
    Logger.log('⚠️ Missing userId or userMessage, skip event.');
    return;
  }

  Logger.log('📨 User: ' + userId + ' | Message: ' + userMessage);

  try {
    sendLoadingAnimation(userId);
    const dialogflowResponse = queryDialogflow(userMessage, userId);

    if (!dialogflowResponse || !dialogflowResponse.messages) {
      Logger.log('⚠️ No Dialogflow response, sending fallback message.');
      pushSimpleMessage(userId, 'ขออภัยครับ ไม่สามารถตอบกลับได้ในขณะนี้');
      return;
    }

    sendLineMessages(userId, dialogflowResponse);

    saveToSheet({
      userId: userId,
      userMessage: userMessage,
      aiResponse: formatResponseForSheet(dialogflowResponse.messages),
      intent: dialogflowResponse.intent,
      timestamp: new Date()
    });

    Logger.log('✅ Process completed successfully');
  } catch (error) {
    Logger.log('❌ Error in handleTextMessage: ' + error);
    pushSimpleMessage(userId, 'ขออภัยครับ ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง');
  }
}

// ========================================
// Format Response for Google Sheet (คอลัม D)
// ========================================

function formatResponseForSheet(messages) {
  if (!messages || messages.length === 0) return 'No response';
  
  const responses = [];
  
  messages.forEach((msg, index) => {
    if (msg.type === 'text') {
      responses.push(`[Text] ${msg.text}`);
      
      // แสดง Quick Reply ถ้ามี
      if (msg.quickReply && msg.quickReply.items) {
        const quickReplies = msg.quickReply.items.map(item => item.action.label).join(', ');
        responses.push(`  └─ Quick Reply: ${quickReplies}`);
      }
    } 
    else if (msg.type === 'image') {
      responses.push(`[Image] ${msg.originalContentUrl}`);
    }
    else if (msg.type === 'flex') {
      const altText = msg.altText || 'Flex Message';
      responses.push(`[Flex] ${altText}`);
      
      // แสดงรายละเอียด Carousel
      if (msg.contents && msg.contents.type === 'carousel') {
        const bubbleCount = msg.contents.contents ? msg.contents.contents.length : 0;
        responses.push(`  └─ Carousel: ${bubbleCount} items`);
      }
    }
    else if (msg.type === 'template') {
      responses.push(`[Template] ${msg.template.type}`);
    }
    else {
      responses.push(`[${msg.type}] Unknown format`);
    }
  });
  
  return responses.join('\n');
}

// ========================================
// Dialogflow Integration
// ========================================

function queryDialogflow(message, sessionId) {
  try {
    const accessToken = getDialogflowAccessToken();
    const url = `https://dialogflow.googleapis.com/v2/projects/${CONFIG.DIALOGFLOW_PROJECT_ID}/agent/sessions/${sessionId}:detectIntent`;

    const payload = {
      queryInput: {
        text: {
          text: message,
          languageCode: CONFIG.DIALOGFLOW_LANGUAGE_CODE
        }
      }
    };

    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + accessToken },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());

    if (result.error) {
      Logger.log('❌ Dialogflow Error: ' + JSON.stringify(result.error));
      throw new Error(result.error.message);
    }

    const queryResult = result.queryResult;
    Logger.log('🤖 Dialogflow Raw Response: ' + JSON.stringify(result));

    return {
      intent: queryResult.intent ? queryResult.intent.displayName : 'Unknown',
      confidence: queryResult.intentDetectionConfidence || 0,
      fulfillmentText: queryResult.fulfillmentText || '',
      fulfillmentMessages: queryResult.fulfillmentMessages || [],
      webhookPayload: queryResult.webhookPayload || null,
      parameters: queryResult.parameters || {},
      messages: parseDialogflowMessages(queryResult)
    };
  } catch (error) {
    Logger.log('❌ Dialogflow API Error: ' + error);
    return null;
  }
}

// ========================================
// Parse Dialogflow Messages (แก้ไขให้รองรับ Flex)
// ========================================

function parseDialogflowMessages(queryResult) {
  const messages = [];

  // 1️⃣ Webhook Payload (สำหรับ Custom Payload)
  if (queryResult.webhookPayload && queryResult.webhookPayload.line) {
    Logger.log('✅ Found webhookPayload.line');
    const linePayload = queryResult.webhookPayload.line;
    
    if (Array.isArray(linePayload)) {
      messages.push(...linePayload);
    } else {
      messages.push(linePayload);
    }
    
    Logger.log('✅ Using webhook payload: ' + JSON.stringify(messages));
    return messages;
  }

  // 2️⃣ Fulfillment Messages
  if (queryResult.fulfillmentMessages && queryResult.fulfillmentMessages.length > 0) {
    queryResult.fulfillmentMessages.forEach(msg => {
      
      // ✅ Text messages
      if (msg.text && msg.text.text) {
        msg.text.text.forEach(t => messages.push({ type: 'text', text: t }));
      }
      
      // ✅ Custom Payload for LINE (รองรับ Flex Message)
      if (msg.payload && msg.payload.line) {
        Logger.log('✅ Found payload.line');
        const linePayload = msg.payload.line;
        
        if (Array.isArray(linePayload)) {
          messages.push(...linePayload);
        } else {
          messages.push(linePayload);
        }
      }
      
      // ✅ Quick Reply
      if (msg.quickReplies && msg.quickReplies.quickReplies) {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.type === 'text') {
          lastMessage.quickReply = {
            items: msg.quickReplies.quickReplies.map(qr => ({
              type: 'action',
              action: {
                type: 'message',
                label: qr.substring(0, 20),
                text: qr
              }
            }))
          };
          Logger.log('✅ Quick Reply added');
        }
      }
      
      // ✅ Image messages
      if (msg.image && msg.image.imageUri) {
        messages.push({
          type: 'image',
          originalContentUrl: msg.image.imageUri,
          previewImageUrl: msg.image.imageUri
        });
      }
      
      // ✅ Card messages (LINE Template)
      if (msg.card) {
        const card = msg.card;
        const buttons = [];
        
        if (card.buttons) {
          card.buttons.forEach(btn => {
            if (btn.postback) {
              buttons.push({
                type: 'postback',
                label: btn.text.substring(0, 20),
                data: btn.postback
              });
            } else if (btn.text) {
              buttons.push({
                type: 'message',
                label: btn.text.substring(0, 20),
                text: btn.text
              });
            }
          });
        }
        
        messages.push({
          type: 'template',
          altText: card.title || 'Card message',
          template: {
            type: 'buttons',
            text: card.subtitle || card.title || 'Information',
            actions: buttons.slice(0, 4) // LINE รองรับ max 4 buttons
          }
        });
      }
    });
  }

  // 3️⃣ Fallback: ใช้ fulfillmentText
  if (messages.length === 0 && queryResult.fulfillmentText) {
    messages.push({ type: 'text', text: queryResult.fulfillmentText });
  }

  // 4️⃣ Default fallback
  if (messages.length === 0) {
    messages.push({ type: 'text', text: 'ขอโทษครับ ไม่เข้าใจคำถาม' });
  }

  Logger.log('📤 Parsed Messages: ' + JSON.stringify(messages));
  return messages;
}

// ========================================
// Send LINE Messages (with validation)
// ========================================

function sendLineMessages(userId, dialogflowResponse) {
  const messages = dialogflowResponse.messages;
  if (!messages || messages.length === 0) {
    Logger.log('⚠️ No messages to send.');
    return;
  }

  // ✅ Validate messages
  const validMessages = messages.slice(0, 5).filter(msg => {
    if (!msg.type) {
      Logger.log('⚠️ Invalid message (no type): ' + JSON.stringify(msg));
      return false;
    }
    
    // ตรวจสอบ Text Message ว่างเปล่า
    if (msg.type === 'text' && (!msg.text || msg.text.trim() === '')) {
      Logger.log('⚠️ Empty text message, skipping');
      return false;
    }
    
    // ตรวจสอบ Flex Message
    if (msg.type === 'flex') {
      if (!msg.altText || !msg.contents) {
        Logger.log('⚠️ Invalid Flex message (missing altText or contents)');
        return false;
      }
    }
    
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

  Logger.log('📤 Sending to LINE: ' + JSON.stringify(payload));

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + CONFIG.LINE_CHANNEL_ACCESS_TOKEN },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', options);
  const responseCode = response.getResponseCode();
  const responseText = response.getContentText();
  
  Logger.log('📬 LINE API Response Code: ' + responseCode);
  Logger.log('📬 LINE API Response: ' + responseText);

  if (responseCode !== 200) {
    Logger.log('❌ LINE API Error: ' + responseText);
  }
}

// ========================================
// Loading Animation
// ========================================

function sendLoadingAnimation(userId) {
  try {
    UrlFetchApp.fetch('https://api.line.me/v2/bot/chat/loading/start', {
      method: 'post',
      contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + CONFIG.LINE_CHANNEL_ACCESS_TOKEN },
      payload: JSON.stringify({ chatId: userId, loadingSeconds: 5 }),
      muteHttpExceptions: true
    });
    Logger.log('⏳ Loading animation started');
  } catch (error) {
    Logger.log('⚠️ Loading animation error: ' + error);
  }
}

// ========================================
// Simple Fallback Message
// ========================================

function pushSimpleMessage(userId, text) {
  try {
    const response = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
      method: 'post',
      contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + CONFIG.LINE_CHANNEL_ACCESS_TOKEN },
      payload: JSON.stringify({ to: userId, messages: [{ type: 'text', text }] }),
      muteHttpExceptions: true
    });
    Logger.log('📬 Fallback sent: ' + response.getResponseCode());
  } catch (error) {
    Logger.log('❌ pushSimpleMessage Error: ' + error);
  }
}

// ========================================
// Get Dialogflow Access Token
// ========================================

function getDialogflowAccessToken() {
  const serviceAccount = JSON.parse(PropertiesService.getScriptProperties().getProperty('DIALOGFLOW_SERVICE_ACCOUNT'));
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/dialogflow',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const jwt = createJWT(header, claim, serviceAccount.private_key);
  const options = {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    payload: {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    }
  };

  const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', options);
  const result = JSON.parse(response.getContentText());
  return result.access_token;
}

function createJWT(header, claim, privateKey) {
  const encHeader = Utilities.base64EncodeWebSafe(JSON.stringify(header));
  const encClaim = Utilities.base64EncodeWebSafe(JSON.stringify(claim));
  const sig = Utilities.base64EncodeWebSafe(
    Utilities.computeRsaSha256Signature(encHeader + '.' + encClaim, privateKey)
  );
  return encHeader + '.' + encClaim + '.' + sig;
}

// ========================================
// Save to Google Sheet
// ========================================

function saveToSheet(data) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.SHEET_NAME);
      sheet.appendRow(['Timestamp', 'User ID', 'User Message', 'Response Format', 'Intent']);
    }
    sheet.appendRow([data.timestamp, data.userId, data.userMessage, data.aiResponse, data.intent]);
    Logger.log('💾 Saved to Google Sheets');
  } catch (error) {
    Logger.log('⚠️ Sheets Error: ' + error);
  }
}