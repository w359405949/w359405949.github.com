import { createStaticPackageBootstrapProvider, openActiveProjectStore, openProjectSessionFromPackage, bootstrapActiveProjectFromPackage, buildBrowserRom, createProjectStoreRomBuildProvider } from '../js/scene-actors-Cftr7mCE.js';
import { state } from '../js/emulator-Bl-sLXnd.js';
import '../js/baseline-assembly-C0KRII8X.js';
import '../js/project-store-values-klefznSR.js';

// @editor-module 在浏览器 Worker 中执行快速构建，并发布准备子项与构建事件。

self.onmessage = async () => {
  const timings = {};
  let lastEventAt = performance.now();
  const emit = event => {
    const now = performance.now();
    self.postMessage({type: "event", event: {...event, duration_ms: now - lastEventAt}});
    lastEventAt = now;
  };
  try {
    emit({stage: "hydrate", message: "打开项目仓库"});
    const hydrateStarted = performance.now();
    const onProgress = event => emit({stage: "hydrate", ...event});
    const provider = createStaticPackageBootstrapProvider({onProgress});
    const repository = await openActiveProjectStore();
    onProgress({message: "读取发布清单"});
    const packageManifest = await provider.loadManifest();
    onProgress({message: "打开字段对象会话"});
    const session = await openProjectSessionFromPackage(repository, provider, packageManifest);
    state.projectRepository = session.repository;
    state.browserPackageManifest = packageManifest;
    const hydrated = await bootstrapActiveProjectFromPackage({
      verify: false,
      onProgress,
      provider: {...provider, loadManifest: async () => packageManifest},
    });
    timings.hydrate = performance.now() - hydrateStarted;
    state.projectRepository = repository;
    state.browserProjectManifest = hydrated.manifest;
    emit({stage: "hydrate", status: "success", message: "构建数据已就绪"});
    self.postMessage({type: "hydrated", manifest: hydrated.manifest});
    const result = await buildBrowserRom({
      verify: false,
      verification: hydrated.verification,
      timings,
      provider: createProjectStoreRomBuildProvider(state.projectRepository),
      onEvent: emit,
    });
    self.postMessage({type: "complete", result, manifest: state.browserProjectManifest, timings},
      [result.rom.buffer, result.save.buffer]);
  } catch (error) {
    self.postMessage({type: "error", message: error instanceof Error ? error.message : String(error), stack: error?.stack});
  }
};
