// @editor-module 为开发根路径与静态发布子路径提供同一站点地址。
const root = import.meta.url.startsWith("file:") ? "/" : new URL("../", import.meta.url).pathname;

export const siteUrl = path => `${root}${String(path).replace(/^\/+/, "")}`;
