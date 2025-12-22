// ===== Configuration =====
const CONFIG = {
  TEST_MODE: false, // <--- ถ้าเป็น true จะไม่ส่ง LINE (ถ้าจะใช้งานจริงให้แก้เป็น false)
  CALENDAR_ID: '64353fc5b70e07752f918736d8cd2b2df5721057464872cbab1d56d8b971a1c3@group.calendar.google.com',
  LINE_ACCESS_TOKEN: 'wQl9rs+m1p0t5eyZRT+2vXMNzeZqDQauwOqH64IbX8mDcRo43tj5t7daBslKezp949cEi3lABOUARb6dEiO8HA0+5ufaoDvnP71DKMtBAYUn2XKDGwfWnoOkahgpnl9cWLIRNrjsSQNJ5dAo5Y6vgwdB04t89/1O/w1cDnyilFU=',
  LINE_GROUP_ID: 'Cf16cff305b9c8a5e99ad7fc483bc8f81',
  TIMEZONE: 'Asia/Bangkok',
  SHEET_COLUMNS: {
    EVENT_NAME: 0,
    DETAIL: 1, 
    USER_NAME: 2,
    LOCATION: 3,
    START_DATE: 4,
    START_TIME: 5,
    END_DATE: 6,
    END_TIME: 7,
    CONFIRM_STATUS: 8, // สถานะการยืนยัน: PENDING, CONFIRMED
    CREATION_STATUS: 9, // สถานะการสร้าง: CREATED
    EVENT_ID: 10 // Event ID ใน Google Calendar
  },
  STATUS_VALUES: {
    PENDING: 'PENDING',       // รอการยืนยัน
    CONFIRMED: 'CONFIRMED',   // ยืนยันแล้ว ให้ส่งแจ้งเตือน
    CREATED: 'CREATED'        // สร้างใน Calendar แล้ว
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
      
      // ตั้งการแจ้งเตือนเช้าวันงาน
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
  // --- ส่วนที่เพิ่มเข้ามาสำหรับ Test Mode ---
  if (CONFIG.TEST_MODE) {
    Logger.log('🧪 [TEST MODE] ระบบทำงานสำเร็จ แต่ระงับการส่ง LINE ไว้');
    Logger.log('📨 ข้อมูลที่จะส่ง: ' + JSON.stringify(messages));
    
    // แจ้งเตือนบนหน้าจอให้รู้ว่าจบกระบวนการแล้ว (ใส่ try-catch เพื่อป้องกัน Error ในหน้า Editor)
    try {
      SpreadsheetApp.getUi().alert('🧪 TEST MODE: ทำรายการสำเร็จ\n(สร้าง/แก้ไข Calendar แล้ว แต่ไม่ได้ส่ง LINE)');
    } catch (e) {
      Logger.log('⚠️ ไม่สามารถแสดง Popup ได้ (เนื่องจากรันจากหน้า Script Editor) แต่ระบบทำงานถูกต้องครับ');
    }
    
    return; // จบการทำงานตรงนี้เลย ไม่ยิงไปหา LINE API
  }
  // ------------------------------------

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

// ===== Reminder Functions =====
function scheduleReminders(eventData) {
  try {
    // 1. แจ้งทันทีเมื่อมีการอัพเดทยืนยันข้อมูล (ทำงานทันทีใน addCalendarEvent)
    Logger.log('📱 ส่งการแจ้งเตือนทันทีเมื่อยืนยันข้อมูล');
    
    // 2. แจ้งเตือนในวันจริงเวลา 8:00 น.
    const eventDate = new Date(eventData.startEvent);
    const reminderDate = new Date(eventDate);
    reminderDate.setHours(8, 0, 0, 0); // ตั้งเวลา 8:00 น.
    
    // ตรวจสอบว่าเวลาแจ้งเตือนยังไม่ผ่านไปแล้ว
    if (reminderDate > new Date()) {
      ScriptApp.newTrigger('sendMorningReminder')
        .timeBased()
        .at(reminderDate)
        .create();
        
      // เก็บข้อมูล Event ใน Properties เพื่อใช้ในการแจ้งเตือน
      PropertiesService.getScriptProperties().setProperty(
        'morning_reminder_' + reminderDate.getTime(),
        JSON.stringify(eventData)
      );
      
      Logger.log('⏰ ตั้งแจ้งเตือนเวลา 8:00 น. ในวันงาน: ' + Utilities.formatDate(reminderDate, CONFIG.TIMEZONE, "dd/MM/yyyy HH:mm"));
    } else {
      Logger.log('⚠️ เวลาแจ้งเตือน 8:00 น. ผ่านไปแล้ว');
    }
    
    Logger.log('⏰ ตั้งการแจ้งเตือนสำเร็จ');
  } catch (error) {
    Logger.log('⚠️ ไม่สามารถตั้งการแจ้งเตือนได้: ' + error.toString());
  }
}

function sendMorningReminder() {
  sendReminder('🌅 แจ้งเตือนเช้า: วันนี้มีกิจกรรมที่ต้องดำเนินการ');
}

function sendReminder(reminderText) {
  try {
    const currentTime = new Date().getTime();
    const properties = PropertiesService.getScriptProperties().getProperties();
    
    // หาข้อมูล Event ที่ตรงกับเวลาปัจจุบัน (ให้ tolerance 5 นาที)
    let eventData = null;
    let propertyKey = null;
    
    for (const key in properties) {
      if (key.startsWith('morning_reminder_')) {
        const reminderTime = parseInt(key.replace('morning_reminder_', ''));
        const timeDiff = Math.abs(currentTime - reminderTime);
        
        // หากเวลาใกล้เคียงกัน (ภายใน 5 นาที)
        if (timeDiff <= 5 * 60 * 1000) {
          eventData = JSON.parse(properties[key]);
          propertyKey = key;
          break;
        }
      }
    }
    
    if (eventData) {
      // สร้างข้อความแจ้งเตือนแบบ Flex Message สำหรับเช้าวันนี้
      const morningMessage = createMorningReminderFlexMessage(eventData, reminderText);
      sendLineMessage([morningMessage]);
      
      // ลบข้อมูลที่ใช้แล้ว
      if (propertyKey) {
        PropertiesService.getScriptProperties().deleteProperty(propertyKey);
      }
      
      Logger.log('✅ ส่งการแจ้งเตือนสำเร็จ: ' + reminderText);
    } else {
      Logger.log('⚠️ ไม่พบข้อมูล Event สำหรับการแจ้งเตือน');
    }
  } catch (error) {
    Logger.log('❌ ไม่สามารถส่งการแจ้งเตือนได้: ' + error.toString());
  }
}

// ===== Utility Functions =====
function updateCreationStatus(rowIndex, creationStatus, eventId = '') {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    
    // อัพเดทสถานะการสร้าง
    sheet.getRange(rowIndex, CONFIG.SHEET_COLUMNS.CREATION_STATUS + 1).setValue(creationStatus);
    
    // อัพเดท Event ID หากมี
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
    
    // อัพเดทสถานะการยืนยัน
    sheet.getRange(rowIndex, CONFIG.SHEET_COLUMNS.CONFIRM_STATUS + 1).setValue(confirmStatus);
    
    Logger.log(`📝 อัพเดทสถานะการยืนยัน แถวที่ ${rowIndex}: ${confirmStatus}`);
    
  } catch (error) {
    Logger.log('❌ ไม่สามารถอัพเดทสถานะการยืนยันได้: ' + error.toString());
  }
}

// ฟังก์ชันสำหรับตรวจสอบและประมวลผล Event ทั้งหมดใน Sheets
function processAllEvents() {
  try {
    Logger.log('🔄 เริ่มประมวลผล Event ทั้งหมด...');
    
    const sheet = SpreadsheetApp.getActiveSheet();
    const data = sheet.getDataRange().getValues();
    
    if (data.length < 2) {
      Logger.log('⚠️ ไม่มีข้อมูล Event');
      return;
    }
    
    let processedCount = 0;
    
    // วนลูปตรวจสอบทุกแถว (เริ่มจากแถวที่ 2 เพราะแถวที่ 1 เป็น header)
    for (let i = 1; i < data.length; i++) {
      const event = data[i];
      const rowIndex = i + 1;
      
      const eventData = {
        rowIndex: rowIndex,
        eventName: event[CONFIG.SHEET_COLUMNS.EVENT_NAME],
        confirmStatus: event[CONFIG.SHEET_COLUMNS.CONFIRM_STATUS],
        creationStatus: event[CONFIG.SHEET_COLUMNS.CREATION_STATUS]
      };
      
      // ข้าม Event ที่ไม่มีชื่อกิจกรรม
      if (!eventData.eventName) continue;
      
      // ตั้งสถานะ PENDING ถ้ายังไม่มีสถานะ
      if (!eventData.confirmStatus) {
        updateConfirmStatus(rowIndex, CONFIG.STATUS_VALUES.PENDING);
        Logger.log(`⏳ ตั้งสถานะ PENDING สำหรับ Event แถวที่ ${rowIndex}: ${eventData.eventName}`);
        continue;
      }
      
      // ประมวลผล Event ที่มีสถานะ CONFIRMED และยังไม่ได้สร้าง
      if (eventData.confirmStatus === CONFIG.STATUS_VALUES.CONFIRMED && 
          eventData.creationStatus !== CONFIG.STATUS_VALUES.CREATED) {
        
        Logger.log(`⚡ ประมวลผล Event แถวที่ ${rowIndex}: ${eventData.eventName}`);
        
        // ประมวลผล Event นี้โดยตั้งให้เป็นแถวปัจจุบัน
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
    Logger.log('❌ Error ในการประมวลผล Event ทั้งหมด: ' + error.toString());
    sendErrorNotification('Error ในการประมวลผล Event ทั้งหมด: ' + error.toString());
  }
}

// ฟังก์ชันสำหรับดึงข้อมูล Event จากแถวที่ระบุ
function getEventDataByRow(rowIndex) {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const data = sheet.getDataRange().getValues();
    
    if (rowIndex < 1 || rowIndex > data.length) {
      Logger.log(`⚠️ แถวที่ ${rowIndex} ไม่มีข้อมูล`);
      return null;
    }
    
    const event = data[rowIndex - 1]; // -1 เพราะ array เริ่มจาก 0
    
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
    Logger.log('❌ ไม่สามารถดึงข้อมูล Event จากแถวที่ ' + rowIndex + ': ' + error.toString());
    return null;
  }
}

function sendErrorNotification(errorMessage) {
  try {
    const message = {
      type: "text", 
      text: `❌ เกิดข้อผิดพลาดในระบบ Event Manager\n\nError: ${errorMessage}\n\nกรุณาตรวจสอบข้อมูลใน Google Sheets`
    };
    sendLineMessage([message]);
  } catch (error) {
    Logger.log('❌ ไม่สามารถส่งการแจ้งเตือนข้อผิดพลาดได้: ' + error.toString());
  }
}

// ฟังก์ชันสำหรับตั้งสถานะ PENDING ของแถวที่เลือก
function setPendingStatusForSelectedRow() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const activeRange = sheet.getActiveRange();
    const selectedRow = activeRange.getRow();
    
    if (selectedRow === 1) {
      SpreadsheetApp.getUi().alert('กรุณาเลือกแถวข้อมูล Event (ไม่ใช่ header)');
      return;
    }
    
    updateConfirmStatus(selectedRow, CONFIG.STATUS_VALUES.PENDING);
    
    SpreadsheetApp.getUi().alert(`ตั้งสถานะ PENDING สำหรับแถวที่ ${selectedRow} เรียบร้อยแล้ว`);
    Logger.log(`✅ ตั้งสถานะ PENDING สำหรับแถวที่ ${selectedRow} ผ่าน Menu`);
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('เกิดข้อผิดพลาด: ' + error.toString());
    Logger.log('❌ Error in setPendingStatusForSelectedRow: ' + error.toString());
  }
}

// ฟังก์ชันสำหรับยืนยันและส่งแจ้งเตือนของแถวที่เลือก
function setConfirmedStatusForSelectedRow() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const activeRange = sheet.getActiveRange();
    const selectedRow = activeRange.getRow();
    
    if (selectedRow === 1) {
      SpreadsheetApp.getUi().alert('กรุณาเลือกแถวข้อมูล Event (ไม่ใช่ header)');
      return;
    }
    
    // ตรวจสอบข้อมูล Event ที่เลือก
    const eventData = getEventDataByRow(selectedRow);
    if (!eventData || !eventData.eventName) {
      SpreadsheetApp.getUi().alert('แถวที่เลือกไม่มีข้อมูล Event');
      return;
    }
    
    // ตรวจสอบว่าสร้างแล้วหรือยัง
    if (eventData.creationStatus === CONFIG.STATUS_VALUES.CREATED) {
      SpreadsheetApp.getUi().alert('Event นี้ถูกสร้างใน Calendar แล้ว');
      return;
    }
    
    // ยืนยันการดำเนินการ
    const response = SpreadsheetApp.getUi().alert(
      'ยืนยันการสร้าง Event', 
      `คุณต้องการยืนยันและสร้าง Event: "${eventData.eventName}" หรือไม่?\n\nระบบจะ:\n- สร้าง Event ใน Google Calendar\n- ส่งแจ้งเตือนผ่าน LINE ทันที\n- ตั้งแจ้งเตือนเช้าวันงาน เวลา 8:00 น.`, 
      SpreadsheetApp.getUi().ButtonSet.YES_NO
    );
    
    if (response === SpreadsheetApp.getUi().Button.YES) {
      // อัปเดตสถานะเป็น CONFIRMED
      updateConfirmStatus(selectedRow, CONFIG.STATUS_VALUES.CONFIRMED);
      
      // ประมวลผล Event นี้
      const processedData = processEventData(eventData);
      const calendarEventId = createCalendarEvent(processedData);
      
      if (calendarEventId) {
        // ส่งแจ้งเตือนทันที
        sendLineNotification(processedData);
        
        // อัปเดตสถานะเป็น CREATED
        updateCreationStatus(selectedRow, CONFIG.STATUS_VALUES.CREATED, calendarEventId);
        
        // ตั้งการแจ้งเตือนเช้าวันงาน
        scheduleReminders(processedData);
        
        SpreadsheetApp.getUi().alert(`สร้าง Event "${eventData.eventName}" สำเร็จ!\n\n✅ ส่งแจ้งเตือนผ่าน LINE แล้ว\n⏰ ตั้งแจ้งเตือนเช้าวันงานแล้ว`);
        Logger.log(`✅ สร้าง Event สำเร็จสำหรับแถวที่ ${selectedRow}: ${eventData.eventName}`);
      }
    }
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('เกิดข้อผิดพลาด: ' + error.toString());
    Logger.log('❌ Error in setConfirmedStatusForSelectedRow: ' + error.toString());
  }
}

function clearAllReminders() {
  const triggers = ScriptApp.getProjectTriggers();
  let reminderCount = 0;
  
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'sendMorningReminder') {
      ScriptApp.deleteTrigger(trigger);
      reminderCount++;
      Logger.log('🗑️ ลบ Morning Reminder Trigger: ' + trigger.getHandlerFunction());
    }
  });
  
  // ลบ Properties ที่เกี่ยวข้อง
  const properties = PropertiesService.getScriptProperties().getProperties();
  let propertyCount = 0;
  Object.keys(properties).forEach(key => {
    if (key.startsWith('morning_reminder_')) {
      PropertiesService.getScriptProperties().deleteProperty(key);
      propertyCount++;
    }
  });
  
  Logger.log(`✅ ลบ Morning Reminder Triggers: ${reminderCount} ตัว`);
  Logger.log(`✅ ลบ Morning Reminder Properties: ${propertyCount} ตัว`);
}

// ===== Debug Functions =====
function debugEventData() {
  Logger.log('🔍 Debug: ตรวจสอบข้อมูล Event ล่าสุด');
  
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const lastRowIndex = data.length - 1;
  const event = data[lastRowIndex];
  
  Logger.log('📊 ข้อมูลแถวล่าสุด:');
  Logger.log('- ชื่อกิจกรรม: ' + event[CONFIG.SHEET_COLUMNS.EVENT_NAME]);
  Logger.log('- รายละเอียด: ' + event[CONFIG.SHEET_COLUMNS.DETAIL]);
  Logger.log('- ผู้รับผิดชอบ: ' + event[CONFIG.SHEET_COLUMNS.USER_NAME]);
  Logger.log('- สถานที่: ' + event[CONFIG.SHEET_COLUMNS.LOCATION]);
  Logger.log('- วันที่เริ่ม: ' + event[CONFIG.SHEET_COLUMNS.START_DATE]);
  Logger.log('- เวลาเริ่ม: ' + event[CONFIG.SHEET_COLUMNS.START_TIME]);
  Logger.log('- วันที่สิ้นสุด: ' + event[CONFIG.SHEET_COLUMNS.END_DATE]);
  Logger.log('- เวลาสิ้นสุด: ' + event[CONFIG.SHEET_COLUMNS.END_TIME]);
  Logger.log('- สถานะการยืนยัน: ' + event[CONFIG.SHEET_COLUMNS.CONFIRM_STATUS]);
  Logger.log('- สถานะการสร้าง: ' + event[CONFIG.SHEET_COLUMNS.CREATION_STATUS]);
  Logger.log('- Event ID: ' + event[CONFIG.SHEET_COLUMNS.EVENT_ID]);
}

// ===== Testing Functions =====
function testAddEvent() {
  Logger.log('🧪 เริ่มทดสอบระบบ Event Manager...');
  addCalendarEvent();
}

function testProcessAllEvents() {
  Logger.log('🧪 ทดสอบการประมวลผล Event ทั้งหมด...');
  processAllEvents();
}

function testLineConnection() {
  try {
    const testMessage = {
      type: "text",
      text: "🧪 ทดสอบการเชื่อมต่อ LINE\n\nหากเห็นข้อความนี้แสดงว่าระบบทำงานปกติ ✅"
    };
    
    sendLineMessage([testMessage]);
    Logger.log('✅ ทดสอบ LINE สำเร็จ');
  } catch (error) {
    Logger.log('❌ ทดสอบ LINE ล้มเหลว: ' + error.toString());
  }
}

// ==========================================
// ===== ส่วนฟังก์ชันอัปเดตข้อมูล (ใหม่) =====
// ==========================================

function updateEventForSelectedRow() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const activeRange = sheet.getActiveRange();
    const selectedRow = activeRange.getRow();
    
    // ป้องกันการกดที่ Header
    if (selectedRow === 1) {
      SpreadsheetApp.getUi().alert('กรุณาเลือกแถวข้อมูล Event (ไม่ใช่ header)');
      return;
    }
    
    // 1. ดึงข้อมูลจากแถวที่เลือก (ใช้ฟังก์ชันเดิมที่มีอยู่แล้ว)
    const eventData = getEventDataByRow(selectedRow);
    
    // เช็คว่าเคยสร้าง Event หรือยัง (ต้องมี Event ID ถึงจะแก้ได้)
    if (!eventData || !eventData.eventId) {
      SpreadsheetApp.getUi().alert('⚠️ ไม่สามารถอัปเดตได้: ยังไม่มี Event ID\n(ต้องกด CONFIRM เพื่อสร้าง Event ครั้งแรกก่อน)');
      return;
    }

    // ถามยืนยัน
    const response = SpreadsheetApp.getUi().alert(
      'ยืนยันการแก้ไขข้อมูล', 
      `คุณต้องการอัปเดตข้อมูล Event: "${eventData.eventName}"\nระบบจะแก้เวลาใน Calendar และส่ง LINE แจ้งเตือนใหม่`, 
      SpreadsheetApp.getUi().ButtonSet.YES_NO
    );
    
    if (response === SpreadsheetApp.getUi().Button.YES) {
      // 2. ประมวลผลข้อมูลใหม่ (format วันที่/เวลา)
      const processedData = processEventData(eventData);
      
      // 3. แก้ไขใน Google Calendar
      updateCalendarEventOnly(processedData);
      
      // 4. ส่ง LINE แจ้งว่ามีการแก้ไข
      sendLineUpdateNotification(processedData);
      
      // 5. ตั้งแจ้งเตือนใหม่อีกครั้ง (เผื่อเวลาเปลี่ยน)
      scheduleReminders(processedData);
      
      SpreadsheetApp.getUi().alert(`✅ อัปเดตข้อมูลสำเร็จ!\nCalendar ถูกแก้ไขและส่ง LINE แจ้งเตือนแล้ว`);
      Logger.log(`🔄 อัปเดต Event สำเร็จ: ${eventData.eventName}`);
    }
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('เกิดข้อผิดพลาดในการอัปเดต: ' + error.toString());
    Logger.log('❌ Error updating event: ' + error.toString());
  }
}

// ฟังก์ชันเจาะจงสำหรับแก้ Calendar (แยกออกมาเพื่อความปลอดภัย)
function updateCalendarEventOnly(eventData) {
  try {
    const calendar = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
    const event = calendar.getEventById(eventData.eventId);
    
    if (!event) {
      throw new Error('ไม่พบ Event ใน Calendar (อาจถูกลบไปแล้ว)');
    }
    
    // อัปเดตข้อมูลใหม่ทับของเดิม
    event.setTitle(eventData.eventName);
    event.setTime(eventData.startEvent, eventData.endEvent);
    event.setLocation(eventData.location || '');
    
    const description = `รายละเอียด: ${eventData.detail || 'ไม่ระบุ'}\nผู้รับผิดชอบ: ${eventData.userName || 'ไม่ระบุ'}\nสถานที่: ${eventData.location || 'ไม่ระบุ'}`;
    event.setDescription(description);
    
    Logger.log('📅 ปรับปรุงข้อมูลใน Calendar ID: ' + eventData.eventId);
    
  } catch (error) {
    Logger.log('❌ ไม่สามารถอัปเดต Calendar: ' + error.toString());
    throw new Error('ไม่สามารถเข้าถึง Calendar ID นี้ได้');
  }
}

// ฟังก์ชันส่ง LINE แจ้งเตือนการแก้ไข (สีส้ม)
function sendLineUpdateNotification(eventData) {
  const message = {
    type: "flex",
    altText: `📝 แก้ไขข้อมูล: ${eventData.eventName}`,
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
            text: "UPDATE / CORRECTION",
            weight: "bold",
            size: "sm",
            color: "#FF9500" // สีส้ม
          },
          {
            type: "text",
            text: "มีการแก้ไขข้อมูลกิจกรรม",
            weight: "bold",
            size: "md",
            color: "#333333",
            margin: "xs"
          },
          {
            type: "separator",
            margin: "md"
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
              { type: "text", text: "New Date:", color: "#999999", size: "xs", flex: 2 },
              { type: "text", text: eventData.startDateFormatted, size: "xs", color: "#333333", weight: "bold", flex: 3 }
            ]
          },
          {
            type: "box",
            layout: "baseline",
            spacing: "xs",
            contents: [
              { type: "text", text: "New Time:", color: "#999999", size: "xs", flex: 2 },
              { type: "text", text: `${eventData.startTimeFormatted} - ${eventData.endTimeFormatted}`, size: "xs", color: "#FF0000", weight: "bold", flex: 3 }
            ]
          },
          {
            type: "text",
            text: "* ยึดข้อมูลตามประกาศฉบับนี้ *",
            size: "xxs",
            color: "#999999",
            align: "center",
            margin: "lg"
          }
        ]
      }
    }
  };
  
  sendLineMessage([message]);
}