// @editor-module 切换页内展示分页，保留已挂载控件和待写入编辑。
import {esc} from "../core/dom.js";

/** Local display tabs. All controls stay mounted, including pending edits. */
export function inPageTabs({id, label, tabs, content, active = tabs[0].id}) {
  const selected = tabs.some(tab => tab.id === active) ? active : tabs[0].id;
  return `<div class="in-page-tabs" data-in-page-tabs data-active-tab="${esc(selected)}">
    <div class="in-page-tab-list" role="tablist" aria-label="${esc(label)}">
      ${tabs.map(tab => `<button type="button" role="tab" class="in-page-tab"
        id="${esc(id)}-tab-${esc(tab.id)}" data-in-page-tab="${esc(tab.id)}"
        aria-controls="${esc(id)}-panel" aria-selected="${tab.id === selected}"
        tabindex="${tab.id === selected ? 0 : -1}">${esc(tab.label)}</button>`).join("")}
    </div>
    <div class="in-page-tab-content" id="${esc(id)}-panel" role="tabpanel"
      aria-labelledby="${esc(id)}-tab-${esc(selected)}" tabindex="0">${content}</div>
  </div>`;
}

/** data-in-page-tabs-show lists the tabs that share a piece of content. */
export function bindInPageTabs(root, {onChange} = {}) {
  if (!root) return;
  const own = selector => [...root.querySelectorAll(selector)].filter(
    node => node.closest("[data-in-page-tabs]") === root);
  const buttons = own("[data-in-page-tab]");
  const content = own("[data-in-page-tabs-show]");
  const panel = own('[role="tabpanel"]')[0];
  const select = (button, focus = false) => {
    const active = button.dataset.inPageTab;
    for (const tab of buttons) {
      tab.setAttribute("aria-selected", String(tab === button));
      tab.tabIndex = tab === button ? 0 : -1;
    }
    for (const group of content) {
      group.hidden = !group.dataset.inPageTabsShow.split(/\s+/).includes(active);
    }
    panel.setAttribute("aria-labelledby", button.id);
    root.dataset.activeTab = active;
    onChange?.(active);
    if (focus) button.focus();
  };
  for (const [index, button] of buttons.entries()) {
    button.addEventListener("click", () => select(button));
    button.addEventListener("keydown", event => {
      const next = {ArrowRight: (index + 1) % buttons.length,
        ArrowLeft: (index + buttons.length - 1) % buttons.length,
        Home: 0, End: buttons.length - 1}[event.key];
      if (next === undefined) return;
      event.preventDefault();
      select(buttons[next], true);
    });
  }
  select(buttons.find(button => button.dataset.inPageTab === root.dataset.activeTab)
    || buttons[0]);
}
