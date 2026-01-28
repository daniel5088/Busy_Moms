import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

function generateBirthdayDates(birthday: string, yearsCount: number = 2): string[] {
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

async function syncMemberBirthdayEvents(
  supabase: any,
  member: any,
  yearsAhead: number = 2
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
      existingEventsResult.data.map((e: any) => e.event_date)
    );

    const allBirthdayDates = generateBirthdayDates(params.birthday, yearsAhead);
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");

    let supabaseClient;
    let targetUserId: string | null = null;
    let isSyncAll = false;

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    if (token === supabaseServiceKey) {
      isSyncAll = true;
      supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    } else {
      supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
        global: {
          headers: { Authorization: authHeader },
        },
      });

      const {
        data: { user },
        error: userError,
      } = await supabaseClient.auth.getUser(token);

      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: "Invalid user token" }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      targetUserId = user.id;
    }

    const url = new URL(req.url);
    const yearsAhead = parseInt(url.searchParams.get("years") || "2", 10);

    let query = supabaseClient.from("family_members").select("*");

    if (!isSyncAll && targetUserId) {
      query = query.eq("user_id", targetUserId);
    }

    const { data: members, error: membersError } = await query;

    if (membersError) {
      console.error("Error fetching family members:", membersError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch family members", details: membersError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const results = {
      totalMembers: members?.length || 0,
      membersWithBirthdays: 0,
      eventsCreated: 0,
      errors: [] as string[],
    };

    if (members && members.length > 0) {
      for (const member of members) {
        if (member.birthday) {
          results.membersWithBirthdays++;
          const syncResult = await syncMemberBirthdayEvents(
            supabaseClient,
            member,
            yearsAhead
          );

          if (syncResult.success) {
            results.eventsCreated += syncResult.eventsCreated;
          } else {
            results.errors.push(`${member.name}: ${syncResult.error || "Unknown error"}`);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        isSyncAll,
        yearsAhead,
        ...results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error in birthday-sync function:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
