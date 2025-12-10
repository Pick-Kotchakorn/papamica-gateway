# Function Index - Quick Reference

Quick lookup of all functions in this project.

## Files & Functions Count

| Module | File | Functions |
|--------|------|-----------|
| Configuration | Config.gs | 3 |
| System | Main.gs | 5 |
| Events | EventHandler.gs | 15+ |
| LINE API | LineAPI.gs | 10 |
| Sheets | SheetService.gs | 15 |
| Followers | FollowerService.gs | 12 |
| Analytics Config | InsightConfig.gs | 4 |
| Analytics Processing | InsightService.gs | 8 |
| Dashboard | InsightDashboard.gs | 8 |
| Utilities | Utils.gs | 20+ |

## Most Used Functions

1. **doPost(e)** - Webhook entry point (Main.gs)
2. **pushSimpleMessage()** - Send message (LineAPI.gs)
3. **saveConversation()** - Save chat (SheetService.gs)
4. **saveFollower()** - Save follower (FollowerService.gs)
5. **handleTextMessage()** - Handle text (EventHandler.gs)
6. **handleFollowEvent()** - Handle follow (EventHandler.gs)
7. **syncInsightData()** - Sync analytics (InsightService.gs)
8. **updateSimpleDashboard()** - Update dashboard (InsightDashboard.gs)
9. **getUserProfile()** - Get profile (LineAPI.gs)
10. **getFollowerStatistics()** - Get stats (FollowerService.gs)

## Function by Category

### Setup Functions
- initializeSystem() - Initialize entire system
- initializeSheets() - Initialize sheets
- validateConfig() - Validate configuration
- healthCheck() - System health check

### Message Functions
- pushSimpleMessage() - Send simple message
- pushMessages() - Send multiple messages
- replyMessage() - Reply using token
- sendLoadingAnimation() - Show loading animation

### Data Functions
- saveConversation() - Save conversation
- saveFollower() - Save follower
- getSheetDataAsArray() - Load sheet as array
- updateRow() - Update row
- findRowByValue() - Find row by value

### Analytics Functions
- syncInsightData() - Sync all analytics
- processOverviewData() - Process overview
- processMessagingData() - Process messaging
- updateSimpleDashboard() - Update main dashboard
- createDetailedReport() - Create report

### Test Functions
- testConfiguration() - Test config
- testLineAPI() - Test LINE API
- testSheetService() - Test sheets
- testFollowerService() - Test followers
- testInsightService() - Test analytics
- testUtilityFunctions() - Test utilities

## Search by Use Case

### I want to send a message
\\\javascript
pushSimpleMessage(userId, 'Hello!')
\\\

### I want to save conversation
\\\javascript
saveConversation({
  userId, userMessage, aiResponse, timestamp
})
\\\

### I want to get follower data
\\\javascript
const follower = getFollowerData(userId)
const stats = getFollowerStatistics()
\\\

### I want to sync analytics
\\\javascript
syncInsightData()
updateSimpleDashboard()
\\\

### I want to test the system
\\\javascript
initializeSystem()
healthCheck()
\\\

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design & data flow
- [GAS_README.md](./GAS_README.md) - Google Apps Script details
- [TEST_GUIDE.md](./TEST_GUIDE.md) - Testing guide
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Quick lookup
- [DATA_FLOW_AND_FUNCTION_DOC.md](./DATA_FLOW_AND_FUNCTION_DOC.md) - Detailed data flow

## Tips

1. Use retry() for API calls that might fail
2. Use batchProcess() for large datasets
3. Use logWithTimestamp() for debugging
4. Check TEST_GUIDE.md for how to run test functions

---

Last updated: 2025-12-10
