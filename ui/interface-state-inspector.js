// @editor-module 组件属性按领域注入的字段引用挂载所属字段对象控件。
import {mountFieldObjectColumns} from './field-object-editor.js';

export async function mountInterfaceWidgetFields(host, bindings, {getObject, isCurrent}) {
  for (const binding of bindings) {
    const object = await getObject(binding.resource, binding.handle);
    if (!isCurrent()) return;
    let target = host;
    if (binding.separate) {target = host.ownerDocument.createElement('div'); host.append(target);}
    if (binding.columns) await mountFieldObjectColumns(target, object, binding.columns);
    else await object.mount(target, binding.options);
    if (!isCurrent()) return;
  }
}
