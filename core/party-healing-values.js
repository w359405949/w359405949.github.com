// @editor-module 人物回复服务按已确认的字节加法计算 HP 与消息量。
export function partyHealingBase(document, item) {
  if (item !== 0xD1) return document?.records?.find(row => row.id === item)?.base_healing;
  const code = document?.heal_selected_party_member_code?.raw_bytes;
  if (!Array.isArray(code) || code.length !== 75 || code[25] !== 0x79
      || code[26] !== 0x88 || code[27] !== 0xA4 || code[37] !== 0xB9
      || code[38] !== 0x8C || code[39] !== 0xA4) return undefined;
  return code[32] + code[36] * 256;
}

export function partyHealingValues({hp, maxHp, status, base, randomHigh}) {
  if (![hp, maxHp, base].every(value => Number.isInteger(value) && value >= 0 && value <= 65535)
      || ![status, randomHigh].every(value => Number.isInteger(value) && value >= 0 && value <= 255))
    return {missing: '本次回复缺少 HP、回复基数或随机高字节'};
  if (status === 255) return {hp, message: 0x76, consume: false};
  const low = (base & 255) + (randomHigh & 15);
  const hpLow = (low & 255) + (hp & 255) + (low >>> 8);
  const sum = (hpLow & 255) + (((base >>> 8) + (hp >>> 8) + (hpLow >>> 8)) & 255) * 256;
  return {hp: Math.min(maxHp, sum), message: sum > maxHp ? 0x4F : 0x4E,
    quantity: (low & 255) + (base & 0xFF00), consume: true};
}
