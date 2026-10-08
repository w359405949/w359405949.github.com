// @editor-module 战斗演算命令窗与当前队员状态窗。
import {prepareUiBattleCommandWindow, prepareUiBattleStatusSlot} from "../modules/visual/ui-construction-preview.js";

/** 本次播放投影中相同的状态值复用已准备的窗口。 */
export async function prepareBattleSimulationStatus(project) {
  const windows = new Map();
  return async (actors, encounter) => {
    const actor = actors.find(row => row.side === "party");
    const label = actor.maxShield > 0 ? "SI" : "HP";
    const value = actor.maxShield > 0 ? actor.shield : actor.hp;
    const secondary = actor.riding && Number.isInteger(actor.vehicle?.sp) ? {label: 'SP', value: actor.vehicle.sp} : null;
    const key = encounter ? `command:${actor.label}` : `${label}:${value}:${secondary?.value ?? ''}`;
    if (!windows.has(key)) windows.set(key, (encounter
      ? prepareUiBattleCommandWindow(actor.label, project)
      : prepareUiBattleStatusSlot({label, value, secondary}, project)).then(window =>
      canvas => canvas.getContext("2d").drawImage(window.surface,
        window.rectangle.x, window.rectangle.y)));
    return windows.get(key);
  };
}
