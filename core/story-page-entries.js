// @editor-module 新剧情页只分配经读取路径核对的扩展入口。
import {isStoryPageDocument, validateStoryPageJson} from './story-page-json.js';
import {validateStoryPageWorking} from './story-page-working.js';
import {storyPageExpandedEntryIds} from './story-farjump-format.js';

const STORY_PAGE_ENTRY_ROM_SHA256 = 'a02e6d3e619a47930149298a6bc4f90a30af1939e7905a2a1c7115bc6eb92bf2';
const STORY_PAGE_ENTRY_IDS = Object.freeze(Object.fromEntries(['autonomous', 'interaction']
  .map(kind => [kind, Object.freeze(storyPageExpandedEntryIds(kind))])));

export function allocateStoryPageEntries(page, document, records, serializeProgram) {
  validateStoryPageJson(document);
  const taken = new Map(['autonomous', 'interaction'].map(kind => [kind, new Set()]));
  const previous = records.find(record => record.resource_id === `story-page-working:${page}`);
  for (const record of records.filter(isStoryPageDocument)) {
    validateStoryPageWorking(record);
    if (record === previous) continue;
    for (const entry of record.overrides.rom_entries || []) {
      if (!STORY_PAGE_ENTRY_IDS[entry.kind]?.includes(entry.script_id)) throw new TypeError('剧情页入口没有分配许可');
      if (taken.get(entry.kind).has(entry.script_id)) throw new TypeError('剧情页入口重复分配');
      taken.get(entry.kind).add(entry.script_id);
    }
  }
  return document.programs.map(program => {
    serializeProgram(program);
    const old = previous?.overrides.rom_entries?.find(entry => entry.key === program.key && entry.kind === program.kind);
    const available = STORY_PAGE_ENTRY_IDS[program.kind].filter(id => !taken.get(program.kind).has(id));
    const script_id = available.includes(old?.script_id) ? old.script_id : available[0];
    if (script_id === undefined) throw new TypeError(`${program.key}：${program.kind === 'interaction' ? '交互' : '自主'}脚本入口已用尽`);
    taken.get(program.kind).add(script_id);
    return {key: program.key, kind: program.kind, script_id};
  });
}

export function assertStoryPageEntryRom(manifest) {
  if ((manifest.source_package_sha256 ?? manifest.rom?.sha256) !== STORY_PAGE_ENTRY_ROM_SHA256)
    throw new TypeError('当前 ROM 没有新剧情页入口分配许可');
}

export function storyPageEntryProgram(record, entry) {
  validateStoryPageWorking(record);
  if (!isStoryPageDocument(record) || !STORY_PAGE_ENTRY_IDS[entry.kind]?.includes(entry.script_id))
    throw new TypeError('剧情页入口没有分配许可');
  const program = record.overrides.document.programs.find(program => program.key === entry.key && program.kind === entry.kind);
  if (!program) throw new TypeError('剧情页入口缺少语义指令');
  return program;
}
