// @editor-module 汇总编译器结果与链接器报告。
// 顶层 build_id 标识 ROM/SAV 配对，linker.build_id 保留 ROM 内容身份。
const PACKAGE_BUILD_REPORT_SCHEMA = "metalmaxcn.package-build-report";

function compareText(left, right) {
  const leftPoints = Array.from(left, character => character.codePointAt(0));
  const rightPoints = Array.from(right, character => character.codePointAt(0));
  const length = Math.min(leftPoints.length, rightPoints.length);
  for (let index = 0; index < length; index += 1) {
    if (leftPoints[index] !== rightPoints[index]) {
      return leftPoints[index] - rightPoints[index];
    }
  }
  return leftPoints.length - rightPoints.length;
}

export function changedBuildAssetIds(compilerResults) {
  return [...new Set(compilerResults.flatMap(
    compiler => compiler.changed_asset_ids,
  ))].sort(compareText);
}

export function packageBuildReport(linker, compilerResults, verifiedExcludedAssets, saveMetadata = {}) {
  return {
    schema: PACKAGE_BUILD_REPORT_SCHEMA,
    build_id: linker.build_id,
    target_profile_id: linker.target_profile_id,
    build_map_sha256: linker.build_map_sha256,
    baseline_sha256: linker.baseline_sha256,
    output_sha256: linker.output_sha256,
    ...saveMetadata,
    changed_bytes: linker.changed_bytes,
    changed_asset_ids: changedBuildAssetIds(compilerResults),
    verified_excluded_assets: [...verifiedExcludedAssets],
    omitted_scripts: compilerResults.flatMap(compiler => compiler.omitted_scripts || []),
    compilers: compilerResults.map(compiler => ({
      compiler_id: compiler.compiler_id,
      compiled_asset_ids: [...compiler.compiled_asset_ids],
      changed_asset_ids: [...compiler.changed_asset_ids],
      bundle_asset_ids: compiler.bundles.map(bundle => bundle.asset_id).sort(compareText),
    })),
    linker,
  };
}
