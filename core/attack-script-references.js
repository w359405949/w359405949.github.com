// @editor-module 从武器脚本生成运行期编译所需的资源引用。
function integer(value) {
  if (typeof value === "boolean") return Number(value);
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && /^[+-]?\d+$/.test(value.trim())) return Number(value);
  throw new Error("expected an imported integer");
}
function hex(value, width = 6) {
  if (!Number.isInteger(value)) throw new Error("expected an integer for hex formatting");
  return "0x" + (value < 0 ? "-" : "") + Math.abs(value).toString(16).toUpperCase().padStart(width - (value < 0 ? 1 : 0), "0");
}
function formatted(value, width = 2) { return hex(value, width).slice(2); }
function get(value, key) {
  if (value == null || !Object.hasOwn(value, key)) throw new Error(`missing imported field: ${key}`);
  return value[key];
}
function commandOperand(command, name) {
  for (const operand of command.operands ?? []) if (get(operand, "name") === name) return integer(get(operand, "value"));
  return null;
}

export function semanticScriptReferences({script, source_handle, prefix_length, default_chr_mode}) {
  const references = [];
  if (default_chr_mode !== null) references.push({source: source_handle, field: "default_chr_mode", target: "shared-chr-bank",
    relation: "uses-chr-context", selector: default_chr_mode, selector_hex: hex(default_chr_mode, 2)});
  function append(command, operand, target, relation, selector = null) {
    const offset = integer(get(command, "offset")) - prefix_length;
    const reference = {source: source_handle, field: `commands[${offset}]` + (operand === null ? "" : "." + operand),
      command_offset: offset, target, relation};
    if (selector !== null) Object.assign(reference, {selector, selector_hex: hex(selector, 2)});
    references.push(reference);
  }
  for (const command of script.commands ?? []) {
    const name = String(get(command, "name"));
    if (name === "call_visual_script") {
      const value = commandOperand(command, "visual_code");
      if (value === null || value < 0 || value >= 79) throw new Error("invalid nested attack-visual reference");
      append(command, "visual_code", `attack-visual:${formatted(value)}`, "calls-visual-script");
    } else if (name === "call_aux_script") {
      const value = commandOperand(command, "script_id");
      if (value === null) throw new Error("missing auxiliary-script reference");
      append(command, "script_id", `attack-visual-aux-script:${formatted(value)}`, "calls-auxiliary-script");
    } else if (name === "play_sound") {
      const value = commandOperand(command, "sound_id");
      if (value === null) throw new Error("missing audio-command reference");
      append(command, "sound_id", `audio-command:${formatted(value)}`, "plays-audio-command");
    } else if (name === "set_frame_mode_and_wait") {
      const value = commandOperand(command, "mode");
      if (value === null) throw new Error("missing attack CHR mode");
      append(command, "mode", "shared-chr-bank", "uses-chr-context", value);
    } else if (name === "set_battle_sprite_palette") {
      const value = commandOperand(command, "palette_offset");
      if (value === null || value % 3) throw new Error("attack sprite-palette offset is not record-aligned");
      append(command, "palette_offset", `sprite-palette:${formatted(Math.floor(value / 3))}`, "uses-sprite-palette");
    } else if (["set_object_action", "spawn_object_at_target", "spawn_object_at_actor"].includes(name)) {
      const value = commandOperand(command, "action");
      if (value === null) throw new Error("missing battle-action reference");
      append(command, "action", `battle-action:${formatted(value)}`, "uses-battle-action");
      if (name === "spawn_object_at_actor") append(command, null, "weapon-attack-parameter", "uses-launch-anchor-profile");
    }
  }
  return references;
}

export {integer, hex, formatted, get, commandOperand};
