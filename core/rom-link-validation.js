// @editor-module 在 ROM 写入前统一校验目标、映射、基线与片段。
import {
    RomLinker, LinkerError, LinkerSchemaError, canonicalHash, canonicalJson,
    compareText, identifierRepr, normalizeBundle, sha256Hex,
} from "./rom-linker.js";
import {validateStoryFarjumpWrites} from "./story-farjump-validation.js";
import {validateSceneMapExpansionWrites} from './scene-map-expansion.js';
import {validateApplicationReaderWrites} from './application-reader-validation.js';
import {validateExpansionSharedPool} from './expansion-shared-pool.js';

class TargetValidationError extends LinkerError {}
class BuildMapValidationError extends LinkerError {}
class PreimageError extends LinkerError {}
class OwnershipError extends LinkerError {}
class CapacityError extends LinkerError {}
class OverlapError extends LinkerError {}
class AtomicGroupError extends LinkerError {}

const regionByKind = (target, kind) => target.regions.find(region => region.kind === kind);
const slotEnd = slot => slot.file_offset + slot.capacity;
const relationshipRoot = slot => slot.alias_of || slot.mirror_of || slot.slot_id;
const bytesEqual = (left, right) => left.length === right.length &&
    left.every((byte, index) => byte === right[index]);
const staticValidationCache = new Set();

function nes2RomSize(lsb, msbNibble, unit) {
    if (msbNibble !== 0x0f) return ((msbNibble << 8) | lsb) * unit;
    return (2 ** (lsb >> 2)) * ((lsb & 0x03) * 2 + 1);
}

export function romHeaderSizes(header) {
    const nes2 = (header[7] & 0x0c) === 0x08;
    return {
        prgBytes: nes2 ? nes2RomSize(header[4], header[9] & 0x0f, 16 * 1024)
            : header[4] * 16 * 1024,
        chrBytes: nes2 ? nes2RomSize(header[5], header[9] >> 4, 8 * 1024)
            : header[5] * 8 * 1024,
    };
}

class LinkValidation {
    constructor(linker) {
        this.baseline = linker.baseline;
        this.target = linker.target;
        this.buildMap = linker.buildMap;
        this.slots = linker.slots;
        this.linker = linker;
    }

    async validateTargetAndMap() {
        if (this.buildMap.target_profile_id !== this.target.profile_id) {
            throw new BuildMapValidationError("BuildMap target_profile_id does not match the target profile");
        }
        const mapHash = await canonicalHash({...this.buildMap,
            slots: [...this.buildMap.slots].sort((left, right) => compareText(left.slot_id, right.slot_id))});
        if (mapHash !== this.target.build_map_sha256) {
            throw new BuildMapValidationError("BuildMap hash does not match the hash pinned by the target profile");
        }
        for (const slot of this.buildMap.slots) {
            const region = regionByKind(this.target, slot.region);
            if (slot.file_offset < region.file_offset || slotEnd(slot) > region.file_offset + region.size) {
                throw new BuildMapValidationError(`slot ${identifierRepr(slot.slot_id)} escapes the ${slot.region} region`);
            }
            const relative = slot.file_offset - region.file_offset;
            const bankIndex = Math.floor(relative / region.bank_size);
            const bankOffset = relative % region.bank_size;
            if (slot.bank_index !== bankIndex || slot.bank_offset !== bankOffset) {
                throw new BuildMapValidationError(`slot ${identifierRepr(slot.slot_id)} bank coordinates do not match file_offset`);
            }
            if (bankOffset + slot.capacity > region.bank_size) {
                throw new BuildMapValidationError(`slot ${identifierRepr(slot.slot_id)} crosses a physical bank boundary`);
            }
            if (slot.bank_offset % slot.alignment) {
                throw new BuildMapValidationError(`slot ${identifierRepr(slot.slot_id)} bank offset violates its alignment`);
            }
        }
        for (const slot of this.buildMap.slots) {
            const relation = slot.alias_of || slot.mirror_of;
            if (relation === null) continue;
            const target = this.slots.get(relation);
            if (!target) {
                throw new BuildMapValidationError(
                    `slot ${identifierRepr(slot.slot_id)} refers to missing slot ${identifierRepr(relation)}`);
            }
            if (target.alias_of !== null || target.mirror_of !== null) {
                throw new BuildMapValidationError("alias/mirror references must point directly to a relationship root");
            }
            if (slot.atomic_group !== target.atomic_group) {
                throw new BuildMapValidationError("related slots must use the same atomic_group");
            }
            if (slot.alias_of !== null) this.validateAlias(slot, target);
            else this.validateMirror(slot, target);
        }
        const ordered = [...this.buildMap.slots].sort((left, right) =>
            left.file_offset - right.file_offset || slotEnd(left) - slotEnd(right) ||
            compareText(left.slot_id, right.slot_id));
        for (let leftIndex = 0; leftIndex < ordered.length; leftIndex += 1) {
            const left = ordered[leftIndex];
            for (const right of ordered.slice(leftIndex + 1)) {
                if (right.file_offset >= slotEnd(left)) break;
                const exact = left.file_offset === right.file_offset &&
                    slotEnd(left) === slotEnd(right) &&
                    relationshipRoot(left) === relationshipRoot(right) &&
                    (left.alias_of !== null || right.alias_of !== null);
                if (!exact) {
                    throw new OverlapError(
                        `slots ${identifierRepr(left.slot_id)} and ${identifierRepr(right.slot_id)} overlap`);
                }
            }
        }
    }

    validateAlias(slot, target) {
        const fields = ["region", "file_offset", "capacity", "bank_index", "bank_offset",
            "baseline_bin", "preimage_sha256", "alignment", "fill", "runtime_address"];
        if (fields.some(field => slot[field] !== target[field])) {
            throw new BuildMapValidationError(
                `alias ${identifierRepr(slot.slot_id)} must exactly describe ${identifierRepr(target.slot_id)}`);
        }
    }

    validateMirror(slot, target) {
        const fields = ["region", "capacity", "alignment", "fill", "owner"];
        if (fields.some(field => slot[field] !== target[field])) {
            throw new BuildMapValidationError(`mirror ${identifierRepr(slot.slot_id)} has incompatible slot semantics`);
        }
        if (slot.file_offset < slotEnd(target) && target.file_offset < slotEnd(slot)) {
            throw new OverlapError("mirror slots must occupy distinct physical ranges");
        }
    }

    async validateBaseline() {
        const fileSize = regionByKind(this.target, "chr").file_offset + regionByKind(this.target, "chr").size;
        if (this.baseline.length !== fileSize) {
            throw new TargetValidationError(`baseline is ${this.baseline.length} bytes; target requires ${fileSize}`);
        }
        if (this.linker.baselineSha256 !== this.target.baseline_sha256) {
            throw new TargetValidationError("baseline hash does not match target profile");
        }
        this.validateOutputLayout(this.baseline);
    }

    validateOutputLayout(data) {
        const expectedSize = regionByKind(this.target, "chr").file_offset + regionByKind(this.target, "chr").size;
        if (data.length !== expectedSize) {
            throw new TargetValidationError("ROM output length no longer matches target");
        }
        this.validateHeader(data.subarray(0, 16));
    }

    validateHeader(header) {
        if (!bytesEqual(header.subarray(0, 4), new Uint8Array([0x4e, 0x45, 0x53, 0x1a]))) {
            throw new TargetValidationError("baseline is missing the iNES signature");
        }
        if (header[6] & 0x04) {
            throw new TargetValidationError("trainer-bearing ROMs require an explicit region schema");
        }
        const nes2 = (header[7] & 0x0c) === 0x08;
        let mapper = (header[6] >> 4) | (header[7] & 0xf0);
        let submapper = null;
        const {prgBytes: prgSize, chrBytes: chrSize} = romHeaderSizes(header);
        if (nes2) {
            mapper |= (header[8] & 0x0f) << 8;
            submapper = header[8] >> 4;
        }
        if (mapper !== this.target.mapper) {
            throw new TargetValidationError(`baseline mapper ${mapper} does not match target ${this.target.mapper}`);
        }
        if (this.target.submapper !== null && submapper !== this.target.submapper) {
            throw new TargetValidationError("baseline submapper does not match target");
        }
        if (prgSize !== regionByKind(this.target, "prg").size) {
            throw new TargetValidationError("baseline PRG size does not match target region");
        }
        if (chrSize !== regionByKind(this.target, "chr").size) {
            throw new TargetValidationError("baseline CHR size does not match target region");
        }
    }

    async validatePreimages() {
        for (const slot of this.buildMap.slots) {
            const preimage = this.baseline.slice(slot.file_offset, slotEnd(slot));
            if (await sha256Hex(preimage) !== slot.preimage_sha256) {
                throw new PreimageError(`slot ${identifierRepr(slot.slot_id)} preimage hash does not match baseline`);
            }
        }
    }

    validateTargetedSlots(fragments) {
        const targetedSlots = new Map();
        for (const fragment of fragments) {
            const previous = targetedSlots.get(fragment.slot_id) || [];
            if (previous.length && (fragment.offset_in_slot === undefined ||
                previous.some(item => item.offset_in_slot === undefined))) {
                throw new OverlapError("only one fragment may directly target a logical slot");
            }
            if (previous.some(item => item.offset_in_slot < fragment.offset_in_slot + fragment.payload.length &&
                fragment.offset_in_slot < item.offset_in_slot + item.payload.length)) {
                throw new OverlapError("fragments targeting the same logical slot overlap");
            }
            previous.push(fragment);
            targetedSlots.set(fragment.slot_id, previous);
        }
    }

    validateFragments(fragments) {
        for (const fragment of fragments) {
            const slot = this.slots.get(fragment.slot_id);
            if (!slot) {
                throw new BuildMapValidationError(
                    `fragment ${fragment.asset_id}/${fragment.fragment_id} targets unknown slot ` +
                    identifierRepr(fragment.slot_id));
            }
            if (fragment.asset_id !== slot.owner) {
                throw new OwnershipError(
                    `asset ${identifierRepr(fragment.asset_id)} does not own slot ${identifierRepr(slot.slot_id)}`);
            }
            const offset = fragment.offset_in_slot ?? 0;
            if (offset + fragment.payload.length > slot.capacity) {
                throw new CapacityError(
                    `fragment ${fragment.asset_id}/${fragment.fragment_id} uses ` +
                    `${fragment.payload.length} bytes; slot capacity is ${slot.capacity}`);
            }
            if (fragment.alignment > slot.alignment || slot.alignment % fragment.alignment ||
                (slot.bank_offset + offset) % fragment.alignment) {
                throw new CapacityError(
                    `fragment ${fragment.asset_id}/${fragment.fragment_id} alignment ` +
                    `is incompatible with slot ${identifierRepr(slot.slot_id)}`);
            }
        }
    }

    validateAtomicGroups(fragments) {
        const groups = new Map();
        for (const slot of this.buildMap.slots) {
            if (slot.atomic_group === null) continue;
            if (!groups.has(slot.atomic_group)) groups.set(slot.atomic_group, new Set());
            groups.get(slot.atomic_group).add(relationshipRoot(slot));
        }
        const touched = new Set(fragments.map(fragment => relationshipRoot(this.slots.get(fragment.slot_id))));
        for (const [groupId, required] of groups) {
            const present = new Set([...required].filter(slotId => touched.has(slotId)));
            if (present.size && present.size !== required.size) {
                const missing = [...required].filter(slotId => !present.has(slotId)).sort(compareText);
                throw new AtomicGroupError(
                    `atomic group ${identifierRepr(groupId)} is missing slots: ${missing.join(", ")}`);
            }
        }
    }

    validateRelatedWrites(resolved) {
        const sourcesByRoot = new Map();
        for (const item of resolved) {
            const root = relationshipRoot(item.slot);
            if (!sourcesByRoot.has(root)) sourcesByRoot.set(root, []);
            sourcesByRoot.get(root).push(item);
        }
        const membersByRoot = new Map();
        for (const slot of this.buildMap.slots) {
            const root = relationshipRoot(slot);
            if (!membersByRoot.has(root)) membersByRoot.set(root, []);
            membersByRoot.get(root).push(slot);
        }
        for (const rootId of [...sourcesByRoot.keys()].sort(compareText)) {
            const sources = sourcesByRoot.get(rootId).sort((left, right) =>
                compareText(left.fragment.asset_id, right.fragment.asset_id) ||
                compareText(left.fragment.fragment_id, right.fragment.fragment_id));
            if (sources.some(item => item.fragment.offset_in_slot !== undefined)) {
                if (sources.some(item => item.fragment.offset_in_slot === undefined)) {
                    throw new OverlapError("partial and complete fragments share a slot group");
                }
                const byOffset = new Map();
                for (const item of sources) {
                    const offset = item.fragment.offset_in_slot;
                    const same = byOffset.get(offset);
                    if (same && !bytesEqual(same[0].payload, item.payload)) {
                        throw new OverlapError("related partial fragments differ");
                    }
                    if (!same) byOffset.set(offset, [item]); else same.push(item);
                }
                const spans = [...byOffset.entries()].sort((a, b) => a[0] - b[0]);
                for (let index = 1; index < spans.length; index += 1) {
                    if (spans[index][0] < spans[index - 1][0] + spans[index - 1][1][0].payload.length) {
                        throw new OverlapError("related partial fragments overlap");
                    }
                }
                const physical = new Map();
                for (const slot of membersByRoot.get(rootId)) {
                    const key = canonicalJson([slot.file_offset, slot.capacity]);
                    if (!physical.has(key)) physical.set(key, []);
                    physical.get(key).push(slot);
                }
                const projected = [...physical.values()].map(slots => {
                    const slot = slots[0];
                    const data = this.baseline.slice(slot.file_offset, slotEnd(slot));
                    for (const [offset, items] of spans) data.set(items[0].payload, offset);
                    return data;
                });
                if (projected.slice(1).some(data => !bytesEqual(data, projected[0]))) {
                    throw new OverlapError(`mirror group ${identifierRepr(rootId)} does not render identical bytes`);
                }
                for (const slots of physical.values()) for (const [offset, items] of spans) {
                    if (offset + items[0].payload.length > slots[0].capacity) {
                        throw new CapacityError("partial fragment escapes related slot");
                    }
                }
                continue;
            }
            const payload = sources[0].payload;
            if (sources.slice(1).some(item => !bytesEqual(item.payload, payload))) {
                throw new OverlapError(`related slot group ${identifierRepr(rootId)} received different payloads`);
            }
            const byRange = new Map();
            for (const member of membersByRoot.get(rootId)) {
                const key = canonicalJson([member.file_offset, member.capacity]);
                if (!byRange.has(key)) byRange.set(key, []);
                byRange.get(key).push(member);
            }
            const rendered = [...byRange.values()].sort((left, right) =>
                left[0].file_offset - right[0].file_offset || left[0].capacity - right[0].capacity)
                .map(members => this.linker.renderSlot(members[0], payload));
            if (rendered.slice(1).some(data => !bytesEqual(data, rendered[0]))) {
                throw new OverlapError(`mirror group ${identifierRepr(rootId)} does not render identical bytes`);
            }
        }
    }

    validatePlannedWrites(planned) {
        for (let index = 1; index < planned.length; index += 1) {
            const previous = planned[index - 1];
            const current = planned[index];
            if (current.slot.file_offset + (current.offset_in_slot ?? 0) <
                previous.slot.file_offset + (previous.offset_in_slot ?? 0) + previous.data.length) {
                throw new OverlapError(
                    `planned writes for ${identifierRepr(previous.slot_ids)} and ` +
                    `${identifierRepr(current.slot_ids)} overlap`);
            }
        }
    }

    validateOutputHeader(planned) {
        const header = this.baseline.slice(0, 16);
        for (const write of planned) {
            const start = write.slot.file_offset + (write.offset_in_slot ?? 0);
            for (let index = Math.max(0, start); index < Math.min(16, start + write.data.length); index += 1) {
                header[index] = write.data[index - start];
            }
        }
        this.validateHeader(header);
    }
}

/** Validate the complete ROM build before calling linkRom. */
export async function validateRomLinkInputs({baseline, target, buildMap, bundles}) {
    const linker = await RomLinker.create({baseline, target, buildMap});
    const validation = new LinkValidation(linker);
    const staticKey = await canonicalHash([
        linker.baselineSha256, linker.target, linker.buildMap,
    ]);
    if (!staticValidationCache.has(staticKey)) {
        await validation.validateTargetAndMap();
        await validation.validateBaseline();
        await validation.validatePreimages();
        await validateExpansionSharedPool(linker);
        if (staticValidationCache.size >= 4) staticValidationCache.clear();
        staticValidationCache.add(staticKey);
    }
    if (!bundles || typeof bundles[Symbol.iterator] !== "function") {
        throw new LinkerSchemaError("bundles must be iterable");
    }
    const normalized = [];
    for (const input of bundles) normalized.push(await normalizeBundle(input));
    normalized.sort((left, right) => compareText(left.asset_id, right.asset_id));
    const assetIds = normalized.map(bundle => bundle.asset_id);
    if (new Set(assetIds).size !== assetIds.length) {
        throw new LinkerSchemaError("bundle asset IDs must be globally unique");
    }
    const fragments = normalized.flatMap(bundle => bundle.fragments)
        .sort((left, right) => compareText(left.asset_id, right.asset_id) ||
            compareText(left.fragment_id, right.fragment_id));
    const keys = fragments.map(fragment => canonicalJson([fragment.asset_id, fragment.fragment_id]));
    if (new Set(keys).size !== keys.length) {
        throw new LinkerSchemaError("fragment identity must be globally unique");
    }
    validation.validateTargetedSlots(fragments);
    validation.validateFragments(fragments);
    validation.validateAtomicGroups(fragments);
    const resolved = fragments.map(fragment => linker.resolveFragment(fragment));
    await validateStoryFarjumpWrites(linker, resolved);
    await validateSceneMapExpansionWrites(linker, resolved);
    await validateApplicationReaderWrites(linker, resolved);
    validation.validateRelatedWrites(resolved);
    const planned = linker.planWrites(resolved);
    validation.validatePlannedWrites(planned);
    validation.validateOutputHeader(planned);
}
