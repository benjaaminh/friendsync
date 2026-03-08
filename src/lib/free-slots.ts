export interface TimeSlot {
  start: Date;
  end: Date;
  durationMinutes: number;
}

interface BusyInterval {
  start: Date;
  end: Date;
}

function mergeIntervals(intervals: BusyInterval[]): BusyInterval[] {
  if (intervals.length === 0) return [];

  const sorted = [...intervals].sort(
    (a, b) => a.start.getTime() - b.start.getTime()
  );

  const merged: BusyInterval[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    if (current.start.getTime() <= last.end.getTime()) {
      last.end = new Date(
        Math.max(last.end.getTime(), current.end.getTime())
      );
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

function splitAtMidnights(
  start: Date,
  end: Date,
  timezoneOffset: number
): Array<{ start: Date; end: Date }> {
  const segments: Array<{ start: Date; end: Date }> = [];
  let current = new Date(start.getTime());

  while (current < end) {
    const nextMidnight = new Date(current.getTime());
    nextMidnight.setUTCHours(0, 0, 0, 0);
    nextMidnight.setUTCDate(nextMidnight.getUTCDate() + 1);
    // Adjust for timezone
    nextMidnight.setUTCHours(nextMidnight.getUTCHours() - timezoneOffset);

    const segmentEnd = nextMidnight < end ? nextMidnight : end;
    segments.push({ start: new Date(current.getTime()), end: segmentEnd });
    current = segmentEnd;
  }

  return segments;
}

function clipToReasonableHours(
  slot: { start: Date; end: Date },
  dayStartHour: number,
  dayEndHour: number
): { start: Date; end: Date } | null {
  const startHour =
    slot.start.getUTCHours() + slot.start.getUTCMinutes() / 60;
  const endHour = slot.end.getUTCHours() + slot.end.getUTCMinutes() / 60;

  // Same day check
  const clippedStart = new Date(slot.start.getTime());
  const clippedEnd = new Date(slot.end.getTime());

  if (startHour < dayStartHour) {
    clippedStart.setUTCHours(dayStartHour, 0, 0, 0);
  }
  if (endHour > dayEndHour || (endHour === 0 && slot.end > slot.start)) {
    clippedEnd.setUTCHours(dayEndHour, 0, 0, 0);
    clippedEnd.setUTCFullYear(
      clippedStart.getUTCFullYear(),
      clippedStart.getUTCMonth(),
      clippedStart.getUTCDate()
    );
  }

  if (clippedStart >= clippedEnd) return null;
  return { start: clippedStart, end: clippedEnd };
}

export function computeFreeSlots(
  busySlots: Array<{ start: Date; end: Date }>,
  queryStart: Date,
  queryEnd: Date,
  minDurationMinutes: number = 30,
  dayStartHour: number = 9,
  dayEndHour: number = 23
): TimeSlot[] {
  // Merge all busy intervals
  const merged = mergeIntervals(busySlots);

  // Compute free gaps
  const freeGaps: Array<{ start: Date; end: Date }> = [];

  if (merged.length === 0) {
    freeGaps.push({ start: queryStart, end: queryEnd });
  } else {
    // Gap before first busy
    if (queryStart < merged[0].start) {
      freeGaps.push({ start: queryStart, end: merged[0].start });
    }
    // Gaps between busy intervals
    for (let i = 0; i < merged.length - 1; i++) {
      if (merged[i].end < merged[i + 1].start) {
        freeGaps.push({ start: merged[i].end, end: merged[i + 1].start });
      }
    }
    // Gap after last busy
    if (merged[merged.length - 1].end < queryEnd) {
      freeGaps.push({
        start: merged[merged.length - 1].end,
        end: queryEnd,
      });
    }
  }

  // Split at midnight boundaries and clip to reasonable hours
  const result: TimeSlot[] = [];

  for (const gap of freeGaps) {
    const daySegments = splitAtMidnights(gap.start, gap.end, 0);

    for (const segment of daySegments) {
      const clipped = clipToReasonableHours(
        segment,
        dayStartHour,
        dayEndHour
      );
      if (!clipped) continue;

      const durationMinutes =
        (clipped.end.getTime() - clipped.start.getTime()) / (1000 * 60);
      if (durationMinutes >= minDurationMinutes) {
        result.push({
          start: clipped.start,
          end: clipped.end,
          durationMinutes,
        });
      }
    }
  }

  return result;
}
