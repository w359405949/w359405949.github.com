// @editor-module 剧情详情与选择器共用当前指令投影。
import {db} from '../../core/project-db.js';
import {esc} from '../../core/dom.js';
import {currentTextReference} from '../../core/resource-index.js';
import {projectStoryScriptPrograms} from '../../core/story-script-layout.js';
import {storySceneActionPresentation, storySceneDialogueReferences} from '../../core/story-scene-actions.js';
import {STORY_DIALOGUE_OPERATIONS} from '../../core/story-dialogue-operations.js';
import {eventFlagReferenceMarkup} from '../save/event-flags.js';
import {renderModuleComponent} from '../../ui/module-components.js';
import {loadCurrentTextRecordDisplays} from '../../views/text/catalog.js';
import '../text/components.js';

export async function paintStoryReferenceDetails(host) {
  await loadCurrentTextRecordDisplays(host);
}

export async function prepareStoryReferenceDetails(document, kind, entries, currentPrograms = null, textDisplays = null) {
  const story = await db.getDocument('project.story');
  const published = (story.browser_vm?.programs || []).filter(program => program.kind === kind);
  const missing = (story[kind]?.entries || []).filter(entry => entry.path
    && !published.some(program => Number(program.id) === Number(entry.id)));
  const programs = [...published, ...(await Promise.all(missing.map(entry =>
    db.getPackageDocument(`game/story/${entry.path}`, null)))).filter(Boolean)];
  const projected = currentPrograms || (document.layout ? projectStoryScriptPrograms(document, programs) : programs);
  const semantics = new Map(story.browser_vm.opcode_semantics.map(row =>
    [row.opcode, {...row, ...STORY_DIALOGUE_OPERATIONS[row.opcode]}]));
  return entries.map(entry => {
    const program = projected.find(program => Number(program.id) === Number(entry.id));
    const dialogues = [];
    const actionLabels = [];
    const actions = (program?.commands || []).map(command => {
      const semantic = semantics.get(command.opcode);
      if (!semantic) {
        const label = command.name || command.opcode_hex;
        actionLabels.push(label);
        return `<li>${esc(label)}</li>`;
      }
      const operands = command.currentOperands || command.operands || [];
      const ui = semantic.record_operand_index == null ? null : {
        region_id: semantic.region_id,
        record_operand_index: semantic.record_operand_index,
      };
      const action = {command: {...command, blocking_ui: command.blocking_ui || ui},
        semantic, operation: semantic.operation, operands};
      const service = semantic.operation === 'dispatch-interaction-service' && command.interaction_service;
      if (service) dialogues.push({
        application: {command: operands[semantic.region_operand_index],
          instance: operands[semantic.record_operand_index]}, operation: action.operation,
      });
      const presentation = storySceneActionPresentation(action);
      const conditional = semantic.operation === 'start-event-selected-dialogue';
      actionLabels.push(conditional ? '条件文字' : presentation?.label || command.name || semantic.operation);
      const references = service ? [] : conditional ? [
        {regionId: semantic.region_id, recordId: operands[semantic.set_record_operand_index], label: '事件位已设置'},
        {regionId: semantic.region_id, recordId: operands[semantic.clear_record_operand_index], label: '事件位未设置'},
      ] : storySceneDialogueReferences(action);
      const text = references.map(({regionId, recordId, label}) => {
        if (!Number.isInteger(regionId) || !Number.isInteger(recordId)) return '';
        dialogues.push({record: `record:${regionId.toString(16).toUpperCase().padStart(2, '0')}:${String(recordId).padStart(3, '0')}`,
          label, operation: action.operation, interactionWindow: true});
        const preview = renderModuleComponent('text-record', 'preview', {
          value: `record:${regionId.toString(16).toUpperCase().padStart(2, '0')}:${String(recordId).padStart(3, '0')}`,
          displayText: textDisplays?.get(`record:${regionId.toString(16).toUpperCase().padStart(2, '0')}:${String(recordId).padStart(3, '0')}`)});
        return `${label ? `<p>${esc(label)}</p>` : ''}${preview}`;
      }).join('');
      return `<li>${[
        esc(conditional ? '条件文字' : presentation?.label || command.name || semantic.operation),
        conditional ? eventFlagReferenceMarkup(operands[semantic.flag_operand_index]) : esc(presentation?.value || ''),
        ...(presentation?.operands || []).map(({label, index, eventFlag}) => eventFlag
          ? eventFlagReferenceMarkup(operands[index]) : esc(`${label} ${operands[index]}`)),
      ].filter(Boolean).join(' · ')}${text}</li>`;
    });
    const summary = [...new Set(actionLabels)].slice(0, 3).join(' · ') || '无动作';
    const firstText = dialogues.find(dialogue => dialogue.record)?.record;
    const text = firstText ? textDisplays?.get(firstText) || currentTextReference(firstText).label : '';
    const excerpt = text.length > 80 ? `${text.slice(0, 80)}…` : text;
    const pickerDetails = `<p>${esc(summary)}</p>${excerpt ? `<p>${esc(excerpt)}</p>` : ''}`;
    return {...entry, dialogues, pickerDetails,
      details: actions.length ? `<ol>${actions.join('')}</ol>` : '无动作'};
  });
}
