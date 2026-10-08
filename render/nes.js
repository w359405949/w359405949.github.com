// @editor-module NES 渲染原语：调色板、pattern 解码与图块合成。
// 显示现场的区域合成由 frame-composition.js 提供。

// RGB 对照采用 Mesen NesDefaultVideoFilter 的 2C02 色表。
export const nesPalette = [
  [102,102,102],[0,42,136],[20,18,167],[59,0,164],[92,0,126],[110,0,64],[108,6,0],[86,29,0],
  [51,53,0],[11,72,0],[0,82,0],[0,79,8],[0,64,77],[0,0,0],[0,0,0],[0,0,0],
  [173,173,173],[21,95,217],[66,64,255],[117,39,254],[160,26,204],[183,30,123],[181,49,32],[153,78,0],
  [107,109,0],[56,135,0],[12,147,0],[0,143,50],[0,124,141],[0,0,0],[0,0,0],[0,0,0],
  [255,254,255],[100,176,255],[146,144,255],[198,118,255],[243,106,255],[254,110,204],[254,129,112],[234,158,34],
  [188,190,0],[136,216,0],[92,228,48],[69,224,130],[72,205,222],[79,79,79],[0,0,0],[0,0,0],
  [255,254,255],[192,223,255],[211,210,255],[232,200,255],[251,194,255],[254,196,234],[254,204,197],[247,216,165],
  [228,229,148],[207,239,150],[189,244,171],[179,243,204],[181,235,242],[184,184,184],[0,0,0],[0,0,0],
];

export function uiHexBytes(rawHex) {
  return String(rawHex || "").trim().split(/\s+/)
    .filter(Boolean)
    .map(value => Number.parseInt(value, 16));
}

export function uiPutRgb(pixels, width, x, y, colour) {
  if (x < 0 || y < 0 || x >= width || y * width * 4 >= pixels.length) return;
  const offset = (y * width + x) * 4;
  pixels[offset] = colour[0];
  pixels[offset + 1] = colour[1];
  pixels[offset + 2] = colour[2];
  pixels[offset + 3] = 255;
}

export function uiPaintPattern(
  pixels, width, height, patterns, corePatterns, tileId, originX, originY,
  patternProfiles = [], paletteValues = null
) {
  const palette = (paletteValues || [0x0F, 0x30, 0x10, 0x00])
    .map(index => nesPalette[Number(index) & 0x3F]);
  const profiles = Array.isArray(patternProfiles)
    ? patternProfiles : patternProfiles ? [patternProfiles] : [];
  const patternProfile = profiles.find(profile => (
    tileId >= Number(profile?.first_tile ?? -1)
    && tileId <= Number(profile?.last_tile ?? -1)
  )) || null;
  const coreMatch = !patternProfile && tileId <= 0x7F;
  const profileFirst = Number(patternProfile?.first_tile ?? -1);
  const profileLast = Number(patternProfile?.last_tile ?? -1);
  const profileMatch = (
    patternProfile
    && tileId >= profileFirst
    && tileId <= profileLast
  );
  const source = coreMatch
    ? corePatterns
    : profileMatch ? patternProfile.patterns : patterns;
  const patternOffset = coreMatch
    ? tileId * 16
    : profileMatch ? (tileId - profileFirst) * 16 : (tileId - 0x80) * 16;
  if (patternOffset < 0 || patternOffset + 16 > source.length) {
    const warning = [154, 67, 88];
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        if (!((x + y) & 1)) uiPutRgb(pixels, width, originX + x, originY + y, warning);
      }
    }
    return;
  }
  for (let y = 0; y < 8; y += 1) {
    const low = source[patternOffset + y];
    const high = source[patternOffset + 8 + y];
    for (let x = 0; x < 8; x += 1) {
      const shift = 7 - x;
      const value = ((low >> shift) & 1) | (((high >> shift) & 1) << 1);
      uiPutRgb(pixels, width, originX + x, originY + y, palette[value]);
    }
  }
}

// rowProfiles 描述帧内切 CHR bank 的整屏画面：青蛙赛跑在第 18 行换掉背景
// bank，上半屏是赛道图、下半屏的消息窗回到常规 UI bank。用同一对 bank 铺整屏
// 会把其中一半画成乱码，所以按行段选图块。
export function uiPaintRomNametable(
  image, layer, patterns, corePatterns, patternProfiles, rowProfiles = []
) {
  const source = uiHexBytes(layer.raw_hex);
  if (source.length !== 0x400) return;
  const paletteSets = layer.palette_sets || [];
  const segments = Array.isArray(rowProfiles) ? rowProfiles : [];
  for (let position = 0; position < 32 * 30; position += 1) {
    const tileX = position % 32;
    const tileY = Math.floor(position / 32);
    const attribute = source[0x3C0 + Math.floor(tileY / 4) * 8
      + Math.floor(tileX / 4)];
    const shift = ((tileY & 0x02) << 1) | (tileX & 0x02);
    const paletteId = (attribute >> shift) & 0x03;
    const segment = segments.find(item => (
      tileY >= Number(item?.first_row ?? -1)
      && tileY <= Number(item?.last_row ?? -1)
    ));
    uiPaintPattern(
      image.data, image.width, image.height, patterns, corePatterns,
      source[position], tileX * 8, tileY * 8,
      segment ? [...segment.profiles, ...patternProfiles] : patternProfiles,
      paletteSets[paletteId]
    );
  }
}

function uiPaintSpritePattern(
  image, tileId, originX, originY, patternProfiles, paletteValues,
  horizontalFlip = false, verticalFlip = false,
  behindBackground = false
) {
  const profile = (patternProfiles || []).find(item => (
    tileId >= Number(item?.first_tile ?? -1)
    && tileId <= Number(item?.last_tile ?? -1)
  ));
  if (!profile?.patterns) return;
  const patternOffset = (tileId - Number(profile.first_tile)) * 16;
  if (patternOffset < 0 || patternOffset + 16 > profile.patterns.length) return;
  const palette = (paletteValues || [0x0F, 0x30, 0x10, 0x00])
    .map(value => nesPalette[Number(value) & 0x3F]);
  for (let outputY = 0; outputY < 8; outputY += 1) {
    const sourceY = verticalFlip ? 7 - outputY : outputY;
    const low = profile.patterns[patternOffset + sourceY];
    const high = profile.patterns[patternOffset + 8 + sourceY];
    for (let outputX = 0; outputX < 8; outputX += 1) {
      const sourceX = horizontalFlip ? 7 - outputX : outputX;
      const shift = 7 - sourceX;
      const value = ((low >> shift) & 1) | (((high >> shift) & 1) << 1);
      if (value) {
        const targetOffset = (
          (originY + outputY) * image.width + originX + outputX
        ) * 4;
        const background = nesPalette[0x0F];
        if (
          behindBackground
          && (
            image.data[targetOffset] !== background[0]
            || image.data[targetOffset + 1] !== background[1]
            || image.data[targetOffset + 2] !== background[2]
          )
        ) {
          continue;
        }
        uiPutRgb(
          image.data, image.width, originX + outputX, originY + outputY,
          palette[value]
        );
      }
    }
  }
}

export function uiPaintRomTileGrid(
  image, layer, patterns, corePatterns, patternProfiles
) {
  const source = uiHexBytes(layer.raw_hex);
  const rows = Number(layer.rows || 0);
  const groups = Number(layer.groups_per_row || 0);
  const cells = Number(layer.cells_per_group || 0);
  const groupGap = Number(layer.group_gap || 0);
  const rowStride = Number(layer.row_stride || 0);
  let sourceIndex = 0;
  let rowCursor = Number(layer.destination_cursor || 0) & 0x3FF;
  const paint = (position, tile) => {
    const logical = Number(position) & 0x3FF;
    const tileY = Math.floor(logical / 32);
    if (tileY >= 30) return;
    uiPaintPattern(
      image.data, image.width, image.height, patterns, corePatterns,
      Number(tile), (logical % 32) * 8, tileY * 8, patternProfiles
    );
  };
  for (let row = 0; row < rows; row += 1) {
    let cursor = rowCursor;
    for (let group = 0; group < groups; group += 1) {
      for (let cell = 0; cell < cells; cell += 1) {
        if (sourceIndex < source.length) paint(cursor, source[sourceIndex]);
        sourceIndex += 1;
        cursor = (cursor + 1) & 0x3FF;
      }
      cursor = (cursor + groupGap) & 0x3FF;
    }
    rowCursor = (rowCursor + rowStride) & 0x3FF;
  }
  for (const [position, tile] of layer.extra_writes || []) {
    paint(position, tile);
  }
}

// 运行期把实体图形、数字等写回同一张逻辑 nametable。constructor 只保存这些
// 语义写入，不保存截图；图块像素仍从已登记的 ROM / 核心字体 pattern 读取。
export function uiPaintTileWrites(
  image, layer, patterns, corePatterns, patternProfiles
) {
  const paletteSets = layer.palette_sets || [];
  const defaultAttribute = Number(layer.default_attribute ?? 0xFF) & 0xFF;
  const attributes = new Map(
    (layer.attribute_writes || []).map(([position, value]) => [
      Number(position) & 0x3FF, Number(value) & 0xFF,
    ])
  );
  for (const [rawPosition, rawTile] of layer.writes || []) {
    const position = Number(rawPosition) & 0x3FF;
    const tileY = Math.floor(position / 32);
    if (tileY >= 30) continue;
    const tileX = position % 32;
    const attributePosition = 0x3C0
      + Math.floor(tileY / 4) * 8 + Math.floor(tileX / 4);
    const attribute = attributes.get(attributePosition) ?? defaultAttribute;
    const shift = ((tileY & 0x02) << 1) | (tileX & 0x02);
    const paletteId = (attribute >> shift) & 0x03;
    uiPaintPattern(
      image.data, image.width, image.height, patterns, corePatterns,
      Number(rawTile), tileX * 8, tileY * 8, patternProfiles,
      paletteSets[paletteId]
    );
  }
}

export function uiPaintTileFill(
  image, layer, patterns, corePatterns, patternProfiles
) {
  const writes = [];
  const originX = Number(layer.x || 0);
  const originY = Number(layer.y || 0);
  const width = Number(layer.width || 0);
  const height = Number(layer.height || 0);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      writes.push([(originY + y) * 32 + originX + x, Number(layer.tile)]);
    }
  }
  uiPaintTileWrites(
    image, {...layer, writes}, patterns, corePatterns, patternProfiles
  );
}

export function uiPaintResolvedMetasprite(image, layer, patternProfiles, preview) {
  const anchorX = Number(layer.anchor_x || 0);
  const anchorY = Number(layer.anchor_y || 0);
  const yBias = Number(layer.oam_y_bias ?? 1);
  const paletteSets = layer.palette_sets || preview.sprite_palettes || [];
  const sprites = layer.kind === "rom_oam"
    ? [...(layer.sprites || [])].reverse()
    : (layer.sprites || []);
  for (const sprite of sprites) {
    if (sprite.transparent_tile) continue;
    const attribute = Number(sprite.attribute || 0);
    uiPaintSpritePattern(
      image, Number(sprite.tile),
      anchorX + Number(sprite.x || 0),
      anchorY + Number(sprite.y || 0) + yBias,
      patternProfiles,
      paletteSets[attribute & 0x03],
      Boolean(sprite.horizontal_flip ?? (attribute & 0x40)),
      Boolean(sprite.vertical_flip ?? (attribute & 0x80)),
      Boolean(sprite.behind_background ?? (attribute & 0x20))
    );
  }
}

export function uiBlankCanvas(canvas, {transparent = false} = {}) {
  canvas.width = 256;
  canvas.height = 240;
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  const image = context.createImageData(canvas.width, canvas.height);
  if (transparent) return {context, image};
  const background = nesPalette[0x0F];
  for (let offset = 0; offset < image.data.length; offset += 4) {
    image.data[offset] = background[0];
    image.data[offset + 1] = background[1];
    image.data[offset + 2] = background[2];
    image.data[offset + 3] = 255;
  }
  return {context, image};
}
