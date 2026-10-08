// @editor-module PRG 物理字段对象覆盖已发布归属、代码与分类字节。

export function createPrgPhysicalFieldObjects(recordPages, {offset, length, bytes = null}) {
  if (!Array.isArray(recordPages) || !Number.isInteger(offset) || offset < 0
      || !Number.isInteger(length) || length < 1) {
    throw new TypeError("PRG 物理字段对象需要有效窗口与记录页");
  }
  const chosen = Array(length).fill(null);
  // 已载入的记录页是连续的字节块。先把它们并成窗口内的区间，逐字节归属只走这些
  // 区间——原来的 `loaded(at)` 对窗口每个字节线性扫一遍页表，代价是
  // 命中记录字节数 × 已载入页数，一次整 bank 关联要几秒。
  const loaded = [];
  for (const page of recordPages) {
    const address = page?.address;
    if (!Number.isInteger(address?.offset) || !Number.isInteger(address?.end_exclusive)) {
      throw new TypeError("PRG 物理字段对象记录页缺少地址");
    }
    const start = Math.max(offset, address.offset);
    const end = Math.min(offset + length, address.end_exclusive);
    if (end <= start) continue;
    loaded.push([start - offset, end - offset]);
  }
  loaded.sort((left, right) => left[0] - right[0]);
  for (let index = 1; index < loaded.length;) {
    if (loaded[index][0] <= loaded[index - 1][1]) {
      loaded[index - 1][1] = Math.max(loaded[index - 1][1], loaded[index][1]);
      loaded.splice(index, 1);
    } else index += 1;
  }
  const records = recordPages.flatMap(page => page?.records?.annotations || [])
    .filter(record => record?.address?.space === "prg"
      && Number.isInteger(record.address.offset)
      && Number.isInteger(record.address.end_exclusive)
      && record.address.end_exclusive > offset
      && record.address.offset < offset + length)
    .sort((left, right) => Number(left.apply_order || 0) - Number(right.apply_order || 0));
  for (const record of records) {
    const start = Math.max(offset, record.address.offset) - offset;
    const end = Math.min(offset + length, record.address.end_exclusive) - offset;
    const owner = record.resource_owner?.resource_id && record.resource_owner?.role
      ? record.resource_owner : null;
    for (const [windowStart, windowEnd] of loaded) {
      if (windowEnd <= start) continue;
      if (windowStart >= end) break;
      for (let local = Math.max(start, windowStart); local < Math.min(end, windowEnd); local += 1) {
        const previous = chosen[local];
        const previousOwner = previous?.resource_owner?.resource_id
          && previous?.resource_owner?.role;
        if (!previous || (owner && (!previousOwner
            || record.address.length <= previous.address.length))
            || (!owner && !previousOwner)) chosen[local] = record;
      }
    }
  }
  const objects = [];
  const byByte = Array(length).fill(null);
  let uncovered = 0;
  for (let local = 0; local < length;) {
    const record = chosen[local];
    if (!record) {uncovered += 1; local += 1; continue;}
    let end = local + 1;
    while (end < length && chosen[end] === record) end += 1;
    const start = offset + local;
    const endExclusive = offset + end;
    const windowStart = local;
    const windowEnd = end;
    const owner = record.resource_owner;
    const ownerId = owner?.resource_id && owner?.role
      ? `${owner.resource_id}/${owner.role}` : null;
    const physical = Object.freeze({space: "prg", offset: start,
      length: end - local, end_exclusive: endExclusive});
    const unpermitted = !ownerId || record.status === "code"
      || owner.resource_id.startsWith("code-module:");
    const object = Object.freeze({
      id: ownerId || `prg.unassigned:${start.toString(16).padStart(6, "0")}-${endExclusive.toString(16).padStart(6, "0")}`,
      resourceId: owner?.resource_id || "prg.unassigned",
      role: owner?.role || null,
      owner: owner ? Object.freeze({
        elementIndex: owner.element_index, elementCount: owner.element_count,
      }) : null,
      physical,
      meaning: record.field?.meaning || record.record || "未细分 PRG 字节",
      status: record.status || "classified",
      writeback: unpermitted ? Object.freeze({state: "unpermitted"}) : null,
      get origin() {return bytes?.slice(windowStart, windowEnd) || null;},
      get working() {return null;},
      get edited() {return false;},
    });
    objects.push(object);
    byByte.fill(object, local, end);
    local = end;
  }
  return Object.freeze({objects: Object.freeze(objects), byByte: Object.freeze(byByte),
    total: length, uncovered});
}

export function projectPrgFieldObjects(annotations, {offset, bytes, owners = null,
  cpuWindows = [], namedRanges = []}) {
  if (!Array.isArray(annotations) || !Number.isInteger(offset) || offset < 0) {
    throw new TypeError("PRG 字段对象投影需要注解窗口");
  }
  const byByte = Array(annotations.length).fill(null);
  const objects = [];
  let uncovered = 0;
  const identity = (annotation, local) => {
    const owner = owners?.[local];
    return owner?.resourceId && owner?.role
      ? `${owner.resourceId}/${owner.role}/${annotation.status === "code" ? "code" : "data"}`
      : `${annotation.status || "classified"}/${annotation.searchKey
        || `${annotation.record}:${annotation.rangeStart}`}`;
  };
  for (let local = 0; local < annotations.length;) {
    const annotation = annotations[local];
    if (!annotation) {uncovered += 1; local += 1; continue;}
    const key = identity(annotation, local);
    let end = local + 1;
    while (end < annotations.length && annotations[end]
        && identity(annotations[end], end) === key) end += 1;
    const windowStart = local, windowEnd = end;
    const start = offset + local;
    const endExclusive = offset + end;
    const owner = owners?.[local] || annotation.resourceOwner;
    const ownerId = owner?.resourceId && owner?.role
      ? `${owner.resourceId}/${owner.role}` : null;
    const presentations = Object.freeze(annotations.slice(local, end));
    const unpermitted = !ownerId || annotation.status === "code"
      || owner.resourceId.startsWith("code-module:");
    const object = Object.freeze({
      id: ownerId || `prg.unassigned:${start.toString(16).padStart(6, "0")}-${endExclusive.toString(16).padStart(6, "0")}`,
      resourceId: owner?.resourceId || "prg.unassigned",
      role: owner?.role || null,
      physical: Object.freeze({space: "prg", offset: start,
        length: end - local, end_exclusive: endExclusive}),
      presentation: annotation,
      presentationAt(physicalOffset) {
        return presentations[physicalOffset - start] || null;
      },
      writeback: unpermitted ? Object.freeze({state: "unpermitted"}) : null,
      get origin() {return bytes?.slice(windowStart, windowEnd) || null;},
      get working() {return null;},
      get edited() {return false;},
    });
    objects.push(object);
    byByte.fill(object, local, end);
    local = end;
  }
  const namedRangeViews = Object.freeze(namedRanges.map(range => {
    const start = Number(range.prg_offset);
    const end = start + Number(range.length || 0);
    const members = new Set();
    for (let at = Math.max(offset, start); at < Math.min(offset + byByte.length, end); at += 1) {
      const object = byByte[at - offset];
      if (object) members.add(object);
    }
    return Object.freeze({...range, fieldObjects: Object.freeze([...members])});
  }));
  return Object.freeze({objects: Object.freeze(objects), byByte: Object.freeze(byByte),
    namedRangeViews, total: annotations.length, uncovered,
    cpuAddressAt(physicalOffset) {
      const object = byByte[physicalOffset - offset];
      if (!object) return null;
      const window = cpuWindows.find(entry => physicalOffset >= entry.offset
        && physicalOffset < entry.offset + entry.length);
      return Number.isInteger(window?.cpuStart)
        ? window.cpuStart + physicalOffset - window.offset : null;
    }});
}
