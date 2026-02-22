/**
 * MongoDB Atlas Trigger Function: Variable Income 24-Hour Fallback
 * 
 * This function is designed to be executed by a MongoDB Atlas Trigger
 * that runs daily to process variable income entries older than 24 hours.
 * 
 * Deployment: Copy this code into MongoDB Atlas App Services
 * Trigger Type: Scheduled
 * Schedule: Daily at a time after all user reminder times (e.g., 00:30 UTC)
 */

exports = async function() {
  const serviceName = "mongodb-atlas"; // Your Atlas service name
  const dbName = context.environment.values.DB_NAME || "moneyssutra";
  
  const db = context.services.get(serviceName).db(dbName);
  const incomeSources = db.collection("income_sources");
  const notifications = db.collection("notifications");
  
  // Get current date in ISO format
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  console.log(`[Atlas Trigger] Running 24-hour fallback check at ${now.toISOString()}`);
  
  // Find all variable income sources that:
  // 1. Are marked as variable (incomeType: "variable")
  // 2. Have a nextDueDate that is today or in the past
  // 3. Have not been recorded today (lastEntryDate is not today)
  // 4. Have an expectedAmount set (fallback value)
  
  const variableIncome = await incomeSources.find({
    incomeType: "variable",
    nextDueDate: { $lte: today },
    lastEntryDate: { $ne: today },
    expectedAmount: { $exists: true, $gt: 0 }
  }).toArray();
  
  console.log(`[Atlas Trigger] Found ${variableIncome.length} variable income sources requiring fallback`);
  
  const results = {
    processed: 0,
    skipped: 0,
    errors: []
  };
  
  for (const income of variableIncome) {
    try {
      // Calculate next due date based on frequency
      let nextDue = new Date(income.nextDueDate);
      switch (income.frequency) {
        case "Daily":
          nextDue.setDate(nextDue.getDate() + 1);
          break;
        case "Weekly":
          nextDue.setDate(nextDue.getDate() + 7);
          break;
        case "Bi-Weekly":
          nextDue.setDate(nextDue.getDate() + 14);
          break;
        case "Monthly":
          nextDue.setMonth(nextDue.getMonth() + 1);
          break;
        case "Quarterly":
          nextDue.setMonth(nextDue.getMonth() + 3);
          break;
        case "Half-Yearly":
          nextDue.setMonth(nextDue.getMonth() + 6);
          break;
        case "Yearly":
          nextDue.setFullYear(nextDue.getFullYear() + 1);
          break;
        default:
          nextDue.setDate(nextDue.getDate() + 1);
      }
      
      const fallbackAmount = income.lastRecordedAmount || income.expectedAmount;
      
      // Update the income source with fallback
      await incomeSources.updateOne(
        { id: income.id },
        {
          $set: {
            currentAmount: fallbackAmount,
            lastEntryDate: today,
            nextDueDate: nextDue.toISOString().split('T')[0]
          }
        }
      );
      
      // Create a notification for the user
      await notifications.insertOne({
        id: new BSON.UUID().toString(),
        userId: income.userId,
        title: "Auto-Recorded Income",
        message: `Fallback amount ₹${fallbackAmount.toLocaleString('en-IN')} was auto-recorded for "${income.name}" as no entry was made within 24 hours.`,
        type: "auto_entry",
        relatedIncomeId: income.id,
        relatedIncomeName: income.name,
        isRead: false,
        actionUrl: `/income/${income.type.toLowerCase()}`,
        createdAt: now.toISOString()
      });
      
      console.log(`[Atlas Trigger] Processed fallback for income: ${income.name} (ID: ${income.id})`);
      results.processed++;
      
    } catch (error) {
      console.error(`[Atlas Trigger] Error processing income ${income.id}: ${error.message}`);
      results.errors.push({ incomeId: income.id, error: error.message });
    }
  }
  
  console.log(`[Atlas Trigger] Completed: ${results.processed} processed, ${results.skipped} skipped, ${results.errors.length} errors`);
  
  return {
    status: "completed",
    timestamp: now.toISOString(),
    ...results
  };
};
