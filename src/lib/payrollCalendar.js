export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export const MONTH_SHORT_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

export const WEEKDAYS_MON_FIRST = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/**
 * Calculates total days, Sundays, and working days (excluding Sundays) for a given month & year.
 * @param {number} year - Full year (e.g. 2026)
 * @param {number} monthIndex - 0-indexed month (0 = January, 11 = December)
 */
export function calculateMonthWorkingDays(year, monthIndex) {
  const safeYear = Number(year) || new Date().getFullYear()
  const safeMonth = Math.max(0, Math.min(11, Number(monthIndex) || 0))

  // Total days in month (passing 0 as day to next month gives last day of target month)
  const totalDays = new Date(safeYear, safeMonth + 1, 0).getDate()

  const sundayDates = []
  const calendarDays = []

  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(safeYear, safeMonth, day)
    const dayOfWeek = date.getDay() // 0 = Sunday, 1 = Monday, ...
    const isSunday = dayOfWeek === 0

    if (isSunday) {
      sundayDates.push(day)
    }

    const pad = n => String(n).padStart(2, '0')
    calendarDays.push({
      dayNumber: day,
      dateString: `${safeYear}-${pad(safeMonth + 1)}-${pad(day)}`,
      dayOfWeek,
      isSunday,
      isWorkingDay: !isSunday
    })
  }

  // Calculate start offset for a Monday-first calendar grid
  // In JS getDay(): 0 is Sunday, 1 is Monday, ..., 6 is Saturday.
  // We want Monday = 0, Tuesday = 1, ..., Sunday = 6
  const firstDayJs = new Date(safeYear, safeMonth, 1).getDay()
  const startDayOffset = (firstDayJs + 6) % 7

  const sundaysCount = sundayDates.length
  const workingDays = totalDays - sundaysCount

  return {
    year: safeYear,
    monthIndex: safeMonth,
    monthName: MONTH_NAMES[safeMonth],
    monthShortName: MONTH_SHORT_NAMES[safeMonth],
    monthLabel: `${MONTH_NAMES[safeMonth]} ${safeYear}`,
    totalDays,
    sundaysCount,
    sundayDates,
    workingDays,
    startDayOffset,
    calendarDays
  }
}

/**
 * Generates exact calendar week ranges for any given month & year.
 * Week 1 starts on Day 1 of the month and ends on the first Saturday.
 * Subsequent weeks start on Monday (skipping Sunday) and end on Saturday or the month's end.
 * @param {number} year - Full year (e.g. 2026)
 * @param {number} monthIndex - 0-indexed month (0 = Jan, 9 = Oct)
 */
export function getCalendarWeeksForMonth(year, monthIndex) {
  const safeYear = Number(year) || new Date().getFullYear()
  const safeMonth = Math.max(0, Math.min(11, Number(monthIndex) || 0))
  const lastDay = new Date(safeYear, safeMonth + 1, 0).getDate()
  const weeks = []
  let currentStart = 1
  let weekNum = 1

  while (currentStart <= lastDay) {
    // If start day is Sunday, move to Monday
    const startDate = new Date(safeYear, safeMonth, currentStart)
    if (startDate.getDay() === 0) {
      currentStart += 1
      if (currentStart > lastDay) break
    }

    const startDay = currentStart
    let endDay = currentStart

    // Find the next Saturday or last day of month
    while (endDay < lastDay) {
      const d = new Date(safeYear, safeMonth, endDay)
      if (d.getDay() === 6) { // Saturday
        break
      }
      endDay += 1
    }

    const pad = n => String(n).padStart(2, '0')
    weeks.push({
      weekNum,
      label: `Week ${weekNum}`,
      dayFrom: startDay,
      dayTo: endDay,
      dateFrom: `${safeYear}-${pad(safeMonth + 1)}-${pad(startDay)}`,
      dateTo: `${safeYear}-${pad(safeMonth + 1)}-${pad(endDay)}`
    })

    weekNum += 1
    currentStart = endDay + 1
  }
  return weeks
}

/**
 * Generates an array of years around the reference year.
 */
export function getYearsRange(referenceYear = new Date().getFullYear(), backYears = 2, forwardYears = 5) {
  const start = referenceYear - backYears
  const end = referenceYear + forwardYears
  const years = []
  for (let y = start; y <= end; y++) {
    years.push(y)
  }
  return years
}
