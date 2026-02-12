import { FamilyMember } from '../lib/supabase';

export function getBirthdayReminderMember(familyMembers: FamilyMember[]): FamilyMember | null {
  if (!familyMembers || familyMembers.length === 0) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const eligibleMembers: Array<{ member: FamilyMember; nextBirthday: Date }> = [];

  for (const member of familyMembers) {
    if (!member.birthday) {
      continue;
    }

    try {
      const birthdayDate = new Date(member.birthday);
      if (isNaN(birthdayDate.getTime())) {
        continue;
      }

      const month = birthdayDate.getMonth();
      const day = birthdayDate.getDate();

      const currentYear = today.getFullYear();
      let nextBirthday = new Date(currentYear, month, day);
      nextBirthday.setHours(0, 0, 0, 0);

      if (nextBirthday <= today) {
        nextBirthday = new Date(currentYear + 1, month, day);
        nextBirthday.setHours(0, 0, 0, 0);
      }

      const diffInMs = nextBirthday.getTime() - today.getTime();
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

      if (diffInDays === 14) {
        eligibleMembers.push({ member, nextBirthday });
      }
    } catch (error) {
      console.error('Error processing birthday for member:', member.name, error);
      continue;
    }
  }

  if (eligibleMembers.length === 0) {
    return null;
  }

  eligibleMembers.sort((a, b) => a.nextBirthday.getTime() - b.nextBirthday.getTime());

  return eligibleMembers[0].member;
}
