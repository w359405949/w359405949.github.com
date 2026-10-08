// @editor-module 在页面模块解析前启动清单读取与按页预取。
import {prefetchPackageJson} from "./package-io.js";
void prefetchPackageJson("manifest.json").catch(() => {});
void import("./startup-prefetch.js").catch(() => {});
