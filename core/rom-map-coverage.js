// @editor-module 仅按 target bindings 与授权 BuildMap 关系计算字节地图写回覆盖。
// ROM map write coverage comes only from semantic target bindings and their
// authorized BuildMap slot relationship groups.  Manifest writeback labels,
// byte-map roundtrip annotations and extracted reference assets are evidence,
// not linker authority.

function nonNegativeInteger(value) {
    return Number.isInteger(value) && value >= 0;
}

function relationshipRoot(slot) {
    return slot.alias_of || slot.mirror_of || slot.slot_id;
}

function authorizedRomMapSlotRanges(targetDefinition, region, total) {
    if (!targetDefinition || typeof targetDefinition !== "object" ||
        typeof region !== "string" || !region ||
        !nonNegativeInteger(total) || total === 0) {
        return [];
    }

    const profile = targetDefinition.profile;
    const buildMap = targetDefinition.build_map;
    const bindings = targetDefinition.bindings;
    if (!profile || !buildMap || !bindings ||
        !Array.isArray(profile.regions) ||
        !Array.isArray(buildMap.slots) ||
        !Array.isArray(bindings.bindings) ||
        typeof profile.profile_id !== "string" || !profile.profile_id ||
        buildMap.target_profile_id !== profile.profile_id ||
        bindings.target_profile_id !== profile.profile_id ||
        typeof profile.build_map_sha256 !== "string" ||
        !profile.build_map_sha256 ||
        bindings.build_map_sha256 !== profile.build_map_sha256) {
        return [];
    }

    const targetRegion = profile.regions.find(item => item?.kind === region);
    if (!targetRegion || !nonNegativeInteger(targetRegion.file_offset) ||
        !Number.isInteger(targetRegion.size) || targetRegion.size <= 0) {
        return [];
    }
    const limit = Math.min(total, targetRegion.size);
    const slotsById = new Map();
    for (const slot of buildMap.slots) {
        if (!slot || typeof slot.slot_id !== "string" || !slot.slot_id) continue;
        slotsById.set(slot.slot_id, slot);
    }

    const authorizedRoots = new Set();
    for (const binding of bindings.bindings) {
        if (!binding || typeof binding.compiler_id !== "string" ||
            !binding.compiler_id || !Array.isArray(binding.sources)) continue;
        for (const source of binding.sources) {
            const slot = slotsById.get(source?.slot_id);
            if (!slot) continue;
            const rootId = relationshipRoot(slot);
            const root = slotsById.get(rootId);
            if (root && relationshipRoot(root) === root.slot_id) {
                authorizedRoots.add(rootId);
            }
        }
    }

    const ranges = [];
    for (const slot of buildMap.slots) {
        if (!slot || slot.region !== region ||
            !authorizedRoots.has(relationshipRoot(slot)) ||
            !nonNegativeInteger(slot.file_offset) ||
            !Number.isInteger(slot.capacity) || slot.capacity <= 0) continue;
        const start = slot.file_offset - targetRegion.file_offset;
        const end = start + slot.capacity;
        if (end <= 0 || start >= limit) continue;
        ranges.push([Math.max(0, start), Math.min(limit, end)]);
    }
    ranges.sort((left, right) => left[0] - right[0] || left[1] - right[1]);

    const merged = [];
    for (const [start, end] of ranges) {
        const previous = merged.at(-1);
        if (!previous || start > previous[1]) merged.push([start, end]);
        else previous[1] = Math.max(previous[1], end);
    }
    return merged;
}

export function authorizedRomMapSlotBytes(targetDefinition, region, total) {
    return authorizedRomMapSlotRanges(targetDefinition, region, total)
        .reduce((covered, [start, end]) => covered + end - start, 0);
}
