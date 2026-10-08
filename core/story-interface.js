// @editor-module 结局画面引用公共界面状态与当帧运行数据。

const ENDING_CREDITS_SCREEN_ID =
  "ui-screen:interface:ending-credits:state:ending-credits.credits-page";
const ENDING_MESSAGE_SCREEN_ID =
  "ui-screen:interface:ending-credits:state:ending-credits.message";
const WANTED_POSTER_SCREEN_ID =
  "ui-screen:interface:wanted-information:state:wanted-information.poster";

export function storyInterfaceState(snapshot = {}) {
  const dialogue = snapshot.dialogue;
  if (dialogue?.operation === "start-blocking-ui-action") return {
    label: "界面窗口", operation: dialogue.operation,
    text: {region: dialogue.regionId, record: dialogue.recordId},
  };
  const operation = snapshot.endingOperation;
  if (!operation || operation === "actor-list-vm") return null;
  const record = dialogue && Number.isInteger(dialogue.regionId)
    ? `record:${dialogue.regionId.toString(16).toUpperCase().padStart(2, "0")}:${String(dialogue.recordId).padStart(3, "0")}`
    : null;
  const wanted = snapshot.endingWantedTargetId != null;
  const textScreen = record ? operation === "ending-credits-record"
    ? ENDING_CREDITS_SCREEN_ID : ENDING_MESSAGE_SCREEN_ID : null;
  const screen = dialogue?.uiScreenId || (wanted ? WANTED_POSTER_SCREEN_ID : textScreen);
  if (!screen && !dialogue) return null;
  return {stage: snapshot.endingStageId, label: snapshot.endingStageLabel, operation,
    screen, textScreen: wanted ? textScreen : null,
    context: dialogue?.uiPreviewContext || (record ? {record, page_index: dialogue.pageIndex} : null),
    target: snapshot.endingWantedTargetId ?? null, defeated: snapshot.endingWantedDefeated,
    text: record ? {region: dialogue.regionId, record: dialogue.recordId} : null};
}

const runtimeFrames = new WeakMap();

export function storyInterfaceRuntime(compiled, frame) {
  let sources = runtimeFrames.get(compiled);
  if (!sources) {
    sources = (compiled.frames || []).flatMap((snapshot, index) =>
      snapshot.partyMembers || snapshot.vehicles ? [{snapshot, index}] : []);
    runtimeFrames.set(compiled, sources);
  }
  return sources.findLast(source => source.index <= frame)?.snapshot || {};
}
