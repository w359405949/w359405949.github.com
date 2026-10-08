// @editor-module 将编辑器错误与调用栈上报日志并保留出错位置与恢复操作。
import {esc} from "../core/dom.js";
import {editorLog} from "../core/editor-log.js";
import {StoryPageDataError} from "../core/story-page-working.js";

export function storyPageRecoveryButton(page) {
  return `<button class="button ghost" data-clear-story-page="${esc(page)}" title="丢弃本剧情页的修改；其他页面和字段修改保留">清理本页修改</button>`;
}

export function bindStoryPageRecovery(root, {database, afterReset, onError}) {
  for (const button of root?.querySelectorAll("[data-clear-story-page]") || []) {
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        await database.resetStoryPageWorking(button.dataset.clearStoryPage);
        await afterReset();
      } catch (error) {onError(error);}
      finally {button.disabled = false;}
    });
  }
}

export function editorErrorMarkup(block, error, {storyRecovery = false} = {}) {
  editorLog.error("编辑页面", `${block}：${error?.message || error}`, error);
  return `<div class="editor-error"><b>${esc(block)}</b>
    ${storyRecovery && error instanceof StoryPageDataError ? storyPageRecoveryButton(error.storyPage) : ""}</div>`;
}

/** Render at the failed subview, without replacing its controls or other errors. */
export function showEditorError(root, block, error) {
  if (!root?.isConnected) {
    // Failed writes can finish after navigation. Keep their named block visible
    // on the current page rather than losing the error with the detached panel.
    root = document.querySelector("#content");
    if (!root) throw error;
  }
  let host = [...root.children].find(node => node.dataset.editorErrorBlock === block);
  if (!host) {
    host = document.createElement("div");
    host.dataset.editorErrorBlock = block;
    root.prepend(host);
  }
  host.innerHTML = editorErrorMarkup(block, error);
}
