# 📖 Function Index - Quick Reference

> ค้นหาฟังก์ชันที่ต้องการได้อย่างรวดเร็ว

---

## 🔍 Quick Search

| หมวดหมู่ | ไฟล์ | จำนวนฟังก์ชัน |
|----------|------|---------------|
| [Configuration](#configuration) | Config.gs | 3 |
| [System](#system) | Main.gs | 5 |
| [Events](#events) | EventHandler.gs | 15+ |
| [LINE API](#line-api) | LineAPI.gs | 10 |
| [Sheets](#sheets) | SheetService.gs | 15 |
| [Followers](#followers) | FollowerService.gs | 12 |
| [Analytics Config](#analytics-config) | InsightConfig.gs | 4 |
| [Analytics Processing](#analytics-processing) | InsightService.gs | 8 |
| [Dashboard](#dashboard) | InsightDashboard.gs | 8 |
| [Utilities](#utilities) | Utils.gs | 20+ |

---

## Configuration

📄 **File:** `Config.gs`

### Constants

```javascript
LINE_CONFIG           // LINE API configuration
SHEET_CONFIG          // Google Sheets configuration
SYSTEM_CONFIG         // System settings & feature flags
```

### Functions

```javascript
getConfig(path)                    // Get configuration value
validateConfig()                   // Validate all configurations
testConfiguration()                // Test configuration setup
```

---

## System

📄 **File:** `Main.gs`

### Core Functions

```javascript
doPost(e)                          // 🔥 Main webhook handler
routeEvent(event)                  // Route events to handlers
createJsonResponse(data)           // Create JSON response
```

### Setup & Monitoring

```javascript
initializeSystem()                 // 🔥 Initialize entire system
healthCheck()                      // Check system health
testWebhook()                      // Test webhook functionality
```

---

## Events

📄 **File:** `EventHandler.gs`

### Event Handlers

```javascript
handleMessageEvent(event)          // 🔥 Main message handler
handlePostbackEvent(event)         // Handle postback
handleFollowEvent(event)           // 🔥 Handle follow
handleUnfollowEvent(event)         // Handle unfollow
handleJoinEvent(event)             // Handle join group
handleLeaveEvent(event)            // Handle leave group
```

### Message Type Handlers

```javascript
handleTextMessage(event)           // 🔥 Text messages
handleImageMessage(event)          // Image messages
handleVideoMessage(event)          // Video messages
handleAudioMessage(event)          // Audio messages
handleFileMessage(event)           // File messages
handleLocationMessage(event)       // Location messages
handleStickerMessage(event)        // Sticker messages
```

---

## LINE API

📄 **File:** `LineAPI.gs`

### Messaging

```javascript
pushSimpleMessage(userId, text)    // 🔥 Send simple message
pushMessages(userId, messages)     // Send multiple messages
replyMessage(replyToken, messages) // Reply using token
sendLoadingAnimation(userId)       // 🔥 Show loading
```

### User Info

```javascript
getUserProfile(userId)             // 🔥 Get user profile
```

### Validation

```javascript
validateMessage(message)           // Validate message object
filterValidMessages(messages)      // Filter valid messages
```

### Testing

```javascript
testLineAPI()                      // Test LINE API connection
```

---

## Sheets

📄 **File:** `SheetService.gs`

### Sheet Management

```javascript
getOrCreateSheet(name, headers)    // 🔥 Get/create sheet
formatSheetHeader(sheet, row)      // Format header row
initializeSheets()                 // 🔥 Initialize all sheets
```

### Data Operations

```javascript
saveConversation(data)             // 🔥 Save conversation
findRowByValue(sheet, col, value)  // Find specific row
updateRow(sheet, rowNum, values)   // Update row
deleteRow(sheet, rowNum)           // Delete row
clearSheetData(sheet)              // Clear all data
```

### Data Retrieval

```javascript
getSheetDataAsArray(sheetName)     // 🔥 Load sheet as array
appendDataArray(sheet, dataArray)  // Append multiple rows
isDuplicateDate(sheet, date)       // Check duplicate date
getSheetStats(sheetName)           // Get sheet statistics
```

### Export

```javascript
exportSheetToCSV(sheetName)        // Export to CSV
```

### Testing

```javascript
testSheetService()                 // Test sheet operations
```

---

## Followers

📄 **File:** `FollowerService.gs`

### Basic Operations

```javascript
saveFollower(data)                 // 🔥 Save follower data
getFollowerData(userId)            // 🔥 Get follower info
updateFollowerStatus(userId, status, timestamp)  // Update status
updateFollowerInteraction(userId)  // 🔥 Update interaction
```

### Queries

```javascript
getActiveFollowers(days)           // Get active followers
getFollowerStatistics()            // 🔥 Get statistics
getFollowersByTag(tag)             // Get by tag
getTopActiveUsers(limit)           // Get top users
```

### Tag Management

```javascript
addTagToFollower(userId, tag)      // Add tag
removeTagFromFollower(userId, tag) // Remove tag
```

### Export

```javascript
exportFollowersToCSV(status)       // Export to CSV
```

### Testing

```javascript
testFollowerService()              // Test follower functions
```

---

## Analytics Config

📄 **File:** `InsightConfig.gs`

### Constants

```javascript
INSIGHT_CONFIG                     // 🔥 Analytics configuration
```

### Functions

```javascript
getInsightColumnIndex(category, field)  // Get column index
validateInsightConfig()            // Validate config
getInsightSheetHeaders(sheetType)  // Get headers
testInsightConfiguration()         // Test configuration
```

---

## Analytics Processing

📄 **File:** `InsightService.gs`

### Main Functions

```javascript
syncInsightData()                  // 🔥 Sync all data
getInsightLineData()               // 🔥 Load raw data
```

### Data Processing

```javascript
processOverviewData(insightData)   // 🔥 Process overview
processMessagingData(insightData)  // Process messaging
processBroadcastData(insightData)  // 🔥 Process broadcasts
processAcquisitionData(insightData)// Process acquisition
processRichMenuData(insightData)   // Process rich menu
```

### Helper Functions

```javascript
getPreviousDayContacts(sheet, date)      // Get previous data
isDuplicateBroadcast(sheet, id, type)    // Check duplicate
```

### Testing

```javascript
testInsightService()               // Test insight functions
```

---

## Dashboard

📄 **File:** `InsightDashboard.gs`

### Dashboard Operations

```javascript
updateSimpleDashboard()            // 🔥 Update main dashboard
createDetailedReport(reportType)   // 🔥 Create report
createWeeklySummary()              // Create summary
```

### Export & Email

```javascript
exportDashboardToPDF()             // Export to PDF
emailDashboard(recipient)          // 🔥 Email report
```

### Scheduling

```javascript
setupDashboardSchedule()           // 🔥 Setup auto-update
removeDashboardSchedule()          // Remove schedule
```

### Testing

```javascript
testDashboardFunctions()           // Test dashboard
```

---

## Utilities

📄 **File:** `Utils.gs`

### Formatting

```javascript
formatDateThai(date, includeTime)  // 🔥 Format Thai date
formatNumber(num)                  // Format with commas
truncateText(text, maxLength)      // Truncate text
```

### Calculation

```javascript
calculatePercentage(part, total, decimals)  // 🔥 Calculate %
```

### Validation

```javascript
isValidEmail(email)                // Validate email
isValidUrl(url)                    // Validate URL
sanitizeString(str)                // Sanitize string
```

### Conversion

```javascript
safeParseFloat(value, default)     // Parse float safely
safeParseInt(value, default)       // Parse int safely
```

### Date & Time

```javascript
getDateRange(days, endDate)        // Get date range
sleep(milliseconds)                // Wait/pause
```

### Objects

```javascript
deepClone(obj)                     // Deep copy object
mergeObjects(...objects)           // Merge objects
```

### Error Handling

```javascript
retry(func, maxRetries, delay)     // 🔥 Retry on error
createErrorResponse(msg, code, details)   // Error response
createSuccessResponse(data, msg)   // Success response
```

### Logging

```javascript
logWithTimestamp(message, level)   // 🔥 Log with time
```

### Batch Processing

```javascript
batchProcess(array, batchSize, processor)  // Process in batches
```

### Misc

```javascript
generateRandomId(length)           // Generate random ID
```

### Testing

```javascript
testUtilityFunctions()             // Test utilities
```

---

## 🔥 Most Used Functions

### Top 10 Essential Functions

| # | Function | File | Purpose |
|---|----------|------|---------|
| 1 | `doPost(e)` | Main.gs | Webhook entry point |
| 2 | `pushSimpleMessage()` | LineAPI.gs | Send message |
| 3 | `saveConversation()` | SheetService.gs | Save chat |
| 4 | `saveFollower()` | FollowerService.gs | Save follower |
| 5 | `handleTextMessage()` | EventHandler.gs | Handle text |
| 6 | `handleFollowEvent()` | EventHandler.gs | Handle follow |
| 7 | `syncInsightData()` | InsightService.gs | Sync analytics |
| 8 | `updateSimpleDashboard()` | InsightDashboard.gs | Update dashboard |
| 9 | `getUserProfile()` | LineAPI.gs | Get profile |
| 10 | `getFollowerStatistics()` | FollowerService.gs | Get stats |

---

## 🎯 Function by Use Case

### Use Case: ส่งข้อความ

```javascript
// Simple message
pushSimpleMessage(userId, 'Hello!')

// Multiple messages
pushMessages(userId, [msg1, msg2, msg3])

// With loading
sendLoadingAnimation(userId)
pushSimpleMessage(userId, 'Response')
```

### Use Case: บันทึกข้อมูล

```javascript
// Save conversation
saveConversation({
  userId, userMessage, aiResponse, intent, timestamp
})

// Save follower
saveFollower({
  userId, displayName, status, ...
})

// Update interaction
updateFollowerInteraction(userId)
```

### Use Case: ดึงข้อมูล

```javascript
// Get follower
const follower = getFollowerData(userId)

// Get statistics
const stats = getFollowerStatistics()

// Get sheet data
const data = getSheetDataAsArray('Conversations')
```

### Use Case: Analytics

```javascript
// Full sync
syncInsightData()

// Update dashboard
updateSimpleDashboard()

// Create report
const report = createDetailedReport('weekly')

// Email report
emailDashboard('email@example.com')
```

### Use Case: Setup & Testing

```javascript
// Initialize
initializeSystem()

// Health check
healthCheck()

// Test components
testConfiguration()
testLineAPI()
testSheetService()
```

---

## 📚 Function Categories

### 🔧 Setup Functions
- `initializeSystem()`
- `initializeSheets()`
- `validateConfig()`
- `healthCheck()`

### 📨 Message Functions
- `pushSimpleMessage()`
- `pushMessages()`
- `replyMessage()`
- `sendLoadingAnimation()`

### 🗄️ Data Functions
- `saveConversation()`
- `saveFollower()`
- `getSheetDataAsArray()`
- `updateRow()`

### 📊 Analytics Functions
- `syncInsightData()`
- `processOverviewData()`
- `updateSimpleDashboard()`
- `createDetailedReport()`

### 🧪 Test Functions
- `test*()` - All test functions
- `healthCheck()`
- `validateConfig()`

---

## 🔍 Search by Action

| I want to... | Use this function |
|-------------|-------------------|
| Send a message | `pushSimpleMessage()` |
| Get user info | `getUserProfile()` |
| Save conversation | `saveConversation()` |
| Track follower | `saveFollower()` |
| Get statistics | `getFollowerStatistics()` |
| Sync analytics | `syncInsightData()` |
| Update dashboard | `updateSimpleDashboard()` |
| Create report | `createDetailedReport()` |
| Send email | `emailDashboard()` |
| Test system | `healthCheck()` |

---

## 💡 Tips & Tricks

### Tip 1: ใช้ retry() สำหรับ API calls
```javascript
retry(() => {
  pushSimpleMessage(userId, 'Hello')
}, 3, 1000)
```

### Tip 2: Batch process large datasets
```javascript
batchProcess(largeArray, 100, (batch) => {
  // Process batch
})
```

### Tip 3: ใช้ logWithTimestamp() เพื่อ debug
```javascript
logWithTimestamp('Processing user: ' + userId, 'INFO')
```

### Tip 4: Validate ก่อนบันทึก
```javascript
if (isValidEmail(email)) {
  // Save
}
```

---

## 📞 Need Help?

**Can't find what you're looking for?**

1. Check [README.md](README.md) for detailed docs
2. See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for setup
3. View [SUMMARY.md](SUMMARY.md) for overview
4. Contact support@example.com

---

**Last Updated:** 2025-01-XX  
**Version:** 2.0.0

---

Legend:  
🔥 = Most commonly used  
📄 = File reference  
🔍 = Search term
