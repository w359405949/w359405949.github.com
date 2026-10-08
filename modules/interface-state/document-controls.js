// @editor-module 状态机文档控件只编辑应用程序的既有语义。
import {esc} from '../../core/dom.js';
import {referencePickerMarkup, bindReferencePicker} from '../../ui/reference-picker.js';
import {prepareModuleComponent, renderModuleComponent, hydrateModuleComponents} from '../../ui/module-components.js';
import {currentTextReference} from '../../core/resource-index.js';
import '../../modules/text/components.js';
import {appendInterfaceStateProgramSegment} from '../../core/interface-state-document.js';
import {appendApplicationProgramChoice} from '../../core/application-program.js';

const operandLabel = (instruction, index) => instruction.opcode === 0xD4
  ? ['选项正文', '选择布局'][index] : instruction.opcode === 0xCB ? '正文来源槽'
    : instruction.opcode === 0xF7 && index === 0 ? '输入模式' : `参数 ${index + 1}`;
const instructionLabel = instruction => instruction.kind === 'text' ? '正文'
  : instruction.kind === 'native-call' ? instruction.handler : instruction.kind === 'indexed-branches' ? '选项去向'
    : ({209: '跳转', 212: '选择', 247: '选择输入', 254: '返回', 203: '正文来源'})[instruction.opcode]
      || `指令 ${instruction.opcode.toString(16).toUpperCase()}`;

export async function mountInterfaceStateDocumentControls(host, object, {segmentId = null,
  onChange = () => {}, beforeEdit = () => {}} = {}) {
  const document = object.value;
  const program = document.program;
  const error = failure => {
    const message = host.querySelector('[data-state-document-error]');
    if (message) {message.hidden = false; message.textContent = failure.message;}
  };
  let editing = false;
  const edit = async change => {
    if (editing) return;
    editing = true;
    const controls = [...host.querySelectorAll('input, select, button')];
    controls.forEach(control => {control.disabled = true;});
    try {beforeEdit(); await object.edit(change); await onChange();}
    catch (failure) {error(failure);}
    finally {editing = false; controls.forEach(control => {control.disabled = false;});}
  };
  const segment = program?.segments.find(row => row.id === segmentId);
  if (!segment) {
    host.innerHTML = `<label>标题 <input data-state-document-title value="${esc(document.title)}"></label>
      <p>${esc(document.source?.id || (program ? '新应用程序' : '空文档'))}</p>
      ${program ? '<button class="button" data-state-add-segment>新增段</button>' : ''}
      ${program && (!document.source || document.source.entry.commandId >= 0x39)
        && !program.segments.some(segment => segment.instructions.some(row => row.kind === 'native-call'))
        ? '<button class="button" data-state-add-choice>新增选择</button>' : ''}
      <p data-state-document-error role="alert" hidden></p>`;
    host.querySelector('[data-state-document-title]').addEventListener('change', event =>
      edit(current => {current.title = event.target.value; return current;}));
    host.querySelector('[data-state-add-segment]')?.addEventListener('click', () => edit(appendInterfaceStateProgramSegment));
    host.querySelector('[data-state-add-choice]')?.addEventListener('click', () => edit(current => {
      appendApplicationProgramChoice(current.program); return current;
    }));
    return;
  }
  const choices = program.segments.map(row => ({value: row.id, label: row.id.split(':').at(-1)}));
  const destination = (value, path) => `<select data-state-destination="${esc(JSON.stringify(path))}">
    ${choices.map(row => `<option value="${esc(row.value)}"${value.target === row.value ? ' selected' : ''}>段 ${esc(row.label)}</option>`).join('')}
    ${value.kind === 'end' ? [254, 255].map(end => `<option value="${end}"${value.value === end ? ' selected' : ''}>返回 ${end}</option>`).join('') : ''}
    </select>`;
  const texts = await prepareModuleComponent('text-record', 'reference');
  if (!host.isConnected) return;
  if (texts.error) throw new Error(texts.error);
  const records = texts.entries.filter(row => /^record:06:[0-9]{3}$/u.test(row.node_id)
    && Number(row.node_id.slice(-3)) <= 0x8E).map(row => ({
      handle: `text-record:06:${Number(row.node_id.slice(-3)).toString(16).toUpperCase().padStart(3, '0')}`,
      record: row.node_id, label: currentTextReference(row.node_id).label || row.node_id,
    }));
  host.innerHTML = `<div class="screen-workbench-stage-toolbar">
      <button class="button" data-state-move-segment="-1">↑</button>
      <button class="button" data-state-move-segment="1">↓</button>
      <button class="button" data-state-remove-segment>删除段</button></div>
    ${segment.instructions.map((instruction, index) => `<section>
      <h4>${esc(instructionLabel(instruction))}</h4>
      ${instruction.kind === 'text' ? `<div data-state-text-instruction="${index}">${referencePickerMarkup({
        moduleId: 'text-record', value: instruction.record, label: '正文', compact: true,
        items: records.map(row => ({value: row.handle, label: row.label,
          preview: renderModuleComponent('text-record', 'preview', {value: row.record, compact: false})})),
      })}</div>` : instruction.kind === 'native-call' ? `<code>${esc(instruction.handler)}</code>`
        : instruction.kind === 'indexed-branches' ? instruction.targets.map((target, branch) =>
          `<label>选项 ${branch + 1} ${destination(target, [index, 'targets', branch])}</label>`).join('')
          : instruction.operands.map((operand, position) =>
            ['segment', 'end'].includes(operand.kind) ? `<label>去向 ${destination(operand, [index, 'operands', position])}</label>`
              : ['parameter', 'runtime-text-slot'].includes(operand.kind) ? `<label>${esc(operandLabel(instruction, position))}
                  <input type="number" min="0" max="${operand.kind === 'runtime-text-slot' ? 19 : 255}" value="${operand.value}"
                    data-state-parameter="${esc(JSON.stringify([index, position]))}"></label>`
                : '<span>↛</span>').join('')}
      </section>`).join('')}<p data-state-document-error role="alert" hidden></p>`;
  const changeInstruction = (index, change) => edit(current => {
    change(current.program.segments.find(row => row.id === segmentId).instructions[index]); return current;
  });
  for (const container of host.querySelectorAll('[data-state-text-instruction]')) {
    const index = Number(container.dataset.stateTextInstruction);
    bindReferencePicker(container.querySelector('[data-module-reference-picker]'), {
      paint: preview => hydrateModuleComponents(preview),
      onSelect: value => changeInstruction(index, instruction => {instruction.record = value;}),
    });
  }
  for (const input of host.querySelectorAll('[data-state-parameter]')) input.addEventListener('change', () => {
    const [index, position] = JSON.parse(input.dataset.stateParameter);
    void changeInstruction(index, instruction => {instruction.operands[position].value = Number(input.value);});
  });
  for (const input of host.querySelectorAll('[data-state-destination]')) input.addEventListener('change', () => {
    const [index, kind, position] = JSON.parse(input.dataset.stateDestination);
    void changeInstruction(index, instruction => {
      instruction[kind][position] = input.value.startsWith('application-program:')
        ? {kind: 'segment', target: input.value} : {kind: 'end', value: Number(input.value)};
    });
  });
  host.querySelector('[data-state-remove-segment]').addEventListener('click', () => edit(current => {
    current.program.segments = current.program.segments.filter(row => row.id !== segmentId); return current;
  }));
  for (const button of host.querySelectorAll('[data-state-move-segment]')) button.addEventListener('click', () => edit(current => {
    const segments = current.program.segments, index = segments.findIndex(row => row.id === segmentId);
    const next = index + Number(button.dataset.stateMoveSegment);
    if (next >= 0 && next < segments.length) [segments[index], segments[next]] = [segments[next], segments[index]];
    return current;
  }));
}
