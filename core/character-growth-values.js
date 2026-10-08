// @editor-module 成长显示值由已发布等级门槛与累计经验计算。

// 等级与经验须处于同一升级区间，超出区间的现场须先完成成长流程。
export function characterGrowthRequiredExperience(document, level, experience) {
  const threshold = document?.experience_thresholds?.find(row => row.current_level === level);
  if (!threshold || !Number.isInteger(experience) || experience < 0
    || experience > threshold.required_total_experience) return null;
  return threshold.required_total_experience - experience;
}
