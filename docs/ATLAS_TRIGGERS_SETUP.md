# MongoDB Atlas Triggers Setup Guide

This guide explains how to configure MongoDB Atlas Triggers for the Variable Income feature in Moneyssutra.

## Overview

Two triggers are needed:
1. **Send Reminders Trigger** - Runs hourly to send push notification reminders
2. **Variable Income Fallback Trigger** - Runs daily to auto-record fallback amounts for income not recorded within 24 hours

---

## Step 1: Access MongoDB Atlas App Services

1. Log in to your [MongoDB Atlas Dashboard](https://cloud.mongodb.com)
2. Select your project (the one containing your Moneyssutra cluster)
3. Click **"App Services"** in the left sidebar (or "Realm" in older UI)
4. Click **"Create a New App"** or select an existing App Services application

---

## Step 2: Configure Environment Values

Before creating triggers, set up environment variables:

1. In your App Services app, go to **"Values"** in the left sidebar
2. Click **"Create New Value"**
3. Add the following values:

| Name | Type | Value |
|------|------|-------|
| `DB_NAME` | Value | `moneyssutra` (or your database name) |
| `BACKEND_URL` | Value | `https://expense-nav-update.preview.emergentagent.com` |
| `INTERNAL_API_KEY` | Secret | (Generate a secure key for internal API calls) |

---

## Step 3: Create the Reminder Trigger (Hourly)

1. Go to **"Triggers"** in the left sidebar
2. Click **"Add a Trigger"**
3. Configure as follows:

| Setting | Value |
|---------|-------|
| **Trigger Type** | Scheduled |
| **Name** | `sendVariableIncomeReminders` |
| **Enabled** | ON |
| **Schedule Type** | Basic |
| **Repeat once by** | Hour |
| **At** | 0 (runs at :00 of every hour) |

4. In the **Function** section:
   - Select **"New Function"**
   - Name it: `sendReminders`
   - Copy the contents of `/app/backend/atlas_triggers/send_reminders.js`
   - Paste into the function editor

5. Click **"Save"**

---

## Step 4: Create the Fallback Trigger (Daily)

1. In **"Triggers"**, click **"Add a Trigger"**
2. Configure as follows:

| Setting | Value |
|---------|-------|
| **Trigger Type** | Scheduled |
| **Name** | `processVariableIncomeFallback` |
| **Enabled** | ON |
| **Schedule Type** | Basic |
| **Repeat once by** | Day |
| **At** | 00:30 (runs at 12:30 AM UTC daily) |

4. In the **Function** section:
   - Select **"New Function"**
   - Name it: `variableIncomeFallback`
   - Copy the contents of `/app/backend/atlas_triggers/variable_income_fallback.js`
   - Paste into the function editor

5. Click **"Save"**

---

## Step 5: Test the Triggers

### Manual Test (Recommended for Initial Setup)

1. Go to **"Triggers"** → Select your trigger
2. Click **"Run"** to execute manually
3. Check the **"Logs"** tab for execution results

### Verify Logs

1. Go to **"Logs"** in the left sidebar
2. Filter by **"Triggers"**
3. Check for successful execution messages:
   - `[Atlas Trigger] Running 24-hour fallback check at...`
   - `[Atlas Trigger] Completed: X processed, Y skipped, Z errors`

---

## Trigger Schedule Reference

| Trigger | Schedule | UTC Time | IST Time |
|---------|----------|----------|----------|
| Reminders | Hourly at :00 | Every hour | Every hour |
| Fallback | Daily at 00:30 | 12:30 AM | 6:00 AM |

---

## Troubleshooting

### Trigger Not Firing

1. Ensure the trigger is **Enabled**
2. Check if the schedule is correct (UTC timezone)
3. Verify App Services deployment is active

### Function Errors

1. Check **Logs** for detailed error messages
2. Verify MongoDB connection is working
3. Ensure `DB_NAME` environment value matches your database

### Push Notifications Not Sending

1. Verify `BACKEND_URL` is correct and accessible
2. Check if `INTERNAL_API_KEY` matches your backend configuration
3. Ensure the user has push subscriptions saved

---

## Files Reference

- **Fallback Function**: `/app/backend/atlas_triggers/variable_income_fallback.js`
- **Reminders Function**: `/app/backend/atlas_triggers/send_reminders.js`

---

## Security Notes

1. Keep your `INTERNAL_API_KEY` secret and rotate it periodically
2. The trigger functions only process data - they don't expose any API
3. All user data stays within your MongoDB Atlas cluster

---

## Next Steps After Setup

1. Create a variable income source in the app
2. Set a reminder time
3. Wait for the trigger to fire at the scheduled time
4. Check the Notifications bell in the app for the reminder

For questions or issues, check the MongoDB Atlas documentation or contact support.
