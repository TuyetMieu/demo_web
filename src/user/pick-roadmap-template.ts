import { SurveyDto } from './dto/user.dto';

/**
 * Task 72 — chọn roadmap template theo thứ tự ưu tiên:
 *   career_target > language > domain
 * Dùng chung giữa UsersModule (submitSurvey) và RoadmapModule (getRoadmaps).
 */
export function pickRoadmapTemplate(data: SurveyDto): string | null {
  const norm = (v?: string) => v?.trim().toLowerCase() || null;

  return norm(data.career_target) ?? norm(data.language) ?? norm(data.domain);
}
