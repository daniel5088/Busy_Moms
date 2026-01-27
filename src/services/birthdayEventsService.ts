import { supabase, type FamilyMember, type Event } from '../lib/supabase';

interface BirthdayEventParams {
  memberId: string;
  userId: string;
  name: string;
  birthday: string;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function getNextBirthdayDate(birthday: string, startYear: number): string {
  const [, month, day] = birthday.split('-');
  const monthNum = parseInt(month, 10);
  const dayNum = parseInt(day, 10);

  if (monthNum === 2 && dayNum === 29 && !isLeapYear(startYear)) {
    return `${startYear}-02-28`;
  }

  return `${startYear}-${month}-${day}`;
}

function generateBirthdayDates(birthday: string, yearsCount: number): string[] {
  const today = new Date();
  const currentYear = today.getFullYear();
  const [, month, day] = birthday.split('-');

  const thisYearBirthday = new Date(currentYear, parseInt(month, 10) - 1, parseInt(day, 10));
  const startYear = thisYearBirthday >= today ? currentYear : currentYear + 1;

  const dates: string[] = [];
  for (let i = 0; i < yearsCount; i++) {
    const year = startYear + i;
    dates.push(getNextBirthdayDate(birthday, year));
  }

  return dates;
}

export async function createBirthdayEventsForNext100Years(
  member: FamilyMember
): Promise<{ success: boolean; eventsCreated: number; error?: string }> {
  try {
    if (!member.birthday) {
      return { success: true, eventsCreated: 0 };
    }

    if (!member.id || !member.user_id || !member.name) {
      return { success: false, eventsCreated: 0, error: 'Invalid member data' };
    }

    const params: BirthdayEventParams = {
      memberId: member.id,
      userId: member.user_id,
      name: member.name,
      birthday: member.birthday,
    };

    const existingEventsResult = await supabase
      .from('events')
      .select('description, event_date')
      .eq('user_id', params.userId)
      .like('description', `birthday:${params.memberId}:%`);

    if (existingEventsResult.error) {
      console.error('Error fetching existing birthday events:', existingEventsResult.error);
      return {
        success: false,
        eventsCreated: 0,
        error: existingEventsResult.error.message,
      };
    }

    const existingEventDates = new Set(
      existingEventsResult.data.map((e) => e.event_date)
    );

    const allBirthdayDates = generateBirthdayDates(params.birthday, 100);
    const datesToCreate = allBirthdayDates.filter(
      (date) => !existingEventDates.has(date)
    );

    if (datesToCreate.length === 0) {
      return { success: true, eventsCreated: 0 };
    }

    const eventsToInsert = datesToCreate.map((date) => {
      const year = date.split('-')[0];
      return {
        user_id: params.userId,
        title: `🎂 ${params.name}'s Birthday`,
        description: `birthday:${params.memberId}:${year}`,
        event_date: date,
        start_time: null,
        end_time: null,
        event_type: 'family',
        source: 'birthday',
        location: '',
        participants: [],
        rsvp_required: false,
        rsvp_status: 'pending',
      };
    });

    const insertResult = await supabase.from('events').insert(eventsToInsert);

    if (insertResult.error) {
      console.error('Error inserting birthday events:', insertResult.error);
      return {
        success: false,
        eventsCreated: 0,
        error: insertResult.error.message,
      };
    }

    return { success: true, eventsCreated: datesToCreate.length };
  } catch (error) {
    console.error('Unexpected error creating birthday events:', error);
    return {
      success: false,
      eventsCreated: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function updateBirthdayEvents(
  member: FamilyMember,
  oldBirthday: string | null
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    if (!member.id || !member.user_id) {
      return { success: false, error: 'Invalid member data' };
    }

    const today = new Date().toISOString().split('T')[0];

    if (oldBirthday) {
      const deleteResult = await supabase
        .from('events')
        .delete()
        .eq('user_id', member.user_id)
        .like('description', `birthday:${member.id}:%`)
        .gte('event_date', today);

      if (deleteResult.error) {
        console.error('Error deleting old birthday events:', deleteResult.error);
        return {
          success: false,
          error: `Failed to delete old events: ${deleteResult.error.message}`,
        };
      }
    }

    if (member.birthday) {
      const createResult = await createBirthdayEventsForNext100Years(member);
      if (!createResult.success) {
        return {
          success: false,
          error: createResult.error || 'Failed to create new birthday events',
        };
      }

      return {
        success: true,
        message: `Birthday events updated successfully. Created ${createResult.eventsCreated} events.`,
      };
    }

    return { success: true, message: 'Old birthday events removed successfully.' };
  } catch (error) {
    console.error('Unexpected error updating birthday events:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
