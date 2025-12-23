// ========================================
// 📅 CALENDAR SERVICE (Secure & Optimized V2.1)
// ========================================
// เพิ่มฟีเจอร์: ยกเลิก Event (Cancellation)

// เชื่อมต่อกับค่าที่ตั้งไว้ใน Config.js
const CONFIG = {
  TEST_MODE: CALENDAR_CONFIG.TEST_MODE,
  CALENDAR_ID: CALENDAR_CONFIG.CALENDAR_ID,
  LINE_ACCESS_TOKEN: CALENDAR_CONFIG.LINE_ACCESS_TOKEN,
  LINE_GROUP_ID: CALENDAR_CONFIG.LINE_GROUP_ID,
  TIMEZONE: CALENDAR_CONFIG.TIMEZONE,
  SHEET_COLUMNS: CALENDAR_CONFIG.COLUMNS, 
  // อัปเดตสถานะให้รองรับการยกเลิก (CANCELLED)
  STATUS_VALUES: {
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    CREATED: 'CREATED',
    CANCELLED: 'CANCELLED' // <--- เพิ่มสถานะนี้
  }
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
      
      // ใช้ระบบ Daily Scan แทนการสร้าง Trigger
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
      startEvent = new Date(year, month - 1, day);
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
    const isPM = timeStr.includes('pm');
    const cleanTime = timeStr.replace(/(pm|am)/g, '').trim();
    let timeParts = cleanTime.includes('.') ? cleanTime.split('.') : cleanTime.split(':');
    if (timeParts.length === 1) timeParts.push('0');
    
    hours = parseInt(timeParts[0]);
    minutes = parseInt(timeParts[1]) || 0;
    
    if (isPM && hours !== 12) hours += 12;
    else if (!isPM && hours === 12) hours = 0;
    
  } else if (timeStr.includes(':') || timeStr.includes('.')) {
    const timeParts = timeStr.includes(':') ? timeStr.split(':') : timeStr.split('.');
    hours = parseInt(timeParts[0]);
    minutes = parseInt(timeParts[1]) || 0;
  } else {
    const num = parseInt(timeStr);
    if (num >= 0 && num <= 23) hours = num;
  }
  
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
      { description: description, location: eventData.location || '' }
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
          { type: "text", text: "EVENT NOTIFICATION", weight: "bold", size: "sm", color: "#1DB446" },
          { type: "text", text: eventData.eventName, weight: "bold", size: "lg", wrap: true, color: "#333333" },
          {
            type: "box",
            layout: "baseline",
            spacing: "xs",
            contents: [
              { type: "text", text: "Date:", color: "#999999", size: "xs", flex: 2 },
              { type: "text", text: eventData.startDateFormatted, size: "xs", color: "#ff0000", weight: "bold", flex: 3 }
            ]
          },
          {
            type: "box",
            layout: "baseline",
            spacing: "xs",
            contents: [
              { type: "text", text: "Time:", color: "#999999", size: "xs", flex: 2 },
              { type: "text", text: `${eventData.startTimeFormatted} - ${eventData.endTimeFormatted}`, size: "xs", color: "#333333", weight: "bold", flex: 3 }
            ]
          },
          {
            type: "box",
            layout: "baseline",
            spacing: "xs",
            contents: [
              { type: "text", text: "Contact:", color: "#999999", size: "xs", flex: 2 },
              { type: "text", text: eventData.userName || "ไม่ระบุ", size: "xs", color: "#333333", weight: "bold", flex: 3 }
            ]
          },
          {
            type: "box",
            layout: "baseline",
            contents: [
              { type: "text", text: "Location:", flex: 2, size: "xs", color: "#999999" },
              { type: "text", text: eventData.location || "ไม่ระบุสถานที่", flex: 3, size: "xs", weight: "bold", color: "#333333" }
            ]
          },
          { type: "separator", margin: "md" },
          { type: "text", color: "#999999", text: "Detail:", size: "xs" },
          { type: "text", text: eventData.detail || "ไม่มีรายละเอียดเพิ่มเติม", size: "xs", color: "#666666", wrap: true, margin: "xs" },
          {
            type: "box",
            layout: "baseline",
            contents: [
              { type: "text", text: "อัปเดตล่าสุด:", flex: 0, size: "xs", color: "#999999" },
              { type: "text", text: `${Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "dd/MM/yyyy HH:mm")}`, flex: 5, size: "xs", color: "#333333", align: "center", weight: "bold" }
            ],
            margin: "md"
          }
        ]
      }
    }
  };
}

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
          { type: "text", text: "MORNING REMINDER", weight: "bold", size: "sm", color: "#FF9500" },
          { type: "text", text: "วันนี้มีกิจกรรมที่ต้องดำเนินการ", weight: "bold", size: "md", color: "#FF6B35", margin: "xs" },
          { type: "text", text: eventData.eventName, weight: "bold", size: "lg", wrap: true, color: "#333333", margin: "md" },
          {
            type: "box",
            layout: "baseline",
            spacing: "xs",
            contents: [
              { type: "text", text: "Time:", color: "#999999", size: "xs", flex: 2 },
              { type: "text", text: `${eventData.startTimeFormatted} - ${eventData.endTimeFormatted}`, size: "xs", color: "#FF0000", weight: "bold", flex: 3 }
            ]
          },
          {
            type: "box",
            layout: "baseline",
            spacing: "xs",
            contents: [
              { type: "text", text: "Contact:", color: "#999999", size: "xs", flex: 2 },
              { type: "text", text: eventData.userName || "ไม่ระบุ", size: "xs", color: "#333333", weight: "bold", flex: 3 }
            ]
          },
          {
            type: "box",
            layout: "baseline",
            contents: [
              { type: "text", text: "Location:", flex: 2, size: "xs", color: "#999999" },
              { type: "text", text: eventData.location || "ไม่ระบุสถานที่", flex: 3, size: "xs", weight: "bold", color: "#333333" }
            ]
          },
          { type: "separator", margin: "md" },
          { type: "text", color: "#999999", text: "Detail:", size: "xs" },
          { type: "text", text: eventData.detail || "ไม่มีรายละเอียดเพิ่มเติม", size: "xs", color: "#666666", wrap: true, margin: "xs" },
          {
            type: "box",
            layout: "baseline",
            contents: [
              { type: "text", text: "แจ้งเตือนเวลา:", flex: 0, size: "xs", color: "#999999" },
              { type: "text", text: `${Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "dd/MM/yyyy HH:mm")}`, flex: 5, size: "xs", color: "#333333", align: "center", weight: "bold" }
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
      SpreadsheetApp.getUi().alert('🧪 TEST MODE: ทำรายการสำเร็จ\n(Calendar/Sheet อัปเดตแล้ว)');
    } catch (e) {}
    return;
  }

  const payload = { to: CONFIG.LINE_GROUP_ID, messages: messages };
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + CONFIG.LINE_ACCESS_TOKEN },
    payload: JSON.stringify(payload)
  };
  
  try {
    const response = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', options);
    if (response.getResponseCode() === 200) Logger.log('📱 ส่งข้อความ LINE สำเร็จ');
    else Logger.log('⚠️ LINE Response: ' + response.getContentText());
  } catch (error) {
    Logger.log('❌ ไม่สามารถส่งข้อความ LINE ได้: ' + error.toString());
    throw error;
  }
}

// ===== Reminder Functions =====
function scheduleReminders(eventData) {
  Logger.log(`📝 บันทึกข้อมูลสำหรับ Morning Reminder: ${eventData.eventName}`);
  Logger.log('ℹ️ ระบบจะแจ้งเตือนอัตโนมัติเมื่อถึงวันงาน (โดยใช้ Trigger รายวัน)');
}

function sendMorningReminder() {
  Logger.log('🌅 เริ่มต้นกระบวนการตรวจสอบ Morning Reminder...');
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const data = sheet.getDataRange().getValues();
    const today = new Date();
    today.setHours(0,0,0,0);
    
    let notiCount = 0;
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const startDateRaw = row[CONFIG.SHEET_COLUMNS.START_DATE];
      const confirmStatus = row[CONFIG.SHEET_COLUMNS.CONFIRM_STATUS];
      
      if (!startDateRaw) continue;
      
      let eventDate;
      if (startDateRaw instanceof Date) {
        eventDate = new Date(startDateRaw);
      } else {
         const dateStr = startDateRaw.toString();
         if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            eventDate = new Date(parts[2], parts[1]-1, parts[0]);
         } else {
            eventDate = new Date(startDateRaw);
         }
      }
      
      if (eventDate && !isNaN(eventDate.getTime())) {
         eventDate.setHours(0,0,0,0);
         if (eventDate.getTime() === today.getTime() && 
            (confirmStatus === CONFIG.STATUS_VALUES.CONFIRMED || confirmStatus === CONFIG.STATUS_VALUES.CREATED)) {
            const eventData = getEventDataByRow(i + 1);
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
    }
    Logger.log(`📝 อัพเดทสถานะ Event แถวที่ ${rowIndex}: ${creationStatus}`);
  } catch (error) {
    Logger.log('❌ Error updateCreationStatus: ' + error.toString());
  }
}

function updateConfirmStatus(rowIndex, confirmStatus) {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    sheet.getRange(rowIndex, CONFIG.SHEET_COLUMNS.CONFIRM_STATUS + 1).setValue(confirmStatus);
    Logger.log(`📝 อัพเดทสถานะการยืนยัน แถวที่ ${rowIndex}: ${confirmStatus}`);
  } catch (error) {
    Logger.log('❌ Error updateConfirmStatus: ' + error.toString());
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
  } catch (error) { return null; }
}

function sendErrorNotification(errorMessage) {
  try {
    sendLineMessage([{ type: "text", text: `❌ Error: ${errorMessage}` }]);
  } catch (error) {}
}

// ===== Menu/Toolbar Functions =====
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📅 Event Manager')
    .addItem('⏳ ตั้งสถานะ PENDING', 'setPendingStatusForSelectedRow')
    .addItem('✅ ยืนยัน CONFIRMED', 'setConfirmedStatusForSelectedRow')
    .addSeparator()
    .addItem('🛠️ อัปเดตข้อมูล (แก้ไข)', 'updateEventForSelectedRow')
    .addItem('❌ ยกเลิก Event (ลบ)', 'cancelEventForSelectedRow') // <--- เมนูใหม่
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
  handleSelectedRow((row) => {
    const eventData = getEventDataByRow(row);
    if (!eventData || !eventData.eventName) { SpreadsheetApp.getUi().alert('ไม่มีข้อมูล Event'); return; }
    if (eventData.creationStatus === CONFIG.STATUS_VALUES.CREATED) { SpreadsheetApp.getUi().alert('Event สร้างแล้ว'); return; }
    
    const resp = SpreadsheetApp.getUi().alert('ยืนยันสร้าง Event?', SpreadsheetApp.getUi().ButtonSet.YES_NO);
    if (resp === SpreadsheetApp.getUi().Button.YES) {
      updateConfirmStatus(row, CONFIG.STATUS_VALUES.CONFIRMED);
      const processed = processEventData(eventData);
      const evId = createCalendarEvent(processed);
      if (evId) {
        sendLineNotification(processed);
        updateCreationStatus(row, CONFIG.STATUS_VALUES.CREATED, evId);
        scheduleReminders(processed);
      }
    }
  }, 'สร้าง Event');
}

function handleSelectedRow(action, actionName) {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const row = sheet.getActiveRange().getRow();
    if (row === 1) { SpreadsheetApp.getUi().alert('กรุณาเลือกแถวข้อมูล'); return; }
    action(row);
    SpreadsheetApp.getUi().alert(`${actionName} เรียบร้อย (ตรวจสอบ Log หากมีปัญหา)`);
  } catch (e) { SpreadsheetApp.getUi().alert('Error: ' + e.toString()); }
}

function clearAllReminders() { Logger.log('⚠️ Deprecated function'); }

// ===== Update Functions =====
function updateEventForSelectedRow() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const row = sheet.getActiveRange().getRow();
    if (row === 1) return;
    const eventData = getEventDataByRow(row);
    if (!eventData || !eventData.eventId) { SpreadsheetApp.getUi().alert('ต้องสร้าง Event ก่อน'); return; }

    const resp = SpreadsheetApp.getUi().alert('ยืนยันแก้ไข?', SpreadsheetApp.getUi().ButtonSet.YES_NO);
    if (resp === SpreadsheetApp.getUi().Button.YES) {
      const processed = processEventData(eventData);
      updateCalendarEventOnly(processed);
      sendLineUpdateNotification(processed);
      SpreadsheetApp.getUi().alert('✅ อัปเดตสำเร็จ!');
    }
  } catch (error) { SpreadsheetApp.getUi().alert('Error: ' + error.toString()); }
}

function updateCalendarEventOnly(eventData) {
  const cal = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
  const ev = cal.getEventById(eventData.eventId);
  if (!ev) throw new Error('ไม่พบ Event ใน Calendar');
  ev.setTitle(eventData.eventName);
  ev.setTime(eventData.startEvent, eventData.endEvent);
  ev.setLocation(eventData.location || '');
  ev.setDescription(`รายละเอียด: ${eventData.detail || '-'}\nผู้รับผิดชอบ: ${eventData.userName || '-'}`);
}

function sendLineUpdateNotification(eventData) {
  const message = {
    type: "flex",
    altText: `📝 แก้ไขข้อมูล: ${eventData.eventName}`,
    contents: {
      type: "bubble",
      body: {
        type: "box", layout: "vertical",
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

// ==========================================
// ===== ❌ CANCELLATION FUNCTIONS (FIXED) =====
// ==========================================

function cancelEventForSelectedRow() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const selectedRow = sheet.getActiveRange().getRow();
    
    if (selectedRow === 1) { SpreadsheetApp.getUi().alert('กรุณาเลือกแถวข้อมูล Event'); return; }
    
    const eventData = getEventDataByRow(selectedRow);
    if (!eventData || !eventData.eventName) { SpreadsheetApp.getUi().alert('ไม่พบข้อมูล Event'); return; }
    
    // กรณีที่ยังไม่ได้สร้างใน Calendar
    if (!eventData.eventId) {
      const confirm = SpreadsheetApp.getUi().alert('Event นี้ยังไม่ได้สร้างใน Calendar ต้องการเปลี่ยนสถานะเป็น ยกเลิก หรือไม่?', SpreadsheetApp.getUi().ButtonSet.YES_NO);
      if (confirm === SpreadsheetApp.getUi().Button.YES) {
        updateCreationStatus(selectedRow, CONFIG.STATUS_VALUES.CANCELLED);
        SpreadsheetApp.getUi().alert('เปลี่ยนสถานะเป็น CANCELLED เรียบร้อย');
      }
      return;
    }

    const response = SpreadsheetApp.getUi().alert(
      '⚠️ ยืนยันการยกเลิก', 
      `ต้องการยกเลิก Event: "${eventData.eventName}" ?\n(ระบบจะลบจาก Calendar และแจ้ง LINE)`, 
      SpreadsheetApp.getUi().ButtonSet.YES_NO
    );
    
    if (response === SpreadsheetApp.getUi().Button.YES) {
      const deleteSuccess = deleteCalendarEvent(eventData.eventId);
      
      if (deleteSuccess) {
        // 🛠️ FIX: เพิ่มบรรทัดนี้ เพื่อแปลงรูปแบบวันที่ก่อนส่ง LINE
        const processedData = processEventData(eventData); 
        
        updateCreationStatus(selectedRow, CONFIG.STATUS_VALUES.CANCELLED, 'REMOVED');
        
        // ส่งข้อมูลที่ process แล้ว (processedData) แทนข้อมูลดิบ
        sendCancellationNotification(processedData);
        
        SpreadsheetApp.getUi().alert(`✅ ยกเลิก Event สำเร็จ!`);
        Logger.log(`🗑️ Cancelled event: ${eventData.eventName}`);
      }
    }
  } catch (error) {
    SpreadsheetApp.getUi().alert('เกิดข้อผิดพลาด: ' + error.toString());
    Logger.log('❌ Error cancelling event: ' + error.toString());
  }
}

function deleteCalendarEvent(eventId) {
  try {
    if (eventId === 'REMOVED') return true;
    const calendar = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
    const event = calendar.getEventById(eventId);
    if (event) {
      event.deleteEvent();
      Logger.log('🗑️ ลบ Event จาก Calendar ID: ' + eventId);
      return true;
    } else {
      Logger.log('⚠️ ไม่พบ Event ใน Calendar (อาจถูกลบไปแล้ว)');
      return true; 
    }
  } catch (error) {
    Logger.log('❌ ไม่สามารถลบ Calendar Event: ' + error.toString());
    throw new Error('เข้าถึง Calendar ไม่ได้ หรือ Event ถูกลบไปแล้ว');
  }
}

function sendCancellationNotification(eventData) {
  const message = {
    type: "flex",
    altText: `❌ ยกเลิกกิจกรรม: ${eventData.eventName}`,
    contents: {
      type: "bubble",
      body: {
        type: "box", layout: "vertical", spacing: "sm", paddingAll: "20px",
        contents: [
          { type: "text", text: "CANCELLED / ยกเลิก", weight: "bold", size: "sm", color: "#FF334B" },
          { type: "text", text: "กิจกรรมนี้ถูกยกเลิกแล้ว", weight: "bold", size: "md", color: "#333333", margin: "xs" },
          { type: "separator", margin: "md" },
          { type: "text", text: eventData.eventName, weight: "bold", size: "lg", wrap: true, color: "#999999", decoration: "line-through", margin: "md" },
          {
            type: "box", layout: "baseline", spacing: "xs",
            contents: [
              { type: "text", text: "Date:", color: "#999999", size: "xs", flex: 2 },
              { type: "text", text: eventData.startDateFormatted, size: "xs", color: "#999999", decoration: "line-through", flex: 3 }
            ]
          },
          { type: "text", text: "* ไม่ต้องดำเนินการใดๆ *", size: "xxs", color: "#999999", align: "center", margin: "lg" }
        ]
      }
    }
  };
  sendLineMessage([message]);
}

function testLineConnection() {
  sendLineMessage([{ type: "text", text: "🧪 Test Connection OK" }]);
}