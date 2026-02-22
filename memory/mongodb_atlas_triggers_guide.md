# MongoDB Atlas Triggers Configuration Guide

This guide explains how to set up MongoDB Atlas Triggers for automated financial operations in Moneyssutra.

## Overview

MongoDB Atlas Triggers allow you to run serverless JavaScript functions in response to database events or on a scheduled basis. For Moneyssutra, we need two types of triggers:

1. **Scheduled Trigger**: Daily premium processing and reminders
2. **Database Trigger**: Real-time updates when data changes

---

## Prerequisites

1. A MongoDB Atlas account with an M10+ cluster (triggers require dedicated clusters)
2. Access to Atlas App Services
3. The MongoDB connection string from your cluster

---

## Step 1: Create an Atlas App Services Application

1. Log in to [MongoDB Atlas](https://cloud.mongodb.com)
2. Click **App Services** in the left navigation
3. Click **Create a New App**
4. Select your cluster and give the app a name (e.g., "Moneyssutra-Triggers")
5. Click **Create App Service**

---

## Step 2: Configure Database Access

1. In App Services, go to **Data Access > Rules**
2. Add a rule for the `test_database` database (or your DB_NAME)
3. Set permissions to allow read/write for the following collections:
   - `insurances`
   - `expense_transactions`
   - `income_transactions`
   - `notifications`
   - `income_sources`

---

## Step 3: Create Scheduled Trigger - Daily Premium Processing

This trigger runs daily to check for insurance premiums due and auto-record them as expenses.

### Create the Trigger

1. Go to **Triggers** in App Services
2. Click **Add a Trigger**
3. Configure:
   - **Trigger Type**: Scheduled
   - **Name**: `daily_premium_processor`
   - **Schedule Type**: Advanced
   - **CRON Expression**: `0 0 * * *` (runs at midnight UTC daily)
   - **Function**: Create new function (see below)

### Function Code: `processDuePremiums`

```javascript
exports = async function() {
  const db = context.services.get("mongodb-atlas").db("test_database");
  const today = new Date().toISOString().split('T')[0];
  
  console.log(`Processing premiums for ${today}`);
  
  // Find insurances with autoCreateExpense enabled
  const insurances = await db.collection("insurances").find({
    autoCreateExpense: true,
    premiumPaymentDate: { $exists: true, $ne: null }
  }).toArray();
  
  for (const insurance of insurances) {
    try {
      // Check if premium end date or policy end date has passed
      if (insurance.premiumEndDate && new Date(insurance.premiumEndDate) < new Date()) continue;
      if (insurance.endDate && new Date(insurance.endDate) < new Date()) continue;
      
      const baseDate = new Date(insurance.premiumPaymentDate);
      const currentDate = new Date();
      let isDueToday = false;
      
      // Check if today is a premium due date
      switch (insurance.premiumFrequency) {
        case "One-Time":
          isDueToday = insurance.premiumPaymentDate === today;
          break;
        case "Monthly":
          isDueToday = baseDate.getDate() === currentDate.getDate();
          break;
        case "Quarterly":
          const monthsDiff = (currentDate.getFullYear() - baseDate.getFullYear()) * 12 + 
                            (currentDate.getMonth() - baseDate.getMonth());
          isDueToday = (monthsDiff % 3 === 0) && (baseDate.getDate() === currentDate.getDate());
          break;
        case "Half-Yearly":
          const halfYearDiff = (currentDate.getFullYear() - baseDate.getFullYear()) * 12 + 
                               (currentDate.getMonth() - baseDate.getMonth());
          isDueToday = (halfYearDiff % 6 === 0) && (baseDate.getDate() === currentDate.getDate());
          break;
        case "Yearly":
          isDueToday = (baseDate.getMonth() === currentDate.getMonth()) && 
                       (baseDate.getDate() === currentDate.getDate());
          break;
      }
      
      if (!isDueToday) continue;
      
      // Check if already recorded today
      const existing = await db.collection("expense_transactions").findOne({
        entityId: insurance.id,
        transactionDate: today,
        source: "auto_premium"
      });
      
      if (existing) continue;
      
      // Create expense transaction
      const transaction = {
        id: new BSON.ObjectId().toString(),
        userId: insurance.userId,
        entityId: insurance.id,
        entityName: insurance.policyName,
        category: "Insurance",
        amount: insurance.premiumAmount,
        transactionDate: today,
        notes: `Auto-recorded ${insurance.premiumFrequency} premium for ${insurance.policyName}`,
        source: "auto_premium",
        isLocked: false,
        createdAt: new Date().toISOString()
      };
      
      await db.collection("expense_transactions").insertOne(transaction);
      console.log(`Recorded premium for ${insurance.policyName}`);
      
      // Create notification
      if (insurance.userId) {
        await db.collection("notifications").insertOne({
          id: new BSON.ObjectId().toString(),
          userId: insurance.userId,
          title: `Premium Recorded: ${insurance.policyName}`,
          message: `Your ${insurance.premiumFrequency} premium of ₹${insurance.premiumAmount.toLocaleString()} has been auto-recorded.`,
          type: "premium_recorded",
          relatedInsuranceId: insurance.id,
          actionUrl: `/insurance/${insurance.id}`,
          isRead: false,
          createdAt: new Date().toISOString()
        });
      }
      
    } catch (error) {
      console.error(`Error processing ${insurance.policyName}:`, error);
    }
  }
  
  return { processed: insurances.length };
};
```

---

## Step 4: Create Scheduled Trigger - Hourly Reminders

This trigger sends reminders for variable income entries.

### Create the Trigger

1. Go to **Triggers** in App Services
2. Click **Add a Trigger**
3. Configure:
   - **Trigger Type**: Scheduled
   - **Name**: `hourly_income_reminders`
   - **Schedule Type**: Advanced
   - **CRON Expression**: `0 * * * *` (runs at the top of every hour)
   - **Function**: Create new function (see below)

### Function Code: `sendIncomeReminders`

```javascript
exports = async function() {
  const db = context.services.get("mongodb-atlas").db("test_database");
  const now = new Date();
  const currentTime = now.toISOString().slice(11, 16); // HH:MM format
  const today = now.toISOString().split('T')[0];
  
  console.log(`Checking reminders for time: ${currentTime}`);
  
  // Find variable income sources with reminders set for current time
  const sources = await db.collection("income_sources").find({
    incomeType: "variable",
    reminderTime: currentTime,
    lastEntryDate: { $ne: today }
  }).toArray();
  
  for (const source of sources) {
    try {
      // Check if we already sent a reminder today
      const existing = await db.collection("notifications").findOne({
        userId: source.userId,
        relatedIncomeId: source.id,
        type: "income_reminder",
        createdAt: { $regex: `^${today}` }
      });
      
      if (existing) continue;
      
      // Determine the action URL based on income type
      const typeSlug = (source.type || "job").toLowerCase().replace(/\s+/g, '-');
      const actionUrl = `/${typeSlug}-income/${source.id}`;
      
      // Create notification
      await db.collection("notifications").insertOne({
        id: new BSON.ObjectId().toString(),
        userId: source.userId,
        title: `Time to record ${source.name}`,
        message: source.expectedAmount 
          ? `Hi! It's time to record your ${source.name} income. Expected: ₹${source.expectedAmount.toLocaleString()}`
          : `Hi! It's time to record your ${source.name} income.`,
        type: "income_reminder",
        relatedIncomeId: source.id,
        relatedIncomeName: source.name,
        actionUrl: actionUrl,
        isRead: false,
        createdAt: new Date().toISOString()
      });
      
      console.log(`Sent reminder for ${source.name}`);
      
    } catch (error) {
      console.error(`Error sending reminder for ${source.name}:`, error);
    }
  }
  
  return { reminders_sent: sources.length };
};
```

---

## Step 5: Deploy and Test

1. Click **Review Draft & Deploy** in App Services
2. Test each trigger manually:
   - Go to the trigger
   - Click **Run** to execute immediately
   - Check the logs for any errors

---

## Step 6: Monitoring

1. Go to **Logs** in App Services to view trigger execution logs
2. Set up **Alerts** for failed trigger executions:
   - Go to **Alerts** in Atlas
   - Create an alert for "App Services Trigger Failure"
   - Configure email notifications

---

## Alternative: Using the Built-in Scheduler

If you prefer not to use Atlas Triggers, Moneyssutra includes a built-in background scheduler that runs within the FastAPI backend. This scheduler:

- Checks for due premiums daily at startup and when the date changes
- Sends income reminders every minute based on configured reminder times

The built-in scheduler is enabled by default and requires no additional configuration.

---

## Troubleshooting

### Trigger Not Firing

1. Verify the CRON expression is correct
2. Check that the App Service has proper database permissions
3. Review the logs for any permission errors

### Data Not Appearing

1. Ensure the database name matches your `DB_NAME` environment variable
2. Check that the userId field is being set correctly
3. Verify the collection names match exactly

### Function Timeouts

Atlas Trigger functions have a 60-second timeout. If processing many records, consider:
- Batching the operations
- Increasing the function's memory allocation
- Running more frequently with smaller batches

---

## Support

For issues with Atlas Triggers, refer to:
- [MongoDB Atlas Triggers Documentation](https://www.mongodb.com/docs/atlas/app-services/triggers/)
- [Scheduled Triggers Guide](https://www.mongodb.com/docs/atlas/app-services/triggers/scheduled-triggers/)
