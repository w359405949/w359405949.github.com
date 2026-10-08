// @editor-module 全部 owner 组件的唯一装配入口
//
// `ui/module-components.js` 的可嵌入能力靠副作用登记：文件没被 import，那一格就是空的。
//
// **这份清单只此一份。** 谁要"所有模块的处理器都在场"就 import 本文件：模块工作台
// 要它才渲染得出 editor，处理器登记页要它才数得准。抄第二份清单的后果不是报错，
// 是那一页少了几行而没人看得出来——恰恰是这两张表最该防住的事。
//
// 新增 owner 组件文件时加在这里，按路径排序。

import "./actor/components.js";
import "./audio/components.js";
import "./battle/components.js";
import "./battle/reference-coverage-components.js";
import "./audio-sequence-reference.js";
import "./encounter/components.js";
import "./encounter/zone-components.js";
import "./facility/components.js";
import "./generic-components.js";
import "./item/components.js";
import "./item/field-use-components.js";
import "./item/healing-components.js";
import "./metasprite/components.js";
import "./metasprite/direct-frame-components.js";
import "./monster/components.js";
import "./monster/visual-components.js";
import "./save/components.js";
import "./scene/components.js";
import "./scene/investigation-components.js";
import "./scene/object-components.js";
import "./scene/step-effects.js";
import "./scene/transfer-components.js";
import "./shell/components.js";
import "./story/components.js";
import "./story/interaction-components.js";
import "./text/components.js";
import "./visual/components.js";
import "./visual/sprite-palette-components.js";
import "../ui/actor-appearance.js";
