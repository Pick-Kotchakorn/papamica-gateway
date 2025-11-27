# ⚡ Quick Reference Card

> One-page cheat sheet for LINE OA Bot v2.0

---

## 🚀 Installation (3 Steps)

```javascript
// 1. Update Config
LINE_CONFIG.CHANNEL_ACCESS_TOKEN = 'YOUR_TOKEN'
SHEET_CONFIG.SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID'

// 2. Initialize
initializeSystem()

// 3. Deploy & Set Webhook URL
```

---

## 🔥 Most Used Functions

| Action | Function | File |
|--------|----------|------|
| **Send Message** | `pushSimpleMessage(userId, text)` | LineAPI.gs |
| **Get Profile** | `getUserProfile(userId)` | LineAPI.gs |
| **Save Chat** | `saveConversation(data)` | SheetService.gs |
| **Save Follower** | `saveFollower(data)` | FollowerService.gs |
| **Get Stats** | `getFollowerStatistics()` | FollowerService.gs |
| **Sync Data** | `syncInsightData()` | InsightService.gs |
| **Update Dashboard** | `updateSimpleDashboard()` | InsightDashboard.gs |
| **Health Check** | `healthCheck()` | Main.gs |

---

## 📁 File Structure

```
Config.gs           → Settings
Main.gs             → Entry point
EventHandler.gs     → Process events
LineAPI.gs          → LINE API calls
SheetService.gs     → Sheet operations
FollowerService.gs  → Follower management
InsightConfig.gs    → Analytics config
InsightService.gs   → Data processing
InsightDashboard.gs → Reports
Utils.gs            → Helper functions
```

---

## 🎯 Quick Tasks

### Send a Message
```javascript
pushSimpleMessage('U123...', 'Hello!')
```

### Get User Info
```javascript
const profile = getUserProfile('U123...')
console.log(profile.displayName)
```

### Save Data
```javascript
saveConversation({
  userId: 'U123...',
  userMessage: 'Hi',
  aiResponse: 'Hello!',
  intent: 'greeting',
  timestamp: new Date()
})
```

### Get Statistics
```javascript
const stats = getFollowerStatistics()
console.log(`Total: ${stats.total}, Active: ${stats.active}`)
```

### Update Dashboard
```javascript
updateSimpleDashboard()
```

---

## 🧪 Testing

```javascript
// Test everything
testConfiguration()
testLineAPI()
testSheetService()
testFollowerService()
testInsightService()
testDashboardFunctions()
testUtilityFunctions()

// Health check
healthCheck()
```

---

## 🔧 Configuration

```javascript
// LINE API
LINE_CONFIG = {
  CHANNEL_ACCESS_TOKEN: 'YOUR_TOKEN',
  API_ENDPOINTS: {...},
  LOADING_SECONDS: 5
}

// Sheets
SHEET_CONFIG = {
  SPREADSHEET_ID: 'YOUR_ID',
  SHEETS: {...},
  COLUMNS: {...}
}

// System
SYSTEM_CONFIG = {
  FEATURES: {
    DIALOGFLOW_ENABLED: false,
    ANALYTICS_ENABLED: true,
    AUTO_RESPONSE: true,
    FOLLOWER_TRACKING: true
  },
  MESSAGES: {...},
  DEFAULTS: {...}
}
```

---

## 📊 Event Flow

```
LINE → doPost() → routeEvent() → Handler → Process → Save
```

---

## 🗄️ Data Sheets

| Sheet | Purpose |
|-------|---------|
| **Conversations** | Chat history |
| **Followers** | User data |
| **Analytics_Daily** | Daily metrics |
| **Messaging_Stats** | Message stats |
| **Broadcast_Performance** | Broadcast data |
| **Dashboard** | Summary view |

---

## ⚙️ Setup Automation

```javascript
// Auto-update dashboard (daily at 2 AM)
setupDashboardSchedule()

// Email weekly report
emailDashboard('your-email@example.com')
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| **Webhook Error** | `validateConfig()` + Check URL |
| **No Response** | `testLineAPI()` + Check Token |
| **Data Not Saved** | `testSheetService()` + Check Permissions |
| **Analytics Error** | `validateInsightConfig()` + Check Data |

---

## 🔍 Common Patterns

### Send Message with Loading
```javascript
sendLoadingAnimation(userId)
pushSimpleMessage(userId, 'Your response')
```

### Save and Update
```javascript
saveConversation(data)
updateFollowerInteraction(userId)
```

### Error Handling
```javascript
try {
  // Your code
} catch (error) {
  logWithTimestamp(error.message, 'ERROR')
  pushSimpleMessage(userId, 'Error occurred')
}
```

### Retry on Failure
```javascript
retry(() => {
  pushSimpleMessage(userId, 'Message')
}, 3, 1000)
```

---

## 📱 LINE Manager URLs

- **Manager:** https://manager.line.biz/
- **Developers:** https://developers.line.biz/console/
- **Messaging API Docs:** https://developers.line.biz/en/reference/messaging-api/

---

## 🎯 Feature Flags

```javascript
SYSTEM_CONFIG.FEATURES = {
  DIALOGFLOW_ENABLED: false,    // Dialogflow
  ANALYTICS_ENABLED: true,      // Analytics
  AUTO_RESPONSE: true,          // Echo mode
  FOLLOWER_TRACKING: true       // Track users
}
```

---

## 📝 Code Snippets

### Custom Message Handler
```javascript
function handleCustomMessage(event) {
  const userId = event.source.userId
  const text = event.message.text
  
  // Your logic here
  
  pushSimpleMessage(userId, 'Response')
  saveConversation({...})
}
```

### Custom Analytics
```javascript
function processCustomData(data) {
  const sheet = getOrCreateSheet('Custom_Analytics', headers)
  
  data.forEach(row => {
    // Process row
    sheet.appendRow([...])
  })
}
```

---

## 🚨 Important Notes

- ⚠️ Always validate input
- ⚠️ Use try-catch blocks
- ⚠️ Log errors properly
- ⚠️ Test before deploy
- ⚠️ Backup regularly

---

## 📞 Quick Help

- 📚 **Docs:** README.md
- 🚀 **Setup:** DEPLOYMENT_GUIDE.md
- 📊 **Overview:** SUMMARY.md
- 🔍 **Functions:** INDEX.md
- 📧 **Support:** support@example.com

---

## ⌨️ Keyboard Shortcuts

| Action | Keys |
|--------|------|
| **Save** | Ctrl+S / Cmd+S |
| **Run** | Ctrl+R / Cmd+R |
| **Logs** | Ctrl+Enter / Cmd+Enter |
| **Find** | Ctrl+F / Cmd+F |

---

## 🎓 Learning Resources

1. **Beginner:** Read README → Follow DEPLOYMENT_GUIDE
2. **Intermediate:** Study code → Customize features
3. **Advanced:** Add modules → Optimize performance

---

## ✅ Deployment Checklist

- [ ] Get LINE Access Token
- [ ] Create Spreadsheet
- [ ] Update Config.gs
- [ ] Run initializeSystem()
- [ ] Deploy as Web App
- [ ] Set Webhook URL
- [ ] Verify Webhook
- [ ] Send test message
- [ ] Check logs
- [ ] Done! 🎉

---

## 📊 Version Info

- **Version:** 2.0.0
- **Release:** January 2025
- **License:** MIT
- **Status:** Production Ready ✅

---

**Print this page for quick reference! 🖨️**

---

*Keep this card handy while coding!*  
*Last Updated: 2025-01-XX*
