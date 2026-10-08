// @editor-module CHR 物理字段对象承载图形资源归属与无归属字节。

export function createChrPhysicalFieldObjects(shard, bytes = null) {
  const {offset: base, length} = shard?.address || {};
  if (shard?.space !== "chr" || !Number.isInteger(base) || base < 0
      || !Number.isInteger(length) || length < 1 || !Array.isArray(shard.resources)) {
    throw new TypeError("CHR 字段对象需要有效 bank 与资源范围");
  }
  const views = shard.resources.map((resource, index) => {
    const address = resource?.address || {};
    if (address.space !== "chr" || !Number.isInteger(address.offset)
        || !Number.isInteger(address.end_exclusive)
        || address.end_exclusive <= address.offset
        || address.end_exclusive <= base || address.offset >= base + length) {
      throw new TypeError(`CHR bank ${shard.bank} 资源范围 ${index} 无效`);
    }
    const associations = (resource.associations || []).map(association => {
      const owner = association.metadata?.resource_owner || association.resource_owner;
      return Object.freeze({
        producer: association.producer, status: association.status,
        resourceIds: Object.freeze([...(association.resource_ids || [])]),
        bindings: Object.freeze([...(association.resource_address_bindings || [])]),
        owner: owner?.resource_id && owner?.role ? Object.freeze({
          resourceId: owner.resource_id, role: owner.role,
          elementIndex: owner.element_index, elementCount: owner.element_count,
        }) : null,
      });
    });
    return Object.freeze({address: Object.freeze({...address}),
      associations: Object.freeze(associations), index});
  });
  const preferred = [...views].sort((left, right) =>
    Number(right.associations.some(association => association.owner))
      - Number(left.associations.some(association => association.owner))
      || left.address.length - right.address.length || left.index - right.index);
  const chosen = Array(length).fill(null);
  for (const view of preferred) {
    const start = Math.max(base, view.address.offset) - base;
    const end = Math.min(base + length, view.address.end_exclusive) - base;
    for (let local = start; local < end; local += 1) chosen[local] ||= view;
  }
  const byByte = Array(length).fill(null);
  const objects = [];
  let uncovered = 0;
  for (let local = 0; local < length;) {
    const view = chosen[local];
    if (!view) {uncovered += 1; local += 1; continue;}
    let end = local + 1;
    while (end < length && chosen[end] === view) end += 1;
    const start = base + local;
    const endExclusive = base + end;
    const windowStart = local, windowEnd = end;
    const owner = view.associations.find(association => association.owner)?.owner;
    const related = Object.freeze(views.filter(item =>
      item.address.offset < endExclusive && item.address.end_exclusive > start));
    const object = Object.freeze({
      id: owner ? `${owner.resourceId}/${owner.role}`
        : `chr.unassigned:${start.toString(16).padStart(6, "0")}-${endExclusive.toString(16).padStart(6, "0")}`,
      resourceId: owner?.resourceId || "chr.unassigned",
      role: owner?.role || null,
      physical: Object.freeze({space: "chr", offset: start,
        length: end - local, end_exclusive: endExclusive}),
      owner,
      rangeViews: related,
      writeback: owner ? null : Object.freeze({state: "unpermitted"}),
      get origin() {return bytes?.slice(windowStart, windowEnd) || null;},
      get working() {return null;},
      get edited() {return false;},
    });
    objects.push(object);
    byByte.fill(object, local, end);
    local = end;
  }
  return Object.freeze({bank: shard.bank, objects: Object.freeze(objects), byByte: Object.freeze(byByte),
    rangeViews: Object.freeze(views), total: length, uncovered});
}
