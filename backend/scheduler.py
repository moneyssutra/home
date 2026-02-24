"""Background scheduler for automated tasks - premium processing, income recording, reminders."""
from datetime import datetime, timezone, timedelta
import uuid
import logging
import asyncio

from database import db
from routes.utils import create_notification_and_cleanup

logger = logging.getLogger(__name__)

scheduler_running = False


def stop_scheduler():
    global scheduler_running
    scheduler_running = False


async def check_and_process_due_premiums():
    """Check for insurance premiums due today and auto-record them as expense transactions."""
    try:
        today = datetime.now().strftime("%Y-%m-%d")
        logger.info(f"Checking for due insurance premiums for date: {today}")

        insurances = await db.insurances.find({
            "autoCreateExpense": True,
            "premiumPaymentDate": {"$exists": True, "$ne": None}
        }, {"_id": 0}).to_list(500)

        for insurance in insurances:
            user_id = insurance.get("userId")
            insurance_id = insurance.get("id")
            policy_name = insurance.get("policyName", "Insurance Premium")
            premium_amount = insurance.get("premiumAmount", 0)
            frequency = insurance.get("premiumFrequency", "Yearly")
            payment_date_str = insurance.get("premiumPaymentDate")
            end_date_str = insurance.get("endDate")
            premium_end_date_str = insurance.get("premiumEndDate")

            if not payment_date_str or not premium_amount:
                continue

            if premium_end_date_str:
                premium_end = datetime.strptime(premium_end_date_str, "%Y-%m-%d")
                if datetime.now() > premium_end:
                    continue

            if end_date_str:
                end_date = datetime.strptime(end_date_str, "%Y-%m-%d")
                if datetime.now() > end_date:
                    continue

            base_date = datetime.strptime(payment_date_str, "%Y-%m-%d")
            current_date = datetime.now()
            is_due_today = False

            if frequency == "One-Time":
                is_due_today = payment_date_str == today
            elif frequency == "Monthly":
                is_due_today = base_date.day == current_date.day
            elif frequency == "Quarterly":
                months_diff = (current_date.year - base_date.year) * 12 + (current_date.month - base_date.month)
                is_due_today = (months_diff % 3 == 0) and (base_date.day == current_date.day)
            elif frequency == "Half-Yearly":
                months_diff = (current_date.year - base_date.year) * 12 + (current_date.month - base_date.month)
                is_due_today = (months_diff % 6 == 0) and (base_date.day == current_date.day)
            elif frequency == "Yearly":
                is_due_today = (base_date.month == current_date.month) and (base_date.day == current_date.day)

            if not is_due_today:
                continue

            existing_transaction = await db.expense_transactions.find_one({
                "entityId": insurance_id,
                "transactionDate": today,
                "source": "auto_premium"
            })

            if existing_transaction:
                logger.debug(f"Premium already recorded today for {policy_name}")
                continue

            transaction = {
                "id": str(uuid.uuid4()),
                "userId": user_id,
                "entityId": insurance_id,
                "entityName": policy_name,
                "category": "Insurance",
                "amount": premium_amount,
                "transactionDate": today,
                "notes": f"Auto-recorded {frequency} premium for {policy_name}",
                "source": "auto_premium",
                "isLocked": False,
                "createdAt": datetime.now(timezone.utc).isoformat()
            }

            await db.expense_transactions.insert_one(transaction)
            logger.info(f"Auto-recorded premium transaction for {policy_name}: ₹{premium_amount}")

            if user_id:
                notification = {
                    "id": str(uuid.uuid4()),
                    "userId": user_id,
                    "title": f"Premium Recorded: {policy_name}",
                    "message": f"Your {frequency} premium of ₹{premium_amount:,.0f} for {policy_name} has been auto-recorded as an expense.",
                    "type": "premium_recorded",
                    "relatedInsuranceId": insurance_id,
                    "actionUrl": f"/insurance/{insurance_id}",
                    "isRead": False,
                    "createdAt": datetime.now(timezone.utc).isoformat()
                }
                await create_notification_and_cleanup(notification)

    except Exception as e:
        logger.error(f"Error processing due premiums: {str(e)}")


async def auto_record_fixed_income():
    """Auto-record income transactions for Fixed income sources based on their frequency."""
    try:
        today = datetime.now().strftime("%Y-%m-%d")
        logger.info(f"Checking for fixed income due today: {today}")

        fixed_incomes = await db.income_sources.find({
            "incomeType": "fixed"
        }, {"_id": 0}).to_list(500)

        for income in fixed_incomes:
            user_id = income.get("userId")
            income_id = income.get("id")
            income_name = income.get("name", "Income")
            expected_amount = income.get("expectedAmount", 0)
            frequency = income.get("frequency", "Monthly")
            selected_date = income.get("selectedDate")
            selected_day = income.get("selectedDay")
            selected_month = income.get("selectedMonth")
            custom_date = income.get("customDate")

            if not expected_amount:
                continue

            current_date = datetime.now()
            is_due_today = False

            if frequency == "Daily":
                is_due_today = True
            elif frequency == "Weekly":
                if selected_day:
                    days_of_week = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
                    is_due_today = days_of_week[current_date.weekday()] == selected_day or current_date.strftime("%A") == selected_day
            elif frequency == "Monthly":
                if selected_date:
                    try:
                        base_date = datetime.strptime(selected_date, "%Y-%m-%d") if "-" in selected_date else None
                        if base_date:
                            is_due_today = base_date.day == current_date.day
                        else:
                            is_due_today = int(selected_date) == current_date.day
                    except (ValueError, TypeError):
                        pass
            elif frequency == "Quarterly":
                if selected_date and selected_month:
                    try:
                        months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
                        base_month = months.index(selected_month) if selected_month in months else 0
                        base_date = datetime.strptime(selected_date, "%Y-%m-%d") if "-" in selected_date else None
                        base_day = base_date.day if base_date else int(selected_date)
                        months_diff = (current_date.month - 1 - base_month) % 12
                        is_due_today = (months_diff % 3 == 0) and (base_day == current_date.day)
                    except (ValueError, TypeError, IndexError):
                        pass
            elif frequency == "Half-Yearly":
                if selected_date and selected_month:
                    try:
                        months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
                        base_month = months.index(selected_month) if selected_month in months else 0
                        base_date = datetime.strptime(selected_date, "%Y-%m-%d") if "-" in selected_date else None
                        base_day = base_date.day if base_date else int(selected_date)
                        months_diff = (current_date.month - 1 - base_month) % 12
                        is_due_today = (months_diff % 6 == 0) and (base_day == current_date.day)
                    except (ValueError, TypeError, IndexError):
                        pass
            elif frequency == "Yearly":
                if selected_date and selected_month:
                    try:
                        months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
                        base_month = months.index(selected_month) if selected_month in months else 0
                        base_date = datetime.strptime(selected_date, "%Y-%m-%d") if "-" in selected_date else None
                        base_day = base_date.day if base_date else int(selected_date)
                        is_due_today = (base_month == current_date.month - 1) and (base_day == current_date.day)
                    except (ValueError, TypeError, IndexError):
                        pass
            elif frequency == "Others":
                if custom_date:
                    is_due_today = custom_date == today

            if not is_due_today:
                continue

            existing_transaction = await db.income_transactions.find_one({
                "entityId": income_id,
                "transactionDate": today
            })

            if existing_transaction:
                logger.debug(f"Fixed income already recorded today for {income_name}")
                continue

            transaction = {
                "id": str(uuid.uuid4()),
                "userId": user_id,
                "entityId": income_id,
                "entityName": income_name,
                "incomeAmount": expected_amount,
                "transactionDate": today,
                "type": "Fixed",
                "source": "auto_fixed",
                "notes": f"Auto-recorded {frequency} income",
                "isLocked": False,
                "createdAt": datetime.now(timezone.utc).isoformat()
            }

            await db.income_transactions.insert_one(transaction)
            logger.info(f"Auto-recorded fixed income for {income_name}: ₹{expected_amount}")

            if user_id:
                notification = {
                    "id": str(uuid.uuid4()),
                    "userId": user_id,
                    "title": f"Income Recorded: {income_name}",
                    "message": f"Your {frequency} income of ₹{expected_amount:,.0f} for {income_name} has been auto-recorded.",
                    "type": "auto_entry",
                    "relatedIncomeId": income_id,
                    "relatedIncomeName": income_name,
                    "expectedAmount": expected_amount,
                    "actionUrl": f"/income/{income.get('type', 'business').lower()}/{income_id}",
                    "isRead": False,
                    "createdAt": datetime.now(timezone.utc).isoformat()
                }
                await create_notification_and_cleanup(notification)
                logger.info(f"Created auto-entry notification for {income_name}")

    except Exception as e:
        logger.error(f"Error auto-recording fixed income: {str(e)}")


async def check_and_send_reminders():
    """Background task that runs every minute to check for income reminders."""
    global scheduler_running
    scheduler_running = True
    logger.info("Background reminder scheduler started")

    last_premium_check_date = None

    while scheduler_running:
        try:
            now = datetime.now()
            current_time = now.strftime("%H:%M")
            today = now.strftime("%Y-%m-%d")

            if last_premium_check_date != today:
                logger.info(f"Running daily checks for {today}")
                await check_and_process_due_premiums()
                await auto_record_fixed_income()
                last_premium_check_date = today

            logger.debug(f"Checking reminders for time: {current_time}")

            variable_incomes = await db.income_sources.find({
                "incomeType": "variable",
                "reminderTime": current_time,
                "lastEntryDate": {"$ne": today}
            }, {"_id": 0}).to_list(100)

            for source in variable_incomes:
                user_id = source.get("userId")
                source_id = source.get("id")
                source_name = source.get("name", "Income")
                source_type = source.get("type", "job").lower().replace(' ', '-')
                expected_amount = source.get("expectedAmount", 0)

                existing_notification = await db.notifications.find_one({
                    "userId": user_id,
                    "relatedIncomeId": source_id,
                    "type": "income_reminder",
                    "createdAt": {"$regex": f"^{today}"}
                })

                if existing_notification:
                    logger.debug(f"Reminder already sent today for {source_name}")
                    continue

                action_url = f"/{source_type}-income/{source_id}"
                notification = {
                    "id": str(uuid.uuid4()),
                    "userId": user_id,
                    "title": f"Time to record {source_name}",
                    "message": f"Hi! It's time to record your {source_name} income. Expected: ₹{expected_amount:,.0f}" if expected_amount else f"Hi! It's time to record your {source_name} income.",
                    "type": "income_reminder",
                    "relatedIncomeId": source_id,
                    "relatedIncomeName": source_name,
                    "actionUrl": action_url,
                    "isRead": False,
                    "createdAt": datetime.now(timezone.utc).isoformat()
                }

                await create_notification_and_cleanup(notification)
                logger.info(f"Sent reminder notification for {source_name} to user {user_id}")

        except Exception as e:
            logger.error(f"Error in reminder scheduler: {str(e)}")

        # Weekly gamification processing - Sunday at 23:59
        if now.weekday() == 6 and current_time == "23:59":
            await run_weekly_gamification()

        await asyncio.sleep(60)


async def run_weekly_gamification():
    """Run weekly gamification processing for all users."""
    try:
        logger.info("Running weekly gamification processing...")
        users = await db.users.find({}, {"_id": 0, "user_id": 1}).to_list(10000)
        from routes.intelligence import (
            _get_liquid_funds, _get_monthly_mandatory_expense,
            _get_monthly_income, _get_monthly_discretionary_spending, _get_total_emi
        )
        from routes.gamification import _get_level, _get_or_create_profile, _unlock_achievement, ACHIEVEMENTS, STREAK_REWARDS

        for user_doc in users:
            user_id = user_doc.get("user_id")
            if not user_id:
                continue
            try:
                user_filter = {"userId": user_id}
                profile = await _get_or_create_profile(user_id)

                liquid_funds = await _get_liquid_funds(user_filter)
                monthly_mandatory = await _get_monthly_mandatory_expense(user_filter)
                monthly_income = await _get_monthly_income(user_filter)
                total_emi = await _get_total_emi(user_filter)

                daily_expense = monthly_mandatory / 30 if monthly_mandatory > 0 else 0
                survival_days = int(liquid_funds / daily_expense) if daily_expense > 0 else 999

                debt_ratio = total_emi / monthly_income if monthly_income > 0 else 1.0
                cash_ratio = (monthly_income - await _get_monthly_discretionary_spending(user_filter)) / monthly_income if monthly_income > 0 else 0

                cash_score = 25 if cash_ratio > 0.40 else (18 if cash_ratio > 0.25 else (10 if cash_ratio > 0.10 else 5))
                debt_score = 25 if debt_ratio < 0.25 else (18 if debt_ratio < 0.40 else (10 if debt_ratio < 0.60 else 5))
                liquidity_score = 25 if survival_days > 180 else (18 if survival_days > 90 else (10 if survival_days > 30 else 5))
                score = cash_score + debt_score + liquidity_score + 25

                high_alerts = await db.alerts.count_documents({
                    "userId": user_id, "severity": "HIGH",
                    "created_at": {"$gte": (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()}
                })

                xp_earned = 0
                if score > 85:
                    xp_earned += 40
                elif score > 70:
                    xp_earned += 20
                if high_alerts == 0:
                    xp_earned += 15

                current_streak = profile.get("current_streak", 0)
                if score >= 70 and high_alerts == 0:
                    current_streak += 1
                else:
                    current_streak = 0

                longest_streak = max(profile.get("longest_streak", 0), current_streak)
                for weeks, bonus in STREAK_REWARDS.items():
                    if current_streak == weeks:
                        xp_earned += bonus

                new_xp = profile.get("xp", 0) + xp_earned

                await db.user_gamification_profile.update_one(
                    {"user_id": user_id},
                    {"$set": {
                        "xp": new_xp,
                        "level": _get_level(new_xp)["title"],
                        "current_streak": current_streak,
                        "longest_streak": longest_streak,
                        "last_score": score,
                        "last_survival_days": survival_days,
                        "last_processed_at": datetime.now(timezone.utc).isoformat()
                    }},
                    upsert=True
                )

                # Weekly summary notification
                notification = {
                    "id": str(uuid.uuid4()),
                    "userId": user_id,
                    "title": "Weekly Financial Summary",
                    "message": f"Score: {score} | Survival: {survival_days} days | Streak: {current_streak}w | +{xp_earned} XP",
                    "type": "weekly_summary",
                    "isRead": False,
                    "createdAt": datetime.now(timezone.utc).isoformat()
                }
                await create_notification_and_cleanup(notification)

                logger.info(f"Weekly gamification processed for user {user_id}: score={score}, xp=+{xp_earned}")
            except Exception as e:
                logger.error(f"Error processing gamification for user {user_id}: {str(e)}")

        logger.info("Weekly gamification processing complete")
    except Exception as e:
        logger.error(f"Error in weekly gamification: {str(e)}")
