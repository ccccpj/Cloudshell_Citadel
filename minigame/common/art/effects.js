module.exports = {
  "version": 1,
  "origin": "package-root",
  "frameOrder": "row-major",
  "clips": [
    {
      "id": "wave-normal",
      "name": "普通波 · 波前",
      "file": "effects/wave-normal.png",
      "frameWidth": 192,
      "frameHeight": 192,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 12,
      "loop": true,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "wave",
      "element": "normal",
      "sourceRadius": 75,
      "logicalRadius": "wave.radius",
      "logicalWidth": "wave.width",
      "alpha": "wave.alpha",
      "usage": "frame selects surface phase; gameplay radius drives expansion"
    },
    {
      "id": "wave-wind",
      "name": "风波 · 波前",
      "file": "effects/wave-wind.png",
      "frameWidth": 192,
      "frameHeight": 192,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 12,
      "loop": true,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "wave",
      "element": "wind",
      "sourceRadius": 75,
      "logicalRadius": "wave.radius",
      "logicalWidth": "wave.width",
      "alpha": "wave.alpha",
      "usage": "frame selects surface phase; gameplay radius drives expansion"
    },
    {
      "id": "wave-fire",
      "name": "火波 · 波前",
      "file": "effects/wave-fire.png",
      "frameWidth": 192,
      "frameHeight": 192,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 12,
      "loop": true,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "wave",
      "element": "fire",
      "sourceRadius": 75,
      "logicalRadius": "wave.radius",
      "logicalWidth": "wave.width",
      "alpha": "wave.alpha",
      "usage": "frame selects surface phase; gameplay radius drives expansion"
    },
    {
      "id": "wave-ice",
      "name": "冰波 · 波前",
      "file": "effects/wave-ice.png",
      "frameWidth": 192,
      "frameHeight": 192,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 12,
      "loop": true,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "wave",
      "element": "ice",
      "sourceRadius": 75,
      "logicalRadius": "wave.radius",
      "logicalWidth": "wave.width",
      "alpha": "wave.alpha",
      "usage": "frame selects surface phase; gameplay radius drives expansion"
    },
    {
      "id": "wave-electric",
      "name": "电波 · 波前",
      "file": "effects/wave-electric.png",
      "frameWidth": 192,
      "frameHeight": 192,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 12,
      "loop": true,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "wave",
      "element": "electric",
      "sourceRadius": 75,
      "logicalRadius": "wave.radius",
      "logicalWidth": "wave.width",
      "alpha": "wave.alpha",
      "usage": "frame selects surface phase; gameplay radius drives expansion"
    },
    {
      "id": "cast-normal",
      "name": "普通波起手",
      "file": "effects/cast-normal.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 16,
      "loop": false,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "cast"
    },
    {
      "id": "cast-wind",
      "name": "风波起手",
      "file": "effects/cast-wind.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 16,
      "loop": false,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "cast"
    },
    {
      "id": "cast-fire",
      "name": "火波起手",
      "file": "effects/cast-fire.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 16,
      "loop": false,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "cast"
    },
    {
      "id": "cast-ice",
      "name": "冰波起手",
      "file": "effects/cast-ice.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 16,
      "loop": false,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "cast"
    },
    {
      "id": "cast-electric",
      "name": "电波起手",
      "file": "effects/cast-electric.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 16,
      "loop": false,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "cast"
    },
    {
      "id": "enemy-hit",
      "name": "来敌受击",
      "file": "effects/enemy-hit.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 32,
      "loop": false,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "combat"
    },
    {
      "id": "core-hit",
      "name": "飞龟受击",
      "file": "effects/core-hit.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 32,
      "loop": false,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "combat"
    },
    {
      "id": "critical",
      "name": "暴击",
      "file": "effects/critical.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 16,
      "loop": false,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "combat"
    },
    {
      "id": "death",
      "name": "羽片散落",
      "file": "effects/death.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 16,
      "loop": false,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "combat"
    },
    {
      "id": "explosion",
      "name": "燃烧爆炸",
      "file": "effects/explosion.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 16,
      "loop": false,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "combat"
    },
    {
      "id": "shatter",
      "name": "碎冰飞散",
      "file": "effects/shatter.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 16,
      "loop": false,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "combat"
    },
    {
      "id": "low-health",
      "name": "低生命预警",
      "file": "effects/low-health.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 12,
      "loop": true,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "combat"
    },
    {
      "id": "shield",
      "name": "护盾维持",
      "file": "effects/shield.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 12,
      "loop": true,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "combat"
    },
    {
      "id": "shield-break",
      "name": "护盾破裂",
      "file": "effects/shield-break.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 16,
      "loop": false,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "combat"
    },
    {
      "id": "resist",
      "name": "元素抗性反馈",
      "file": "effects/resist.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 16,
      "loop": false,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "combat"
    },
    {
      "id": "immune",
      "name": "元素免疫反馈",
      "file": "effects/immune.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 16,
      "loop": false,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "combat"
    },
    {
      "id": "burn",
      "name": "持续燃烧",
      "file": "effects/burn.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 12,
      "loop": true,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "combat"
    },
    {
      "id": "eternal-flame",
      "name": "永恒之火",
      "file": "effects/eternal-flame.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 12,
      "loop": true,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "combat"
    },
    {
      "id": "slow",
      "name": "减速",
      "file": "effects/slow.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 12,
      "loop": true,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "combat"
    },
    {
      "id": "freeze",
      "name": "冻结",
      "file": "effects/freeze.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 12,
      "loop": true,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "combat"
    },
    {
      "id": "frost-ground",
      "name": "冰霜区域",
      "file": "effects/frost-ground.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 12,
      "loop": true,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "combat"
    },
    {
      "id": "polar-storm",
      "name": "极地风暴",
      "file": "effects/polar-storm.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 12,
      "loop": true,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "combat"
    },
    {
      "id": "knockback",
      "name": "击退风痕",
      "file": "effects/knockback.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 16,
      "loop": false,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "combat"
    },
    {
      "id": "knockback-contact",
      "name": "击退碰撞",
      "file": "effects/knockback-contact.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 16,
      "loop": false,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "combat"
    },
    {
      "id": "vortex",
      "name": "风暴之眼",
      "file": "effects/vortex.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 12,
      "loop": true,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "combat"
    },
    {
      "id": "chain",
      "name": "两点电弧",
      "file": "effects/chain.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 12,
      "loop": true,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "combat",
      "sourceEndpoints": [
        [
          6,
          56
        ],
        [
          106,
          56
        ]
      ],
      "rotation": "alongSegment"
    },
    {
      "id": "fire-chain",
      "name": "燃烧连线",
      "file": "effects/fire-chain.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 12,
      "loop": true,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "combat",
      "sourceEndpoints": [
        [
          6,
          56
        ],
        [
          106,
          56
        ]
      ],
      "rotation": "alongSegment"
    },
    {
      "id": "storm-strike",
      "name": "闪电风暴",
      "file": "effects/storm-strike.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 16,
      "loop": false,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "combat",
      "sourceEndpoints": [
        [
          6,
          56
        ],
        [
          106,
          56
        ]
      ],
      "rotation": "alongSegment"
    },
    {
      "id": "emp",
      "name": "电磁脉冲",
      "file": "effects/emp.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 16,
      "loop": false,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "combat"
    },
    {
      "id": "phoenix",
      "name": "涅槃火环触发",
      "file": "effects/phoenix.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 16,
      "loop": false,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "combat"
    },
    {
      "id": "heal",
      "name": "生命恢复",
      "file": "effects/heal.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 16,
      "loop": false,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "combat"
    },
    {
      "id": "revive",
      "name": "激励复活",
      "file": "effects/revive.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 16,
      "loop": false,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "combat"
    },
    {
      "id": "core-trail",
      "name": "飞行尾流",
      "file": "effects/core-trail.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 12,
      "loop": true,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "combat"
    },
    {
      "id": "enhance",
      "name": "强化生效",
      "file": "effects/enhance.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 16,
      "loop": false,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "interface"
    },
    {
      "id": "awaken",
      "name": "觉醒生效",
      "file": "effects/awaken.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 16,
      "loop": false,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "interface"
    },
    {
      "id": "unlock",
      "name": "解锁生效",
      "file": "effects/unlock.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 16,
      "loop": false,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "interface"
    },
    {
      "id": "level-up",
      "name": "等级提升",
      "file": "effects/level-up.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 16,
      "loop": false,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "interface"
    },
    {
      "id": "new-entry",
      "name": "图鉴发现",
      "file": "effects/new-entry.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 16,
      "loop": false,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "interface"
    },
    {
      "id": "stage-clear",
      "name": "航段完成",
      "file": "effects/stage-clear.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 16,
      "loop": false,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "interface"
    },
    {
      "id": "stage-warning",
      "name": "最后五秒",
      "file": "effects/stage-warning.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 8,
      "loop": true,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "interface"
    },
    {
      "id": "high-score",
      "name": "刷新纪录",
      "file": "effects/high-score.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 16,
      "loop": false,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "interface"
    },
    {
      "id": "rank-rise",
      "name": "排名提升",
      "file": "effects/rank-rise.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 16,
      "loop": false,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "interface"
    },
    {
      "id": "hud-press",
      "name": "技能按下",
      "file": "effects/hud-press.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 16,
      "loop": false,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "interface"
    },
    {
      "id": "hud-ready",
      "name": "技能就绪",
      "file": "effects/hud-ready.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 16,
      "loop": false,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "interface"
    },
    {
      "id": "wave-switch",
      "name": "元素切换",
      "file": "effects/wave-switch.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 16,
      "loop": false,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "interface"
    },
    {
      "id": "cooldown",
      "name": "冷却进度",
      "file": "effects/cooldown.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 16,
      "loop": false,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "interface",
      "frameSelection": "clamp(floor(elapsed/duration*8),0,7)"
    },
    {
      "id": "loading",
      "name": "载入旋转",
      "file": "effects/loading.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 12,
      "loop": true,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "interface"
    },
    {
      "id": "xp-gain",
      "name": "经验入账",
      "file": "effects/xp-gain.png",
      "frameWidth": 112,
      "frameHeight": 112,
      "columns": 4,
      "rows": 2,
      "frames": 8,
      "fps": 16,
      "loop": false,
      "pivot": [
        0.5,
        0.5
      ],
      "category": "interface"
    }
  ]
};
