export function getAgeFromBirthday(birthday: string | null | undefined): number | null {
  if (!birthday) {
    return null;
  }

  try {
    const birthDate = new Date(birthday);
    const today = new Date();

    if (isNaN(birthDate.getTime())) {
      return null;
    }

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age >= 0 ? age : null;
  } catch (error) {
    console.error('Error calculating age from birthday:', error);
    return null;
  }
}
