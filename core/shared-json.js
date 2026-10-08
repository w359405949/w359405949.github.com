// @editor-module 编码与展开只读派生物的共享 JSON 容器。
import {freezeValidatedJson, isFrozenValidatedJson} from './project-store-values.js';
export function sharedJsonDocument(value) {
  const nodes = [], indices = new Map();
  const encode = value => {
    if (value === null || typeof value !== 'object') return value;
    const node = Array.isArray(value) ? ['array', value.map(encode)]
      : ['object', Object.entries(value).map(([key, value]) => [key, encode(value)])];
    const key = JSON.stringify(node);
    if (!indices.has(key)) {
      indices.set(key, nodes.length);
      nodes.push(node);
    }
    return [indices.get(key)];
  };
  const root = encode(JSON.parse(JSON.stringify(value)));
  return {schema: 'metalmaxcn.shared-json', root, nodes};
}

const decodedDocuments = new WeakMap();

export function sharedJsonValue(document) {
  const immutable = isFrozenValidatedJson(document);
  if (immutable && decodedDocuments.has(document)) return decodedDocuments.get(document);
  const values = [];
  const read = value => Array.isArray(value) ? values[value[0]] : value;
  for (const [kind, members] of document.nodes) {
    values.push(freezeValidatedJson(kind === 'array' ? members.map(read)
      : Object.fromEntries(members.map(([key, value]) => [key, read(value)]))));
  }
  const value = read(document.root);
  if (immutable) decodedDocuments.set(document, value);
  return value;
}
