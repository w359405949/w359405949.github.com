// @editor-module 每个 owner 的保底身份组件
import {esc} from "../core/dom.js";
import {
  registerModuleComponentFallback,
} from "../ui/module-components.js";

// 字段对象没有自己的导航入口与页面，所以身份只显示，不给链接。
function ownerIdentity({moduleId, module = null, handle = "", value = ""}) {
  const identity = String(handle || value || moduleId);
  return {
    identity,
    title: module?.title || moduleId,
  };
}

function genericModulePreviewMarkup({
  moduleId,
  module = null,
  handle = "",
  value = "",
  compact = false,
  componentAttributes = "",
} = {}) {
  const owner = ownerIdentity({moduleId, module, handle, value});
  return `<span class="module-identity-preview${compact ? " compact" : ""}" ${componentAttributes}>
    <span class="module-identity-glyph" aria-hidden="true">${esc(
      owner.title.slice(0, 1).toUpperCase())}</span>
    <span><b>${esc(owner.title)}</b><small class="mono">${esc(owner.identity)}</small></span>
  </span>`;
}

function genericModuleReferenceMarkup({
  moduleId,
  module = null,
  handle = "",
  value = "",
  controlMarkup = "",
  componentAttributes = "",
} = {}) {
  return `<span class="module-generic-reference" ${componentAttributes}>
    ${genericModulePreviewMarkup({moduleId, module, handle, value, compact: true})}
    ${controlMarkup ? `<span class="module-generic-reference-control">${controlMarkup}</span>` : ""}
  </span>`;
}

function syncGenericModuleReferences(root) {
  const hosts = [
    ...(root.matches?.('.module-generic-reference') ? [root] : []),
    ...root.querySelectorAll('.module-generic-reference'),
  ];
  for (const host of hosts) {
    const control = host.querySelector('select, input');
    const identity = host.querySelector('.module-identity-preview small.mono');
    if (control && identity) identity.textContent = control.value;
  }
}

registerModuleComponentFallback("preview", {render: genericModulePreviewMarkup});
registerModuleComponentFallback("cover", {render: genericModulePreviewMarkup});
registerModuleComponentFallback("reference", {
  render: genericModuleReferenceMarkup, sync: syncGenericModuleReferences,
});
