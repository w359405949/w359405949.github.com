// @editor-module 设备帧消费显式随机现场并返回已确认的完成结果。

const byte = value => Number.isInteger(value) && value >= 0 && value <= 255;
const requireByte = (value, name) => {
  if (!byte(value)) throw new TypeError(`设备帧缺少 ${name}`);
  return value;
};

export const FACILITY_DEVICE_CODE_NAMES = Object.freeze([
  'frog-initial-x', 'frog-finish-x', 'frog-moving-wait',
  ...Array.from({length: 12}, (_, index) => `frog-type-${index}`),
  ...Array.from({length: 12}, (_, index) => `frog-odds-${index}`),
  ...Array.from({length: 3}, (_, index) => `frog-row-y-${index}`),
  ...Array.from({length: 4}, (_, index) => `frog-idle-frame-${index}`),
  ...Array.from({length: 4}, (_, index) => `frog-wait-0-${index}`),
  ...Array.from({length: 2}, (_, index) => `frog-moving-frame-0-${index}`),
  ...Array.from({length: 3}, (_, index) => `frog-moving-frame-${index + 1}`),
  ...Array.from({length: 3}, (_, index) => `frog-speed-${index + 1}`),
  ...Array.from({length: 12}, (_, index) => `frog-wait-${index + 4}`),
  'vending-lottery-ball-object', 'vending-lottery-win-x',
  ...Array.from({length: 16}, (_, index) => `vending-lottery-delta-${index}`),
  ...Array.from({length: 12}, (_, index) => `vending-lottery-wait-${index}`),
  ...Array.from({length: 16}, (_, index) => `vending-lottery-x-${index}`),
  ...Array.from({length: 16}, (_, index) => `vending-lottery-y-${index}`),
]);

function moveFrog(racer, random, codes) {
  const read = name => requireByte(codes[name], name);
  if (racer.type === 0) {
    if (racer.speed) {
      racer.wait = (racer.wait - 1) & 255;
      if (racer.wait < 128) {racer.object = read('frog-idle-frame-0'); return;}
      racer.speed = (racer.speed - 1) & 255;
      racer.wait = read('frog-moving-wait');
    }
    racer.wait = (racer.wait - 1) & 255;
    if (racer.wait >= 128) {
      racer.speed = (racer.speed + 1) & 255;
      racer.wait = read(`frog-wait-0-${random & 3}`);
    }
    racer.x = (racer.x - 1) & 255;
    racer.object = read(`frog-moving-frame-0-${(racer.x >> 1) & 1}`);
    return;
  }
  if (racer.y >= racer.initialY) {
    racer.y = racer.initialY;
    racer.wait = (racer.wait - 1) & 255;
    if (racer.wait < 128) {racer.object = read(`frog-idle-frame-${racer.type}`); return;}
    racer.fractionalSpeed = 255;
    racer.speed = read(`frog-speed-${racer.type}`);
    racer.wait = read(`frog-wait-${racer.type * 4 + (random & 3)}`);
  }
  racer.x = (racer.x - 1) & 255;
  const position = racer.fraction + racer.fractionalSpeed;
  racer.fraction = position & 255;
  racer.y = (racer.y + racer.speed + (position >> 8)) & 255;
  const speed = racer.fractionalSpeed + 64;
  racer.fractionalSpeed = speed & 255;
  racer.speed = (racer.speed + (speed >> 8)) & 255;
  racer.object = read(`frog-moving-frame-${racer.type}`);
}

function moveLottery(frame, codes) {
  frame.remaining = (frame.remaining - 1) & 255;
  if (frame.remaining >= 128) {
    frame.status = 'complete';
    frame.completion = {kind: frame.kind, confirmed: true, position: frame.position,
      won: frame.x === codes['vending-lottery-win-x']};
    return;
  }
  frame.position = (frame.position - 1) & 15;
  frame.x = requireByte(codes[`vending-lottery-x-${frame.position}`], '抽奖横坐标');
  frame.y = requireByte(codes[`vending-lottery-y-${frame.position}`], '抽奖纵坐标');
  frame.object = requireByte(codes['vending-lottery-ball-object'], '抽奖图形') + Number(frame.x === codes['vending-lottery-win-x']);
  frame.wait = frame.remaining < 12 ? requireByte(codes[`vending-lottery-wait-${frame.remaining}`], '抽奖帧等待') : 2;
}

export function createFacilityDeviceFrame(kind, input, codes) {
  const random = input?.random;
  requireByte(random?.high, '随机高字节'); requireByte(random?.low, '随机低字节');
  const result = {kind, status: 'running', frame: 0, random: structuredClone(random), completion: null};
  if (kind === 'frog-race') {
    if (!Array.isArray(input.fractional) || input.fractional.length !== 3 || !input.fractional.every(byte))
      throw new TypeError('设备帧缺少调用前 054A 三字节现场');
    result.group = random.high & 3;
    result.racers = Array.from({length: 3}, (_, index) => {
      const type = requireByte(codes[`frog-type-${result.group * 3 + 2 - index}`], '参赛类型');
      if (type > 3) throw new TypeError('参赛类型超出已确认的动画域');
      return {type, odds: requireByte(codes[`frog-odds-${result.group * 3 + 2 - index}`], '赔率'),
        x: requireByte(codes['frog-initial-x'], '起点'), y: codes[`frog-row-y-${index}`],
        initialY: codes[`frog-row-y-${index}`], fraction: input.fractional[index],
        fractionalSpeed: null, speed: 1, wait: 1, object: codes[`frog-idle-frame-${type}`]};
    });
    for (let index = 2; index >= 0; index--) moveFrog(result.racers[index], 0, codes);
    return result;
  }
  if (kind !== 'vending-lottery') throw new TypeError('未声明的设备帧构造');
  result.position = requireByte(input.position, '抽奖起始位置');
  if (result.position > 15) throw new RangeError('抽奖起始位置超出位置表');
  result.remaining = (result.position + 24 + requireByte(codes[`vending-lottery-delta-${random.high & 15}`], '抽奖增量')) & 255;
  result.wait = 0;
  moveLottery(result, codes);
  return result;
}

export function advanceFacilityDeviceFrame(current, input, codes) {
  const next = structuredClone(current);
  if (next.status !== 'running') return next;
  if (input?.type !== 'frame') throw new TypeError('设备帧需要逐帧输入');
  if (next.kind === 'frog-race') {
    const random = input.random ?? next.random.frames?.[next.frame];
    if (!byte(random?.high) || !byte(random?.low)) return {...next, status: 'unknown',
      completion: {kind: next.kind, confirmed: false, reason: '赛程缺少本帧显式随机状态'}};
    Object.assign(next.random, {high: random.high, low: random.low});
    let value = random.high;
    for (let index = 2; index >= 0; index--, value >>= 2) {
      const racer = next.racers[index];
      moveFrog(racer, value, codes);
      if (racer.x < requireByte(codes['frog-finish-x'], '终点')) {
        next.status = 'complete';
        next.completion = {kind: next.kind, confirmed: true, winner: index, type: racer.type, odds: racer.odds};
        break;
      }
    }
  } else {
    if (next.wait) next.wait--;
    if (!next.wait) moveLottery(next, codes);
  }
  next.frame++;
  return next;
}
