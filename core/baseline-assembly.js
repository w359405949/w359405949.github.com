// @editor-module 按发布的分片与填充值装配构建基线。
import {sha256Hex} from "./rom-linker.js";

export async function assembleBaseline(definition, readBinary, onProgress = () => {}) {
  const sections = definition.assembly?.sections;
  if (!Array.isArray(sections) || !sections.length ||
      !Number.isSafeInteger(definition.file_bytes) || definition.file_bytes <= 0) {
    throw new Error("基线装配声明不完整");
  }
  let end = 0;
  for (const section of sections) {
    if (section.file_offset !== end || !Number.isSafeInteger(section.length) || section.length <= 0 ||
        (section.path === undefined
          ? !Number.isInteger(section.fill) || section.fill < 0 || section.fill > 255
          : typeof section.path !== "string" || !section.path || section.fill !== undefined ||
            !/^[0-9a-f]{64}$/.test(section.sha256))) {
      throw new Error("基线装配分片不连续或声明无效");
    }
    end += section.length;
  }
  if (end !== definition.file_bytes) throw new Error("基线装配总长度不符");
  const baseline = new Uint8Array(end);
  let cursor = 0;
  let completed = 0;
  const worker = async () => {
    while (cursor < sections.length) {
      const section = sections[cursor++];
      if (section.path === undefined) {
        baseline.fill(section.fill, section.file_offset, section.file_offset + section.length);
      } else {
        const bytes = await readBinary(section.path);
        if (!(bytes instanceof Uint8Array) || bytes.length !== section.length ||
            await sha256Hex(bytes) !== section.sha256) {
          throw new Error(`${section.path}: 基线分片长度或 SHA-256 不符`);
        }
        baseline.set(bytes, section.file_offset);
      }
      onProgress({message: "装配基线", progress_current: ++completed, progress_total: sections.length});
    }
  };
  await Promise.all(Array.from({length: Math.min(12, sections.length)}, worker));
  if (await sha256Hex(baseline) !== definition.sha256) throw new Error("装配基线 SHA-256 不符");
  return baseline;
}
