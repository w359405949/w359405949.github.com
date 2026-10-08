// @editor-module 为编辑器、构建器与模拟器共享同一浏览器项目会话。
// One browser project session shared by the editor, builder, and emulator.

import {
    IndexedDbProjectStore,
    PROJECT_DATABASE_NAME,
} from "./project-store.js";

export const ACTIVE_PROJECT_ID = "metalmaxcn";

let activeStorePromise = null;

export function openActiveProjectStore(options = {}) {
    if (!activeStorePromise) {
        activeStorePromise = IndexedDbProjectStore.open({
            projectId: ACTIVE_PROJECT_ID,
            databaseName: PROJECT_DATABASE_NAME,
            ...options,
        }).catch(error => {
            activeStorePromise = null;
            throw error;
        });
    }
    return activeStorePromise;
}
