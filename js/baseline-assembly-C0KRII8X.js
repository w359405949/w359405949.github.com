import { sha256Hex } from './project-store-values-klefznSR.js';

// @editor-module 物理字段对象读取已发布符号来源。

const BYTE_MAP_INDEX_PATH = "analysis/byte-map/index.json";
const RESOURCE_RANGE_INDEX_PATH = "analysis/byte-map/resource-byte-ranges.json";

async function loadPhysicalFieldSourceIndex(database) {
  const manifest = await database.getPackageDocument(BYTE_MAP_INDEX_PATH, null, {readonly: true});
  if (!manifest?.bank_shards || !Array.isArray(manifest.address_spaces)) {
    throw new Error("物理字段对象地址空间清单无效");
  }
  return manifest;
}

async function loadResourceRangeAssociationManifest(database) {
  const manifest = await database.getPackageDocument(RESOURCE_RANGE_INDEX_PATH, null, {readonly: true});
  if (!manifest?.shards || typeof manifest.shards !== "object") {
    throw new Error("资源关联范围清单无效");
  }
  return manifest;
}

async function loadResourceRangeAssociationShard(database, manifest, shard) {
  const spec = manifest?.shards?.[shard];
  if (typeof spec?.path !== "string" || !spec.path) return null;
  const document_ = await database.getPackageDocument(spec.path, null, {readonly: true});
  if (document_?.shard !== shard || !document_.by_uid
      || typeof document_.by_uid !== "object") {
    throw new Error(`资源关联范围分片 ${shard} 无效`);
  }
  return document_;
}

// @editor-module 剧情编辑页面声明执行链、播放配置与既有路由。
let publishedSequences = [];
let publishedNavigation = [];

function applyStoryPageNames(project) {
  const sequences = project?.story?.browser_vm?.sequences;
  const navigation = project?.story_navigation;
  if ((sequences === publishedSequences || (!sequences && !publishedSequences.length))
      && (navigation === publishedNavigation || (!navigation && !publishedNavigation.length))) return false;
  publishedSequences = sequences || [];
  publishedNavigation = navigation || [];
  return true;
}

function storyPageName(label) {
  return String(label)
    .replace(/scene-actor:([0-9A-F]+):([0-9A-F]+)/gu, "角色 $1·$2")
    .replace(/encounter-formation:([0-9A-F]+)/gu, "编队 $1")
    .replace(/scene-actor-list:/gu, "")
    .replace(/story-interaction-script:script:/gu, "交互 ");
}

function storyPage(definition) {
  return Object.freeze({
    editable: true,
    ...definition,
    get navigationLabel() {
      return publishedSequences.find(row => row.id === definition.sequenceId)?.label
        || publishedNavigation.find(row => row.view === definition.view)?.label
        || storyPageName(definition.navigationLabel);
    },
    get title() {
      return publishedSequences.find(row => row.id === definition.sequenceId)?.label
        || publishedNavigation.find(row => row.view === definition.view)?.label
        || storyPageName(definition.title);
    },
    eyebrow: storyPageName(definition.eyebrow),
  });
}

function identifiedStory(view, sequenceId, actorListHex, name, detail) {
  return storyPage({
    view,
    sequenceId,
    navigationLabel: `${name} scene-actor-list:${actorListHex}`,
    eyebrow: `STORY scene-actor-list:${actorListHex}`,
    title: `${name} scene-actor-list:${actorListHex}`,
    description: `${name}对应普通角色表 $${actorListHex} 的不可操控执行链。${detail}。`,
  });
}

// 酒馆以场景 $22 重新检查事件位 $78 的进场边界分页。
const STORY_SOURCE_PAGES = Object.freeze([
  storyPage({view: 'story-page', navigation: false, navigationLabel: '剧情页',
    title: '剧情页', eyebrow: 'STORY', links: []}),
  storyPage({
    view: "story-sequence",
    navigation: false,
    navigationLabel: "剧情执行链",
    eyebrow: "STORY SEQUENCE",
    title: "剧情执行链",
    description: "查看场景关联的剧情执行链。",
  }),
  storyPage({
    view: "opening",
    sequenceId: "story-f0-f1",
    navigationLabel: "开场·被赶出家门",
    eyebrow: "OPENING ANIMATION",
    title: "开场动画",
    description: "独立回放开场“被父亲赶出家门”的 $F0 → $F1 剧情演出、对话、角色动作与音频事件。",
  }),
  storyPage({
    view: "scene-entry-02",
    sequenceId: "scene-entry-02",
    navigationLabel: "家门外首次进场",
    eyebrow: "SCENE ENTRY scene-actor-list:02",
    title: "家门外首次进场",
    description: "场景 $02 普通角色脚本 $0F/$56 在 global-event-flag:11 未置位时执行，完成后写入 global-event-flag:11。",
  }),
  storyPage({
    view: "cutscene-f2",
    sequenceId: "story-f2",
    navigationLabel: "死亡复活 scene-actor-list:F2",
    eyebrow: "STORY scene-actor-list:F2",
    title: "死亡复活 scene-actor-list:F2",
    description: "全灭后的死亡复活演出。代码驱动，仅可调整内容。",
  }),
  storyPage({
    view: "cutscene-f3",
    sequenceId: "story-f3",
    navigationLabel: "洞窟狼孩 scene-actor-list:F3",
    eyebrow: "STORY scene-actor-list:F3",
    title: "洞窟狼孩 scene-actor-list:F3",
    description: "洞窟狼孩事件演出。代码驱动，仅可调整内容。",
  }),
  storyPage({
    view: "cutscene-f4f8",
    sequenceId: "story-f4-f8",
    preludeSequenceId: "ordinary-control-lock-list-24",
    navigationLabel: "酒馆冲突 scene-actor-list:F4",
    eyebrow: "STORY scene-actor-list:F4",
    title: "酒馆冲突 scene-actor-list:F4",
    description: "酒馆普通表 $24 前置与 $F4 演出在写 global-event-flag:78 并进入场景 $22 后结束。",
  }),
  storyPage({
    view: "scene-entry-22",
    sequenceId: "scene-entry-22",
    navigationLabel: "酒馆门外与伙伴加入",
    eyebrow: "SCENE ENTRY scene-actor-list:22",
    title: "酒馆门外与伙伴加入",
    description: "场景 $22 检查 global-event-flag:78 后锁控，写 global-event-flag:1A 并清 global-event-flag:78 后延续到场景 $24 的 $F8，结束写 global-event-flag:1B。",
  }),
  storyPage({
    view: "cutscene-f5f9",
    sequenceId: "story-f5-f9",
    navigationLabel: "戈麦斯基地",
    eyebrow: "STORY GOMEZ",
    title: "戈麦斯基地",
    description: "戈麦斯基地与红狼事件的三段演出。代码驱动，仅可调整内容。",
  }),
  storyPage({
    view: "scene-variant-f7",
    sequenceId: "scene-variant-f7",
    navigationLabel: "狗与墓地 scene-actor-list:F7",
    eyebrow: "SCENE ACTION scene-actor-list:F7",
    title: "狗与墓地 scene-actor-list:F7",
    description: "场景 $73 中持续运行的狗绕行动作。玩家操控始终保留；它不是锁控剧情，但复用剧情工作台独立查看和编辑。",
  }),
  storyPage({
    view: "cutscene-f6",
    sequenceId: "story-f6",
    navigationLabel: "阻塞场景 scene-actor-list:F6",
    eyebrow: "STORY scene-actor-list:F6",
    title: "阻塞场景 scene-actor-list:F6",
    description: "场景 $F6 的专用阻塞流程；自然入口与后续 route 0 已定位，逐帧 VM 会在专用机器码边界明确停住。",
  }),
  identifiedStory(
    "cutscene-lock-2b", "extended-fb-list-2b", "2B",
    "酒吧剧情",
    "酒吧场景台词涉及东北海湾与潮汐洞穴",
  ),
  identifiedStory(
    "cutscene-lock-40", "extended-fc-list-40", "40",
    "无歌村",
    "无歌村的坐标门与成对控制锁已定位，台词涉及萧条镇子与酒馆",
  ),
  identifiedStory(
    "cutscene-lock-7b", "extended-fd-list-7b", "7B",
    "无敌医院",
    "与 $7C/$7D 同属无敌医院 Boss 剧情，但各自独立触发、不会连续播放；脚本 $4C 的成对控制锁会在当前场景内自然返回",
  ),
  identifiedStory(
    "cutscene-lock-7c", "extended-fe-list-7c", "7C",
    "无敌医院",
    "与 $7B/$7D 同属无敌医院 Boss 剧情，但各自独立触发、不会连续播放；脚本 $4B 包含六次控制锁切换并在当前场景内自然返回",
  ),
  identifiedStory(
    "cutscene-lock-7d", "ordinary-control-lock-list-7d", "7D",
    "无敌医院",
    "与 $7B/$7C 同属无敌医院 Boss 剧情，但各自独立触发、不会连续播放；四次控制锁后转入剧情战斗",
  ),
  identifiedStory(
    "cutscene-lock-90", "extended-ff-list-90", "90",
    "工厂剧情",
    "工厂场景台词涉及载人传送带与自然保护团",
  ),
  identifiedStory(
    "cutscene-lock-00", "ordinary-control-lock-list-00", "00",
    "世界地图角色演出",
    "场景 $00 的五名角色分别执行自主脚本 $34、$35、$51、$89、$61，退出由场景重载链负责",
  ),
  identifiedStory(
    "cutscene-lock-5a", "ordinary-control-lock-list-5a", "5A",
    "早安场景",
    "角色 $03 进场执行自主脚本 $6D 并切换控制锁，角色 $02 的台词为“早上好”",
  ),
  identifiedStory(
    "cutscene-lock-5b", "ordinary-control-lock-list-5b", "5B",
    "洗车店",
    "角色 $00、$01、$02 进场后共同执行自主脚本 $6E，脚本切换控制锁并循环动作",
  ),
  storyPage({
    view: "cutscene-lock-88",
    sequenceId: "ordinary-control-lock-list-88",
    sequenceIds: [
      "ordinary-control-lock-list-88",
      "interaction-list-88-actor-06-script-2e",
    ],
    navigationLabel: "帕鲁山洞与红狼相认 scene-actor-list:88",
    eyebrow: "STORY scene-actor-list:88",
    title: "帕鲁山洞与红狼相认 scene-actor-list:88",
    description: "普通角色表执行三次控制锁并转入剧情战斗；角色 $06 的交互脚本按红狼状态播放相认对话并写入完成事件位。",
  }),
  storyPage({
    view: "nina-death",
    sequenceId: "scene-nina-death",
    navigationLabel: "尼娜殉情",
    eyebrow: "STORY NINA",
    title: "尼娜殉情",
    description: "尼娜离开房间后，城堡外的世界地图演出播放来生与红狼幸福的遗言；演出完成后写入 global-event-flag:B7。",
  }),
  identifiedStory(
    "cutscene-lock-9d", "ordinary-control-lock-list-9d", "9D",
    "战车与自然保护团",
    "角色 $00 的交互脚本 $3D 包含“我也需要一辆战车”与“自然保护团”台词；页面播放本场景的自主脚本",
  ),
  identifiedStory(
    "cutscene-lock-a5", "ordinary-control-lock-list-a5", "A5",
    "玛丽琳",
    "成对控制锁会在当前场景内自然返回，台词涉及玛丽琳偶人与歌娃",
  ),
  identifiedStory(
    "cutscene-lock-ac", "ordinary-control-lock-list-ac", "AC",
    "什么？快点",
    "角色 $01 的直接台词为“什么？快点”；角色 $00、$01、$02 分别执行自主脚本 $50、$73、$4F",
  ),
  identifiedStory(
    "cutscene-lock-ad", "ordinary-control-lock-list-ad", "AD",
    "炸毁电梯填海",
    "角色 $00 的交互脚本 $47 说明把炸药装入电梯并用瓦砾填海；角色 $01 请求帮助父亲",
  ),
  identifiedStory(
    "cutscene-lock-cd", "ordinary-control-lock-list-cd", "CD",
    "编队 $15 剧情战",
    "角色 $01 的自主脚本 $7A 进入编队 $15 并携带事件标志 $8F；页面在进入战斗时结束，战斗本身不属于本页",
  ),
  identifiedStory(
    "cutscene-lock-d7", "ordinary-control-lock-list-d7", "D7",
    "诺亚",
    "单次控制锁后换场，由诺亚相关的后续场景链继续",
  ),
  identifiedStory(
    "cutscene-lock-e7", "ordinary-control-lock-list-e7", "E7",
    "戈麦斯瀑布地雷阵",
    "角色 $00、$01、$02 的交互脚本分别为 $41、$0B、$40，台词涉及戈麦斯、大瀑布与地雷",
  ),
  storyPage({
    view: "cutscene-e7-after-dialogues",
    sequenceId: "scene-e7-after-dialogues",
    navigationLabel: "戈麦斯瀑布·三人对话后",
    eyebrow: "STORY E7",
    title: "戈麦斯瀑布·三人对话后",
  }),
  storyPage({
    view: "cutscene-e7-boat",
    sequenceId: "scene-e7-boat-left",
    sequenceIds: ["scene-e7-boat-left", "scene-e7-boat-right"],
    navigationLabel: "戈麦斯瀑布·乘船",
    eyebrow: "STORY E7",
    title: "戈麦斯瀑布·乘船",
  }),
  storyPage({
    view: "interaction-e7",
    sequenceId: "interaction-list-e7-actor-00-script-41",
    sequenceIds: [
      "interaction-list-e7-actor-00-script-41",
      "interaction-list-e7-actor-01-script-0b",
      "interaction-list-e7-actor-02-script-40",
    ],
    navigationLabel: "戈麦斯瀑布地雷阵·交互 scene-actor-list:E7",
    eyebrow: "STORY INTERACTION scene-actor-list:E7",
    title: "戈麦斯瀑布地雷阵·交互 scene-actor-list:E7",
    description: "角色 $00、$01、$02 分别触发交互脚本 $41、$0B、$40；页面从交互触发开始播放对应台词。",
  }),
  storyPage({
    view: "interaction-43-57",
    sequenceId: "interaction-list-43-actor-05-script-57",
    navigationLabel: "scene-actor:43:05 对话 → encounter-formation:12",
    eyebrow: "STORY INTERACTION scene-actor-list:43/story-interaction-script:script:57",
    title: "scene-actor:43:05 对话 → encounter-formation:12",
    description: "角色 `$05` 先运行自主脚本 `$83` 的场景动作，再触发交互 `$57`，依次播放台词并在编队 `$12`、待置 global-event-flag:78 的战斗入口停止。",
  }),
  storyPage({
    view: "interaction-74-01",
    sequenceId: "interaction-list-74-actor-02-script-01",
    navigationLabel: "机械师请求入队 scene-actor-list:74",
    eyebrow: "STORY INTERACTION scene-actor-list:74/story-interaction-script:script:01",
    title: "机械师请求入队 scene-actor-list:74",
    description: "角色 $02 先运行自主脚本 $16 的入队前角色演出，再触发交互 `$01`，询问战车并请求作为机械师加入队伍。",
    unimplementedStops: [{
      sequenceId: "interaction-list-74-actor-02-script-01",
      scriptId: 0x01,
      cursor: 0x07,
      effect: "机械师入队",
    }],
  }),
  storyPage({
    view: "interaction-f8-f9-02",
    sequenceId: "interaction-list-f8-actor-03-script-02",
    sequenceIds: [
      "interaction-list-f8-actor-03-script-02",
      "interaction-list-f9-actor-03-script-02",
    ],
    navigationLabel: "女战士请求入队 scene-actor-list:F8/scene-actor-list:F9",
    eyebrow: "STORY INTERACTION scene-actor-list:F8/scene-actor-list:F9/story-interaction-script:script:02",
    title: "女战士请求入队 scene-actor-list:F8/scene-actor-list:F9",
    description: "场景 $F8 与 $F9 的角色 $03 共用交互脚本 $02；女战士请求加入队伍并立志亲手收拾红狼。",
    unimplementedStops: [
      {
        sequenceId: "interaction-list-f8-actor-03-script-02",
        scriptId: 0x02,
        cursor: 0x0D,
        effect: "女战士入队",
      },
      {
        sequenceId: "interaction-list-f9-actor-03-script-02",
        scriptId: 0x02,
        cursor: 0x0D,
        effect: "女战士入队",
      },
    ],
  }),
  storyPage({
    view: "interaction-71-08",
    sequenceId: "interaction-list-71-actor-03-script-08",
    navigationLabel: "前方怪物警告 scene-actor-list:71",
    eyebrow: "STORY INTERACTION scene-actor-list:71/story-interaction-script:script:08",
    title: "前方怪物警告 scene-actor-list:71",
    description: "角色 $03 询问是否继续前进，并按选择与战车条件发出怪物警告或拒绝通行。",
  }),
  storyPage({
    view: "interaction-09-09",
    sequenceId: "interaction-list-09-actor-00-script-09",
    navigationLabel: "时空隧道传闻成真 scene-actor-list:09",
    eyebrow: "STORY INTERACTION scene-actor-list:09/story-interaction-script:script:09",
    title: "时空隧道传闻成真 scene-actor-list:09",
    description: "角色 $00 运行自主脚本 `$18` 的场景状态动作，并通过交互 `$09` 介绍废弃的时空隧道，在玩家由隧道抵达后确认传闻成真。",
  }),
  storyPage({
    view: "interaction-0d-0a",
    sequenceId: "interaction-list-0d-actor-01-script-0a",
    navigationLabel: "归还戒指与宝石镜 scene-actor-list:0D",
    eyebrow: "STORY INTERACTION scene-actor-list:0D/story-interaction-script:script:0A",
    title: "归还戒指与宝石镜 scene-actor-list:0D",
    description: "角色 $01 说明结婚戒指的来历，并在归还后赠予宝石镜。",
    unimplementedStops: [{
      sequenceId: "interaction-list-0d-actor-01-script-0a",
      scriptId: 0x0A,
      cursor: 0x0C,
      effect: "检查是否持有结婚戒指",
    }],
  }),
  storyPage({
    view: "interaction-8b-22",
    sequenceId: "interaction-list-8b-actor-00-script-22",
    navigationLabel: "受伤的狗发起战斗 scene-actor-list:8B",
    eyebrow: "STORY INTERACTION scene-actor-list:8B/story-interaction-script:script:22",
    title: "受伤的狗发起战斗 scene-actor-list:8B",
    description: "角色 $00 先运行自主脚本 `$2C` 的受伤移动循环，再触发交互 `$22` 发出叫声，并在编队 `$10`、待置 global-event-flag:20 的战斗入口停止。",
  }),
  storyPage({
    view: "interaction-92-23-25",
    sequenceId: "interaction-list-92-actor-03-script-25",
    sequenceIds: [
      "interaction-list-92-actor-00-script-23",
      "interaction-list-92-actor-01-script-24",
      "interaction-list-92-actor-03-script-25",
    ],
    navigationLabel: "花儿赠送战车 scene-actor-list:92",
    eyebrow: "STORY INTERACTION scene-actor-list:92/story-interaction-script:script:23–story-interaction-script:script:25",
    title: "花儿赠送战车 scene-actor-list:92",
    description: "角色 `$00` 先运行自主脚本 `$2E` 的场景动作；三名角色分别触发交互 `$23`、`$24`、`$25`，花儿允许主角开走战车，完成后写入 global-event-flag:71。",
  }),
  storyPage({
    view: "interaction-3d-29-2a",
    sequenceId: "interaction-list-3d-actor-07-script-29",
    sequenceIds: [
      "interaction-list-3d-actor-07-script-29",
      "interaction-list-3d-actor-06-script-2a",
    ],
    navigationLabel: "击败瓦鲁后的谢礼 scene-actor-list:3D",
    eyebrow: "STORY INTERACTION scene-actor-list:3D/story-interaction-script:script:29–story-interaction-script:script:2A",
    title: "击败瓦鲁后的谢礼 scene-actor-list:3D",
    description: "角色 `$07` 先运行自主 `$45`，再通过交互 `$29` 讲述父亲遭遇、致谢并写入完成事件位；角色 `$06` 运行自主 `$7E`，同页保留其交互 `$2A` 的酒馆对话。",
  }),
  storyPage({
    view: "interaction-98-31",
    sequenceId: "interaction-list-98-actor-00-script-31",
    navigationLabel: "异形与扳手 scene-actor-list:98",
    eyebrow: "STORY INTERACTION scene-actor-list:98/story-interaction-script:script:31",
    title: "异形与扳手 scene-actor-list:98",
    description: "角色 $00 交代藏在衣柜里的异形与扳手，并在异形败亡分支交出钥匙、写入完成事件位。",
  }),
  storyPage({
    view: "interaction-47-42",
    sequenceId: "interaction-list-47-actor-01-script-42",
    navigationLabel: "击败异形鳄鱼获赠战车 scene-actor-list:47",
    eyebrow: "STORY INTERACTION scene-actor-list:47/story-interaction-script:script:42",
    title: "击败异形鳄鱼获赠战车 scene-actor-list:47",
    description: "角色 `$01` 先运行自主脚本 `$55` 的场景动作，再通过交互 `$42` 确认异形鳄鱼已被消灭，提出赠送战车并写入完成事件位。",
  }),
  storyPage({
    view: "interaction-f5-44-45",
    sequenceId: "interaction-list-f5-actor-01-script-44",
    sequenceIds: [
      "interaction-list-f5-actor-01-script-44",
      "interaction-list-f5-actor-02-script-45",
    ],
    navigationLabel: "红狼的战车与挑战 scene-actor-list:84",
    eyebrow: "STORY INTERACTION scene-actor-list:84/story-interaction-script:script:44–story-interaction-script:script:45",
    title: "红狼的战车与挑战 scene-actor-list:84",
    description: "角色 $01 留下战车并托付尼娜；角色 $02 向主角发出生死挑战并写入完成事件位；两条交互由场景 $84 在剧情状态 0 调用，共用角色表 $F5 的记录。",
  }),
  storyPage({
    view: "interaction-af-49",
    sequenceId: "interaction-list-af-actor-00-script-49",
    navigationLabel: "丽可请求炸楼修桥 scene-actor-list:AF",
    eyebrow: "STORY INTERACTION scene-actor-list:AF/story-interaction-script:script:49",
    title: "丽可请求炸楼修桥 scene-actor-list:AF",
    description: "丽可先运行自主脚本 `$72` 的场景状态动作，再通过交互 `$49` 讲述与父亲寻找母亲时遇到断桥，请主角帮助父亲炸楼铺路，并说明可用计算机重启电梯。",
  }),
  storyPage({
    view: "interaction-a7-4b",
    links: [{label: '卫星地图 ↗', href: '?view=interfaceui&interface=satellite-map'}],
    sequenceId: "interaction-list-a7-actor-01-script-4b",
    navigationLabel: "赠送卫星地图 scene-actor-list:A7",
    eyebrow: "STORY INTERACTION scene-actor-list:A7/story-interaction-script:script:4B",
    title: "赠送卫星地图 scene-actor-list:A7",
    description: "角色 `$01` 先运行自主脚本 `$76` 的场景状态动作，再通过交互 `$4B` 将卫星地图交给主角，说明人造卫星会显示当前位置，并写入完成事件位。",
  }),
  storyPage({
    view: "interaction-a2-4d",
    sequenceId: "interaction-list-a2-actor-00-script-4d",
    navigationLabel: "搬动玛丽琳偶人 scene-actor-list:A2",
    eyebrow: "STORY INTERACTION scene-actor-list:A2/story-interaction-script:script:4D",
    title: "搬动玛丽琳偶人 scene-actor-list:A2",
    description: "角色 `$00` 先运行自主脚本 `$7D` 的事件状态循环，再通过交互 `$4D` 询问是否搬动玛丽琳偶人，确认后执行偶人搬运指令并写入完成事件位。",
    unimplementedStops: [{
      sequenceId: "interaction-list-a2-actor-00-script-4d",
      scriptId: 0x4D,
      cursor: 0x08,
      effect: "搬动玛丽琳偶人",
    }],
  }),
  storyPage({
    view: "interaction-41-51",
    sequenceId: "interaction-list-41-actor-00-script-51",
    navigationLabel: "镇口守卫放行 scene-actor-list:41",
    eyebrow: "STORY INTERACTION scene-actor-list:41/story-interaction-script:script:51",
    title: "镇口守卫放行 scene-actor-list:41",
    description: "守卫先运行自主脚本 `$80` 的站岗动作，再通过交互 `$51` 警告镇内不太平，并在确认主角不是山贼后放行、写入完成事件位。",
  }),
  storyPage({
    view: "interaction-42-52",
    sequenceId: "interaction-list-42-actor-00-script-52",
    navigationLabel: "山贼异动与放行 scene-actor-list:42",
    eyebrow: "STORY INTERACTION scene-actor-list:42/story-interaction-script:script:52",
    title: "山贼异动与放行 scene-actor-list:42",
    description: "守卫先运行自主脚本 `$81` 的站岗动作，再通过交互 `$52` 警告山贼正在等待什么，并在认出主角后催促进入、写入完成事件位。",
  }),
  storyPage({
    view: "interaction-e8-58",
    sequenceId: "interaction-list-e8-actor-06-script-58",
    navigationLabel: "兹玛爷爷与东京塔 A scene-actor-list:E8",
    eyebrow: "STORY INTERACTION scene-actor-list:E8/story-interaction-script:script:58",
    title: "兹玛爷爷与东京塔 A scene-actor-list:E8",
    description: "角色 $06 纠正兹玛爷爷的称呼，指出他熟悉东京塔，并写入该角色的完成事件位。",
  }),
  storyPage({
    view: "interaction-e8-59",
    sequenceId: "interaction-list-e8-actor-07-script-59",
    navigationLabel: "兹玛爷爷与东京塔 B scene-actor-list:E8",
    eyebrow: "STORY INTERACTION scene-actor-list:E8/story-interaction-script:script:59",
    title: "兹玛爷爷与东京塔 B scene-actor-list:E8",
    description: "角色 $07 纠正兹玛爷爷的称呼，指出他熟悉东京塔，并写入该角色的独立完成事件位。",
  }),
  storyPage({
    view: "interaction-67-61",
    sequenceId: "interaction-list-67-actor-01-script-61",
    navigationLabel: "发现山火 scene-actor-list:67",
    eyebrow: "STORY INTERACTION scene-actor-list:67/story-interaction-script:script:61",
    title: "发现山火 scene-actor-list:67",
    description: "角色 $01 写入山火事件位并发出「山火！」警报。",
    unimplementedStops: [{
      sequenceId: "interaction-list-67-actor-01-script-61",
      scriptId: 0x61,
      cursor: 0x02,
      effect: "显示山火警报",
    }],
  }),
  storyPage({
    view: "interaction-e6-62",
    sequenceId: "interaction-list-e6-actor-00-script-62",
    navigationLabel: "诺亚哨卡剧情战 A scene-actor-list:E6",
    eyebrow: "STORY INTERACTION scene-actor-list:E6/story-interaction-script:script:62",
    title: "诺亚哨卡剧情战 A scene-actor-list:E6",
    description: "角色 $00 先运行自主脚本 `$8E` 的事件状态动作，再以交互脚本 `$62` 宣告依诺亚命令封锁哨卡并毁灭人类，随后进入编队 `$15`、待置 global-event-flag:B2 的剧情战。",
  }),
  storyPage({
    view: "interaction-e6-63",
    sequenceId: "interaction-list-e6-actor-02-script-63",
    navigationLabel: "诺亚哨卡剧情战 B scene-actor-list:E6",
    eyebrow: "STORY INTERACTION scene-actor-list:E6/story-interaction-script:script:63",
    title: "诺亚哨卡剧情战 B scene-actor-list:E6",
    description: "角色 $02 先运行自主脚本 `$8F` 的事件状态动作，再以交互脚本 `$63` 宣告依诺亚命令封锁哨卡并毁灭人类，随后进入编队 `$15`、待置 global-event-flag:B3 的独立剧情战。",
  }),
  storyPage({
    view: "interaction-30-66",
    sequenceId: "interaction-list-30-actor-00-script-66",
    navigationLabel: "枪声后的剧情战 scene-actor-list:30",
    eyebrow: "STORY INTERACTION scene-actor-list:30/story-interaction-script:script:66",
    title: "枪声后的剧情战 scene-actor-list:30",
    description: "角色 `$00` 先运行自主脚本 `$88` 的事件状态动作，再通过交互 `$66` 发出「啪！」声，随后进入编队 `$04`、待置 global-event-flag:53 的剧情战。",
    unimplementedStops: [{
      sequenceId: "interaction-list-30-actor-00-script-66",
      scriptId: 0x66,
      cursor: 0x00,
      effect: "显示枪声「啪！」",
    }],
  }),
  storyPage({
    view: "interaction-bd-be-67",
    sequenceId: "interaction-list-bd-actor-01-script-67",
    sequenceIds: [
      "interaction-list-bd-actor-01-script-67",
      "interaction-list-be-actor-01-script-67",
    ],
    navigationLabel: "沉默角色剧情战 scene-actor-list:BD/scene-actor-list:BE",
    eyebrow: "STORY INTERACTION scene-actor-list:BD–scene-actor-list:BE/story-interaction-script:script:67",
    title: "沉默角色剧情战 scene-actor-list:BD/scene-actor-list:BE",
    description: "场景 `$BD` 与 `$BE` 的角色 `$01` 均先运行自主脚本 `$04`，再共用交互 `$67` 的沉默回应，随后进入编队 `$14`、待置 global-event-flag:22 的剧情战。",
    unimplementedStops: [
      {
        sequenceId: "interaction-list-bd-actor-01-script-67",
        scriptId: 0x67,
        cursor: 0x00,
        effect: "显示沉默回应「……」",
      },
      {
        sequenceId: "interaction-list-be-actor-01-script-67",
        scriptId: 0x67,
        cursor: 0x00,
        effect: "显示沉默回应「……」",
      },
    ],
  }),
  storyPage({
    view: "ending",
    sequenceId: "extended-fa-ending",
    navigationLabel: "结局与职员表",
    eyebrow: "ENDING ANIMATION",
    title: "结局动画",
    description: "独立回放结局与职员表，包括世界镜头、通缉状态、战车回顾、音频事件与 RESET 终页。",
  }),
]);

const dialoguePages = STORY_SOURCE_PAGES.filter(page => page.view.startsWith('interaction-'));
const performancePages = STORY_SOURCE_PAGES.filter(page => page.view.startsWith('cutscene-lock-'));
const STORY_PAGE_DEFINITIONS = Object.freeze([
  ...STORY_SOURCE_PAGES.map(page => dialoguePages.includes(page) || performancePages.includes(page)
    ? storyPage({...page, navigation: false}) : page),
  storyPage({view: 'interaction-dialogue', navigationLabel: '剧情对话', title: '剧情对话',
    eyebrow: 'STORY INTERACTION', sequenceKind: 'interaction', collection: true,
    description: '选择角色交互执行链，编辑所选流程的组件、条件与脚本。',
    sourceViews: dialoguePages.map(page => page.view),
    unimplementedStops: dialoguePages.flatMap(page => page.unimplementedStops || []),
    links: [{label: '交互脚本', href: '?view=actors&actorPart=story&storyKind=interaction'}]}),
  storyPage({view: 'scene-actor-performance', navigationLabel: '场景角色演出', title: '场景角色演出',
    eyebrow: 'STORY', collection: true,
    description: '选择场景角色的锁控执行链，编辑所选演出的条件与自然完成边界。',
    sequenceIds: performancePages.flatMap(page => page.sequenceIds || [page.sequenceId]),
    sourceViews: performancePages.map(page => page.view),
    unimplementedStops: performancePages.flatMap(page => page.unimplementedStops || [])}),
]);

const STORY_PAGE_VIEW_IDS = Object.freeze(
  STORY_PAGE_DEFINITIONS.map(definition => definition.view),
);

const EDITABLE_STORY_VIEW_IDS = Object.freeze(
  STORY_PAGE_DEFINITIONS.filter(definition => definition.editable)
    .map(definition => definition.view),
);

const storyPageByView = new Map(
  STORY_PAGE_DEFINITIONS.map(definition => [definition.view, definition]),
);
const editableStoryViews = new Set(EDITABLE_STORY_VIEW_IDS);
const storyViewBySequenceId = new Map();
for (const definition of STORY_PAGE_DEFINITIONS) {
  for (const sequenceId of definition.sequenceIds || [definition.sequenceId]) {
    if (!storyViewBySequenceId.has(sequenceId)) storyViewBySequenceId.set(sequenceId, definition.view);
  }
  if (definition.preludeSequenceId) {
    storyViewBySequenceId.set(definition.preludeSequenceId, definition.view);
  }
}

let currentStoryPageDefinition = null;
function setCurrentStoryPageDefinition(definition) {
  currentStoryPageDefinition = definition;
}

function storyPageDefinitionForView(view) {
  if (view === currentStoryPageDefinition?.view) return currentStoryPageDefinition;
  return storyPageByView.get(String(view || "")) || null;
}

function storySequencePreludeIdForView(view) {
  return storyPageDefinitionForView(view)?.preludeSequenceId || null;
}

function storyViewForSequenceId(sequenceId) {
  return storyViewBySequenceId.get(String(sequenceId || "")) || null;
}

function storyEditableView(view) {
  return editableStoryViews.has(String(view || ""));
}

function storyPlaybackView(view) {
  return storyPageByView.has(String(view || ""));
}

// @editor-module 声明正文 schema 对应的包内只读输入。
const PACKAGE_SCHEMA_PATHS = Object.freeze({
  "project.ui.interfaces": ["game/ui/construction/interfaces/index.json"],
  "project.ui.dispatch": ["game/ui/construction/dispatch/index.json"],
  "project.ui.templates": ["game/ui/construction/templates/index.json"],
  "project.ui.scene-flow-states": ["game/ui/construction/scene-flow-states/index.json"],
  "project.text-catalog": ["game/ui/construction/script/text_catalog.json"],
  "project.text-providers": ["game/ui/construction/script/data_providers.json"],
  "project.text-fonts": ["game/text/fonts/index.json"],
  "audio-sequence": ["game/audio/sequence-graph.json"],
  "weapon-attack-parameter": ["game/visuals/weapon-effects/assets/index.json"],
  "project.runtime": [
    "runtime/index.json"
  ],
  "project.scenes": [
    "game/scenes/index.json"
  ],
  "project.scenes.logic": [
    "game/scenes/logic-index.json"
  ],
  "project.story": [
    "game/story/index.json"
  ],
  "project.facilities": [
    "game/ui/facilities/index.json"
  ],
  "project.wanted": [
    "game/ui/wanted/index.json"
  ],
  "project.ui": [
    "game/ui/index.json",
    "game/ui/construction/index.json"
  ],
  "project.ui.editor": [
    "game/ui/construction/dispatch/index.json",
    "game/ui/construction/script/text_catalog.json",
    "game/ui/construction/static/index.json",
    "game/ui/construction/compositions/index.json",
    "game/ui/construction/interfaces/index.json",
    "game/ui/facilities/index.json",
    "game/ui/index.json"
  ],
  "project.visuals": [
    "game/visuals/index.json"
  ],
  "project.audio": [
    "game/audio/index.json"
  ]
});

const repositoryResourceId = schema => ({item: "item-entry", monster: "monster-profile"})[schema] || schema;

function packageSchemaPaths(schema, manifest) {
  const path = schema === 'project.ui.editor'
    ? manifest?.browser_prepared_inputs?.ui_editor_shared || manifest?.browser_prepared_inputs?.ui_editor
    : schema === 'project.story' ? manifest?.browser_prepared_inputs?.story_shared : null;
  return path ? [path] : PACKAGE_SCHEMA_PATHS[schema] || [];
}

// @editor-module 按发布的分片与填充值装配构建基线。

async function assembleBaseline(definition, readBinary, onProgress = () => {}) {
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

var baselineAssembly = /*#__PURE__*/Object.freeze({
  __proto__: null,
  assembleBaseline: assembleBaseline
});

export { BYTE_MAP_INDEX_PATH, EDITABLE_STORY_VIEW_IDS, PACKAGE_SCHEMA_PATHS, STORY_PAGE_DEFINITIONS, STORY_PAGE_VIEW_IDS, applyStoryPageNames, baselineAssembly, loadPhysicalFieldSourceIndex, loadResourceRangeAssociationManifest, loadResourceRangeAssociationShard, packageSchemaPaths, repositoryResourceId, setCurrentStoryPageDefinition, storyEditableView, storyPageDefinitionForView, storyPlaybackView, storySequencePreludeIdForView, storyViewForSequenceId };
