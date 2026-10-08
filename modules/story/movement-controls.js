// @editor-module 剧情脚本字段对象的连续移动方向与步数控件。
import {esc} from '../../core/dom.js';
import {changeStoryMovementSteps, storyMovementInstructions} from '../../core/story-movement.js';
import {storyCommandByteBinding} from './command-fields.js';
import {assembleStoryScriptLayout, resetStoryScriptSequence, storyScriptResetOwners} from '../../core/story-script-layout.js';
import {resetToOriginalButton, applyResetToOriginalStates} from '../../ui/table.js';
import {canonicalJsonEqual} from '../../core/project-store-values.js';

export function storyMovementMarkup(command, semantics) {
  const runs = command.movementInstructions || command.movementRuns || [command];
  const choices = [...semantics.values()].filter(row => row.operation === 'attempt-tile-step')
    .map(row => ({value: row.opcode, label: {up: '上', down: '下', left: '左', right: '右'}[row.direction]}));
  return `<div data-story-movement="${esc(JSON.stringify({resourceId: `story-${command.scriptKind}-script`,
    commandIds: runs.map(run => run.instructionId), scriptId: command.structureScriptId,
    programId: command.programId, scriptKind: command.scriptKind, opcode: command.opcode, choices}))}"></div>`;
}

export async function hydrateStoryMovement(root, database, onValue, beforeChange, programs) {
  for (const host of root.querySelectorAll('[data-story-movement]')) {
    if (host.dataset.ready) continue;
    host.dataset.ready = 'true';
    const props = JSON.parse(host.dataset.storyMovement);
    const object = await database.getFieldObject(props.resourceId, `${props.resourceId}:pool`);
    const field = object.fields.find(field => field.fieldName === 'sequence');
    if (!host.isConnected) continue;
    host.innerHTML = `<label class="story-command-operand">方向 <select data-story-movement-direction aria-label="方向">${props.choices.map(choice =>
      `<option value="${choice.value}"${choice.value === props.opcode ? ' selected' : ''}>${choice.label}</option>`).join('')}</select></label>
      <label class="story-command-operand">步数 <input data-story-movement-steps aria-label="步数" type="number" min="1" step="1" value="${props.commandIds.length}"></label>
      ${resetToOriginalButton(props.scriptId, {title: '重置脚本', attributes: {'data-story-movement-reset': ''}})}
      <p role="status" data-story-movement-error hidden></p>`;
    const controls = [...host.querySelectorAll('input,select,button')];
    const {value: initial} = await database.readResource(props.resourceId);
    const scriptObjects = await Promise.all(storyScriptResetOwners(initial, props.scriptId).map(id =>
      database.getFieldObject(props.resourceId, `${props.resourceId}:script:${id.toString(16).toUpperCase().padStart(2, '0')}`)));
    const resetFields = scriptObjects.flatMap(object => object.fields);
    const resetButton = host.querySelector('[data-story-movement-reset]');
    let busy = false;
    const syncReset = () => applyResetToOriginalStates(host, new Map([[String(props.scriptId),
      resetFields.some(field => field.hasOverride) || !canonicalJsonEqual(field.value,
        resetStoryScriptSequence({...initial, sequence: field.value}, props.scriptId))]]), {busy});
    for (const member of [field, ...resetFields]) member.bind(resetButton, syncReset);
    const errorHost = host.querySelector('[data-story-movement-error]');
    const currentInstructions = () => {
      const current = programs();
      const program = current.find(program => program.id === props.programId
        && (program.kind || 'autonomous') === props.scriptKind);
      const first = program?.commands.find(command => command.instructionId === props.commandIds[0]);
      if (!first || !props.choices.some(choice => choice.value === first.opcode))
        throw new TypeError('移动指令已改变，请重新选择移动键');
      return storyMovementInstructions({...first, programId: props.programId, scriptKind: props.scriptKind}, current);
    };
    const edit = async control => {
      errorHost.hidden = true;
      busy = true;
      controls.forEach(input => input.disabled = true);
      try {
        const {value: asset} = await database.readResource(props.resourceId);
        const version = field.version;
        if (control.hasAttribute('data-story-movement-reset')) {
          beforeChange(props.commandIds[0]);
          await database.writeFields([{field, value: resetStoryScriptSequence(asset, props.scriptId)},
            ...resetFields.map(field => ({field, reset: true}))], {expectedVersion: version});
        } else if (control.hasAttribute('data-story-movement-steps')) {
          const ids = currentInstructions().map(command => command.instructionId);
          const sequence = changeStoryMovementSteps(asset, ids, Number(control.value), () => `insert-${crypto.randomUUID()}`);
          beforeChange(props.commandIds[0]);
          await field.set(sequence, {expectedVersion: version});
        } else {
          const opcode = Number(control.value);
          if (!props.choices.some(choice => choice.value === opcode)) throw new TypeError('移动方向无效');
          const values = new Map();
          const sequence = structuredClone(field.value);
          const assembled = assembleStoryScriptLayout(asset);
          for (const instruction of currentInstructions()) {
            const id = instruction.instructionId;
            const command = assembled.commands.find(command => command.id === id);
            if (command.source_offset === undefined) sequence.find(token => token.id === command.group_id).bytes[0] = opcode;
            else {
              const binding = storyCommandByteBinding(instruction, programs());
              const owner = await database.getFieldObject(binding.resourceId, binding.handle);
              const bytecode = owner.fields.find(field => field.fieldName === 'bytecode');
              if (!values.has(bytecode)) values.set(bytecode, [...bytecode.value]);
              values.get(bytecode)[binding.byteIndex] = opcode;
            }
          }
          beforeChange(props.commandIds[0]);
          await database.writeFields([{field, value: sequence}, ...[...values].map(([field, value]) => ({field, value}))], {expectedVersion: version});
        }
        await onValue(props.resourceId);
        if (host.isConnected) {
          const current = currentInstructions();
          host.querySelector('[data-story-movement-steps]').value = current.length;
          host.querySelector('[data-story-movement-direction]').value = current[0].opcode;
        }
      } catch (error) {errorHost.textContent = error.message; errorHost.hidden = false;}
      finally {busy = false; controls.forEach(input => input.disabled = false); syncReset();}
    };
    controls.forEach(control => control.addEventListener(control.tagName === 'BUTTON' ? 'click' : 'change', () => {host.editCompletion = edit(control);}));
  }
}
