import { getAgeFromBirthday } from '../../../utils/ageCalculator';

describe('getAgeFromBirthday', () => {
  const mockToday = new Date('2024-06-15');

  beforeEach(() => {
    // Mock Date to ensure consistent test results
    jest.spyOn(global, 'Date').mockImplementation((() => mockToday) as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should calculate age correctly for birthday that has passed this year', () => {
    const birthday = '2010-03-15'; // Birthday in March, current mock date is June
    const age = getAgeFromBirthday(birthday);
    expect(age).toBe(14);
  });

  it('should calculate age correctly for birthday that has not passed this year', () => {
    const birthday = '2010-08-20'; // Birthday in August, current mock date is June
    const age = getAgeFromBirthday(birthday);
    expect(age).toBe(13); // Should still be 13 because birthday hasn't occurred
  });

  it('should calculate age correctly for birthday today', () => {
    const birthday = '2010-06-15'; // Birthday is today
    const age = getAgeFromBirthday(birthday);
    expect(age).toBe(14);
  });

  it('should handle February 29 leap year birthdays', () => {
    const birthday = '2012-02-29'; // Leap year birthday
    const age = getAgeFromBirthday(birthday);
    expect(age).toBe(12);
  });

  it('should return null for null birthday', () => {
    const age = getAgeFromBirthday(null);
    expect(age).toBeNull();
  });

  it('should return null for undefined birthday', () => {
    const age = getAgeFromBirthday(undefined);
    expect(age).toBeNull();
  });

  it('should return null for empty string birthday', () => {
    const age = getAgeFromBirthday('');
    expect(age).toBeNull();
  });

  it('should return null for invalid date string', () => {
    const age = getAgeFromBirthday('not-a-date');
    expect(age).toBeNull();
  });

  it('should handle dates in various formats', () => {
    const age1 = getAgeFromBirthday('2010-01-15');
    expect(age1).toBe(14);

    const age2 = getAgeFromBirthday('2010/01/15');
    expect(age2).toBe(14);
  });

  it('should return null for future dates', () => {
    const age = getAgeFromBirthday('2030-01-15');
    expect(age).toBeNull();
  });

  it('should handle very old dates', () => {
    const age = getAgeFromBirthday('1950-01-15');
    expect(age).toBe(74);
  });

  it('should handle birthday same month but earlier day', () => {
    const birthday = '2010-06-10'; // Earlier in June
    const age = getAgeFromBirthday(birthday);
    expect(age).toBe(14);
  });

  it('should handle birthday same month but later day', () => {
    const birthday = '2010-06-20'; // Later in June
    const age = getAgeFromBirthday(birthday);
    expect(age).toBe(13);
  });
});
