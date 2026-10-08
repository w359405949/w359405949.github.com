// @editor-module 角色项名引用当前说话人文字与已发布交互用途。
import {state} from './state.js';
import {currentTextReference} from './resource-index.js';
import {componentTextSummary} from './ui-component-labels.js';

export function dialogueSpeakerName(reference) {
  if (!/^record:0C:[0-9]{3}$/u.test(String(reference || ''))) return '';
  const text = currentTextReference(reference).label;
  const name = text.split('「')[0].trim();
  return text.includes('「') && name && !name.includes('〔') ? name : '';
}

export function sceneActorName(record) {
  const entry = state.project?.story?.npc_catalog?.records?.find(row => row.uid === record?.uid);
  const references = Number(record?.text_region) > 0 && Number(record.text_region) < 0x10
    ? [`record:${Number(record.text_region).toString(16).toUpperCase().padStart(2, '0')}:${
      String(record.interaction_or_record_id).padStart(3, '0')}`]
    : (entry?.text_references || []).filter(row => row.found).map(row => row.node_id);
  for (const reference of references) {
    const name = dialogueSpeakerName(reference);
    if (name) return {label: name, nameSource: `说话人前缀 · ${reference}`};
  }
  if (entry?.service?.label) return {label: entry.service.label, nameSource: '服务用途'};
  const text = references.map(reference => componentTextSummary(currentTextReference(reference).label)).find(Boolean);
  if (text) return {label: `对话角色 · ${text}`, nameSource: '交互正文；姓名未确认'};
  return {label: record ? Number(record.autonomous_script_id) ? '场景动作角色' : '场景角色'
    : '临时角色', nameSource: '姓名未确认'};
}
