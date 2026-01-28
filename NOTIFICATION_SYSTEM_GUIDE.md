# Notification System Guide

## Overview

The BusyMoms app now features a comprehensive web push notification system that sends timely reminders for events, tasks, reminders, shopping alerts, wellness check-ins, and birthday notifications.

## Features

- **Web Push Notifications**: Browser-based notifications that work even when the tab is in the background
- **Granular Controls**: Enable/disable notifications by type (events, reminders, tasks, shopping, wellness, birthdays)
- **Customizable Timing**: Set default reminder times for events (5 min to 1 day before)
- **Quiet Hours**: Configure time periods when notifications are suppressed
- **Sound Control**: Toggle notification sounds on/off
- **Automatic Scheduling**: Notifications are automatically scheduled when creating or updating items

## Database Schema

### notification_settings Table
Stores user notification preferences:
- `events_enabled`, `reminders_enabled`, `tasks_enabled`, etc.
- `default_event_reminder_minutes`: Default time before events to notify
- `quiet_hours_start`, `quiet_hours_end`: Quiet hours configuration
- `notification_sound_enabled`: Sound preference

### notification_queue Table
Stores scheduled and sent notifications:
- `notification_type`: event, reminder, task, shopping, wellness, birthday
- `scheduled_for`: When to send the notification
- `status`: pending, sent, failed, cancelled
- `related_id`, `related_table`: Links to the source item

## Using the Notification System

### Accessing Settings

1. Navigate to **Settings** from the More menu
2. Find the **Notifications** section
3. Click **Configure** on "Notification Settings"
4. Enable browser notifications when prompted

### Configuring Preferences

**Notification Types:**
- Toggle each notification type on/off
- Event Reminders, Reminders, Tasks, Shopping, Wellness, Birthdays

**Event Reminder Timing:**
- Choose default time before events: 5min, 10min, 15min, 30min, 1hr, 2hrs, or 1 day
- This applies to all new events

**Quiet Hours:**
- Set start and end times to suppress notifications
- Example: 10:00 PM to 7:00 AM

**Sound:**
- Toggle notification sounds on/off

### How It Works

**Events:**
- When you create/update an event with a date and time, a notification is automatically scheduled
- Notification is sent at the configured time before the event (default: 15 minutes)
- Editing an event cancels the old notification and schedules a new one

**Reminders:**
- Notifications are sent at the exact reminder date/time
- If no time is specified, defaults to 9:00 AM

**Tasks:**
- Notifications are sent 1 hour before the task due date/time
- If no time is specified, defaults to 9:00 AM

**Birthdays:**
- Birthday notifications are sent at 9:00 AM on the birthday
- Automatically scheduled when family members have birthdays

## Technical Details

### Services

**notificationService.ts**
- Main service handling notification scheduling, permission requests, and delivery
- Methods:
  - `getSettings()`: Get user notification settings
  - `updateSettings()`: Update notification preferences
  - `scheduleNotification()`: Schedule a new notification
  - `cancelNotification()`: Cancel a notification
  - `showBrowserNotification()`: Display browser notification
  - `checkAndShowNotifications()`: Check for pending notifications

### Hooks

**useNotificationManager**
- React hook providing notification functionality to components
- Initializes notification checker on mount
- Provides methods for scheduling notifications for different types

### Integration Points

**EventForm** (`src/components/forms/EventForm.tsx`)
- Schedules event notifications when saving events
- Cancels old notifications when updating events

**ReminderForm** (`src/components/forms/ReminderForm.tsx`)
- Schedules reminder notifications when saving
- Updates notifications when editing

**TaskForm** (`src/components/forms/TaskForm.tsx`)
- Schedules task notifications with due dates
- Manages notification updates

**App.tsx**
- Initializes notification manager on app load
- Starts background notification checker

## Notification Checker

The system runs a background checker every 60 seconds to:
1. Query pending notifications that are due
2. Check if user is in quiet hours
3. Display browser notifications for eligible items
4. Mark notifications as sent or failed

## Permission Handling

**First Time Setup:**
1. User accesses notification settings
2. System prompts for browser notification permission
3. User grants/denies permission

**Permission States:**
- `default`: Not yet asked
- `granted`: Notifications allowed
- `denied`: User blocked notifications

If denied, users must enable notifications in browser settings manually.

## Best Practices

1. **Request Permission Early**: Prompt users during onboarding or first Settings visit
2. **Test Notifications**: Use the "Configure" button to test notification settings
3. **Set Quiet Hours**: Recommend users configure quiet hours for better UX
4. **Check Permission**: Before scheduling, verify notification permission is granted

## Troubleshooting

**Notifications Not Showing:**
- Check browser notification permission in browser settings
- Verify notification type is enabled in app settings
- Check if current time is in quiet hours
- Ensure browser supports notifications (all modern browsers do)

**Notification Too Early/Late:**
- Adjust default event reminder time in settings
- Check that event time is set correctly

**No Sound:**
- Verify sound is enabled in notification settings
- Check browser notification sound settings
- Check device volume

## Future Enhancements

Possible additions:
- Push notifications via service worker for offline support
- Notification history/log
- Snooze functionality
- Multiple reminder times per event
- Custom notification sounds
- Priority-based notification filtering
- Daily digest notifications
