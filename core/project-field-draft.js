// @editor-module 字段可写投影按读取复用字段身份，追踪未提交值与失效版本。
import {canonicalJsonEqual, isFrozenValidatedJson} from "./project-store-values.js";
import {mutableJsonProjection} from "./mutable-json-projection.js";

const cloneJson = value => JSON.parse(JSON.stringify(value));

const fieldDrafts = new WeakMap();
const fieldDraftRevisions = new WeakMap();
const fieldDraftOrigins = new WeakMap();
const containerGetters = new WeakSet();

export function projectFieldContainerGetter(getter) {
  containerGetters.add(getter);
  return getter;
}

export function isProjectFieldContainerGetter(getter) {return containerGetters.has(getter);}

export function projectFieldDraftOrigin(draft) {
  return fieldDraftOrigins.get(draft) || null;
}

export function trackProjectFieldProjection(projection, origin, version) {
  fieldDraftOrigins.set(projection, origin);
  fieldDraftRevisions.set(projection, {generation: 0, version});
  return projection;
}

// 未提交值共用字段身份；未编辑的引用直接读取字段实例。
export function createProjectFieldDraft(document, fields, {version = null} = {}) {
  const draft = isFrozenValidatedJson(document) ? mutableJsonProjection(document)
    : JSON.parse(JSON.stringify(document));
  const pending = new Map();
  const revision = {generation: 0, field: fields[0], version};
  const entries = fields instanceof Map ? fields : new Map(fields.flatMap(field =>
    (field.documentPaths || [field.documentPath]).map(path => [JSON.stringify(path), () => field])));
  for (const [key, resolve] of entries) {
    const path = JSON.parse(key);
    const parent = path.slice(0, -1).reduce((node, key) => node[key], draft);
    let field;
    const currentField = () => field ||= resolve();
    let cachedValue, editable, editableProxy;
    const proxies = new WeakMap();
    const assign = (field, value) => {
      if (canonicalJsonEqual(value, field.value)) pending.delete(field);
      else pending.set(field, cloneJson(value));
      revision.generation += 1;
    };
    const mutable = (field, value) => {
      if (!value || typeof value !== "object") return value;
      if (proxies.has(value)) return proxies.get(value);
      const proxy = new Proxy(value, {
        get(target, name) {
          const value = Reflect.get(target, name);
          return value && typeof value === "object" ? mutable(field, value) : value;
        },
        set(target, name, value) {
          Reflect.set(target, name, value);
          assign(field, editable);
          return true;
        },
        deleteProperty(target, name) {
          Reflect.deleteProperty(target, name);
          assign(field, editable);
          return true;
        },
      });
      proxies.set(value, proxy);
      return proxy;
    };
    Object.defineProperty(parent, path.at(-1), {enumerable: true, configurable: true,
      get: () => {
        const field = currentField();
        const value = pending.has(field) ? pending.get(field) : field.value;
        if (!value || typeof value !== "object") return value;
        if (cachedValue !== value) {
          cachedValue = value;
          editable = cloneJson(value);
          editableProxy = mutable(field, editable);
        }
        return editableProxy;
      },
      set: value => {
        assign(currentField(), value);
      }});
  }
  fieldDrafts.set(draft, pending);
  fieldDraftRevisions.set(draft, revision);
  fieldDraftOrigins.set(draft, document);
  return draft;
}

export function projectFieldDraftRevision(draft) {
  const revision = fieldDraftRevisions.get(draft);
  return revision ? `${revision.generation}:${revision.version ? revision.version() : revision.field?.version}` : null;
}

export function acceptProjectFieldDraft(draft, fields, {reset = false} = {}) {
  const pending = fieldDrafts.get(draft);
  for (const field of fields) if (pending?.has(field) && (reset || canonicalJsonEqual(pending.get(field), field.value))) {
    pending.delete(field);
    fieldDraftRevisions.get(draft).generation += 1;
  }
  return pending !== undefined;
}
