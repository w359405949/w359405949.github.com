// @editor-module 剧情脚本字段对象的指令插入、删除、调换与重置控件。
import {esc} from "../../core/dom.js";
import {assembleStoryScriptLayout, changeStoryScriptSequence, resetStoryScriptSequence, storyScriptResetOwners,
  storyScriptPreviewCommand, storyScriptPreviewCommands, storyScriptPreviewPlan} from "../../core/story-script-layout.js";
import {mountStoryScriptOwner} from "./page-working-controls.js";
import {storyCommandPresentation} from '../../core/story-command-presentation.js';
import {storyCommandPickerMarkup, bindStoryCommandPicker} from './command-picker.js';
import {resetToOriginalButton, applyResetToOriginalStates} from '../../ui/table.js';
import {canonicalJsonEqual} from '../../core/project-store-values.js';
import {projectFieldDraftOrigin, trackProjectFieldProjection} from '../../core/project-field-draft.js';
import {storyInsertionBytes, storyInsertionFieldObject, storyTokenFieldObject,
  mountStoryTokenOperands} from './inserted-command-controls.js';

export function storyScriptStructureMarkup(command, options = {}) {
  return `<div data-story-script-structure="${esc(JSON.stringify({resourceId: `story-${command.scriptKind}-script`,
    commandId: command.instructionId, scriptId: command.structureScriptId, frame: command.start,
    variantId: command.variantId, actorSlot: command.actorSlot, ...options}))}"></div>`;
}

export function mountStoryInsertedOperand(host, object, {tokenId, operandIndex, label}) {
  const field = object.fields.find(field => field.fieldName === "sequence");
  const token = field.value.find(token => token.id === tokenId);
  const branch = field.scriptLayout.declarations[token.bytes[0]].dynamic_advance_operands.includes(operandIndex);
  const input = document.createElement(branch ? "select" : "input");
  if (branch) {
    for (const id of [...field.scriptLayout.commands.map(command => command.id),
      ...field.value.filter(token => typeof token !== "string").map(token => token.id)])
      input.add(new Option(id, id));
  } else {
    input.type = "number";
    input.min = "0";
    input.max = "255";
    input.step = "1";
  }
  input.setAttribute("aria-label", label);
  host.append(input);
  field.bind(input, (target, value) => {
    const current = value.find(token => token.id === tokenId);
    target.value = (branch ? current?.targets.find(target => target.index === operandIndex)?.target
      : current?.bytes[operandIndex]) ?? "";
  });
  input.addEventListener("change", async () => {
    input.setCustomValidity("");
    try {
      if (!input.checkValidity() || input.value === "") throw new TypeError("操作数须为 0–255 的整数");
      const value = structuredClone(field.value);
      const token = value.find(token => token.id === tokenId);
      if (branch) token.targets.find(target => target.index === operandIndex).target = input.value;
      else token.bytes[operandIndex] = Number(input.value);
      await field.set(value, {expectedVersion: field.version});
    } catch (error) {input.setCustomValidity(error.message); input.reportValidity();}
  });
}

export async function hydrateStoryScriptStructure(root, database, onValue, semantics, {scenes = [], sceneAt = () => null,
  actorAppearanceFor = () => ({})} = {}) {
  for (const host of root.querySelectorAll("[data-story-script-structure]")) {
    if (host.dataset.ready) continue;
    host.dataset.ready = "true";
    const props = JSON.parse(host.dataset.storyScriptStructure);
    const object = await database.getFieldObject(props.resourceId, `${props.resourceId}:pool`);
    const field = object.fields.find(field => field.fieldName === "sequence");
    const {value: asset} = await database.readResource(props.resourceId);
    if (!host.isConnected) continue;
    const selected = storyScriptPreviewCommand(asset, props.commandId);
    if (!selected) continue;
    const plan = storyScriptPreviewPlan(asset, [props.scriptId]);
    const omitted = plan.omittedScriptIds.includes(props.scriptId);
    const draft = plan.drafts?.find(page => page.scriptId === props.scriptId);
    const reason = draft?.reason || `容量不足，超出 ${plan.overflowBytes} 字节`;
    const remote = plan.remoteScripts?.some(page => page.scriptId === props.scriptId);
    const sceneId = sceneAt(props.frame);
    const actorAppearance = actorAppearanceFor(props);
    const declarationLabel = declaration => `${declaration.opcode.toString(16).toUpperCase().padStart(2, '0')} · ${storyCommandPresentation(semantics.get(declaration.opcode)).label}`;
    host.innerHTML = `<div class="story-script-structure-actions"${props.operandsOnly ? ' hidden' : ''}>
      ${plan.remoteScripts ? `<span data-script-location>${remote ? "远跳页" : "原池"}</span>` : ""}
      ${omitted ? `<span data-script-unwritten title="未进 ROM（${esc(reason)}）" aria-label="未进 ROM（${esc(reason)}）">↛ 未进 ROM：${esc(reason)}</span>` : ""}
      <details class="story-script-insert-menu"><summary class="button ghost">插入</summary><div data-script-insert-panel></div></details>
      <button type="button" class="button ghost" data-script-action="up" title="前移指令">前移</button>
      <button type="button" class="button ghost" data-script-action="down" title="后移指令">后移</button>
      <button type="button" class="button ghost" data-script-action="copy">复制</button>
      <button type="button" class="button ghost" data-script-action="delete">删除指令</button>
      ${resetToOriginalButton(props.scriptId, {title: "重置脚本", attributes: {'data-script-action': 'reset'}})}
      </div><div data-script-insert>
      ${storyCommandPickerMarkup({resourceId: props.resourceId, declarations: asset.layout.declarations, semantics})}
      <div data-script-operands></div><label>位置 <select data-script-insert-position><option value="before">选中指令前</option><option value="after">选中指令后</option></select></label>
      <button type="button" class="button" data-script-action="insert">${props.insertionPoint === 'start' ? '在开头插入' : props.insertionPoint === 'end' ? '在结尾追加' : '插入指令'}</button>
      </div>${selected.source_offset === undefined ? `<div data-script-inserted-operands></div>` : ""}<p role="status" data-script-error hidden></p>`;
    host.querySelector('[data-script-insert-panel]').append(host.querySelector('[data-script-insert]'));
    if (props.insertionPoint) {
      host.querySelector('[data-script-insert-position]').parentElement.hidden = true;
      host.querySelector('.story-script-insert-menu').open = true;
      host.querySelectorAll('[data-script-action]').forEach(button => {
        if (!['insert', 'reset'].includes(button.dataset.scriptAction)) {button.disabled = true; button.title = '请先选中指令键';}
      });
    }
    bindStoryCommandPicker(host.querySelector('[data-script-insert] [data-module-reference-picker]'),
      {declarations: asset.layout.declarations, semantics});
    const errorHost = host.querySelector("[data-script-error]");
    await mountStoryScriptOwner(host, database, props.resourceId, props.scriptId);
    const resetObjects = await Promise.all(storyScriptResetOwners(asset, props.scriptId).map(id =>
      database.getFieldObject(props.resourceId,
        `${props.resourceId}:script:${id.toString(16).toUpperCase().padStart(2, "0")}`)));
    const resetFields = resetObjects.flatMap(object => object.fields);
    let busy = false;
    let sequenceValue = null, sequenceDirty = false;
    const syncReset = () => {
      if (sequenceValue !== field.value) {
        sequenceValue = field.value;
        if (canonicalJsonEqual(sequenceValue, asset.layout.sequence)) sequenceDirty = false;
        else {
          const current = trackProjectFieldProjection({...asset, sequence: sequenceValue},
            projectFieldDraftOrigin(asset) || asset, () => field.version);
          sequenceDirty = !canonicalJsonEqual(sequenceValue, resetStoryScriptSequence(current, props.scriptId));
        }
      }
      const dirty = sequenceDirty || resetFields.some(field => field.hasOverride);
      applyResetToOriginalStates(host, new Map([[String(props.scriptId), dirty]]), {busy});
    };
    const resetButton = host.querySelector('[data-script-action="reset"]');
    for (const member of [field, ...resetFields]) member.bind(resetButton, syncReset);
    const run = async action => {
      errorHost.hidden = true;
      const buttons = [...host.querySelectorAll('[data-script-action]')];
      const disabled = buttons.map(button => button.disabled);
      busy = true;
      buttons.forEach(button => {button.disabled = true;});
      try {await action(); await onValue(props.resourceId);}
      catch (error) {errorHost.textContent = error.message; errorHost.hidden = false;}
      finally {
        busy = false;
        buttons.forEach((button, index) => {button.disabled = disabled[index];});
        syncReset();
      }
    };
    const currentAsset = async () => (await database.readResource(props.resourceId)).value;
    const write = async (current, sequence) => {
      assembleStoryScriptLayout(current, {sequence});
      await field.set(sequence, {expectedVersion: field.version});
    };
    let choices;
    const insertionChoices = () => choices ||= storyScriptPreviewCommands(asset, props.scriptId)
      .map(command => ({id: command.id, label: `${command.id} · ${declarationLabel(command.declaration)}`}));
    const opcode = host.querySelector("[data-script-opcode]");
    const operandHost = host.querySelector("[data-script-operands]");
    const insertButton = host.querySelector('[data-script-action="insert"]');
    let insertion;
    const renderInsertion = async () => {
      insertButton.disabled = true;
      const declaration = asset.layout.declarations.find(row => row.opcode === Number(opcode.value));
      const semantic = semantics.get(declaration.opcode);
      const draft = storyInsertionFieldObject(object, storyInsertionBytes(declaration, semantic,
        scenes.some(scene => Number(scene.id) === sceneId) ? sceneId : Number(scenes[0]?.id ?? 0)));
      const container = document.createElement('div'); operandHost.replaceChildren(container);
      await mountStoryTokenOperands(container, draft, {declaration, semantic, semantics, scenes, sceneId,
        choices: insertionChoices(), actorAppearance, insertion: true});
      if (container.isConnected) {insertion = draft; insertButton.disabled = false;}
    };
    const prepareInsertion = () => {
      host.operandReady = renderInsertion().catch(error => {errorHost.hidden = false; errorHost.textContent = error.message;});
    };
    opcode.addEventListener('change', prepareInsertion);
    const insertMenu = host.querySelector('.story-script-insert-menu');
    insertMenu.addEventListener('toggle', () => {if (insertMenu.open && !insertion) prepareInsertion();});
    if (!props.operandsOnly && insertMenu.open) prepareInsertion();
    const read = () => {
      for (const input of operandHost.querySelectorAll('input[type="number"]'))
        if (!input.checkValidity() || input.value === '' || !Number.isInteger(Number(input.value))) throw new TypeError('操作数须为 0–255 的整数');
      const targets = [...operandHost.querySelectorAll('[data-script-target]')].map(select => {
        if (!select.value) throw new TypeError('须选择跳转目标');
        return {index: Number(select.dataset.scriptTarget), target: select.value};
      });
      return {bytes: [...insertion.fields[0].value], targets};
    };
    for (const button of host.querySelectorAll("[data-script-action]")) button.addEventListener("click", () => {
      host.editCompletion = run(async () => {
        const current = await currentAsset();
        const action = button.dataset.scriptAction;
        if (action === "reset") {
          const sequence = resetStoryScriptSequence(current, props.scriptId);
          const scriptObjects = await Promise.all(storyScriptResetOwners(current, props.scriptId).map(id =>
            database.getFieldObject(props.resourceId,
              `${props.resourceId}:script:${id.toString(16).toUpperCase().padStart(2, "0")}`)));
          await database.writeFields([{field, value: sequence},
            ...scriptObjects.flatMap(object => object.fields.map(field => ({field, reset: true})))],
            {expectedVersion: field.version});
        } else await write(current, changeStoryScriptSequence(current, {...props, action,
          ...(action === "insert" ? {...read(), after: host.querySelector('[data-script-insert-position]').value === 'after', id: `insert-${crypto.randomUUID()}`}
            : action === 'copy' ? {id: `insert-${crypto.randomUUID()}`} : {})}));
      });
    });
    const insertedHost = host.querySelector("[data-script-inserted-operands]");
    if (insertedHost && props.operandsOnly) {
      const token = asset.sequence.find(token => typeof token !== "string" && token.id === props.commandId);
      await mountStoryTokenOperands(insertedHost, storyTokenFieldObject(object, token.id,
        storyInsertionBytes(selected.declaration, semantics.get(selected.opcode), sceneId ?? 0)), {
        declaration: selected.declaration, semantic: semantics.get(selected.opcode), semantics, scenes, sceneId,
        targets: token.targets, choices: insertionChoices(), actorAppearance,
        onTarget: (index, target) => {host.editCompletion = run(async () => {
          const current = await currentAsset();
          const sequence = structuredClone(current.sequence);
          sequence.find(token => token.id === props.commandId).targets.find(row => row.index === index).target = target;
          await write(current, sequence);
        });},
      });
      insertedHost.addEventListener('field-object-saved', () => {
        host.editCompletion = onValue(props.resourceId).catch(error => {errorHost.hidden = false; errorHost.textContent = error.message;});
      });
    }
    if (props.operandsOnly) {
      host.querySelector('.story-script-structure-actions').remove();
      host.querySelector('[data-story-script-owner]')?.remove();
    } else insertedHost?.remove();
  }
}
