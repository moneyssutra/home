/**
 * MongoDB Atlas Trigger Function: Send Variable Income Reminders
 * 
 * This function is designed to be executed by a MongoDB Atlas Trigger
 * that runs hourly to send push notification reminders for variable income.
 * 
 * Deployment: Copy this code into MongoDB Atlas App Services
 * Trigger Type: Scheduled
 * Schedule: Every hour at :00 (e.g., 0 * * * *)
 */

exports = async function() {
  const serviceName = "mongodb-atlas"; // Your Atlas service name
  const dbName = context.environment.values.DB_NAME || "moneyssutra";
  
  const db = context.services.get(serviceName).db(dbName);
  const incomeSources = db.collection("income_sources");
  const pushSubscriptions = db.collection("push_subscriptions");
  const notifications = db.collection("notifications");
  
  // Get current time
  const now = new Date();
  const currentHour = now.getUTCHours().toString().padStart(2, '0');
  const today = now.toISOString().split('T')[0];
  
  console.log(`[Atlas Trigger] Running reminder check at ${now.toISOString()} (Hour: ${currentHour})`);
  
  // Find variable income sources that:
  // 1. Have reminders enabled (reminderTime is set)
  // 2. The reminder time matches current hour
  // 3. Due date is today
  // 4. Not already recorded today
  
  const dueIncome = await incomeSources.find({
    incomeType: "variable",
    reminderTime: { $regex: `^${currentHour}:` }, // Matches "HH:MM" format
    nextDueDate: today,
    lastEntryDate: { $ne: today }
  }).toArray();
  
  console.log(`[Atlas Trigger] Found ${dueIncome.length} income sources due for reminder`);
  
  const results = {
    reminders_sent: 0,
    notifications_created: 0,
    errors: []
  };
  
  for (const income of dueIncome) {
    try {
      // Create in-app notification
      await notifications.insertOne({
        id: new BSON.UUID().toString(),
        userId: income.userId,
        title: "Income Entry Reminder",
        message: `Time to record your ${income.name} income! Expected: ₹${income.expectedAmount?.toLocaleString('en-IN') || 'N/A'}`,
        type: "income_reminder",
        relatedIncomeId: income.id,
        relatedIncomeName: income.name,
        isRead: false,
        actionUrl: `/income/${income.type.toLowerCase()}`,
        createdAt: now.toISOString()
      });
      results.notifications_created++;
      
      // Get user's push subscriptions
      const subscriptions = await pushSubscriptions.find({
        userId: income.userId
      }).toArray();
      
      // Note: Actual push notification sending requires VAPID keys and pywebpush
      // This would typically be done via an HTTP endpoint call to your backend
      // For Atlas triggers, you can use an HTTP service to call your API:
      
      if (subscriptions.length > 0) {
        // Call your backend API to send push notification
        const backendUrl = context.environment.values.BACKEND_URL || "https://financial-shock.preview.emergentagent.com";
        
        try {
          const response = await context.http.post({
            url: `${backendUrl}/api/internal/send-push`,
            headers: {
              "Content-Type": ["application/json"],
              "X-Internal-Key": [context.environment.values.INTERNAL_API_KEY || ""]
            },
            body: JSON.stringify({
              userId: income.userId,
              title: "Income Entry Reminder",
              body: `Time to record your ${income.name} income!`,
              url: `/income/${income.type.toLowerCase()}`
            })
          });
          
          if (response.statusCode === 200) {
            results.reminders_sent++;
            console.log(`[Atlas Trigger] Push notification sent for income: ${income.name}`);
          }
        } catch (pushError) {
          console.log(`[Atlas Trigger] Push notification failed: ${pushError.message}`);
          // Continue even if push fails - in-app notification is already created
        }
      }
      
    } catch (error) {
      console.error(`[Atlas Trigger] Error processing reminder for ${income.id}: ${error.message}`);
      results.errors.push({ incomeId: income.id, error: error.message });
    }
  }
  
  console.log(`[Atlas Trigger] Completed: ${results.notifications_created} notifications, ${results.reminders_sent} push sent, ${results.errors.length} errors`);
  
  return {
    status: "completed",
    timestamp: now.toISOString(),
    ...results
  };
};
