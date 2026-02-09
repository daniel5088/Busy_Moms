import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useTheme } from '../../hooks/useTheme';

interface CalendarViewProps {
  selectedDate: string;
  onDayPress: (date: DateData) => void;
  markedDates?: {
    [date: string]: {
      marked?: boolean;
      dotColor?: string;
      selected?: boolean;
      selectedColor?: string;
    };
  };
}

export function CalendarView({ selectedDate, onDayPress, markedDates = {} }: CalendarViewProps) {
  const { theme } = useTheme();

  // Merge selected date with marked dates
  const finalMarkedDates = {
    ...markedDates,
    [selectedDate]: {
      ...markedDates[selectedDate],
      selected: true,
      selectedColor: theme.colors.primary.main,
    },
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.card }]}>
      <Calendar
        current={selectedDate}
        onDayPress={onDayPress}
        markedDates={finalMarkedDates}
        theme={{
          backgroundColor: theme.colors.background.primary,
          calendarBackground: theme.colors.background.card,
          textSectionTitleColor: theme.colors.text.secondary,
          selectedDayBackgroundColor: theme.colors.primary.main,
          selectedDayTextColor: theme.colors.text.inverse,
          todayTextColor: theme.colors.primary.main,
          dayTextColor: theme.colors.text.primary,
          textDisabledColor: theme.colors.text.tertiary,
          dotColor: theme.colors.primary.main,
          selectedDotColor: theme.colors.text.inverse,
          arrowColor: theme.colors.primary.main,
          monthTextColor: theme.colors.text.primary,
          indicatorColor: theme.colors.primary.main,
          textDayFontFamily: 'System',
          textMonthFontFamily: 'System',
          textDayHeaderFontFamily: 'System',
          textDayFontSize: 14,
          textMonthFontSize: 16,
          textDayHeaderFontSize: 12,
        }}
        enableSwipeMonths
        style={styles.calendar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  calendar: {
    paddingBottom: 12,
  },
});
