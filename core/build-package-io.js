// @editor-module 提供显式构建阶段的静态包二进制读取入口。
// 构建阶段读取静态包二进制的唯一入口。
//
// 普通页面只能消费 JSON、图片或浏览器项目中已经存在的语义资产；不得从
// `/package/` 请求 layout、region、pattern 等 `.bin`。把读取器放在独立模块，
// 让 import 边界本身就能被测试审计。

import {readPackageBytes} from "./package-cache.js";

export async function packageBuildBinary(path) {
    return new Uint8Array(await readPackageBytes(path));
}
