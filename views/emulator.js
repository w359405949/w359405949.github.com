// @editor-module 游戏模拟器：把独立运行页嵌进编辑器
//
// 视图本身只产出一个 <iframe>。真正的模拟器逻辑在 engine/editor/emulator.js，
// 跑在 iframe 自己的文档里。
//
// 为什么隔离到 iframe 而不是内联进 SPA：
//   1. EmulatorJS 没有 destroy API。实例启动后即使把容器从 DOM 里摘掉，WASM、
//      requestAnimationFrame 和音频仍在跑。而 render() 每次都整块重写 #content，
//      内联的话一切换视图就会留下一个既看不见又停不掉、还在出声的僵尸实例。
//      卸载 iframe 会让浏览器回收整个文档，是唯一可靠的停止方式。
//   2. 上游把 emulator.min.css 追加到 document.head、把 emscripten 核心的 blob
//      <script> 追加到 document.body。关在 iframe 里，这些副作用碰不到编辑器。
//   3. 键盘事件不会外泄：EmulatorJS 把按键绑在自己的容器上，而编辑器在 document
//      上监听 Ctrl+K / Escape。同文档的话游戏内按 K 会抢走搜索框焦点。

import {state} from "../core/state.js";
import {siteUrl} from "../core/site-url.js";

export function renderEmulator() {
  const roms = state.project?.manifest?.rom;
  const name = roms?.source_name || "metalmaxcn.nes";
  // data-rom 是 render() 判断"能否复用现有 iframe"的依据：同一个 ROM 就留着别动，
  // 换了 ROM（比如刚点完"运行新 ROM"）才允许重建。
  const rom = state.emulatorRom || "latest";
  const src = rom ? `${siteUrl("emulator.html")}?rom=${encodeURIComponent(rom)}` : siteUrl("emulator.html");
  return `
    <div class="section-line">
      <h2>运行 ${name}</h2>
      <a class="button ghost" href="${src}" target="_blank" rel="noopener" title="独立窗口" aria-label="独立窗口">↗</a>
    </div>
    <div class="emulator-stage">
      <iframe
        id="emulator-frame"
        data-rom="${rom}"
        src="${src}"
        title="游戏模拟器"
        allow="gamepad *; autoplay"></iframe>
    </div>
  `;
}
