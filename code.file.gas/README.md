# 📱 LINE Official Account Bot - Google Apps Script

> ระบบจัดการ LINE Official Account ด้วย Google Apps Script พร้อม Analytics และ Dashboard

## 📚 สารบัญ

- [ภาพรวมระบบ](#ภาพรวมระบบ)
- [โครงสร้างไฟล์](#โครงสร้างไฟล์)
- [คุณสมบัติ](#คุณสมบัติ)
- [การติดตั้ง](#การติดตั้ง)
- [การใช้งาน](#การใช้งาน)
- [API Reference](#api-reference)
- [การทดสอบ](#การทดสอบ)
- [Troubleshooting](#troubleshooting)

---

## 🎯 ภาพรวมระบบ

ระบบนี้ช่วยให้คุณจัดการ LINE Official Account ได้อย่างมีประสิทธิภาพ โดยมีฟีเจอร์หลักดังนี้:

- ✅ รับและตอบกลับข้อความอัตโนมัติ
- ✅ ติดตามและจัดการข้อมูลผู้ติดตาม (Followers)
- ✅ บันทึกประวัติการสนทนา
- ✅ วิเคราะห์ข้อมูล LINE Insight
- ✅ สร้าง Dashboard และรายงานอัตโนมัติ
- ✅ ส่งรายงานทาง Email

---

## 📁 โครงสร้างไฟล์

```
📦 Project Root
├── 📄 Config.gs                 # การตั้งค่าหลักของระบบ
├── 📄 Main.gs                   # Entry point และ Webhook handler
├── 📄 EventHandler.gs           # จัดการ Events จาก LINE
├── 📄 LineAPI.gs                # LINE API Wrapper
├── 📄 SheetService.gs           # Google Sheets Operations
├── 📄 FollowerService.gs        # จัดการข้อมูลผู้ติดตาม
├── 📄 InsightConfig.gs          # Analytics Configuration
├── 📄 InsightService.gs         # Analytics Data Processing
├── 📄 InsightDashboard.gs       # Dashboard & Reports
└── 📄 Utils.gs                  # Utility Functions
```

### 📋 รายละเอียดแต่ละไฟล์

| ไฟล์ | หน้าที่ | ฟังก์ชันหลัก |
|------|---------|--------------|
| **Config.gs** | การตั้งค่า | `LINE_CONFIG`, `SHEET_CONFIG`, `SYSTEM_CONFIG` |
| **Main.gs** | จุดเริ่มต้น | `doPost()`, `initializeSystem()` |
| **EventHandler.gs** | จัดการ Events | `handleTextMessage()`, `handleFollowEvent()` |
| **LineAPI.gs** | LINE API | `pushSimpleMessage()`, `getUserProfile()` |
| **SheetService.gs** | จัดการ Sheets | `getOrCreateSheet()`, `saveConversation()` |
| **FollowerService.gs** | ผู้ติดตาม | `saveFollower()`, `getFollowerStatistics()` |
| **InsightConfig.gs** | Analytics Config | `INSIGHT_CONFIG`, Column Mappings |
| **InsightService.gs** | ประมวลผลข้อมูล | `syncInsightData()`, `processOverviewData()` |
| **InsightDashboard.gs** | Dashboard | `updateSimpleDashboard()`, `createDetailedReport()` |
| **Utils.gs** | ฟังก์ชันช่วย | `formatDateThai()`, `calculatePercentage()` |

---

## 🌟 คุณสมบัติ

### 1. Message Handling
- รองรับข้อความหลายประเภท (Text, Image, Video, Audio, File, Location, Sticker)
- ระบบ Echo Message (สำหรับโหมด Maintenance)
- Loading Animation
- Quick Reply และ Postback

### 2. Follower Management
- บันทึกข้อมูลผู้ติดตามอัตโนมัติ
- ติดตามสถานะ (Active/Blocked)
- นับจำนวนการโต้ตอบ
- จัดการ Tags
- สถิติผู้ติดตาม

### 3. Analytics
- ประมวลผลข้อมูล LINE Insight
- รายงานภาพรวมรายวัน
- วิเคราะห์การส่งข้อความ
- ประสิทธิภาพ Broadcast
- ช่องทางการเพิ่มเพื่อน

### 4. Dashboard & Reports
- Dashboard อัตโนมัติ
- รายงานรายสัปดาห์/รายเดือน
- ส่งรายงานทาง Email
- Export เป็น PDF

---

## 🚀 การติดตั้ง

### ขั้นตอนที่ 1: สร้าง Google Apps Script Project

1. เปิด [Google Apps Script](https://script.google.com)
2. คลิก "โปรเจ็กต์ใหม่"
3. Copy โค้ดจากแต่ละไฟล์ไปวางในโปรเจ็กต์

### ขั้นตอนที่ 2: ตั้งค่า Configuration

แก้ไขไฟล์ **Config.gs**:

```javascript
// LINE Channel Access Token
CHANNEL_ACCESS_TOKEN: 'YOUR_CHANNEL_ACCESS_TOKEN_HERE'

// Google Spreadsheet ID
SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID_HERE'
```

### ขั้นตอนที่ 3: สร้าง Google Spreadsheet

1. สร้าง Spreadsheet ใหม่
2. Copy Spreadsheet ID จาก URL
3. ใส่ ID ใน `SHEET_CONFIG.SPREADSHEET_ID`

### ขั้นตอนที่ 4: Deploy Web App

1. คลิก "Deploy" > "New deployment"
2. เลือก Type: "Web app"
3. Execute as: "Me"
4. Who has access: "Anyone"
5. Copy Web App URL

### ขั้นตอนที่ 5: ตั้งค่า LINE Webhook

1. เข้า [LINE Developers Console](https://developers.line.biz/)
2. เลือก Channel ของคุณ
3. ไปที่ Messaging API > Webhook settings
4. วาง Web App URL
5. เปิดใช้งาน Webhook

### ขั้นตอนที่ 6: Initialize System

รันฟังก์ชัน:

```javascript
initializeSystem()
```

---

## 💻 การใช้งาน

### การทดสอบระบบ

```javascript
// 1. ทดสอบ Configuration
testConfiguration()

// 2. ทดสอบ LINE API
testLineAPI()

// 3. ทดสอบ Webhook
testWebhook()

// 4. ทดสอบ Sheet Service
testSheetService()

// 5. ทดสอบ Follower Service
testFollowerService()
```

### การ Import ข้อมูล LINE Insight

1. Export ข้อมูลจาก LINE Manager
2. เปิด Sheet "Insight Line"
3. Paste ข้อมูลตั้งแต่แถว 5 ลงไป
4. รันฟังก์ชัน:

```javascript
syncInsightData()
```

### การสร้าง Dashboard

```javascript
// อัพเดท Dashboard
updateSimpleDashboard()

// สร้างรายงานรายสัปดาห์
createDetailedReport('weekly')

// ส่งรายงานทาง Email
emailDashboard('your-email@example.com')
```

### การตั้งค่า Auto-sync

```javascript
// ตั้งค่า Auto-sync รายวัน
setupDailySync()

// ตั้งค่า Auto-update Dashboard
setupDashboardSchedule()

// ดู Triggers ที่มี
viewTriggers()

// ลบ Auto-sync
removeDailySync()
```

---

## 📖 API Reference

### Main Functions

#### `doPost(e)`
Entry point สำหรับ LINE Webhook

**Parameters:**
- `e` (Object): Event object from Google Apps Script

**Returns:**
- `ContentService.TextOutput`: JSON response

---

### LINE API Functions

#### `pushSimpleMessage(userId, text)`
ส่งข้อความข้อความธรรมดา

**Parameters:**
- `userId` (string): LINE User ID
- `text` (string): Message text

**Returns:**
- `boolean`: Success status

**Example:**
```javascript
pushSimpleMessage('U1234567890', 'สวัสดีครับ!');
```

#### `getUserProfile(userId)`
ดึงข้อมูล Profile ของผู้ใช้

**Parameters:**
- `userId` (string): LINE User ID

**Returns:**
- `Object`: User profile object

**Example:**
```javascript
const profile = getUserProfile('U1234567890');
console.log(profile.displayName);
```

---

### Follower Functions

#### `saveFollower(data)`
บันทึกข้อมูลผู้ติดตาม

**Parameters:**
- `data` (Object): Follower data object

**Example:**
```javascript
saveFollower({
  userId: 'U1234567890',
  displayName: 'John Doe',
  status: 'active',
  // ... other fields
});
```

#### `getFollowerStatistics()`
ดึงสถิติผู้ติดตาม

**Returns:**
- `Object`: Statistics object

**Example:**
```javascript
const stats = getFollowerStatistics();
console.log(`Total: ${stats.total}, Active: ${stats.active}`);
```

---

### Analytics Functions

#### `syncInsightData()`
Sync ข้อมูล LINE Insight ทั้งหมด

**Example:**
```javascript
syncInsightData();
```

#### `updateSimpleDashboard()`
อัพเดท Dashboard

**Example:**
```javascript
updateSimpleDashboard();
```

---

## 🧪 การทดสอบ

### Test Suite

รันฟังก์ชันทดสอบทั้งหมด:

```javascript
// 1. Configuration
testConfiguration()

// 2. LINE API
testLineAPI()

// 3. Sheet Service
testSheetService()

// 4. Follower Service
testFollowerService()

// 5. Insight Service
testInsightService()

// 6. Dashboard
testDashboardFunctions()

// 7. Utilities
testUtilityFunctions()
```

### Health Check

ตรวจสอบสถานะระบบ:

```javascript
healthCheck()
```

---

## 🔧 Troubleshooting

### ปัญหา: Webhook ไม่ทำงาน

**สาเหตุที่เป็นไปได้:**
1. Web App URL ไม่ถูกต้อง
2. Webhook ใน LINE Manager ไม่ได้เปิดใช้งาน
3. Permission ไม่ถูกต้อง

**วิธีแก้:**
```javascript
// ตรวจสอบ Configuration
validateConfig()

// ทดสอบ Webhook
testWebhook()
```

### ปัญหา: ไม่สามารถส่งข้อความได้

**วิธีแก้:**
```javascript
// ตรวจสอบ LINE API
testLineAPI()

// ตรวจสอบ Access Token
console.log(LINE_CONFIG.CHANNEL_ACCESS_TOKEN.length)
```

### ปัญหา: Data Sync ไม่สำเร็จ

**วิธีแก้:**
```javascript
// ตรวจสอบข้อมูล
const data = getInsightLineData()
console.log(`Records: ${data.length}`)

// ตรวจสอบ Sheet Structure
validateInsightLineStructure()
```

### ปัญหา: Dashboard ไม่แสดงข้อมูล

**วิธีแก้:**
1. ตรวจสอบว่ามีข้อมูลใน Analytics Sheets
2. รัน `updateSimpleDashboard()` ใหม่
3. ตรวจสอบ Formula ใน Dashboard

---

## 📊 Sheet Structure

### Conversations Sheet
| Column | Description |
|--------|-------------|
| Timestamp | เวลาที่บันทึก |
| User ID | LINE User ID |
| User Message | ข้อความจากผู้ใช้ |
| Response Format | รูปแบบการตอบกลับ |
| Intent | Intent ที่ตรวจจับได้ |

### Followers Sheet
| Column | Description |
|--------|-------------|
| User ID | LINE User ID |
| Display Name | ชื่อที่แสดง |
| Picture URL | URL รูปภาพ |
| Language | ภาษา |
| Status | สถานะ (active/blocked) |
| First Follow Date | วันที่เพิ่มเพื่อนครั้งแรก |
| Last Follow Date | วันที่เพิ่มเพื่อนล่าสุด |
| Follow Count | จำนวนครั้งที่เพิ่มเพื่อน |
| Source Channel | ช่องทางที่เพิ่มเพื่อน |
| Tags | แท็ก |
| Last Interaction | การโต้ตอบล่าสุด |
| Total Messages | จำนวนข้อความทั้งหมด |

---

## 🔐 Security Best Practices

1. **ไม่แชร์ Access Token** - เก็บใน Script Properties หรือ Environment Variables
2. **Validate Webhook** - ตรวจสอบ Signature จาก LINE
3. **Limit Access** - จำกัดสิทธิ์การเข้าถึง Spreadsheet
4. **Regular Backup** - สำรองข้อมูลเป็นประจำ
5. **Monitor Logs** - ตรวจสอบ Logs เป็นประจำ

---

## 📝 License

MIT License - ใช้งานได้ฟรี

---

## 👨‍💻 Author

Created with ❤️ by Your Name

---

## 📞 Support

หากมีปัญหาหรือข้อสงสัย:
- 📧 Email: support@example.com
- 💬 LINE: @yourlineid

---

## 🎉 Credits

- [LINE Messaging API](https://developers.line.biz/)
- [Google Apps Script](https://developers.google.com/apps-script)

---

**Happy Coding! 🚀**
