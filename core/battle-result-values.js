// @editor-module 战斗引擎按敌方死亡实例累计已装载的奖励字段。

const unavailable = reason => ({status: 'unavailable', reason});
const unsigned = (value, max) => Number.isInteger(value) && value >= 0 && value <= max;

/** AE42/AE5C 的输入为初始化后各敌方实例的经验与金钱，逃离与替换不产生奖励。 */
export function battleResultRewardTotals(deaths) {
  if (!Array.isArray(deaths)) return unavailable('缺少本次敌方死亡结算');
  let experience = 0, gold = 0;
  const settled = new Set();
  for (const death of deaths) {
    if (typeof death?.instance !== 'string' || !death.instance || settled.has(death.instance)
        || !unsigned(death.experience, 65535) || !unsigned(death.gold, 65535))
      return unavailable('敌方死亡结算缺少实例、重复结算或奖励字段');
    settled.add(death.instance);
    experience = Math.min(65535, experience + death.experience);
    gold = (gold + death.gold) % 16777216;
  }
  return {status: 'available', experience, gold};
}
