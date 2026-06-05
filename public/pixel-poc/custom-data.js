/* PoC: 由《丧尸末世》小说经 claude -p 生成 · 数据驱动同款像素游戏壳 */
window.GAME_DATA = {
  "OPENING": "末日第47天。丧尸潮退去，城市成了腐肉坟场。我背包空了大半，水壶见底，喉咙干得像吞了沙。怀里只剩半块发霉饼干、两颗止痛药和一把卷刃猎刀。再不出门找水，今晚就得渴死在这栋楼里。",
  "INIT_STATS": {
    "sanity": 60,
    "health": 50,
    "hunger": 30,
    "thirst": 30
  },
  "ITEMS": {
    "moldy_biscuit": {
      "id": "moldy_biscuit",
      "icon": "🥫",
      "name": "发霉压缩饼干",
      "kind": "consume",
      "effect": {
        "hunger": 8
      },
      "effText": "饱腹 +8（轻微反胃）",
      "qty": 1
    },
    "empty_bottle": {
      "id": "empty_bottle",
      "icon": "💧",
      "name": "见底的水壶",
      "kind": "consume",
      "effect": {
        "thirst": 3
      },
      "effText": "口渴 +3（只剩一点底）",
      "qty": 1
    },
    "painkiller": {
      "id": "painkiller",
      "icon": "💊",
      "name": "止痛药",
      "kind": "consume",
      "effect": {
        "health": 12,
        "sanity": 4
      },
      "effText": "健康 +12 精神 +4",
      "qty": 2
    },
    "bandage": {
      "id": "bandage",
      "icon": "🩹",
      "name": "脏绷带",
      "kind": "consume",
      "effect": {
        "health": 15
      },
      "effText": "健康 +15",
      "qty": 1
    },
    "rusty_hunter_knife": {
      "id": "rusty_hunter_knife",
      "icon": "🔫",
      "name": "卷刃猎刀",
      "kind": "weapon",
      "effect": {
        "sanity": 3
      },
      "effText": "握紧让人安心 精神 +3",
      "qty": 1
    },
    "scrap_parts": {
      "id": "scrap_parts",
      "icon": "🔩",
      "name": "废铁零件",
      "kind": "material",
      "effect": {},
      "effText": "可改造装备",
      "qty": 3
    },
    "flashlight": {
      "id": "flashlight",
      "icon": "🔦",
      "name": "半电手电",
      "kind": "material",
      "effect": {},
      "effText": "夜探必备",
      "qty": 1
    }
  },
  "DESTINATIONS": [
    {
      "id": "gas_station",
      "icon": "⛽",
      "name": "半亮招牌加油站",
      "danger": 2,
      "reward": "瓶装水 / 打火机 / 油桶",
      "ap": 2,
      "confirm": "招牌还亮着半边，但停车场里有动静……确定过去？"
    },
    {
      "id": "convenience_store",
      "icon": "🏪",
      "name": "洗劫过的便利店",
      "danger": 2,
      "reward": "罐头 / 饮料 / 电池",
      "ap": 2,
      "confirm": "玻璃门碎了一地，里面应该还有人没翻到的角落，去吗？"
    },
    {
      "id": "community_clinic",
      "icon": "🏥",
      "name": "社区医院二楼",
      "danger": 3,
      "reward": "药品 / 绷带 / 干净水",
      "ap": 3,
      "confirm": "走廊飘着血腥味，但药品柜可能还没被砸开，确定深入？"
    },
    {
      "id": "abandoned_subway",
      "icon": "🚇",
      "name": "废弃地铁站",
      "danger": 4,
      "reward": "军用物资 / 大量饮用水 / 重武器",
      "ap": 4,
      "confirm": "地铁口黑得像井，里面回荡着低吼。下去就出不来——确定？"
    }
  ],
  "COMPANIONS_POOL": [
    {
      "id": "lin_doctor",
      "name": "林医生",
      "av": "👩‍⚕️",
      "role": "前社区医院护士",
      "status": "轻伤",
      "detail": "灾变那天还在值夜班，靠手术刀活到现在。",
      "hp": 62,
      "mood": "疲惫但镇定",
      "skill": {
        "id": "field_treat",
        "label": "野战包扎",
        "icon": "🩹",
        "effect": {
          "health": 20
        },
        "line": "她撕开绷带，动作快得不像在末世。",
        "note": "恢复健康·每天一次"
      },
      "ask": "「你也是来抢药的？……让我跟你走，我能让你少死几次。」"
    },
    {
      "id": "old_zhao",
      "name": "老赵",
      "av": "🧔",
      "role": "前出租车司机",
      "status": "健康",
      "detail": "对这座城市的每条小巷都门儿清，开车比开枪还稳。",
      "hp": 78,
      "mood": "沉默寡言",
      "skill": {
        "id": "shortcut",
        "label": "抄近路",
        "icon": "🔧",
        "effect": {
          "sanity": 6
        },
        "line": "老赵带你绕开主街，省下半天力气。",
        "note": "恢复精神·每天一次"
      },
      "ask": "「小子，一个人撑不到下周。带上我，路我熟。」"
    }
  ],
  "MAP_NPC": {
    "name": "独眼老贩",
    "av": "🧓",
    "line": "「天台上的小子，下来唠唠？我这有水，你那把破刀能换。」",
    "options": [
      {
        "id": "trade",
        "label": "交易",
        "icon": "🔁",
        "sub": "用材料换水和罐头"
      },
      {
        "id": "recruit",
        "label": "招募",
        "icon": "🤝",
        "sub": "邀他一起搭伙"
      },
      {
        "id": "info",
        "label": "询问情报",
        "icon": "🗺️",
        "sub": "打听地铁站和医院的情况"
      },
      {
        "id": "leave",
        "label": "离开",
        "icon": "🚶",
        "sub": "不交易，转身就走"
      }
    ]
  },
  "SCENE_COMMENTS": {
    "home": [
      {
        "user": "末日老六",
        "av": "🧟",
        "text": "楼下又来俩，主播别开灯！"
      },
      {
        "user": "求生指南",
        "av": "📻",
        "text": "压缩饼干掰一半留着，今晚还得熬"
      },
      {
        "user": "水壶警告",
        "av": "💧",
        "text": "再不出门找水真要嘎了"
      },
      {
        "user": "键盘幸存者",
        "av": "🎮",
        "text": "猎刀该磨了主播 卷成那样砍不动头"
      }
    ],
    "organize": [
      {
        "user": "包包整理控",
        "av": "🎒",
        "text": "止痛药留着别现在嗑！关键时刻保命"
      },
      {
        "user": "理性派",
        "av": "🔧",
        "text": "废铁零件别扔 后面能改装猎刀"
      },
      {
        "user": "夜行人",
        "av": "🔦",
        "text": "手电先别开 省点电留给地铁站"
      }
    ],
    "destination": [
      {
        "user": "地图通",
        "av": "🗺️",
        "text": "加油站招牌亮着说明发电机还在 优先"
      },
      {
        "user": "老猎人",
        "av": "🔫",
        "text": "医院别去 三天前我看见整层都在爬"
      },
      {
        "user": "水源专家",
        "av": "💧",
        "text": "便利店冷柜底层经常有漏网的瓶装水"
      }
    ],
    "explore": [
      {
        "user": "剧情党",
        "av": "📻",
        "text": "生成一段：货架后面突然伸出一只手 是活人还是丧尸？"
      },
      {
        "user": "惊喜制造机",
        "av": "🎁",
        "text": "生成一个隐藏地下室 里面是前业主囤的水和罐头"
      },
      {
        "user": "恐怖谷",
        "av": "🧟",
        "text": "生成丧尸群从地铁口涌出 必须立刻撤"
      },
      {
        "user": "温情党",
        "av": "🩹",
        "text": "生成一个躲在柜台后的小孩 求你带她走"
      },
      {
        "user": "老赌狗",
        "av": "🎲",
        "text": "生成保险柜！里面要么是药 要么是空的"
      },
      {
        "user": "末日诗人",
        "av": "📖",
        "text": "生成墙上前住户留下的最后一行字 看完精神-3"
      }
    ]
  },
  "COMPANIONS": []
};
