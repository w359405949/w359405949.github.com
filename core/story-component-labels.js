// @editor-module 剧情组件项名只保留剧情用途与场景名称。
import {storyPageDefinitionForView, storyViewForSequenceId} from './story-view-config.js';

export function storyComponentLabel(label) {
  return String(label || '')
    .replace(/scene-actor:[0-9A-F]+:[0-9A-F]+|角色\s+[0-9A-F]{2}[·:][0-9A-F]{2}/gu, '角色')
    .replace(/编队\s+\$?[0-9A-F]{2}\s*剧情战/gu, '剧情战斗')
    .replace(/encounter-formation:[0-9A-F]+|编队\s+\$?[0-9A-F]{2}/gu, '剧情战斗')
    .replace(/MODE\s+\$[0-9A-F]+\s*·?\s*/gu, '')
    .replace(/scene-actor-list:[0-9A-F]+|story-interaction-script:script:[0-9A-F]+/gu, '')
    .replace(/场景\s*\$[0-9A-F]+/gu, '场景')
    .replace(/\s+[0-9A-F]{2}(?:\s*[\/–→]\s*[0-9A-F]{2})*$/u, '')
    .replace(/\s+/gu, ' ').replace(/^[\s/·–]+|[\s/·–]+$/gu, '') || '剧情演出';
}

export function storySequenceComponentLabel(sequenceId, fallback) {
  const page = storyPageDefinitionForView(storyViewForSequenceId(sequenceId));
  return storyComponentLabel(page?.sequenceId ? page.title : fallback);
}
