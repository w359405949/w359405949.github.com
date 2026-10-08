// @editor-module 售货机回应复用整屏构造；绑定依据见终端服务证据。
import {fieldSubmenuCodeSource} from './field-submenu-code-sources.js';
const vendingResponses = Object.freeze([
  {segment: '01', handle: 'application-command:1B:text-record:204342', label: '商品选择'},
  {segment: '07', handle: 'application-command:1B:text-record:204369', label: '携带容量不足'},
  {segment: '08', handle: 'application-command:1B:text-record:204372', label: '投币回应'},
  {segment: '09', handle: 'application-command:1B:text-record:204378', record: 'record:10:111', label: '人物选择', party: 'characters'},
  {segment: '11', handle: 'application-command:1B:text-record:204387', label: '金额不足'},
]);
const shellVendingResponses = Object.freeze([
  {segment: '01', offset: 204427, record: 'record:10:108', label: '商品选择'},
  {segment: '04', offset: 204444, record: 'record:10:114', label: '无战车'},
  {segment: '05', offset: 204447, record: 'record:10:111', label: '战车选择', party: 'vehicles'},
  {segment: '09', offset: 204463, record: 'record:10:110', label: '投币回应'},
  {segment: '14', offset: 204487, record: 'record:10:117', label: '炮弹容量不足'},
  {segment: '15', offset: 204490, record: 'record:10:112', label: '金额不足'},
]);
const dualVendingResponses = Object.freeze([
  {segment: '01', offset: 204538, record: 'record:10:108', label: '商品选择'},
  {segment: '05', offset: 204538, record: 'record:10:111', label: '战车选择', party: 'vehicles',
    source: 'application-dialogue-flow:1D:segment:05'},
  {segment: '07', offset: 204566, record: 'record:10:114', label: '无战车'},
  {segment: '08', offset: 204572, record: 'record:10:110', label: '投币回应'},
  {segment: '10', offset: 204581, record: 'record:10:112', label: '金额不足'},
]);
const vendingRetainedStates = Object.freeze({
  '1B': ['02', '03', '04', '05', '10', '17'],
  '1C': ['00', '02', '03', '16'],
  '1D': ['00', '02', '03', '04', '09', '11'],
});

export function vendingServiceResponseEntries(familyId = 11) {
  const command = familyId === 11 ? '1B' : familyId === 12 ? '1C' : familyId === 13 ? '1D' : null;
  if (!command) return [];
  return (familyId === 11 ? vendingResponses : familyId === 12 ? shellVendingResponses : dualVendingResponses).map(row => ({...row,
    command, familyId, handle: row.handle || `application-command:${command}:text-record:${row.offset}`,
    source: row.source || `application-dialogue-flow:${command}:segment:${row.segment}:action:00`}));
}

export function vendingServiceResponsePreview(previews, source) {
  const lottery = vendingLotteryPreview(previews, source);
  if (lottery) return lottery;
  const retained = /^application-dialogue-flow:(1B|1C|1D):segment:(\d{2})$/u.exec(source || '');
  const dualParty = retained?.[1] === '1D' && retained[2] === '05';
  const dualPurchase = retained?.[1] === '1D' && retained[2] === '06';
  const inventoryCheck = retained?.[1] === '1B' && retained[2] === '06';
  const shellPurchase = retained?.[1] === '1C' && ['08', '12'].includes(retained[2]);
  const shellCheck = retained?.[1] === '1C' && ['06', '07', '10', '11', '13', '22'].includes(retained[2])
    ? retained[2] : null;
  const responseSource = shellPurchase || shellCheck ? 'application-dialogue-flow:1C:segment:09:action:00'
    : inventoryCheck ? 'application-dialogue-flow:1B:segment:08:action:00'
    : dualPurchase ? 'application-dialogue-flow:1D:segment:08:action:00'
    : retained && (vendingRetainedStates[retained[1]].includes(retained[2]) || dualParty)
    ? `application-dialogue-flow:${retained[1]}:segment:01:action:00` : source;
  const binding = [11, 12, 13].flatMap(vendingServiceResponseEntries).find(row => row.source === responseSource);
  const template = previews?.find(row => row.id === 'constructor:vending-machine-screen');
  if (!binding || !template?.facility_screen) return null;
  const preview = structuredClone(template);
  const party = dualParty ? 'vehicles' : binding.party;
  const selectionHandle = `application-command:${binding.command}:selection-layout:${binding.familyId === 11 ? 204337 : binding.familyId === 12 ? 204421 : 204533}`;
  return {...preview, id: `constructor:${source}`, visible_state: shellCheck ? '炮弹购买回应' : inventoryCheck ? '购买容量回应' : party ? '购买对象选择' : binding.label,
    terminal_response: {template_id: template.id, source, wait_marker: !party && binding.segment !== '01', party,
      inventory_check: inventoryCheck,
      shell_check: shellCheck,
      scope: shellCheck ? 'shell-purchase-response' : inventoryCheck ? 'inventory-response' : party ? 'party-selection'
        : dualPurchase || shellPurchase ? 'post-selection-coin-response'
          : retained ? 'retained-goods-screen' : 'fixed-body-response'},
    facility_screen: {...preview.facility_screen, resource_id: `application-command:${binding.command}`,
      configuration_family: binding.familyId,
      selection_handle: selectionHandle, body_handle: binding.handle,
      body_region_field: 'region_id'},
    runtime_context: {...preview.runtime_context},
    field_sources: [...preview.field_sources.filter(row => row.reference?.resource_id !== 'application-command:1B'),
      {role: '索引14价格码', reference: fieldSubmenuCodeSource('vending-shell-overflow-price-code')},
      ...(inventoryCheck ? [{role: '人物携带容量', reference: fieldSubmenuCodeSource('vending-role-inventory-capacity')},
        ...['record_id', 'region_id'].map(field => ({role: '容量不足回应', reference: {
          resource_id: 'application-command:1B', entity_handle: 'application-command:1B:text-record:204369', field}}))] : []),
      ...(party ? ['vending-party-selector', 'vending-party-name-origin', 'shop-actor-name-record',
        'shop-vehicle-name-record'].map(name => ({role: name, reference: fieldSubmenuCodeSource(name)})) : []),
      ...(shellCheck ? ['vending-shell-type-capacity', 'vending-loaded-weapon-item-limit',
        'vending-loaded-weapon-count-mask']
        .map(name => ({role: name, reference: fieldSubmenuCodeSource(name)})) : []),
      ...(shellCheck === '22' ? Array.from({length: 6}, (_, index) => ({role: '商品购买分支',
        reference: {resource_id: 'application-command:1C',
          entity_handle: 'application-command:1C:choice-branches:204521', field: `target:${index}`}})) : []),
      ...(shellCheck ? [204487, 204490].flatMap(offset => ['record_id', 'region_id'].map(field => ({role: '炮弹购买失败回应',
        reference: {resource_id: 'application-command:1C', entity_handle: `application-command:1C:text-record:${offset}`, field}}))) : []),
      ...['selector', 'count'].map(field => ({role: '商品选择', reference: {
        resource_id: `application-command:${binding.command}`, entity_handle: selectionHandle, field}})),
      ...['record_id', 'region_id'].map(field => ({
      role: binding.label, reference: {resource_id: `application-command:${binding.command}`,
        entity_handle: binding.handle, field}}))]};
}

function vendingLotteryPreview(previews, source) {
  const match = /^application-dialogue-flow:(1B|1C|1D):segment:(\d{2})(?::action:00)?$/u.exec(source || '');
  if (!match) return null;
  const first = match[1] === '1C' ? 17 : 12;
  const stage = Number(match[2]) - first;
  if (stage < 0 || stage > 4) return null;
  const offsets = match[1] === '1B' ? [204393, 204396, 204408, 204412]
    : match[1] === '1C' ? [204499, 204502, 204514, 204518] : [204590, 204593, 204605, 204609];
  const goods = vendingServiceResponsePreview(previews, `application-dialogue-flow:${match[1]}:segment:01:action:00`);
  if (!goods) return null;
  const bodyHandles = Object.fromEntries(['won', 'recipient', 'capacity', 'cancel'].map((name, index) =>
    [name, `application-command:${match[1]}:text-record:${offsets[index]}`]));
  bodyHandles.goods = goods.facility_screen.body_handle;
  return {...goods, id: `constructor:${source}`, visible_state: ['抽奖结果', '奖品领取对象', '奖品容量判断', '奖品容量不足', '取消领取'][stage],
    terminal_response: {...goods.terminal_response, source, scope: 'lottery-result-stable-display',
      lottery: {stage, body_handles: bodyHandles}, party: stage === 1 ? 'characters' : null,
      wait_marker: stage !== 1},
    facility_screen: {...goods.facility_screen, body_handle: bodyHandles[stage === 0 ? 'won' : stage === 3 ? 'capacity' : 'cancel']},
    field_sources: [...goods.field_sources,
      ...['vending-lottery-ball-object', 'vending-lottery-win-x', 'vending-role-inventory-capacity',
        'vending-party-selector', 'vending-party-name-origin', 'shop-actor-name-record',
        ...Array.from({length: 16}, (_, index) => `vending-lottery-x-${index}`),
        ...Array.from({length: 16}, (_, index) => `vending-lottery-y-${index}`)]
        .map(name => ({role: name, reference: fieldSubmenuCodeSource(name)})),
      ...Object.values(bodyHandles).flatMap(handle => ['record_id', 'region_id'].map(field => ({role: '抽奖回应',
        reference: {resource_id: goods.facility_screen.resource_id, entity_handle: handle, field}})))]};
}

export function elevatorServicePreview(source) {
  if (source !== 'application-dialogue-flow:1F:segment:00') return null;
  return {id: 'constructor:elevator-list', visible_state: '楼层选择',
    interface_state_id: 'unresolved-dynamic-list-application.list',
    viewport: {x: 0, y: 0, width: 256, height: 240},
    pattern_profiles: ['common-ui-bg:0A-80-BF', 'common-ui-frame:CB-C0-FF'],
    glyph_cache_source: 'field-pools', glyph_cache_entry: {dialogue: true},
    layers: [{kind: 'script', record: 'record:03:019', cursor: 0, elevator_frame: true}],
    ui_palette_source: {palette_index: 3, color_parameters: ['field-ui-palette-background',
      'field-ui-palette-foreground', 'field-ui-palette-light', 'field-ui-palette-dark']},
    sprite_palette_source: {resource_id: 'actor-visual', field: 'field_sprite_palettes'},
    facility_screen: {kind: 'elevator', resource_id: 'application-command:1F',
      frame_handle: 'application-command:1F:layout-record:204300',
      selection_handle: 'application-command:1F:selection-layout:204306'},
    field_sources: ['record_id', 'selector', 'count'].map((field, index) => ({
      role: index ? '楼层选择' : '楼层窗口', reference: {resource_id: 'application-command:1F',
        entity_handle: index ? 'application-command:1F:selection-layout:204306'
          : 'application-command:1F:layout-record:204300', field}}))};
}

export function controllerServicePreview(previews, source, invocation = {}) {
  const match = /^application-dialogue-flow:(36|37|38):segment:(00|01|02|03|04|05|06|07)$/u.exec(source || '');
  const template = previews?.find(row => row.id === 'constructor:computer-controller-screen');
  if (!match || !template || !invocation.entryHandle) return null;
  const command = match[1], sceneResource = invocation.entryHandle.split(':').slice(0, 2).join(':');
  const feedback = command === '37' && ['05', '06', '07'].includes(match[2]);
  const success = feedback && match[2] === '06';
  const flagExit = command !== '37' && ['03', '04'].includes(match[2]);
  if (command !== '37' && ['05', '06', '07'].includes(match[2])) return null;
  const preview = structuredClone(template);
  const frame = command === '37' ? 204245 : 204048;
  const selector = command === '37' ? 204253 : 204053;
  const sourceFields = preview.field_sources.filter(row => !['scene:8B', 'application-command:36'].includes(row.reference?.resource_id));
  const parameters = ['controller-status-fallback',
    ...Array.from({length: 7}, (_, index) => `controller-status-record-${16 + index}`),
    ...(command === '37' ? ['controller-password-length', 'controller-password-fill', 'controller-password-terminator',
      'controller-password-cursor-object', 'controller-password-cursor-x', 'controller-password-cursor-y',
      'controller-password-cursor-step',
      ...Array.from({length: 23}, (_, index) => `controller-event-flag-${index}`),
      ...Array.from({length: 24}, (_, index) => `controller-password-byte-${index}`),
      ...Array.from({length: 4}, (_, index) => `controller-password-offset-${index}`)] : []),
    ...(feedback ? ['controller-password-success-record', 'controller-password-error-record', 'controller-password-clear-selector',
      'controller-password-clear-origin-low', 'controller-password-clear-origin-high',
      'controller-password-clear-width', 'controller-password-clear-rows'] : [])];
  return {...preview, id: `constructor:${source}`, visible_state: feedback ? success ? '密码通过' : '密码比较结果' : command === '37' ? '密码输入' : '控制器待机',
    ...(feedback ? {interface_state_id: 'control-terminals.feedback', interface_state_ids: ['control-terminals.feedback'],
      terminal_response: {template_id: template.id, scope: success ? 'password-success-display' : 'password-input-comparison'}} : {}),
    ...(flagExit ? {terminal_response: {template_id: template.id, scope: 'retained-controller-before-scene-unfold'}} : {}),
    facility_screen: {...preview.facility_screen, resource_id: `application-command:${command}`,
      password_feedback: feedback ? success ? 'success' : 'compare' : null,
      password_stage: command === '37' ? match[2] : null,
      expected_handler: 8 + Number.parseInt(command, 16) - 0x36,
      entry_resource: sceneResource, entry_handle: invocation.entryHandle,
      frame_handle: `application-command:${command}:layout-record:${frame}`,
      selection_handle: `application-command:${command}:selection-layout:${selector}`},
    field_sources: [...sourceFields, ...parameters.map(name => ({role: name, reference: fieldSubmenuCodeSource(name)})),
      ...['handler_selector', 'instance_id'].map(field => ({
      role: '终端入口', reference: {resource_id: sceneResource, entity_handle: invocation.entryHandle, field}})),
      {role: '终端窗口', reference: {resource_id: `application-command:${command}`,
        entity_handle: `application-command:${command}:layout-record:${frame}`, field: 'record_id'}},
      ...['selector', 'count'].map(field => ({role: '终端键盘', reference: {resource_id: `application-command:${command}`,
        entity_handle: `application-command:${command}:selection-layout:${selector}`, field}}))]};
}
