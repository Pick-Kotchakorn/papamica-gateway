// ========================================
// 📅 CALENDAR SERVICE (Secure & Optimized V2.0)
// ========================================

// เชื่อมต่อกับค่าที่ตั้งไว้ใน Config.js (Mapping ตัวแปรให้ตรงกัน)
// เพื่อความปลอดภัยและเป็นระเบียบ เราจะไม่ Hardcode Token ไว้ตรงนี้แล้ว
const CONFIG = {
  TEST_MODE: CALENDAR_CONFIG.TEST_MODE,
  CALENDAR_ID: CALENDAR_CONFIG.CALENDAR_ID,
  LINE_ACCESS_TOKEN: CALENDAR_CONFIG.LINE_ACCESS_TOKEN,
  LINE_GROUP_ID: CALENDAR_CONFIG.LINE_GROUP_ID,
  TIMEZONE: CALENDAR_CONFIG.TIMEZONE,
  SHEET_COLUMNS: CALENDAR_CONFIG.COLUMNS, 
  STATUS_VALUES: CALENDAR_CONFIG.STATUS
};

// ===== Main Function =====
function addCalendarEvent() {
  try {
    Logger.log('🚀 เริ่มต้นการตรวจสอบและสร้าง Event...');
    
    const eventData = getLatestEventData();
    if (!eventData) return;
    
    // ถ้าไม่มีสถานะการยืนยัน ให้ตั้งเป็น PENDING
    if (!eventData.confirmStatus) {
      Logger.log('⏳ ตั้งสถานะเริ่มต้นเป็น PENDING');
      updateConfirmStatus(eventData.rowIndex, CONFIG.STATUS_VALUES.PENDING);
      Logger.log('📋 Event ถูกตั้งเป็น PENDING รอการยืนยัน กรุณาเปลี่ยนสถานะเป็น CONFIRMED ในคอลัมน์ I เพื่อส่งแจ้งเตือน');
      return;
    }
    
    // ตรวจสอบสถานะการยืนยัน
    if (eventData.confirmStatus !== CONFIG.STATUS_VALUES.CONFIRMED) {
      Logger.log(`⏳ Event ยังไม่ได้รับการยืนยัน สถานะปัจจุบัน: ${eventData.confirmStatus}`);
      Logger.log('💡 เปลี่ยนสถานะในคอลัมน์ I เป็น "CONFIRMED" แล้วรันฟังก์ชันอีกครั้ง');
      return;
    }
    
    // ตรวจสอบว่า Event นี้ถูกสร้างแล้วหรือยัง
    if (eventData.creationStatus === CONFIG.STATUS_VALUES.CREATED) {
      Logger.log('✅ Event นี้ถูกสร้างใน Calendar แล้ว');
      return;
    }
    
    const processedData = processEventData(eventData);
    const calendarEventId = createCalendarEvent(processedData);
    
    if (calendarEventId) {
      // ส่งแจ้งเตือนทันทีเมื่อยืนยันข้อมูลแล้ว
      sendLineNotification(processedData);
      
      // อัปเดตสถานะเป็น CREATED และบันทึก Event ID
      updateCreationStatus(eventData.rowIndex, CONFIG.STATUS_VALUES.CREATED, calendarEventId);
      
      // (ใหม่) ไม่ต้องสร้าง Trigger แยกแล้ว ใช้ระบบ Daily Scan แทน
      scheduleReminders(processedData);
      
      Logger.log('✅ สร้าง Event สำเร็จและส่งการแจ้งเตือนแล้ว');
    }
    
  } catch (error) {
    Logger.log('❌ Error: ' + error.toString());
    sendErrorNotification(error.toString());
  }
}

// ===== Data Functions =====
function getLatestEventData() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  if (data.length < 2) {
    Logger.log('⚠️ ไม่มีข้อมูล Event');
    return null;
  }
  
  const lastRowIndex = data.length - 1;
  const event = data[lastRowIndex];
  
  return {
    rowIndex: lastRowIndex + 1,
    eventName: event[CONFIG.SHEET_COLUMNS.EVENT_NAME],
    detail: event[CONFIG.SHEET_COLUMNS.DETAIL],
    userName: event[CONFIG.SHEET_COLUMNS.USER_NAME],
    location: event[CONFIG.SHEET_COLUMNS.LOCATION],
    startDate: event[CONFIG.SHEET_COLUMNS.START_DATE],
    startTime: event[CONFIG.SHEET_COLUMNS.START_TIME],
    endDate: event[CONFIG.SHEET_COLUMNS.END_DATE],
    endTime: event[CONFIG.SHEET_COLUMNS.END_TIME],
    confirmStatus: event[CONFIG.SHEET_COLUMNS.CONFIRM_STATUS],
    creationStatus: event[CONFIG.SHEET_COLUMNS.CREATION_STATUS],
    eventId: event[CONFIG.SHEET_COLUMNS.EVENT_ID]
  };
}

function processEventData(eventData) {
  // ตรวจสอบข้อมูลที่จำเป็น
  if (!eventData.eventName || !eventData.startDate || !eventData.startTime) {
    throw new Error('ข้อมูล Event ไม่ครบถ้วน: ต้องมี ชื่อกิจกรรม, วันที่เริ่ม, เวลาเริ่ม');
  }
  
  Logger.log('📝 ข้อมูลดิบ: วันที่=' + eventData.startDate + ', เวลา=' + eventData.startTime);
  
  // แปลงวันที่อย่างถูกต้อง
  let startEvent, endEvent;
  
  // หากเป็น Date object ให้ใช้เลย หากเป็น string ให้แปลง
  if (eventData.startDate instanceof Date) {
    startEvent = new Date(eventData.startDate);
  } else {
    // แปลงจาก string รูปแบบ dd/mm/yyyy
    const dateStr = eventData.startDate.toString();
    if (dateStr.includes('/')) {
      const [day, month, year] = dateStr.split('/');
      startEvent = new Date(year, month - 1, day); // month - 1 เพราะ JS เริ่มนับเดือนจาก 0
    } else {
      startEvent = new Date(eventData.startDate);
    }
  }
  
  // วันที่สิ้นสุด
  if (eventData.endDate) {
    if (eventData.endDate instanceof Date) {
      endEvent = new Date(eventData.endDate);
    } else {
      const dateStr = eventData.endDate.toString();
      if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/');
        endEvent = new Date(year, month - 1, day);
      } else {
        endEvent = new Date(eventData.endDate);
      }
    }
  } else {
    endEvent = new Date(startEvent);
  }
  
  // แปลงเวลาเริ่ม
  if (eventData.startTime) {
    const timeResult = parseTime(eventData.startTime);
    startEvent.setHours(timeResult.hours, timeResult.minutes, 0, 0);
    Logger.log('⏰ เวลาเริ่ม: ' + timeResult.hours + ':' + timeResult.minutes);
  }
  
  // แปลงเวลาสิ้นสุด
  if (eventData.endTime) {
    const timeResult = parseTime(eventData.endTime);
    endEvent.setHours(timeResult.hours, timeResult.minutes, 0, 0);
    Logger.log('⏰ เวลาสิ้นสุด: ' + timeResult.hours + ':' + timeResult.minutes);
  } else {
    // ถ้าไม่มีเวลาสิ้นสุด ให้เพิ่ม 1 ชั่วโมงจากเวลาเริ่ม
    endEvent = new Date(startEvent.getTime() + 60 * 60 * 1000);
  }
  
  // Format สำหรับแสดงผล
  const startDateFormatted = Utilities.formatDate(startEvent, CONFIG.TIMEZONE, "d MMM yyyy");
  const startTimeFormatted = Utilities.formatDate(startEvent, CONFIG.TIMEZONE, "HH:mm");
  const endTimeFormatted = Utilities.formatDate(endEvent, CONFIG.TIMEZONE, "HH:mm");
  
  Logger.log('📅 รูปแบบที่แสดง: ' + startDateFormatted + ' เวลา ' + startTimeFormatted + '-' + endTimeFormatted);
  
  return {
    ...eventData,
    startEvent,
    endEvent,
    startDateFormatted,
    startTimeFormatted, 
    endTimeFormatted
  };
}

// ฟังก์ชันแปลงเวลาที่รองรับหลายรูปแบบ
function parseTime(timeInput) {
  let timeStr = timeInput;
  
  // หาก timeInput เป็น Date object ให้แปลงเป็น string
  if (timeInput instanceof Date) {
    timeStr = Utilities.formatDate(timeInput, CONFIG.TIMEZONE, "HH:mm");
  } else {
    timeStr = timeInput.toString().toLowerCase().trim();
  }
  
  Logger.log('🔍 แปลงเวลา: ' + timeStr);
  
  let hours = 0;
  let minutes = 0;
  
  // รูปแบบต่างๆ ที่รองรับ
  if (timeStr.includes('pm') || timeStr.includes('am')) {
    // รูปแบบ 12 ชั่วโมง เช่น "10.00 pm", "2:30 am"
    const isPM = timeStr.includes('pm');
    const cleanTime = timeStr.replace(/(pm|am)/g, '').trim();
    
    let timeParts;
    if (cleanTime.includes('.')) {
      timeParts = cleanTime.split('.');
    } else if (cleanTime.includes(':')) {
      timeParts = cleanTime.split(':');
    } else {
      // กรณีที่มีแค่ชั่วโมง เช่น "10 pm"
      timeParts = [cleanTime, '0'];
    }
    
    hours = parseInt(timeParts[0]);
    minutes = parseInt(timeParts[1]) || 0;
    
    // แปลงเป็น 24 ชั่วโมง
    if (isPM && hours !== 12) {
      hours += 12;
    } else if (!isPM && hours === 12) {
      hours = 0;
    }
    
  } else if (timeStr.includes(':')) {
    // รูปแบบ 24 ชั่วโมง เช่น "14:30", "09:15"
    const timeParts = timeStr.split(':');
    hours = parseInt(timeParts[0]);
    minutes = parseInt(timeParts[1]) || 0;
    
  } else if (timeStr.includes('.')) {
    // รูปแบบจุด เช่น "14.30", "09.15"
    const timeParts = timeStr.split('.');
    hours = parseInt(timeParts[0]);
    minutes = parseInt(timeParts[1]) || 0;
    
  } else {
    // กรณีที่มีแค่ตัวเลข
    const num = parseInt(timeStr);
    if (num >= 0 && num <= 23) {
      hours = num;
      minutes = 0;
    }
  }
  
  // ตรวจสอบความถูกต้อง
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    Logger.log('❌ เวลาไม่ถูกต้อง: ' + timeStr);
    throw new Error('รูปแบบเวลาไม่ถูกต้อง: ' + timeStr);
  }
  
  return { hours, minutes };
}

// ===== Calendar Functions =====
function createCalendarEvent(eventData) {
  try {
    const calendar = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
    
    const description = `รายละเอียด: ${eventData.detail || 'ไม่ระบุ'}\nผู้รับผิดชอบ: ${eventData.userName || 'ไม่ระบุ'}\nสถานที่: ${eventData.location || 'ไม่ระบุ'}`;
    
    const calendarEvent = calendar.createEvent(
      eventData.eventName,
      eventData.startEvent,
      eventData.endEvent,
      { 
        description: description,
        location: eventData.location || ''
      }
    );
    
    const eventId = calendarEvent.getId();
    Logger.log('📅 สร้าง Calendar Event สำเร็จ: ' + eventId);
    return eventId;
    
  } catch (error) {
    Logger.log('❌ ไม่สามารถสร้าง Calendar Event ได้: ' + error.toString());
    throw new Error('ไม่สามารถสร้าง Calendar Event ได้: ' + error.toString());
  }
}

// ===== LINE Functions =====
function sendLineNotification(eventData) {
  const message = createFlexMessage(eventData);
  sendLineMessage([message]);
}

function createFlexMessage(eventData) {
  return {
    type: "flex",
    altText: `📌 Event: ${eventData.eventName}`,
    contents: {
      type: "bubble",
      size: "mega",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "20px",
        contents: [
          {
            type: "text",
            text: "EVENT NOTIFICATION",
            weight: "bold",
            size: "sm",
            color: "#1DB446"
          },
          {
            type: "text",
            text: eventData.eventName,
            weight: "bold",
            size: "lg",
            wrap: true,
            color: "#333333"
          },
          {
            type: "box",
            layout: "baseline",
            spacing: "xs",
            contents: [
              {
                type: "text",
                text: "Date:",
                color: "#999999",
                size: "xs",
                flex: 2
              },
              {
                type: "text",
                text: eventData.startDateFormatted,
                size: "xs",
                color: "#ff0000",
                weight: "bold",
                flex: 3
              }
            ]
          },
          {
            type: "box",
            layout: "baseline",
            spacing: "xs",
            contents: [
              {
                type: "text",
                text: "Time:",
                color: "#999999",
                size: "xs",
                flex: 2
              },
              {
                type: "text",
                text: `${eventData.startTimeFormatted} - ${eventData.endTimeFormatted}`,
                size: "xs",
                color: "#333333",
                weight: "bold",
                flex: 3
              }
            ]
          },
          {
            type: "box",
            layout: "baseline",
            spacing: "xs",
            contents: [
              {
                type: "text",
                text: "Contact:",
                color: "#999999",
                size: "xs",
                flex: 2
              },
              {
                type: "text",
                text: eventData.userName || "ไม่ระบุ",
                size: "xs",
                color: "#333333",
                weight: "bold",
                flex: 3
              }
            ]
          },
          {
            type: "box",
            layout: "baseline",
            contents: [
              {
                type: "text",
                text: "Location:",
                flex: 2,
                size: "xs",
                color: "#999999"
              },
              {
                type: "text",
                text: eventData.location || "ไม่ระบุสถานที่",
                flex: 3,
                size: "xs",
                weight: "bold",
                color: "#333333"
              }
            ]
          },
          {
            type: "separator",
            margin: "md"
          },
          {
            type: "text",
            color: "#999999",
            text: "Detail:",
            size: "xs"
          },
          {
            type: "text",
            text: eventData.detail || "ไม่มีรายละเอียดเพิ่มเติม",
            size: "xs",
            color: "#666666",
            wrap: true,
            margin: "xs"
          },
          {
            type: "box",
            layout: "baseline",
            contents: [
              {
                type: "text",
                text: "อัปเดตล่าสุด:",
                flex: 0,
                size: "xs",
                color: "#999999"
              },
              {
                type: "text",
                text: `${Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "dd/MM/yyyy เวลา HH:mm น.")}`,
                flex: 5,
                size: "xs",
                color: "#333333",
                align: "center",
                weight: "bold"
              }
            ],
            margin: "md"
          }
        ]
      }
    }
  };
}

// สร้างข้อความแจ้งเตือนเช้าแบบ Flex Message
function createMorningReminderFlexMessage(eventData, reminderText) {
  return {
    type: "flex",
    altText: `${reminderText}: ${eventData.eventName}`,
    contents: {
      type: "bubble",
      size: "mega",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "20px",
        contents: [
          {
            type: "text",
            text: "MORNING REMINDER",
            weight: "bold",
            size: "sm",
            color: "#FF9500"
          },
          {
            type: "text",
            text: "วันนี้มีกิจกรรมที่ต้องดำเนินการ",
            weight: "bold",
            size: "md",
            color: "#FF6B35",
            margin: "xs"
          },
          {
            type: "text",
            text: eventData.eventName,
            weight: "bold",
            size: "lg",
            wrap: true,
            color: "#333333",
            margin: "md"
          },
          {
            type: "box",
            layout: "baseline",
            spacing: "xs",
            contents: [
              {
                type: "text",
                text: "Time:",
                color: "#999999",
                size: "xs",
                flex: 2
              },
              {
                type: "text",
                text: `${eventData.startTimeFormatted} - ${eventData.endTimeFormatted}`,
                size: "xs",
                color: "#FF0000",
                weight: "bold",
                flex: 3
              }
            ]
          },
          {
            type: "box",
            layout: "baseline",
            spacing: "xs",
            contents: [
              {
                type: "text",
                text: "Contact:",
                color: "#999999",
                size: "xs",
                flex: 2
              },
              {
                type: "text",
                text: eventData.userName || "ไม่ระบุ",
                size: "xs",
                color: "#333333",
                weight: "bold",
                flex: 3
              }
            ]
          },
          {
            type: "box",
            layout: "baseline",
            contents: [
              {
                type: "text",
                text: "Location:",
                flex: 2,
                size: "xs",
                color: "#999999"
              },
              {
                type: "text",
                text: eventData.location || "ไม่ระบุสถานที่",
                flex: 3,
                size: "xs",
                weight: "bold",
                color: "#333333"
              }
            ]
          },
          {
            type: "separator",
            margin: "md"
          },
          {
            type: "text",
            color: "#999999",
            text: "Detail:",
            size: "xs"
          },
          {
            type: "text",
            text: eventData.detail || "ไม่มีรายละเอียดเพิ่มเติม",
            size: "xs",
            color: "#666666",
            wrap: true,
            margin: "xs"
          },
          {
            type: "box",
            layout: "baseline",
            contents: [
              {
                type: "text",
                text: "แจ้งเตือนเวลา:",
                flex: 0,
                size: "xs",
                color: "#999999"
              },
              {
                type: "text",
                text: `${Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "dd/MM/yyyy เวลา HH:mm น.")}`,
                flex: 5,
                size: "xs",
                color: "#333333",
                align: "center",
                weight: "bold"
              }
            ],
            margin: "md"
          }
        ]
      }
    }
  };
}

function sendLineMessage(messages) {
  if (CONFIG.TEST_MODE) {
    Logger.log('🧪 [TEST MODE] ระบบทำงานสำเร็จ แต่ระงับการส่ง LINE ไว้');
    Logger.log('📨 ข้อมูลที่จะส่ง: ' + JSON.stringify(messages));
    
    try {
      SpreadsheetApp.getUi().alert('🧪 TEST MODE: ทำรายการสำเร็จ\n(สร้าง/แก้ไข Calendar แล้ว แต่ไม่ได้ส่ง LINE)');
    } catch (e) {
      Logger.log('⚠️ ไม่สามารถแสดง Popup ได้ แต่ระบบทำงานถูกต้องครับ');
    }
    return;
  }

  const payload = {
    to: CONFIG.LINE_GROUP_ID,
    messages: messages
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + CONFIG.LINE_ACCESS_TOKEN
    },
    payload: JSON.stringify(payload)
  };
  
  try {
    const response = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', options);
    if (response.getResponseCode() === 200) {
      Logger.log('📱 ส่งข้อความ LINE สำเร็จ');
    } else {
      Logger.log('⚠️ LINE Response: ' + response.getContentText());
    }
  } catch (error) {
    Logger.log('❌ ไม่สามารถส่งข้อความ LINE ได้: ' + error.toString());
    throw error;
  }
}

// ===== Reminder Functions (Fixed) =====

/**
 * ฟังก์ชันนี้จะถูกเรียกเมื่อสร้าง Event เสร็จ
 * ปรับปรุง: ไม่สร้าง Trigger รายตัวแล้ว แต่จะให้ Daily Trigger มาเช็คเอง
 */
function scheduleReminders(eventData) {
  Logger.log(`📝 บันทึกข้อมูลสำหรับ Morning Reminder: ${eventData.eventName}`);
  Logger.log('ℹ️ ระบบจะแจ้งเตือนอัตโนมัติเมื่อถึงวันงาน (โดยใช้ Trigger รายวัน)');
}

/**
 * ⏰ MAIN DAILY TRIGGER
 * ฟังก์ชันนี้ต้องนำไปตั้ง Trigger ให้รัน "ทุกวัน" เวลา 8:00 - 9:00 น.
 */
function sendMorningReminder() {
  Logger.log('🌅 เริ่มต้นกระบวนการตรวจสอบ Morning Reminder...');
  
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const data = sheet.getDataRange().getValues();
    const today = new Date();
    today.setHours(0,0,0,0); // ตัดเวลาออก เอาแค่วันที่ปัจจุบัน
    
    let notiCount = 0;

    // วนลูปเช็คทุกแถว (เริ่มแถว 2)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const startDateRaw = row[CONFIG.SHEET_COLUMNS.START_DATE];
      const confirmStatus = row[CONFIG.SHEET_COLUMNS.CONFIRM_STATUS];
      
      if (!startDateRaw) continue;
      
      // แปลงวันที่ใน Sheet มาเป็น Date Object เพื่อเปรียบเทียบ
      let eventDate;
      if (startDateRaw instanceof Date) {
        eventDate = new Date(startDateRaw);
      } else {
         // กรณีวันที่มาเป็น String เช่น "31/12/2024"
         const dateStr = startDateRaw.toString();
         if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            // new Date(year, monthIndex, day)
            eventDate = new Date(parts[2], parts[1]-1, parts[0]);
         } else {
            eventDate = new Date(startDateRaw);
         }
      }
      
      // เซ็ตเวลาเป็น 00:00:00 เพื่อเทียบแค่วันที่
      if (eventDate && !isNaN(eventDate.getTime())) {
         eventDate.setHours(0,0,0,0);
         
         // เงื่อนไข: วันที่ตรงกับวันนี้ AND สถานะต้องเป็น CREATED หรือ CONFIRMED
         if (eventDate.getTime() === today.getTime() && 
            (confirmStatus === CONFIG.STATUS_VALUES.CONFIRMED || confirmStatus === CONFIG.STATUS_VALUES.CREATED)) {
              
            // ดึงข้อมูลมาเตรียมส่ง
            const eventData = getEventDataByRow(i + 1); // ใช้ฟังก์ชันเดิมที่มีอยู่แล้ว
            if (eventData) {
              const processedData = processEventData(eventData);
              const msg = createMorningReminderFlexMessage(processedData, '🌅 แจ้งเตือนเช้า: วันนี้มีกิจกรรม');
              sendLineMessage([msg]);
              Logger.log(`✅ ส่งแจ้งเตือนเช้าสำหรับ: ${processedData.eventName}`);
              notiCount++;
            }
         }
      }
    }
    
    Logger.log(`✅ ตรวจสอบเสร็จสิ้น: ส่งแจ้งเตือนไปทั้งหมด ${notiCount} รายการ`);

  } catch (error) {
    Logger.log('❌ Error in sendMorningReminder: ' + error.toString());
  }
}

// ===== Utility Functions =====
function updateCreationStatus(rowIndex, creationStatus, eventId = '') {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    sheet.getRange(rowIndex, CONFIG.SHEET_COLUMNS.CREATION_STATUS + 1).setValue(creationStatus);
    
    if (eventId) {
      sheet.getRange(rowIndex, CONFIG.SHEET_COLUMNS.EVENT_ID + 1).setValue(eventId);
      Logger.log(`📝 อัพเดทสถานะ Event แถวที่ ${rowIndex}: ${creationStatus}, ID: ${eventId}`);
    } else {
      Logger.log(`📝 อัพเดทสถานะ Event แถวที่ ${rowIndex}: ${creationStatus}`);
    }
  } catch (error) {
    Logger.log('❌ ไม่สามารถอัพเดทสถานะการสร้างได้: ' + error.toString());
  }
}

function updateConfirmStatus(rowIndex, confirmStatus) {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    sheet.getRange(rowIndex, CONFIG.SHEET_COLUMNS.CONFIRM_STATUS + 1).setValue(confirmStatus);
    Logger.log(`📝 อัพเดทสถานะการยืนยัน แถวที่ ${rowIndex}: ${confirmStatus}`);
  } catch (error) {
    Logger.log('❌ ไม่สามารถอัพเดทสถานะการยืนยันได้: ' + error.toString());
  }
}

function processAllEvents() {
  try {
    Logger.log('🔄 เริ่มประมวลผล Event ทั้งหมด...');
    const sheet = SpreadsheetApp.getActiveSheet();
    const data = sheet.getDataRange().getValues();
    
    if (data.length < 2) return;
    
    let processedCount = 0;
    
    for (let i = 1; i < data.length; i++) {
      const event = data[i];
      const rowIndex = i + 1;
      
      const eventData = {
        rowIndex: rowIndex,
        eventName: event[CONFIG.SHEET_COLUMNS.EVENT_NAME],
        confirmStatus: event[CONFIG.SHEET_COLUMNS.CONFIRM_STATUS],
        creationStatus: event[CONFIG.SHEET_COLUMNS.CREATION_STATUS]
      };
      
      if (!eventData.eventName) continue;
      
      if (!eventData.confirmStatus) {
        updateConfirmStatus(rowIndex, CONFIG.STATUS_VALUES.PENDING);
        continue;
      }
      
      if (eventData.confirmStatus === CONFIG.STATUS_VALUES.CONFIRMED && 
          eventData.creationStatus !== CONFIG.STATUS_VALUES.CREATED) {
        
        const currentEventData = getEventDataByRow(rowIndex);
        if (currentEventData) {
          const processedData = processEventData(currentEventData);
          const calendarEventId = createCalendarEvent(processedData);
          
          if (calendarEventId) {
            sendLineNotification(processedData);
            updateCreationStatus(rowIndex, CONFIG.STATUS_VALUES.CREATED, calendarEventId);
            scheduleReminders(processedData);
            processedCount++;
            Logger.log(`✅ สร้าง Event สำเร็จ: ${eventData.eventName}`);
          }
        }
      }
    }
    Logger.log(`🎉 ประมวลผลเสร็จสิ้น สร้าง Event ใหม่: ${processedCount} รายการ`);
  } catch (error) {
    Logger.log('❌ Error: ' + error.toString());
    sendErrorNotification(error.toString());
  }
}

function getEventDataByRow(rowIndex) {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const data = sheet.getDataRange().getValues();
    
    if (rowIndex < 1 || rowIndex > data.length) return null;
    
    const event = data[rowIndex - 1];
    
    return {
      rowIndex: rowIndex,
      eventName: event[CONFIG.SHEET_COLUMNS.EVENT_NAME],
      detail: event[CONFIG.SHEET_COLUMNS.DETAIL],
      userName: event[CONFIG.SHEET_COLUMNS.USER_NAME],
      location: event[CONFIG.SHEET_COLUMNS.LOCATION],
      startDate: event[CONFIG.SHEET_COLUMNS.START_DATE],
      startTime: event[CONFIG.SHEET_COLUMNS.START_TIME],
      endDate: event[CONFIG.SHEET_COLUMNS.END_DATE],
      endTime: event[CONFIG.SHEET_COLUMNS.END_TIME],
      confirmStatus: event[CONFIG.SHEET_COLUMNS.CONFIRM_STATUS],
      creationStatus: event[CONFIG.SHEET_COLUMNS.CREATION_STATUS],
      eventId: event[CONFIG.SHEET_COLUMNS.EVENT_ID]
    };
  } catch (error) {
    return null;
  }
}

function sendErrorNotification(errorMessage) {
  try {
    const message = {
      type: "text", 
      text: `❌ เกิดข้อผิดพลาดในระบบ Event Manager\n\nError: ${errorMessage}`
    };
    sendLineMessage([message]);
  } catch (error) {
    Logger.log('❌ Failed to send error notification');
  }
}

// ===== Menu/Toolbar Functions =====
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📅 Event Manager')
    .addItem('⏳ ตั้งสถานะ PENDING', 'setPendingStatusForSelectedRow')
    .addItem('✅ ยืนยัน CONFIRMED', 'setConfirmedStatusForSelectedRow')
    .addSeparator()
    .addItem('🛠️ อัปเดตข้อมูล (แก้ไข)', 'updateEventForSelectedRow')
    .addSeparator()
    .addItem('📋 ประมวลผล Event ทั้งหมด', 'processAllEvents')
    .addItem('🧪 ทดสอบ LINE', 'testLineConnection')
    .addItem('🗑️ ลบการแจ้งเตือนเก่า', 'clearAllReminders')
    .addToUi();
}

function setPendingStatusForSelectedRow() {
  handleSelectedRow((row) => updateConfirmStatus(row, CONFIG.STATUS_VALUES.PENDING), 'ตั้งสถานะ PENDING');
}

function setConfirmedStatusForSelectedRow() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const activeRange = sheet.getActiveRange();
    const selectedRow = activeRange.getRow();
    
    if (selectedRow === 1) {
      SpreadsheetApp.getUi().alert('กรุณาเลือกแถวข้อมูล Event');
      return;
    }
    
    const eventData = getEventDataByRow(selectedRow);
    if (!eventData || !eventData.eventName) {
      SpreadsheetApp.getUi().alert('ไม่มีข้อมูล Event');
      return;
    }
    
    if (eventData.creationStatus === CONFIG.STATUS_VALUES.CREATED) {
      SpreadsheetApp.getUi().alert('Event นี้ถูกสร้างแล้ว');
      return;
    }
    
    const response = SpreadsheetApp.getUi().alert(
      'ยืนยันการสร้าง Event', 
      `ยืนยันสร้าง Event: "${eventData.eventName}" ?`, 
      SpreadsheetApp.getUi().ButtonSet.YES_NO
    );
    
    if (response === SpreadsheetApp.getUi().Button.YES) {
      updateConfirmStatus(selectedRow, CONFIG.STATUS_VALUES.CONFIRMED);
      const processedData = processEventData(eventData);
      const calendarEventId = createCalendarEvent(processedData);
      
      if (calendarEventId) {
        sendLineNotification(processedData);
        updateCreationStatus(selectedRow, CONFIG.STATUS_VALUES.CREATED, calendarEventId);
        scheduleReminders(processedData); // แค่ Log ว่ารอแจ้งเตือน
        SpreadsheetApp.getUi().alert(`✅ สร้าง Event สำเร็จ!`);
      }
    }
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error: ' + error.toString());
  }
}

function clearAllReminders() {
  const triggers = ScriptApp.getProjectTriggers();
  let count = 0;
  // ลบเฉพาะ Trigger ที่ชื่อเก่า หรือ Trigger ที่ไม่ได้ใช้แล้ว
  // สำหรับเวอร์ชั่นใหม่ เราใช้ Trigger ตัวเดียวชื่อ sendMorningReminder ห้ามลบมั่ว
  // ฟังก์ชันนี้เอาไว้ล้างบางกรณีฉุกเฉิน
  Logger.log('⚠️ ฟังก์ชันนี้ถูกปรับเปลี่ยนให้ลบเฉพาะ Trigger ส่วนเกิน (ถ้ามี)');
}

// Helper สำหรับ Menu
function handleSelectedRow(action, actionName) {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const selectedRow = sheet.getActiveRange().getRow();
    if (selectedRow === 1) {
      SpreadsheetApp.getUi().alert('กรุณาเลือกแถวข้อมูล');
      return;
    }
    action(selectedRow);
    SpreadsheetApp.getUi().alert(`${actionName} เรียบร้อย`);
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error: ' + e.toString());
  }
}

// ===== Update Functions =====
function updateEventForSelectedRow() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const selectedRow = sheet.getActiveRange().getRow();
    
    if (selectedRow === 1) return;
    
    const eventData = getEventDataByRow(selectedRow);
    if (!eventData || !eventData.eventId) {
      SpreadsheetApp.getUi().alert('⚠️ ต้องสร้าง Event ก่อนถึงจะแก้ไขได้');
      return;
    }

    const response = SpreadsheetApp.getUi().alert(
      'ยืนยันการแก้ไข', 
      `ต้องการอัปเดต: "${eventData.eventName}" ?`, 
      SpreadsheetApp.getUi().ButtonSet.YES_NO
    );
    
    if (response === SpreadsheetApp.getUi().Button.YES) {
      const processedData = processEventData(eventData);
      updateCalendarEventOnly(processedData);
      sendLineUpdateNotification(processedData);
      SpreadsheetApp.getUi().alert(`✅ อัปเดตข้อมูลสำเร็จ!`);
    }
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error: ' + error.toString());
  }
}

function updateCalendarEventOnly(eventData) {
  const calendar = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
  const event = calendar.getEventById(eventData.eventId);
  if (!event) throw new Error('ไม่พบ Event ใน Calendar');
  
  event.setTitle(eventData.eventName);
  event.setTime(eventData.startEvent, eventData.endEvent);
  event.setLocation(eventData.location || '');
  event.setDescription(`รายละเอียด: ${eventData.detail || '-'}\nผู้รับผิดชอบ: ${eventData.userName || '-'}`);
}

function sendLineUpdateNotification(eventData) {
  const message = {
    type: "flex",
    altText: `📝 แก้ไขข้อมูล: ${eventData.eventName}`,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "UPDATE / CORRECTION", weight: "bold", color: "#FF9500" },
          { type: "text", text: eventData.eventName, weight: "bold", size: "lg", wrap: true },
          { type: "text", text: `New Time: ${eventData.startTimeFormatted} - ${eventData.endTimeFormatted}`, size: "sm" }
        ]
      }
    }
  };
  sendLineMessage([message]);
}

// ===== Test Functions =====
function testLineConnection() {
  sendLineMessage([{ type: "text", text: "🧪 Test Connection OK" }]);
}