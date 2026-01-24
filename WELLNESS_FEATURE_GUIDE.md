# Wellness Feature Implementation Guide

## Overview
A complete cycle tracking and wellness feature has been integrated into your Busy Moms Assistant App, accessible through the Family Hub under the new "Wellness" tab.

## What's Included

### 1. Database Tables
Three new tables store cycle tracking data:
- **cycle_data**: Stores current cycle settings (period start date, cycle length, period length)
- **cycle_symptoms**: Tracks daily symptoms with dates
- **cycle_history**: Maintains historical cycle records for pattern analysis

### 2. Components
- **CycleTracker**: Main component with calendar view, symptom logging, and AI-powered insights
- Fully integrated with your existing authentication and dark mode
- Mobile-responsive design matching your app's aesthetic

### 3. AI-Powered Features
The cycle tracker leverages your existing edge function `cycle-tracker` (formerly `cycle-insights-agent`) to provide:
- **Personalized Insights**: Phase-specific advice on energy, mood, nutrition, and exercise
- **Period Prediction**: AI-based predictions for next period with confidence levels
- **Symptom Analysis**: Pattern recognition and management recommendations

### 4. Features
- Interactive calendar with color-coded cycle phases
- Symptom tracking with 10+ common symptoms
- Real-time phase calculation
- Fertility window tracking
- Settings management for cycle and period length
- Data persistence in Supabase

## Setup Instructions

### Step 1: Create Database Tables
Run the SQL script in your Supabase SQL Editor:

1. Go to https://supabase.com/dashboard/project/rtvwcyrksplhsgycyfzo/sql/new
2. Copy and paste the contents of `WELLNESS_SETUP.sql`
3. Click "Run" to create the tables

### Step 2: Verify Edge Function
Your edge function is already deployed at:
```
https://rtvwcyrksplhsgycyfzo.supabase.co/functions/v1/cycle-tracker
```

The function supports three actions:
- `get_insights`: Get personalized cycle insights
- `predict_period`: Predict next period date
- `analyze_symptoms`: Analyze symptom patterns

### Step 3: Test the Feature
1. Navigate to Family Hub in your app
2. Click on the "Wellness" card (pink/rose gradient with heart icon)
3. Set your last period start date in the Settings section
4. Start logging symptoms on any date
5. Use the AI buttons to get insights, predictions, and analysis

## User Flow

1. **Initial Setup**:
   - User clicks "Wellness" in Family Hub
   - Sets last period start date
   - Optionally adjusts cycle length (default: 28 days) and period length (default: 5 days)

2. **Daily Use**:
   - View color-coded calendar showing cycle phases
   - Click any date to log symptoms
   - See current phase, cycle day, and next period prediction

3. **AI Insights**:
   - Click "Get Insights" for personalized recommendations
   - Click "Predict" for next period prediction
   - Click "Analyze" for symptom pattern analysis

## Cycle Phases
The tracker automatically calculates and displays four phases:
- **Period** (Days 1-5): Pink
- **Follicular** (Days 6-13): Teal
- **Ovulation** (Days 14-16): Purple
- **Luteal** (Days 17-28): Blue

## Data Privacy & Security
- All data is stored securely in Supabase with Row Level Security (RLS)
- Users can only access their own cycle data
- No data is shared between users
- All API calls are authenticated

## Navigation Integration
The wellness feature is accessible via:
- Family Hub → Wellness card
- Bottom navigation remains visible for easy app navigation

## Notifications Integration (Future)
The wellness feature is ready to integrate with your planned notification system:
- Period reminders (1-2 days before predicted start)
- Fertility window notifications
- Symptom pattern alerts
- Custom cycle milestone notifications

## Customization Options
Users can customize:
- Cycle length (20-40 days)
- Period length (2-10 days)
- Symptom tracking (10+ predefined symptoms)
- Calendar month navigation

## Technical Details

### Service Layer
`src/services/cycleTrackerService.ts` handles:
- Data CRUD operations
- Edge function calls
- Authentication checks
- Error handling

### State Management
Component uses React hooks for:
- Local state for UI interactions
- Supabase queries for data persistence
- Loading states for AI operations

### API Integration
Edge function calls include:
- Correlation IDs for request tracking
- Proper CORS headers
- Authentication tokens
- Structured error responses

## Testing Checklist
- [ ] Run WELLNESS_SETUP.sql in Supabase SQL Editor
- [ ] Navigate to Wellness from Family Hub
- [ ] Set period start date
- [ ] Log symptoms on multiple dates
- [ ] Test "Get Insights" button
- [ ] Test "Predict" button
- [ ] Test "Analyze" button
- [ ] Verify calendar navigation works
- [ ] Test dark mode compatibility
- [ ] Verify data persists after page refresh

## Troubleshooting

### Issue: Tables don't exist error
**Solution**: Run the SQL script in Supabase SQL Editor

### Issue: Edge function fails
**Solution**: Verify OPENAI_API_KEY is set in Supabase edge function environment variables

### Issue: Calendar doesn't show phases
**Solution**: Make sure period start date is set in Settings

### Issue: Symptoms not saving
**Solution**: Check browser console for authentication errors

## Future Enhancements
Consider adding:
- Export cycle data to PDF/CSV
- Integration with health apps
- Mood tracking with detailed journal
- Water intake and sleep tracking
- Partner/family sharing options
- Medication reminders
- Doctor appointment scheduling
- Health metrics visualization charts
