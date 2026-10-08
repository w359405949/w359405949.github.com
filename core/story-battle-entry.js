// @editor-module 剧情指令与单人战角色选择构成战斗入口投影。
import {db} from './project-db.js';
import {prepareStorySceneActions, storySceneActions} from './story-scene-actions.js';
import {renderCodeFields} from './render-code-sources.js';
import {battleRoleSelector} from './visual-metasprites.js';

export async function prepareStoryBattleEntry(sequenceId, story, repository = db) {
  try {
    const sequence = story?.browser_vm?.sequences?.find(row => row.id === sequenceId);
    if (!sequence) throw new TypeError(`缺少剧情序列 ${sequenceId}`);
    const [actors, scripts, metasprites, fields] = await Promise.all([
      repository.getDocument('scene-actor', null),
      repository.getResourceDraft('story-autonomous-script'),
      repository.getDocument('metasprite-record', null),
      renderCodeFields(['scripted-party-role'], source =>
        repository.getField(source.resource_id, source.entity_handle, source.field)),
    ]);
    const records = (actors?.records || []).filter(row => row.entry_id === sequence.entry_variant_id);
    const document = await prepareStorySceneActions(records, scripts, story, repository);
    const entries = records.flatMap(actor => {
      const actions = storySceneActions(actor, document, story);
      return actions.filter(action => action.operation === 'start-scripted-encounter'
        && actions.some(row => row.cursor < action.cursor && row.operation === 'refresh-field-state'))
        .map(action => ({actor, action, actions}));
    });
    if (entries.length !== 1) throw new TypeError(`剧情序列 ${sequenceId} 缺少唯一战斗入口`);
    const {actor, action} = entries[0];
    const partyRole = fields['scripted-party-role'];
    const selector = () => battleRoleSelector(metasprites, partyRole.value);
    selector();
    if (!Number.isInteger(action.operands[0])) throw new TypeError('剧情战斗编队缺失');
    return {actorHandle: actor.uid, commandHandle: action.handle, operandFields: action.operandFields,
      get formationId() {return action.operands[0];},
      get victoryFlag() {return action.operands[1];},
      get partyRoleId() {return selector().party_role_id;},
      partyRoleField: partyRole};
  } catch (error) {
    return {missing: error.message};
  }
}
