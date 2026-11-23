module.exports = {
  "schemaVersion": 1,
  "bits": {
    "wind": 1,
    "fire": 2,
    "ice": 4,
    "electric": 8
  },
  "stages": [
    "初航幼龟",
    "驿站飞龟",
    "双塔云哨",
    "巡云要塞",
    "云背王城"
  ],
  "sheet": {
    "frameWidth": 128,
    "frameHeight": 128,
    "columns": 8,
    "rows": 6,
    "anchor": [
      0.5,
      0.5
    ],
    "forward": "up",
    "neutralSpanPx": 100,
    "animations": {
      "fly": {
        "row": 0,
        "frames": 8,
        "fps": 10,
        "loop": true
      },
      "cast": {
        "row": 1,
        "frames": 8,
        "fps": 16,
        "loop": false
      },
      "hit": {
        "row": 2,
        "frames": 6,
        "fps": 18,
        "loop": false
      },
      "defeat": {
        "row": 3,
        "frames": 8,
        "fps": 12,
        "loop": false
      },
      "revive": {
        "row": 4,
        "frames": 8,
        "fps": 12,
        "loop": false
      },
      "unlock": {
        "row": 5,
        "frames": 8,
        "fps": 12,
        "loop": false
      }
    }
  },
  "modules": [
    {
      "id": "wind",
      "name": "翡翠风帆",
      "file": "forms/module-wind.png",
      "anchor": [
        0.335,
        0.41
      ]
    },
    {
      "id": "fire",
      "name": "烽火铜炉",
      "file": "forms/module-fire.png",
      "anchor": [
        0.665,
        0.41
      ]
    },
    {
      "id": "ice",
      "name": "霜晶舱",
      "file": "forms/module-ice.png",
      "anchor": [
        0.35,
        0.61
      ]
    },
    {
      "id": "electric",
      "name": "雷鸣桅",
      "file": "forms/module-electric.png",
      "anchor": [
        0.65,
        0.61
      ]
    }
  ],
  "forms": [
    {
      "id": 0,
      "mask": 0,
      "stage": 0,
      "name": "初航幼龟",
      "portrait": "forms/00.png",
      "sheet": "forms/00-sheet.png",
      "unlocked": [],
      "modules": []
    },
    {
      "id": 1,
      "mask": 1,
      "stage": 1,
      "name": "驿站飞龟",
      "portrait": "forms/01.png",
      "sheet": "forms/01-sheet.png",
      "unlocked": [
        "wind"
      ],
      "modules": [
        "翡翠风帆"
      ]
    },
    {
      "id": 2,
      "mask": 2,
      "stage": 1,
      "name": "驿站飞龟",
      "portrait": "forms/02.png",
      "sheet": "forms/02-sheet.png",
      "unlocked": [
        "fire"
      ],
      "modules": [
        "烽火铜炉"
      ]
    },
    {
      "id": 3,
      "mask": 3,
      "stage": 2,
      "name": "双塔云哨",
      "portrait": "forms/03.png",
      "sheet": "forms/03-sheet.png",
      "unlocked": [
        "wind",
        "fire"
      ],
      "modules": [
        "翡翠风帆",
        "烽火铜炉"
      ]
    },
    {
      "id": 4,
      "mask": 4,
      "stage": 1,
      "name": "驿站飞龟",
      "portrait": "forms/04.png",
      "sheet": "forms/04-sheet.png",
      "unlocked": [
        "ice"
      ],
      "modules": [
        "霜晶舱"
      ]
    },
    {
      "id": 5,
      "mask": 5,
      "stage": 2,
      "name": "双塔云哨",
      "portrait": "forms/05.png",
      "sheet": "forms/05-sheet.png",
      "unlocked": [
        "wind",
        "ice"
      ],
      "modules": [
        "翡翠风帆",
        "霜晶舱"
      ]
    },
    {
      "id": 6,
      "mask": 6,
      "stage": 2,
      "name": "双塔云哨",
      "portrait": "forms/06.png",
      "sheet": "forms/06-sheet.png",
      "unlocked": [
        "fire",
        "ice"
      ],
      "modules": [
        "烽火铜炉",
        "霜晶舱"
      ]
    },
    {
      "id": 7,
      "mask": 7,
      "stage": 3,
      "name": "巡云要塞",
      "portrait": "forms/07.png",
      "sheet": "forms/07-sheet.png",
      "unlocked": [
        "wind",
        "fire",
        "ice"
      ],
      "modules": [
        "翡翠风帆",
        "烽火铜炉",
        "霜晶舱"
      ]
    },
    {
      "id": 8,
      "mask": 8,
      "stage": 1,
      "name": "驿站飞龟",
      "portrait": "forms/08.png",
      "sheet": "forms/08-sheet.png",
      "unlocked": [
        "electric"
      ],
      "modules": [
        "雷鸣桅"
      ]
    },
    {
      "id": 9,
      "mask": 9,
      "stage": 2,
      "name": "双塔云哨",
      "portrait": "forms/09.png",
      "sheet": "forms/09-sheet.png",
      "unlocked": [
        "wind",
        "electric"
      ],
      "modules": [
        "翡翠风帆",
        "雷鸣桅"
      ]
    },
    {
      "id": 10,
      "mask": 10,
      "stage": 2,
      "name": "双塔云哨",
      "portrait": "forms/10.png",
      "sheet": "forms/10-sheet.png",
      "unlocked": [
        "fire",
        "electric"
      ],
      "modules": [
        "烽火铜炉",
        "雷鸣桅"
      ]
    },
    {
      "id": 11,
      "mask": 11,
      "stage": 3,
      "name": "巡云要塞",
      "portrait": "forms/11.png",
      "sheet": "forms/11-sheet.png",
      "unlocked": [
        "wind",
        "fire",
        "electric"
      ],
      "modules": [
        "翡翠风帆",
        "烽火铜炉",
        "雷鸣桅"
      ]
    },
    {
      "id": 12,
      "mask": 12,
      "stage": 2,
      "name": "双塔云哨",
      "portrait": "forms/12.png",
      "sheet": "forms/12-sheet.png",
      "unlocked": [
        "ice",
        "electric"
      ],
      "modules": [
        "霜晶舱",
        "雷鸣桅"
      ]
    },
    {
      "id": 13,
      "mask": 13,
      "stage": 3,
      "name": "巡云要塞",
      "portrait": "forms/13.png",
      "sheet": "forms/13-sheet.png",
      "unlocked": [
        "wind",
        "ice",
        "electric"
      ],
      "modules": [
        "翡翠风帆",
        "霜晶舱",
        "雷鸣桅"
      ]
    },
    {
      "id": 14,
      "mask": 14,
      "stage": 3,
      "name": "巡云要塞",
      "portrait": "forms/14.png",
      "sheet": "forms/14-sheet.png",
      "unlocked": [
        "fire",
        "ice",
        "electric"
      ],
      "modules": [
        "烽火铜炉",
        "霜晶舱",
        "雷鸣桅"
      ]
    },
    {
      "id": 15,
      "mask": 15,
      "stage": 4,
      "name": "云背王城",
      "portrait": "forms/15.png",
      "sheet": "forms/15-sheet.png",
      "unlocked": [
        "wind",
        "fire",
        "ice",
        "electric"
      ],
      "modules": [
        "翡翠风帆",
        "烽火铜炉",
        "霜晶舱",
        "雷鸣桅"
      ]
    }
  ]
};
