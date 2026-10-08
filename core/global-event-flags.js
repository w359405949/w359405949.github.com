// @editor-module 全局事件位的句柄与已确认用途。
import {loadByteMapSpace} from './physical-field-object-document.js';
import {db} from './project-db.js';
import {state} from './state.js';
import {globalEventFlagHandle, globalEventFlagPurposes} from './global-event-flag-purposes.js';
import {currentTextReference} from './resource-index.js';

export {globalEventFlagHandle};
let entries = Array.from({length: 256}, (_, id) => ({id, handle: globalEventFlagHandle(id), label: '未知用途'}));

export function globalEventFlagEntries() { return entries.map(row => globalEventFlagEntry(row.id)); }

export function globalEventFlagEntry(value) {
  if (value === null || value === undefined || value === '') return null;
  const id = typeof value === 'string' && value.startsWith('global-event-flag:')
    ? Number.parseInt(value.split(':')[1], 16) : Number(value);
  if (!Number.isInteger(id) || id < 0 || id >= 256) return null;
  const row = entries[id];
  return row.purposeTextReference ? {...row,
    get label() {return `${row.label} · ${currentTextReference(row.purposeTextReference).label}`;}} : row;
}

export async function prepareGlobalEventFlags() {
  const path = state.browserPackageManifest?.browser_prepared_inputs?.global_event_flags;
  if (path) {
    const document = await db.getPackageDocument(path, null, {readonly: true});
    entries = document.entries;
  } else {
    const document = await loadByteMapSpace('sram', {allPages: true});
    entries = globalEventFlagPurposes(document.annotations);
  }
  return globalEventFlagEntries();
}
