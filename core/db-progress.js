// @editor-module 将 DB 的真实加载批次与进度上报给日志服务。
import {db} from "./project-db.js";
import {editorLog} from "./editor-log.js";

let unsubscribe = null;
let task = null;

export function bindDbProgress() {
  unsubscribe?.();
  unsubscribe = db.subscribeProgress(snapshot => {
    if (!snapshot.active) {
      task?.finish({message: "数据载入结束", progress: null});
      task = null;
      return;
    }
    const entry = {source: "数据载入", message: "载入数据", details: snapshot.labels.join("、"),
      progress: {current: snapshot.done, total: snapshot.total}};
    if (!task) task = editorLog.startTask(entry);
    else task.update(entry);
  });
}
