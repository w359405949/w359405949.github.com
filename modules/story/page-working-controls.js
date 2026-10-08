// @editor-module 共用剧情脚本的 Working 归属入口。
import {state} from "../../core/state.js";
import {storyPageDefinitionForView} from "../../core/story-view-config.js";

export async function mountStoryScriptOwner(host, database, resourceId, scriptId) {
  const page = await database.storyScriptOwner(resourceId, scriptId);
  host.querySelector("[data-story-script-owner]")?.remove();
  if (!host.isConnected || !page || page === state.view) return;
  const link = document.createElement("a");
  link.dataset.storyScriptOwner = page;
  link.href = `?view=${encodeURIComponent(page)}`;
  link.textContent = `由${storyPageDefinitionForView(page).navigationLabel}改动 ↗`;
  host.append(link);
}
