// @editor-module 共享精灵图案引用 MMC3 两页寄存器的当前上半页。
export const SHARED_UI_SPRITE_SOURCE = Object.freeze({
  resource_id: 'chr-bank-mapping-service',
  entity_handle: 'chr-bank-mapping-service:shared-register:0',
  field: 'bank', first_tile: 0x40, last_tile: 0x7F,
});

export async function sharedSpritePatternProfile(source, readField, loadBank) {
  const bank = (await readField(source)).value;
  if (!Number.isInteger(bank) || bank < 0 || bank > 255)
    throw new TypeError('共享精灵图案缺少当前 CHR 寄存器');
  const upperBank = (bank & 0xFE) + 1;
  return {id: `shared-ui-sprite:${upperBank}`, bank: upperBank,
    first_tile: source.first_tile, last_tile: source.last_tile,
    patterns: await loadBank(upperBank)};
}
