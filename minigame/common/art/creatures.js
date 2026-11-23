module.exports = {
  "schemaVersion": 1,
  "coordinateSystem": {
    "anchor": [
      0.5,
      0.5
    ],
    "forward": "up",
    "rotation": "clockwiseRadians"
  },
  "sheet": {
    "frameWidth": 128,
    "frameHeight": 128,
    "columns": 8,
    "rows": 3,
    "anchor": [
      0.5,
      0.5
    ],
    "forward": "up",
    "neutralSilhouetteExtentPx": 108,
    "animations": {
      "fly": {
        "row": 0,
        "frames": 8,
        "fps": 10,
        "loop": true
      },
      "hit": {
        "row": 1,
        "frames": 5,
        "fps": 18,
        "loop": false
      },
      "death": {
        "row": 2,
        "frames": 8,
        "fps": 14,
        "loop": false
      }
    },
    "unusedCells": "hit 行第6–8格透明；请只播放 animations.hit.frames 指定的5帧。"
  },
  "discovery": {
    "event": "actualEncounter",
    "key": "enemy.type",
    "persist": "one entry per species, first observed stage",
    "unseenArt": "silhouette",
    "stageField": "minLevel = earliest eligible spawn, first actual encounter may occur later"
  },
  "spawn": {
    "sides": [
      "top",
      "right",
      "bottom",
      "left"
    ],
    "mode": "weightedRandomOrRankedSpawnTicket",
    "bands": [
      {
        "from": 1,
        "to": 3,
        "totalWeight": 98,
        "eligible": [
          "basic",
          "fast",
          "tank",
          "fireResistant",
          "iceImmune",
          "electricResistant",
          "shielded"
        ]
      },
      {
        "from": 4,
        "to": 5,
        "totalWeight": 100,
        "eligible": [
          "basic",
          "fast",
          "tank",
          "fireResistant",
          "iceImmune",
          "electricResistant",
          "elite",
          "shielded"
        ]
      },
      {
        "from": 6,
        "to": 9,
        "totalWeight": 102,
        "eligible": [
          "basic",
          "fast",
          "tank",
          "fireResistant",
          "iceImmune",
          "electricResistant",
          "elite",
          "ghost",
          "shielded"
        ]
      },
      {
        "from": 10,
        "to": null,
        "totalWeight": 103,
        "eligible": [
          "basic",
          "fast",
          "tank",
          "fireResistant",
          "iceImmune",
          "electricResistant",
          "elite",
          "ghost",
          "shielded",
          "boss"
        ]
      }
    ],
    "formula": "pool = creatures.filter(c => c.minLevel <= stage); probability = c.weight / sum(pool.weight)",
    "defenses": {
      "types": [
        "normal",
        "wind",
        "fire",
        "ice",
        "electric"
      ],
      "resistanceChance": {
        "initial": 0.1,
        "perAdditionalStage": 0.02,
        "max": 0.4
      },
      "immunityChance": {
        "minLevel": 6,
        "initialAtStage1": 0.05,
        "perAdditionalStage": 0.01,
        "max": 0.2
      },
      "limit": "min(2 + floor(level/5), 4)",
      "selection": "按波型独立抽取；第6关起同元素免疫优先。超过上限时打乱并截取。仅幽灵使用固定免疫。",
      "render": "按 enemy.resistances 和 enemy.immunities 叠加防御徽章。三种元素家族的徽章只指物种，不代表天生免疫。",
      "bypass": "普通波「纯净之力」觉醒可穿透免疫。"
    },
    "ranked": {
      "firstLevelOpening": [
        "basic",
        "fast",
        "basic"
      ],
      "deckMinLevels": [
        10,
        6,
        4,
        1
      ],
      "rule": "取满足等级的第一副已签发洗牌牌组，牌型按 (spawnIndex + level * 31) % cards.length 取。"
    }
  },
  "creatures": [
    {
      "id": "basic",
      "type": "basic",
      "name": "铁喙劫鸢",
      "class": "普通",
      "role": "regular",
      "minLevel": 1,
      "weight": 40,
      "rarity": "常见",
      "radius": 15,
      "glyph": "单羽",
      "silhouetteKey": "铁喙、酒红披羽",
      "theme": "#902d25",
      "motion": "raptor",
      "portrait": "creatures/basic.png",
      "sheet": "creatures/basic-sheet.png",
      "badge": "creatures/basic-badge.png",
      "silhouette": "creatures/basic-locked.png",
      "defenseMode": "perInstance",
      "baseStats": {
        "health": 50,
        "speed": 18,
        "armor": 5,
        "shield": 0,
        "impact": 30,
        "score": 10
      },
      "traitBadge": "creatures/basic-badge.png"
    },
    {
      "id": "fast",
      "type": "fast",
      "name": "裂风剪燕",
      "class": "快速",
      "role": "regular",
      "minLevel": 1,
      "weight": 20,
      "rarity": "常见",
      "radius": 12,
      "glyph": "双箭尾",
      "silhouetteKey": "狭长的剪形双尾",
      "theme": "#bb722c",
      "motion": "swift",
      "portrait": "creatures/fast.png",
      "sheet": "creatures/fast-sheet.png",
      "badge": "creatures/fast-badge.png",
      "silhouette": "creatures/fast-locked.png",
      "defenseMode": "perInstance",
      "baseStats": {
        "health": 38,
        "speed": 30,
        "armor": 3,
        "shield": 0,
        "impact": 23,
        "score": 15
      },
      "traitBadge": "creatures/fast-badge.png"
    },
    {
      "id": "tank",
      "type": "tank",
      "name": "铜犀云甲",
      "class": "重装",
      "role": "regular",
      "minLevel": 1,
      "weight": 10,
      "rarity": "少见",
      "radius": 20,
      "glyph": "叠甲",
      "silhouetteKey": "犀角和三层板甲",
      "theme": "#5d595f",
      "motion": "beetle",
      "portrait": "creatures/tank.png",
      "sheet": "creatures/tank-sheet.png",
      "badge": "creatures/tank-badge.png",
      "silhouette": "creatures/tank-locked.png",
      "defenseMode": "perInstance",
      "baseStats": {
        "health": 126,
        "speed": 10,
        "armor": 15,
        "shield": 0,
        "impact": 49,
        "score": 30
      },
      "traitBadge": "creatures/tank-badge.png"
    },
    {
      "id": "fireResistant",
      "type": "fireResistant",
      "name": "炭炉翼蜥",
      "class": "火系",
      "role": "regular",
      "minLevel": 1,
      "weight": 10,
      "rarity": "少见",
      "radius": 16,
      "glyph": "焰核",
      "silhouetteKey": "橙红炉心与翼膜",
      "theme": "#bc421e",
      "motion": "salamander",
      "portrait": "creatures/fireResistant.png",
      "sheet": "creatures/fireResistant-sheet.png",
      "badge": "creatures/fireResistant-badge.png",
      "silhouette": "creatures/fireResistant-locked.png",
      "defenseMode": "perInstance",
      "baseStats": {
        "health": 66,
        "speed": 20,
        "armor": 8,
        "shield": 0,
        "impact": 33,
        "score": 20
      },
      "traitBadge": "creatures/fireResistant-badge.png"
    },
    {
      "id": "iceImmune",
      "type": "iceImmune",
      "name": "霜镜雪鸮",
      "class": "冰系",
      "role": "regular",
      "minLevel": 1,
      "weight": 8,
      "rarity": "少见",
      "radius": 14,
      "glyph": "冰晶",
      "silhouetteKey": "双耳冠与冰晶扇翼",
      "theme": "#5998c0",
      "motion": "owl",
      "portrait": "creatures/iceImmune.png",
      "sheet": "creatures/iceImmune-sheet.png",
      "badge": "creatures/iceImmune-badge.png",
      "silhouette": "creatures/iceImmune-locked.png",
      "defenseMode": "perInstance",
      "baseStats": {
        "health": 60,
        "speed": 16,
        "armor": 6,
        "shield": 0,
        "impact": 31,
        "score": 25
      },
      "traitBadge": "creatures/iceImmune-badge.png"
    },
    {
      "id": "electricResistant",
      "type": "electricResistant",
      "name": "鸣雷云鳐",
      "class": "电系",
      "role": "regular",
      "minLevel": 1,
      "weight": 7,
      "rarity": "少见",
      "radius": 17,
      "glyph": "折闪",
      "silhouetteKey": "菱鳍与短闪电尾刺",
      "theme": "#529789",
      "motion": "manta",
      "portrait": "creatures/electricResistant.png",
      "sheet": "creatures/electricResistant-sheet.png",
      "badge": "creatures/electricResistant-badge.png",
      "silhouette": "creatures/electricResistant-locked.png",
      "defenseMode": "perInstance",
      "baseStats": {
        "health": 72,
        "speed": 14,
        "armor": 10,
        "shield": 0,
        "impact": 34,
        "score": 22
      },
      "traitBadge": "creatures/electricResistant-badge.png"
    },
    {
      "id": "elite",
      "type": "elite",
      "name": "冠羽狮鹫",
      "class": "精英",
      "role": "elite",
      "minLevel": 4,
      "weight": 2,
      "rarity": "稀有",
      "radius": 25,
      "glyph": "三冠",
      "silhouetteKey": "三尖宝冠与狮掌",
      "theme": "#885179",
      "motion": "gryphon",
      "portrait": "creatures/elite.png",
      "sheet": "creatures/elite-sheet.png",
      "badge": "creatures/elite-badge.png",
      "silhouette": "creatures/elite-locked.png",
      "defenseMode": "perInstance",
      "baseStats": {
        "health": 172,
        "speed": 22,
        "armor": 25,
        "shield": 0,
        "impact": 48,
        "score": 50
      },
      "traitBadge": "creatures/elite-badge.png"
    },
    {
      "id": "ghost",
      "type": "ghost",
      "name": "雾幕灵伞",
      "class": "幽灵",
      "role": "special",
      "minLevel": 6,
      "weight": 2,
      "rarity": "稀有",
      "radius": 13,
      "glyph": "幽眼",
      "silhouetteKey": "亮眼、伞冠与下垂魂须",
      "theme": "#947eaf",
      "motion": "jelly",
      "portrait": "creatures/ghost.png",
      "sheet": "creatures/ghost-sheet.png",
      "badge": "creatures/ghost-badge.png",
      "silhouette": "creatures/ghost-locked.png",
      "defenseMode": "fixed",
      "fixedImmunities": [
        "normal",
        "wind",
        "fire",
        "ice"
      ],
      "fixedResistances": [],
      "baseStats": {
        "health": 50,
        "speed": 26,
        "armor": 2,
        "shield": 0,
        "impact": 27,
        "score": 35
      },
      "traitBadge": "creatures/ghost-badge.png"
    },
    {
      "id": "shielded",
      "type": "shielded",
      "name": "碧锁空螯",
      "class": "护盾",
      "role": "regular",
      "minLevel": 1,
      "weight": 3,
      "rarity": "稀有",
      "radius": 18,
      "glyph": "盾",
      "silhouetteKey": "双螯与带锁盾背",
      "theme": "#397461",
      "motion": "crab",
      "portrait": "creatures/shielded.png",
      "sheet": "creatures/shielded-sheet.png",
      "badge": "creatures/shielded-badge.png",
      "silhouette": "creatures/shielded-locked.png",
      "defenseMode": "perInstance",
      "baseStats": {
        "health": 92,
        "speed": 16,
        "armor": 12,
        "shield": 20,
        "impact": 38,
        "score": 28
      },
      "traitBadge": "creatures/shielded-badge.png"
    },
    {
      "id": "boss",
      "type": "boss",
      "name": "旌翼雷君",
      "class": "首领",
      "role": "boss",
      "minLevel": 10,
      "weight": 1,
      "rarity": "首领",
      "radius": 35,
      "glyph": "龙角",
      "silhouetteKey": "带角龙首与铜翼爪",
      "theme": "#6e5667",
      "motion": "wyvern",
      "portrait": "creatures/boss.png",
      "sheet": "creatures/boss-sheet.png",
      "badge": "creatures/boss-badge.png",
      "silhouette": "creatures/boss-locked.png",
      "defenseMode": "perInstance",
      "baseStats": {
        "health": 340,
        "speed": 12,
        "armor": 40,
        "shield": 50,
        "impact": 65,
        "score": 100
      },
      "traitBadge": "creatures/boss-badge.png"
    }
  ]
};
