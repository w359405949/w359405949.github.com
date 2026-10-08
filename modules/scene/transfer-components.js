// @editor-module transition / boundary owner 的引用供给
//
// 两类候选只读源码点名的 project.scenes.logic 平铺表；不遍历场景资源、manifest
// 或模块图。复合句柄仍是唯一候选键，场景目录只补当前显示名。

import {esc} from "../../core/dom.js";
import {db} from "../../core/project-db.js";
import {state} from "../../core/state.js";
import {registerModuleComponent} from "../../ui/module-components.js";
import {
  hydrateReferenceFieldPickers,
  referenceFieldPickerMarkup,
  registerReferenceFieldPresentation,
} from "../../ui/reference-field.js";

const TRANSITION_MODULE_ID = "transition";
const BOUNDARY_MODULE_ID = "boundary";
const SCENE_LOGIC_DOCUMENT_ID = "project.scenes.logic";

const SCENE_CATALOG_DOCUMENT_ID = "project.scenes";
const TRANSITION_TARGET_OWNER_BY_HANDLE = Object.freeze({
  "transition:00:4A": "boundary:01:00",
});

const TRANSFER_MODULES = Object.freeze({
  [TRANSITION_MODULE_ID]: Object.freeze({
    rows: "point_transitions",
    label: "点转场",
    filterLabel: "过滤点转场",
  }),
  [BOUNDARY_MODULE_ID]: Object.freeze({
    rows: "boundary_exits",
    label: "场景边界",
    filterLabel: "过滤场景边界",
  }),
});

const DIRECTION_LABELS = Object.freeze({
  up: "上边界",
  right: "右边界",
  down: "下边界",
  left: "左边界",
  "all-boundaries": "全边界",
});

function transferModule(moduleId) {
  const id = String(moduleId || "");
  const definition = TRANSFER_MODULES[id];
  if (!definition) throw new TypeError(`场景转场引用模块无效：${id || "（空）"}`);
  return {id, ...definition};
}

function valueAtPath(value, path = []) {
  let current = value;
  for (const segment of path) {
    if (current === null || typeof current !== "object"
        || !Object.hasOwn(current, segment)) return undefined;
    current = current[segment];
  }
  return current;
}

function declaredText(entry, path) {
  if (!Array.isArray(path)) return "";
  const value = valueAtPath(entry, path);
  return value === null || value === undefined ? "" : String(value);
}

function byteId(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= 0xff ? number : null;
}

function hexByte(value) {
  const id = byteId(value);
  return id === null ? "??" : id.toString(16).toUpperCase().padStart(2, "0");
}

function normalizeTransferHandle(value, moduleId) {
  const definition = transferModule(moduleId);
  const parts = String(value || "").trim().split(":");
  if (parts.length !== 3 || parts[0].toLowerCase() !== definition.id
      || !/^[0-9a-f]{1,2}$/iu.test(parts[1])
      || !/^[0-9a-f]{1,2}$/iu.test(parts[2])) return "";
  return `${definition.id}:${parts[1].toUpperCase().padStart(2, "0")}:${
    parts[2].toUpperCase().padStart(2, "0")}`;
}

/** Exact cross-owner target relationships published by the module graph. */
function transitionTargetOwner(value) {
  const handle = normalizeTransferHandle(value, TRANSITION_MODULE_ID);
  return handle ? TRANSITION_TARGET_OWNER_BY_HANDLE[handle] || "" : "";
}

function transferHandle(entry, moduleId) {
  const direct = normalizeTransferHandle(
    entry?.resource_id || entry?.handle || entry?.uid,
    moduleId,
  );
  if (direct) return direct;
  const sceneId = byteId(entry?.scene_id);
  const rowId = byteId(entry?.id);
  return sceneId === null || rowId === null
    ? "" : `${moduleId}:${hexByte(sceneId)}:${hexByte(rowId)}`;
}

function requestedTransferHandle({moduleId, entry = null, handle = "", value = ""} = {}) {
  return transferHandle(entry, moduleId)
    || normalizeTransferHandle(handle || value, moduleId);
}

function sceneName(entry, role) {
  const property = role === "destination" ? "destination_scene_name" : "source_scene_name";
  const idProperty = role === "destination" ? "destination_scene_id" : "scene_id";
  return String(entry?.[property] || `场景 $${hexByte(entry?.[idProperty])}`);
}

function coordinate(value) {
  const number = Number(value);
  return Number.isInteger(number) ? String(number) : "?";
}

function directionLabel(entry) {
  const direction = String(entry?.direction || "");
  return DIRECTION_LABELS[direction] || direction || "方向未定";
}

function transferRoute(entry) {
  return `${sceneName(entry, "source")} (${coordinate(entry?.x)}, ${coordinate(entry?.y)})`
    + ` → ${sceneName(entry, "destination")} (${
      coordinate(entry?.destination_x)}, ${coordinate(entry?.destination_y)})`;
}

function transferTitle(entry, moduleId) {
  const rowName = String(entry?.name || entry?.display_name || entry?.label || "").trim();
  if (rowName) return rowName;
  const source = sceneName(entry, "source");
  const target = sceneName(entry, "destination");
  return moduleId === BOUNDARY_MODULE_ID
    ? `${source} ${directionLabel(entry)} → ${target}`
    : `${source} → ${target}`;
}

function transferMeta(entry, moduleId) {
  return transferHandle(entry, moduleId);
}

function transferPreviewMarkup({
  moduleId,
  entry = null,
  handle = "",
  value = "",
  componentAttributes = "",
  error = "",
} = {}) {
  const definition = transferModule(moduleId);
  const identity = requestedTransferHandle({moduleId, entry, handle, value});
  if (!identity || error) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>?</b><small>${esc(error || `${definition.label}引用未解析`)}</small></span>`;
  }
  if (!entry) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>${esc(definition.label)}</b><small>${esc(identity)}</small></span>`;
  }
  const detail = moduleId === BOUNDARY_MODULE_ID
    ? `${directionLabel(entry)} · ${transferRoute(entry)}` : transferRoute(entry);
  return `<span class="module-reference-data-preview" ${componentAttributes}>
    <b>${esc(transferTitle(entry, moduleId))}</b><small>${esc(detail)}</small>
  </span>`;
}

function transferReferenceItem(entry, reference = null) {
  const moduleId = String(reference?.module || "");
  const definition = transferModule(moduleId);
  const handle = transferHandle(entry, moduleId);
  if (!handle) return null;
  const identity = handle.split(":").slice(1).join(":");
  const rowName = String(entry?.name || entry?.display_name || entry?.label || "").trim();
  const declaredDescription = declaredText(entry, reference?.description);
  const description = declaredDescription || transferRoute(entry);
  const declaredValue = declaredText(entry, reference?.key);
  return {
    value: declaredValue || handle,
    label: rowName
      ? `${identity} · ${rowName}`
      : `${identity} · ${transferTitle(entry, moduleId)}`,
    description,
    meta: declaredText(entry, reference?.meta) || transferMeta(entry, moduleId),
    preview: transferPreviewMarkup({moduleId, entry}),
    filter: [
      handle,
      identity,
      rowName,
      description,
      definition.label,
      directionLabel(entry),
      entry?.scene_id,
      entry?.scene_id_hex,
      entry?.id,
      entry?.id_hex,
      entry?.x,
      entry?.y,
      entry?.destination_scene_id,
      entry?.destination_scene_id_hex,
      entry?.destination_x,
      entry?.destination_y,
      entry?.source_scene_slug,
      entry?.destination_scene_slug,
    ].filter(value => value !== null && value !== undefined && value !== "")
      .join(" ").toLowerCase(),
  };
}

function transferRows(documentValue, moduleId) {
  const definition = transferModule(moduleId);
  const rows = documentValue?.[definition.rows];
  if (!Array.isArray(rows)) {
    throw new TypeError(`${SCENE_LOGIC_DOCUMENT_ID} 缺少 ${definition.rows} 静态候选表`);
  }
  return rows;
}

function enrichTransferRows(rows, sceneDocument) {
  const sceneById = new Map((sceneDocument?.editable_scenes || []).map(scene => [
    byteId(scene?.id),
    scene,
  ]));
  return rows.map(entry => {
    const source = sceneById.get(byteId(entry?.scene_id));
    const destination = sceneById.get(byteId(entry?.destination_scene_id));
    return {
      ...entry,
      source_scene_name: String(source?.name || source?.slug || ""),
      source_scene_slug: String(source?.slug || ""),
      destination_scene_name: String(destination?.name || destination?.slug || ""),
      destination_scene_slug: String(destination?.slug || ""),
    };
  });
}

function currentTransferRows(sceneAsset, sceneId, moduleId) {
  const definition = transferModule(moduleId);
  if (sceneAsset?.resource_id !== `scene:${hexByte(sceneId)}`
      || Number(sceneAsset?.document?.scene_id) !== sceneId) {
    throw new TypeError(`scene:${hexByte(sceneId)} 的当前正文身份不一致`);
  }
  const rows = sceneAsset.document?.logic?.layers?.transitions?.[definition.rows];
  if (!Array.isArray(rows)) {
    throw new TypeError(`scene:${hexByte(sceneId)} 缺少当前 ${definition.rows}`);
  }
  return new Map(rows.map(entry => [byteId(entry?.id), entry]));
}

// 候选集合仍完全由 project.scenes.logic 的静态平铺表决定。这里只读取已经存在的
// scene:* working，覆盖同一候选的当前语义值；不从 working 增删或发现候选。唯一的
// split-owner 关系也从真正 owner 的 working 取目标值，不回写另一份副本。
async function overlayCurrentTransferValues(rows, moduleId) {
  const repository = state.projectRepository;
  if (!repository || typeof repository.listWorking !== "function"
      || typeof repository.resolve !== "function") return rows;
  const relevantIds = new Set(rows.map(entry => byteId(entry?.scene_id)));
  if (moduleId === TRANSITION_MODULE_ID) {
    for (const entry of rows) {
      const owner = transitionTargetOwner(transferHandle(entry, moduleId));
      const ownerParts = owner.split(":");
      if (ownerParts.length === 3) relevantIds.add(Number.parseInt(ownerParts[1], 16));
    }
  }
  const working = await repository.listWorking();
  const selectedIds = [...new Set(working.flatMap(record => {
    const match = /^scene:([0-9a-f]{2})$/iu.exec(String(record?.resource_id || ""));
    if (!match) return [];
    const sceneId = Number.parseInt(match[1], 16);
    return relevantIds.has(sceneId) ? [sceneId] : [];
  }))].sort((left, right) => left - right);
  if (!selectedIds.length) return rows;
  const assetsByScene = new Map(await Promise.all(selectedIds.map(async sceneId => {
    const resolved = await repository.resolve(`scene:${hexByte(sceneId)}`, {
      materialize: false,
    });
    return [sceneId, resolved?.value];
  })));
  return rows.map(entry => {
    const sceneId = byteId(entry?.scene_id);
    const rowId = byteId(entry?.id);
    const currentAsset = assetsByScene.get(sceneId);
    const current = currentAsset
      ? currentTransferRows(currentAsset, sceneId, moduleId).get(rowId)
      : null;
    if (!current) {
      if (currentAsset) {
        throw new TypeError(`${transferHandle(entry, moduleId)} 在当前场景正文中不存在`);
      }
    }
    const result = {
      ...entry,
      ...(current ? {
        ...(moduleId === TRANSITION_MODULE_ID ? {
          x: current.x,
          y: current.y,
        } : {}),
        destination_scene_id: current.destination_scene_id,
        destination_x: current.destination_x,
        destination_y: current.destination_y,
      } : {}),
    };
    if (moduleId !== TRANSITION_MODULE_ID) return result;
    const targetOwner = transitionTargetOwner(transferHandle(entry, moduleId));
    if (!targetOwner) return result;
    const [, ownerSceneHex, ownerRowHex] = targetOwner.split(":");
    const ownerSceneId = Number.parseInt(ownerSceneHex, 16);
    const ownerAsset = assetsByScene.get(ownerSceneId);
    if (!ownerAsset) return result;
    const ownerRow = currentTransferRows(
      ownerAsset,
      ownerSceneId,
      BOUNDARY_MODULE_ID,
    ).get(Number.parseInt(ownerRowHex, 16));
    if (!ownerRow) {
      throw new TypeError(`${targetOwner} 在当前场景正文中不存在`);
    }
    return {
      ...result,
      destination_scene_id: ownerRow.destination_scene_id,
      destination_x: ownerRow.destination_x,
      destination_y: ownerRow.destination_y,
    };
  });
}

async function prepareTransferComponent(props) {
  const moduleId = String(props.moduleId || "");
  transferModule(moduleId);
  try {
    const [logicDocument, sceneDocument] = await Promise.all([
      db.getDocument(SCENE_LOGIC_DOCUMENT_ID, null),
      db.getDocument(SCENE_CATALOG_DOCUMENT_ID, null),
    ]);
    const currentRows = await overlayCurrentTransferValues(
      transferRows(logicDocument, moduleId),
      moduleId,
    );
    const entries = enrichTransferRows(currentRows, sceneDocument);
    const identities = entries.map(entry => transferHandle(entry, moduleId));
    if (identities.some(identity => !identity)
        || new Set(identities).size !== identities.length) {
      throw new TypeError(`${moduleId} 的候选句柄为空或重复`);
    }
    const requested = requestedTransferHandle({...props, moduleId});
    return {
      ...props,
      entries,
      entry: props.entry
        || entries.find(entry => transferHandle(entry, moduleId) === requested) || null,
      error: entries.length ? "" : `${moduleId} 的静态候选值域为空`,
    };
  } catch (error) {
    return {...props, entries: [], error: `候选项不可用：${error?.message || error}`};
  }
}

function transferReferencePickerMarkup({
  moduleId,
  entries = [],
  value = null,
  label = "",
  controlMarkup = "",
  componentAttributes = "",
  error = "",
} = {}) {
  const definition = transferModule(moduleId);
  return referenceFieldPickerMarkup({
    reference: {module: moduleId},
    rows: entries,
    value: normalizeTransferHandle(value, moduleId) || value,
    label: label || definition.label,
    controlMarkup,
    componentAttributes,
    error,
  });
}

for (const [moduleId, definition] of Object.entries(TRANSFER_MODULES)) {
  registerReferenceFieldPresentation(moduleId, {
    item: transferReferenceItem,
    className: "scene-transfer-reference-field",
    filterLabel: definition.filterLabel,
    filterPlaceholder: "句柄／源场景／目标场景／坐标／方向",
  });

  registerModuleComponent(moduleId, "reference", {
    prepare: prepareTransferComponent,
    render: transferReferencePickerMarkup,
    hydrate: hydrateReferenceFieldPickers,
  });

  for (const kind of ["preview", "cover"]) {
    registerModuleComponent(moduleId, kind, {
      prepare: prepareTransferComponent,
      render: transferPreviewMarkup,
    });
  }
}
