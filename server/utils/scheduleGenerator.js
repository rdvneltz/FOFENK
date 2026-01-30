const ScheduledLesson = require('../models/ScheduledLesson');
const StudentCourseEnrollment = require('../models/StudentCourseEnrollment');

// Turkish public holidays (2024-2025)
const PUBLIC_HOLIDAYS = [
  '2024-01-01', // New Year
  '2024-04-23', // National Sovereignty Day
  '2024-05-01', // Labor Day
  '2024-05-19', // Atatürk Commemoration and Youth and Sports Day
  '2024-06-15', '2024-06-16', '2024-06-17', '2024-06-18', // Ramadan Feast
  '2024-08-22', '2024-08-23', '2024-08-24', '2024-08-25', '2024-08-26', // Sacrifice Feast
  '2024-08-30', // Victory Day
  '2024-10-29', // Republic Day
  '2025-01-01', // New Year
  '2025-03-31', '2025-04-01', '2025-04-02', '2025-04-03', // Ramadan Feast
  '2025-04-23', // National Sovereignty Day
  '2025-05-01', // Labor Day
  '2025-05-19', // Atatürk Commemoration and Youth and Sports Day
  '2025-06-06', '2025-06-07', '2025-06-08', '2025-06-09', '2025-06-10', // Sacrifice Feast
  '2025-08-30', // Victory Day
  '2025-10-29', // Republic Day
];

/**
 * Generate automatic schedule for a course
 * @param {Object} params - Schedule parameters
 * @param {String} params.courseId - Course ID
 * @param {String} params.instructorId - Instructor ID
 * @param {String} params.studentId - Student ID (for one-on-one/birebir lessons)
 * @param {Date} params.startDate - Start date
 * @param {Date} params.endDate - End date
 * @param {Array} params.daysOfWeek - Days of week (0=Sunday, 1=Monday, ..., 6=Saturday)
 * @param {String} params.startTime - Start time (HH:mm format)
 * @param {String} params.endTime - End time (HH:mm format)
 * @param {String} params.frequency - Frequency (weekly, biweekly, monthly)
 * @param {String} params.seasonId - Season ID
 * @param {String} params.institutionId - Institution ID
 * @param {Boolean} params.skipHolidays - Skip public holidays (default: true)
 * @param {String} params.notes - Description/notes for all generated lessons (shown in calendar)
 * @param {String} params.createdBy - User who created the schedule
 */
const generateSchedule = async (params) => {
  const {
    courseId,
    instructorId,
    studentId,
    startDate,
    endDate,
    daysOfWeek,
    startTime,
    endTime,
    frequency = 'weekly',
    seasonId,
    institutionId,
    skipHolidays = true,
    notes,
    createdBy
  } = params;

  // Validate parameters
  if (!courseId || !startDate || !endDate || !daysOfWeek || daysOfWeek.length === 0) {
    throw new Error('Missing required parameters');
  }

  if (!startTime || !endTime) {
    throw new Error('Start time and end time are required');
  }

  if (!seasonId || !institutionId) {
    throw new Error('Season and institution are required');
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  // Normalize both to noon UTC so the comparison is timezone-safe.
  // Without this, a DatePicker value from Turkey (UTC+3) arrives as
  // previous-day 21:00 UTC, and the loop's noon-based currentDate
  // overshoots it — excluding the last day.
  start.setUTCHours(12, 0, 0, 0);
  end.setUTCHours(12, 0, 0, 0);

  if (start >= end) {
    throw new Error('Start date must be before end date');
  }

  // Generate lesson dates
  const lessonDates = [];
  let currentDate = new Date(start);
  let weekCounter = 0;

  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay();

    // Check if this day is in the selected days
    if (daysOfWeek.includes(dayOfWeek)) {
      // Apply frequency filter
      let shouldInclude = false;

      switch (frequency) {
        case 'weekly':
          shouldInclude = true;
          break;
        case 'biweekly':
          shouldInclude = weekCounter % 2 === 0;
          break;
        case 'monthly':
          // Include only the first occurrence in each month
          const isFirstOccurrence = !lessonDates.some(date => {
            const d = new Date(date);
            return d.getMonth() === currentDate.getMonth() &&
                   d.getFullYear() === currentDate.getFullYear() &&
                   d.getDay() === dayOfWeek;
          });
          shouldInclude = isFirstOccurrence;
          break;
        default:
          shouldInclude = true;
      }

      // Check if it's a holiday
      if (shouldInclude && skipHolidays) {
        const dateStr = currentDate.toISOString().split('T')[0];
        shouldInclude = !PUBLIC_HOLIDAYS.includes(dateStr);
      }

      if (shouldInclude) {
        // Create new date with same day, normalized time
        const lessonDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 12, 0, 0, 0);
        lessonDates.push(lessonDate);
      }
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);

    // Track weeks for biweekly frequency
    if (currentDate.getDay() === 0) {
      weekCounter++;
    }
  }

  // Create scheduled lessons
  const createdLessons = [];

  for (const date of lessonDates) {
    const lessonData = {
      course: courseId,
      instructor: instructorId,
      date: date,
      startTime: startTime,
      endTime: endTime,
      status: 'scheduled',
      season: seasonId,
      institution: institutionId,
      createdBy: createdBy,
      notes: notes || ''
    };

    // Add student for one-on-one (birebir) lessons
    if (studentId) {
      lessonData.student = studentId;
    }

    const lesson = new ScheduledLesson(lessonData);

    await lesson.save();
    createdLessons.push(lesson);
  }

  // For birebir (one-on-one) lessons: auto-create enrollment if not exists
  let enrollmentCreated = false;
  if (studentId && createdLessons.length > 0) {
    // Check if enrollment already exists for this student+course+season
    const existingEnrollment = await StudentCourseEnrollment.findOne({
      student: studentId,
      course: courseId,
      season: seasonId
    });

    if (!existingEnrollment) {
      // Create enrollment with first lesson date as enrollment date
      const firstLessonDate = lessonDates[0];
      const newEnrollment = new StudentCourseEnrollment({
        student: studentId,
        course: courseId,
        enrollmentDate: firstLessonDate,
        season: seasonId,
        institution: institutionId,
        isActive: true,
        notes: 'Birebir ders programı ile otomatik oluşturuldu',
        createdBy: createdBy
      });
      await newEnrollment.save();
      enrollmentCreated = true;
    }
  }

  return {
    success: true,
    count: createdLessons.length,
    lessons: createdLessons,
    enrollmentCreated: enrollmentCreated,
    skippedDays: lessonDates.length < calculateMaxPossibleDays(start, end, daysOfWeek)
  };
};

/**
 * Check if instructor has a conflict at the given time
 */
const checkInstructorConflict = async (instructorId, date, startTime, endTime) => {
  if (!instructorId) return false;

  // Set date boundaries (start and end of the day)
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  // Find lessons for this instructor on this day
  const existingLessons = await ScheduledLesson.find({
    instructor: instructorId,
    date: {
      $gte: dayStart,
      $lte: dayEnd
    },
    status: { $ne: 'cancelled' }
  });

  // Check for time overlap
  for (const lesson of existingLessons) {
    if (hasTimeOverlap(startTime, endTime, lesson.startTime, lesson.endTime)) {
      return true;
    }
  }

  return false;
};

/**
 * Check if two time ranges overlap
 */
const hasTimeOverlap = (start1, end1, start2, end2) => {
  const time1Start = timeToMinutes(start1);
  const time1End = timeToMinutes(end1);
  const time2Start = timeToMinutes(start2);
  const time2End = timeToMinutes(end2);

  return (time1Start < time2End && time1End > time2Start);
};

/**
 * Convert time string (HH:mm) to minutes since midnight
 */
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Calculate maximum possible days for the date range and selected days
 */
const calculateMaxPossibleDays = (startDate, endDate, daysOfWeek) => {
  let count = 0;
  const current = new Date(startDate);
  current.setUTCHours(12, 0, 0, 0);
  const last = new Date(endDate);
  last.setUTCHours(12, 0, 0, 0);

  while (current <= last) {
    if (daysOfWeek.includes(current.getDay())) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
};

/**
 * Delete lessons in a date range
 */
const deleteLessonsInRange = async (courseId, startDate, endDate) => {
  const result = await ScheduledLesson.deleteMany({
    course: courseId,
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  });

  return {
    success: true,
    deletedCount: result.deletedCount
  };
};

module.exports = {
  generateSchedule,
  checkInstructorConflict,
  deleteLessonsInRange,
  PUBLIC_HOLIDAYS
};
