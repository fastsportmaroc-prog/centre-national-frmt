"use server";

import { revalidateStageLinkedPaths } from "@/lib/server/revalidate-stage-paths";
import { loadCalendarMonthData, type CalendarLoadResult } from "@/lib/v2/calendar-load";

export async function refreshCalendarDataAction(
  cursorIso: string,
  view: "year" | "month" | "week" | "day"
): Promise<CalendarLoadResult> {
  const cursor = new Date(cursorIso);
  return loadCalendarMonthData(cursor, view);
}

export async function revalidateCalendarAfterStageAction(stageId?: string): Promise<void> {
  revalidateStageLinkedPaths(stageId);
}
