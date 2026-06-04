import type { NarrativeChoice } from '../comment-types';

export interface PresetExploreEvent {
  id: string;
  context: 'explore_tile';
  title: string;
  scene: string;
  encounter: string;
  eventType: string;
  tags: string[];
  minDay: number;
  dangerLevel: number;
  narrative: string;
  choices: NarrativeChoice[];
  resourceChanges: Partial<Record<'hp' | 'food' | 'sanity' | 'actionPoints', number>>;
  newItems: string[];
  newCompanions: string[];
}

export const presetExploreEvents: PresetExploreEvent[] = [
  // ─── e01: 废弃超市-无人-搜索 ───
  {
    id: 'e01',
    context: 'explore_tile',
    title: '落灰的货架',
    scene: '废弃超市',
    encounter: '无人',
    eventType: '搜索',
    tags: ['超市', '搜索', '食物', '安全'],
    minDay: 1,
    dangerLevel: 1,
    narrative:
      '你推开超市的玻璃门，铰链发出刺耳的尖叫。货架东倒西歪，地上散落着过期食品的包装袋。空气中弥漫着腐烂和灰尘的味道，但角落里似乎还有几个没被翻过的货架。',
    choices: [
      {
        text: '仔细翻找每一个货架，不放过任何角落',
        cost: { sanity: -5 },
        reward: { food: 15 },
        karma: 0,
        successRate: 0.8,
      },
      {
        text: '只拿最容易够到的东西，速战速决',
        cost: {},
        reward: { food: 8 },
        karma: 0,
        successRate: 0.95,
      },
      {
        text: '在门口设置陷阱警报后再搜索',
        cost: { sanity: -3 },
        reward: { food: 12, sanity: 5 },
        karma: 0,
        successRate: 0.85,
      },
    ],
    resourceChanges: {},
    newItems: ['罐头食品'],
    newCompanions: [],
  },

  // ─── e02: 废弃超市-独行幸存者-NPC遭遇 ───
  {
    id: 'e02',
    context: 'explore_tile',
    title: '收银台后面有人',
    scene: '废弃超市',
    encounter: '独行幸存者',
    eventType: 'NPC遭遇',
    tags: ['超市', 'NPC', '幸存者', '社交'],
    minDay: 1,
    dangerLevel: 2,
    narrative:
      '你正在翻找货架时，收银台后面传来一声轻咳。一个蓬头垢面的人慢慢站起来，手里攥着一把美工刀。他看起来很紧张，但并没有攻击的意思——他的眼神里更多的是疲惫和警惕。',
    choices: [
      {
        text: '放下武器，表示友善，提议分享食物',
        cost: { food: -5 },
        reward: { sanity: 10 },
        karma: 2,
        successRate: 0.75,
      },
      {
        text: '保持距离，用手势示意各走各的',
        cost: {},
        reward: { sanity: 3 },
        karma: 0,
        successRate: 0.9,
      },
      {
        text: '趁对方紧张，喝令对方交出物资',
        cost: { sanity: -8 },
        reward: { food: 12 },
        karma: -3,
        successRate: 0.6,
      },
    ],
    resourceChanges: {},
    newItems: [],
    newCompanions: ['流浪者阿杰'],
  },

  // ─── e03: 废弃超市-武装团伙-战斗 ───
  {
    id: 'e03',
    context: 'explore_tile',
    title: '超市已被占据',
    scene: '废弃超市',
    encounter: '武装团伙',
    eventType: '战斗',
    tags: ['超市', '战斗', '武装', '危险'],
    minDay: 3,
    dangerLevel: 4,
    narrative:
      '你刚踏进超市大门，三束手电光同时照在你脸上。"又一个不长眼的。"为首的光头男举起霰弹枪，身后两个同伙已经堵住了出口。超市里堆满了他们搜刮来的物资——这是他们的地盘。',
    choices: [
      {
        text: '举起双手，用食物换取通行',
        cost: { food: -10 },
        reward: {},
        karma: 0,
        successRate: 0.7,
      },
      {
        text: '利用货架掩护，打翻最近的人后突围',
        cost: { hp: -15 },
        reward: { food: 20, sanity: 5 },
        karma: -1,
        successRate: 0.45,
      },
      {
        text: '扔出一个烟雾弹（如果有的话），趁乱逃跑',
        cost: { sanity: -5 },
        reward: {},
        karma: 0,
        successRate: 0.65,
      },
    ],
    resourceChanges: { hp: -5 },
    newItems: [],
    newCompanions: [],
  },

  // ─── e04: 废弃医院-无人-搜索 ───
  {
    id: 'e04',
    context: 'explore_tile',
    title: '废弃药房找药品',
    scene: '废弃医院',
    encounter: '无人',
    eventType: '搜索',
    tags: ['医院', '搜索', '药品', '医疗'],
    minDay: 1,
    dangerLevel: 2,
    narrative:
      '医院的药房大门被撬开过，但里面的药柜似乎还没有被完全洗劫。走廊里弥漫着消毒水和霉菌混合的气味，脚下的碎玻璃咯吱作响。深处的储藏室门还锁着——也许里面还有好东西。',
    choices: [
      {
        text: '撬开储藏室的锁，彻底搜索',
        cost: { sanity: -3 },
        reward: { hp: 20 },
        karma: 0,
        successRate: 0.7,
      },
      {
        text: '只拿外面散落的药品，不冒险',
        cost: {},
        reward: { hp: 8 },
        karma: 0,
        successRate: 0.95,
      },
      {
        text: '搜索护士站的抽屉，可能有被忽略的急救包',
        cost: { sanity: -2 },
        reward: { hp: 12 },
        karma: 0,
        successRate: 0.8,
      },
    ],
    resourceChanges: {},
    newItems: ['急救药品'],
    newCompanions: [],
  },

  // ─── e05: 废弃医院-受伤的人-抉择 ───
  {
    id: 'e05',
    context: 'explore_tile',
    title: '手术台上躺着人',
    scene: '废弃医院',
    encounter: '受伤的人',
    eventType: '抉择',
    tags: ['医院', '抉择', '受伤', '救人', '道德'],
    minDay: 2,
    dangerLevel: 3,
    narrative:
      '手术室的灯奇迹般还亮着。一个年轻女人躺在手术台上，腿上缠着血淋淋的绷带，已经陷入半昏迷。旁边的托盘上放着还没用完的医疗器械——有人试图救她但中途离开了。她的呼吸越来越浅。',
    choices: [
      {
        text: '用你的药品帮她处理伤口，尽力救治',
        cost: { hp: -10, food: -5 },
        reward: { sanity: 15 },
        karma: 3,
        successRate: 0.6,
      },
      {
        text: '留下一些食物和水，但不耽搁时间',
        cost: { food: -5 },
        reward: { sanity: 5 },
        karma: 1,
        successRate: 0.9,
      },
      {
        text: '她已经没救了，拿走旁边有用的医疗器械',
        cost: { sanity: -10 },
        reward: { hp: 15 },
        karma: -3,
        successRate: 0.95,
      },
    ],
    resourceChanges: {},
    newItems: [],
    newCompanions: ['伤员小林'],
  },

  // ─── e06: 废弃医院-变异生物-战斗 ───
  {
    id: 'e06',
    context: 'explore_tile',
    title: '感染区异响',
    scene: '废弃医院',
    encounter: '变异生物',
    eventType: '战斗',
    tags: ['医院', '战斗', '变异', '恐怖'],
    minDay: 4,
    dangerLevel: 5,
    narrative:
      '你推开标着"隔离区"的门，空气瞬间变得黏稠恶臭。天花板上挂满了肉红色的菌丝，角落里传来湿漉漉的咀嚼声。一个浑身长满脓疮的人形生物缓缓转过头来——它曾经是这里的医生，胸前的工牌还依稀可辨。',
    choices: [
      {
        text: '趁它还没完全反应过来，全力攻击要害',
        cost: { hp: -10 },
        reward: { sanity: 10, food: 5 },
        karma: 0,
        successRate: 0.55,
      },
      {
        text: '慢慢后退，关上隔离门把它锁在里面',
        cost: { sanity: -5 },
        reward: {},
        karma: 0,
        successRate: 0.75,
      },
      {
        text: '用走廊的氧气瓶制造爆炸，炸毁整个隔离区',
        cost: { hp: -8 },
        reward: { sanity: 8 },
        karma: 0,
        successRate: 0.5,
      },
    ],
    resourceChanges: { hp: -5 },
    newItems: ['变异组织样本'],
    newCompanions: [],
  },

  // ─── e07: 军事哨站-AI机器人-战斗 ───
  {
    id: 'e07',
    context: 'explore_tile',
    title: '巡逻机器人红光扫过',
    scene: '军事哨站',
    encounter: 'AI机器人',
    eventType: '战斗',
    tags: ['军事', '战斗', 'AI', '机器人', '高科技'],
    minDay: 5,
    dangerLevel: 5,
    narrative:
      '哨站大门紧闭，但围墙有一处缺口。你刚钻过去，一道红色激光扫过地面——三台四足巡逻机器人正沿着预设路线来回巡视。它们的摄像头闪烁着冰冷的蓝光，机械臂末端的电击装置嗡嗡作响。',
    choices: [
      {
        text: '观察巡逻规律，找到盲区潜入',
        cost: { sanity: -5 },
        reward: { food: 10, sanity: 8 },
        karma: 0,
        successRate: 0.5,
      },
      {
        text: '用金属碎片引开机器人注意力，趁机冲进建筑',
        cost: { hp: -8 },
        reward: { sanity: 5 },
        karma: 0,
        successRate: 0.6,
      },
      {
        text: '放弃进入，这里太危险了',
        cost: { sanity: -3 },
        reward: {},
        karma: 0,
        successRate: 1.0,
      },
    ],
    resourceChanges: {},
    newItems: ['电子元件'],
    newCompanions: [],
  },

  // ─── e08: 军事哨站-无人-搜索 ───
  {
    id: 'e08',
    context: 'explore_tile',
    title: '军火库门虚掩',
    scene: '军事哨站',
    encounter: '无人',
    eventType: '搜索',
    tags: ['军事', '搜索', '武器', '物资'],
    minDay: 3,
    dangerLevel: 3,
    narrative:
      '哨站看起来已经被废弃很久了，沙袋工事上长满了杂草。但军火库的铁门居然只是虚掩着——要么是最后撤离的士兵太匆忙，要么是有人故意留的。里面隐约能看到弹药箱的轮廓。',
    choices: [
      {
        text: '小心推开门，检查是否有陷阱后进入搜索',
        cost: { sanity: -3 },
        reward: { hp: 5, sanity: 10 },
        karma: 0,
        successRate: 0.75,
      },
      {
        text: '直接冲进去，能拿多少拿多少',
        cost: { hp: -5 },
        reward: { sanity: 15 },
        karma: 0,
        successRate: 0.6,
      },
      {
        text: '只在外围搜索，不进军火库',
        cost: {},
        reward: { food: 5 },
        karma: 0,
        successRate: 0.9,
      },
    ],
    resourceChanges: {},
    newItems: ['军用匕首', '防弹背心'],
    newCompanions: [],
  },

  // ─── e09: 军事哨站-独行幸存者-线索 ───
  {
    id: 'e09',
    context: 'explore_tile',
    title: '有人在修通讯塔',
    scene: '军事哨站',
    encounter: '独行幸存者',
    eventType: '发现线索',
    tags: ['军事', '线索', '通讯', '幸存者', '技术'],
    minDay: 4,
    dangerLevel: 2,
    narrative:
      '通讯塔上有个人影在忙碌。走近了才看清，是一个戴着工程帽的中年男人，正在焊接天线。他注意到你后并不惊慌："我快修好了，如果成功的话，能收到200公里外的信号。你想知道外面的世界怎么样了吗？"',
    choices: [
      {
        text: '帮他一起修，用你的零件加速进度',
        cost: { food: -5 },
        reward: { sanity: 15 },
        karma: 2,
        successRate: 0.7,
      },
      {
        text: '等他修好，问问他收到了什么信号',
        cost: {},
        reward: { sanity: 8 },
        karma: 0,
        successRate: 0.85,
      },
      {
        text: '拿走他的工具和零件，你更需要这些',
        cost: { sanity: -12 },
        reward: { food: 8 },
        karma: -3,
        successRate: 0.7,
      },
    ],
    resourceChanges: {},
    newItems: ['通讯频率记录'],
    newCompanions: ['工程师老赵'],
  },

  // ─── e10: 地下隧道-无人-环境灾害 ───
  {
    id: 'e10',
    context: 'explore_tile',
    title: '积水越来越深',
    scene: '地下隧道',
    encounter: '无人',
    eventType: '环境灾害',
    tags: ['隧道', '灾害', '水灾', '求生'],
    minDay: 2,
    dangerLevel: 4,
    narrative:
      '地下隧道入口处的水刚没过脚踝，你以为没什么大不了。但越往深处走，水位上升得越快，现在已经到了大腿。远处传来轰隆隆的水流声——某处管道可能刚刚破裂，水位还在上涨。',
    choices: [
      {
        text: '趁水位还不高，拼命往回跑',
        cost: { hp: -5, sanity: -5 },
        reward: {},
        karma: 0,
        successRate: 0.8,
      },
      {
        text: '爬上管道支架，等水位稳定后再行动',
        cost: { food: -3 },
        reward: { sanity: 5 },
        karma: 0,
        successRate: 0.7,
      },
      {
        text: '深吸一口气，潜水穿过前方通道看看有没有出口',
        cost: { hp: -12 },
        reward: { sanity: 10, food: 8 },
        karma: 0,
        successRate: 0.4,
      },
    ],
    resourceChanges: { hp: -3, sanity: -3 },
    newItems: [],
    newCompanions: [],
  },

  // ─── e11: 地下隧道-变异生物-战斗 ───
  {
    id: 'e11',
    context: 'explore_tile',
    title: '黑暗中有东西在动',
    scene: '地下隧道',
    encounter: '变异生物',
    eventType: '战斗',
    tags: ['隧道', '战斗', '变异', '黑暗', '恐怖'],
    minDay: 4,
    dangerLevel: 5,
    narrative:
      '手电筒的光束在隧道壁上跳动，你听到身后传来"嗒嗒嗒"的声音——像是无数条腿在水泥地面上快速移动。你猛地转身，光束照到一只巨大的变异蜈蚣，它的复眼反射出诡异的绿光，长度几乎占满了整个隧道宽度。',
    choices: [
      {
        text: '用火把逼退它，虫类应该怕火',
        cost: { hp: -5 },
        reward: { sanity: 10 },
        karma: 0,
        successRate: 0.6,
      },
      {
        text: '钻进旁边的通风管道，它体型太大追不进来',
        cost: { sanity: -8 },
        reward: {},
        karma: 0,
        successRate: 0.7,
      },
      {
        text: '对准它的复眼猛刺，一击致命',
        cost: { hp: -15 },
        reward: { food: 12, sanity: 12 },
        karma: 0,
        successRate: 0.35,
      },
    ],
    resourceChanges: { hp: -5 },
    newItems: ['坚硬甲壳'],
    newCompanions: [],
  },

  // ─── e12: 地下隧道-独行幸存者-NPC遭遇 ───
  {
    id: 'e12',
    context: 'explore_tile',
    title: '手电照到一张脸',
    scene: '地下隧道',
    encounter: '独行幸存者',
    eventType: 'NPC遭遇',
    tags: ['隧道', 'NPC', '幸存者', '惊吓'],
    minDay: 2,
    dangerLevel: 2,
    narrative:
      '你的手电光扫过隧道拐角时，照到了一张苍白的脸——你们同时吓了一跳。对方是个年轻人，背着一个塞得鼓鼓囊囊的登山包，他说他知道一条穿过隧道的安全路线，但一个人不敢走。',
    choices: [
      {
        text: '结伴同行，互相照应',
        cost: { food: -3 },
        reward: { sanity: 12 },
        karma: 1,
        successRate: 0.8,
      },
      {
        text: '让他把路线画给你，各走各的',
        cost: {},
        reward: { sanity: 5 },
        karma: 0,
        successRate: 0.85,
      },
      {
        text: '不信任陌生人，原路返回',
        cost: { sanity: -5 },
        reward: {},
        karma: 0,
        successRate: 1.0,
      },
    ],
    resourceChanges: {},
    newItems: ['隧道地图'],
    newCompanions: ['背包客小陈'],
  },

  // ─── e13: 居民废墟-幸存者家庭-抉择 ───
  {
    id: 'e13',
    context: 'explore_tile',
    title: '公寓传来婴儿声',
    scene: '居民废墟',
    encounter: '幸存者家庭',
    eventType: '抉择',
    tags: ['居民区', '抉择', '家庭', '婴儿', '道德'],
    minDay: 2,
    dangerLevel: 2,
    narrative:
      '废弃公寓楼里传来微弱的婴儿哭声。你循声找到三楼的一间公寓，门虚掩着——里面是一对年轻夫妇和一个襁褓中的婴儿。他们的食物已经见底，妻子发着高烧，丈夫眼里满是绝望。',
    choices: [
      {
        text: '把你的食物和药品分给他们一半',
        cost: { food: -12, hp: -8 },
        reward: { sanity: 20 },
        karma: 4,
        successRate: 0.95,
      },
      {
        text: '告诉他们附近哪里可以找到物资',
        cost: {},
        reward: { sanity: 8 },
        karma: 1,
        successRate: 0.9,
      },
      {
        text: '假装没看到，悄悄离开',
        cost: { sanity: -10 },
        reward: {},
        karma: -2,
        successRate: 1.0,
      },
    ],
    resourceChanges: {},
    newItems: [],
    newCompanions: [],
  },

  // ─── e14: 居民废墟-无人-搜索 ───
  {
    id: 'e14',
    context: 'explore_tile',
    title: '没被翻过的保险箱',
    scene: '居民废墟',
    encounter: '无人',
    eventType: '搜索',
    tags: ['居民区', '搜索', '保险箱', '宝藏'],
    minDay: 1,
    dangerLevel: 1,
    narrative:
      '这间公寓的主人走得很匆忙，衣柜大敞着，地上散落着照片和证件。但你注意到床底下露出一角金属光泽——是一个小型家用保险箱，看起来还没有被其他搜刮者发现。',
    choices: [
      {
        text: '花时间尝试各种密码组合打开它',
        cost: { sanity: -3 },
        reward: { food: 10, sanity: 8 },
        karma: 0,
        successRate: 0.5,
      },
      {
        text: '用工具暴力撬开',
        cost: { hp: -3 },
        reward: { food: 8, sanity: 5 },
        karma: 0,
        successRate: 0.75,
      },
      {
        text: '搬走整个保险箱，回去再慢慢开',
        cost: { hp: -5, sanity: -2 },
        reward: { food: 12, sanity: 10 },
        karma: 0,
        successRate: 0.85,
      },
    ],
    resourceChanges: {},
    newItems: ['贵重首饰'],
    newCompanions: [],
  },

  // ─── e15: 加油站-商人-NPC遭遇 ───
  {
    id: 'e15',
    context: 'explore_tile',
    title: '流动商人歇脚',
    scene: '加油站',
    encounter: '商人',
    eventType: 'NPC遭遇',
    tags: ['加油站', 'NPC', '商人', '交易'],
    minDay: 2,
    dangerLevel: 1,
    narrative:
      '加油站的遮阳棚下停着一辆改装过的三轮车，上面挂满了各种物资。一个戴草帽的中年人正悠闲地啃着干粮，看到你后露出职业性的笑容："来看看？末世里也得做生意不是。药品、工具、食物，只要你出得起价。"',
    choices: [
      {
        text: '用多余的物资交换急需的药品',
        cost: { food: -8 },
        reward: { hp: 15 },
        karma: 0,
        successRate: 0.9,
      },
      {
        text: '和他聊聊，打听附近的情报',
        cost: { food: -3 },
        reward: { sanity: 10 },
        karma: 0,
        successRate: 0.85,
      },
      {
        text: '不交易，但问他下次什么时候再来',
        cost: {},
        reward: { sanity: 3 },
        karma: 0,
        successRate: 1.0,
      },
    ],
    resourceChanges: {},
    newItems: ['交易地图'],
    newCompanions: [],
  },

  // ─── e16: 加油站-武装团伙-战斗 ───
  {
    id: 'e16',
    context: 'explore_tile',
    title: '这个地盘有人了',
    scene: '加油站',
    encounter: '武装团伙',
    eventType: '战斗',
    tags: ['加油站', '战斗', '武装', '领地'],
    minDay: 3,
    dangerLevel: 4,
    narrative:
      '加油站看起来被精心改造过——轮胎垒成的路障，铁丝网围起的外围。你还没靠近，一发子弹就打在脚前的地面上。"站住！再走一步我就不是警告了！"屋顶上至少有两个枪手。',
    choices: [
      {
        text: '大声喊话表明来意，请求通行或交易',
        cost: { food: -5 },
        reward: { sanity: 5 },
        karma: 0,
        successRate: 0.6,
      },
      {
        text: '立刻撤退，寻找其他路线',
        cost: { sanity: -5 },
        reward: {},
        karma: 0,
        successRate: 0.9,
      },
      {
        text: '趁夜色绕到侧面，偷袭他们的物资仓库',
        cost: { hp: -12 },
        reward: { food: 20, sanity: 8 },
        karma: -2,
        successRate: 0.35,
      },
    ],
    resourceChanges: {},
    newItems: [],
    newCompanions: [],
  },

  // ─── e17: 学校-无人-线索 ───
  {
    id: 'e17',
    context: 'explore_tile',
    title: '黑板上画着地图',
    scene: '学校',
    encounter: '无人',
    eventType: '发现线索',
    tags: ['学校', '线索', '地图', '情报'],
    minDay: 2,
    dangerLevel: 1,
    narrative:
      '教室的黑板上用粉笔画满了标记——不是课堂笔记，而是一张详细的区域地图。上面标注了几个红色圆圈写着"危险"，绿色三角写着"物资"，还有一个蓝色星形标记写着"安全区？"。有人在这里做过非常仔细的侦察。',
    choices: [
      {
        text: '仔细抄录整张地图，记下所有标注',
        cost: { sanity: -2 },
        reward: { sanity: 15 },
        karma: 0,
        successRate: 0.95,
      },
      {
        text: '只记住"安全区"的位置，赶紧出发',
        cost: {},
        reward: { sanity: 10 },
        karma: 0,
        successRate: 0.9,
      },
      {
        text: '搜索教室其他地方，画地图的人可能留下了更多信息',
        cost: { sanity: -3 },
        reward: { sanity: 12, food: 5 },
        karma: 0,
        successRate: 0.7,
      },
    ],
    resourceChanges: {},
    newItems: ['手绘地图'],
    newCompanions: [],
  },

  // ─── e18: 学校-幸存者家庭-抉择 ───
  {
    id: 'e18',
    context: 'explore_tile',
    title: '一群孩子在躲藏',
    scene: '学校',
    encounter: '幸存者家庭',
    eventType: '抉择',
    tags: ['学校', '抉择', '孩子', '道德', '保护'],
    minDay: 3,
    dangerLevel: 2,
    narrative:
      '学校体育馆里传来窸窣的声音。你推开门，七八个孩子惊恐地缩成一团，年纪最大的不过十二三岁。他们身边只有几瓶水和一袋饼干。带头的男孩握着一根铁管挡在其他人前面，声音发抖但眼神坚定："不要伤害他们。"',
    choices: [
      {
        text: '留下大量食物和水，教他们基本的防卫技巧',
        cost: { food: -15 },
        reward: { sanity: 20 },
        karma: 5,
        successRate: 0.95,
      },
      {
        text: '带他们去你知道的安全地点',
        cost: { food: -8, hp: -5 },
        reward: { sanity: 15 },
        karma: 3,
        successRate: 0.6,
      },
      {
        text: '告诉他们往北走有营地，然后离开',
        cost: {},
        reward: { sanity: 3 },
        karma: 0,
        successRate: 0.9,
      },
    ],
    resourceChanges: {},
    newItems: [],
    newCompanions: [],
  },

  // ─── e19: 工厂-AI机器人-战斗 ───
  {
    id: 'e19',
    context: 'explore_tile',
    title: '被AI接管的工厂',
    scene: '工厂',
    encounter: 'AI机器人',
    eventType: '战斗',
    tags: ['工厂', '战斗', 'AI', '自动化', '危险'],
    minDay: 6,
    dangerLevel: 5,
    narrative:
      '工厂的烟囱居然还在冒烟。走近后你发现流水线还在运转——但操控它们的不是人类，而是一群改装过的工业机器人。它们似乎在自主生产某种东西。当你触发了红外感应器时，最近的机械臂猛地转向了你。',
    choices: [
      {
        text: '找到控制室，尝试关闭AI系统',
        cost: { hp: -10 },
        reward: { sanity: 15, food: 10 },
        karma: 0,
        successRate: 0.4,
      },
      {
        text: '利用工厂的复杂地形，引爆锅炉制造混乱后撤离',
        cost: { hp: -8 },
        reward: { sanity: 8 },
        karma: 0,
        successRate: 0.55,
      },
      {
        text: '立刻撤退，记录位置以后再来',
        cost: { sanity: -3 },
        reward: {},
        karma: 0,
        successRate: 0.95,
      },
    ],
    resourceChanges: { hp: -5 },
    newItems: ['AI核心碎片'],
    newCompanions: [],
  },

  // ─── e20: 工厂-无人-搜索 ───
  {
    id: 'e20',
    context: 'explore_tile',
    title: '找到可用零件',
    scene: '工厂',
    encounter: '无人',
    eventType: '搜索',
    tags: ['工厂', '搜索', '零件', '制造'],
    minDay: 2,
    dangerLevel: 2,
    narrative:
      '这座废弃工厂的车间里满是生锈的机床和散落的金属零件。虽然大部分设备已经报废，但工具间里还有一些保存完好的扳手、螺丝刀和焊接工具。仓库角落还堆着几卷未开封的铜线。',
    choices: [
      {
        text: '系统性地搜索整个工具间，挑选最有用的',
        cost: { sanity: -3 },
        reward: { sanity: 10 },
        karma: 0,
        successRate: 0.85,
      },
      {
        text: '重点搜索仓库，大件物资更有价值',
        cost: { hp: -3 },
        reward: { food: 5, sanity: 8 },
        karma: 0,
        successRate: 0.75,
      },
      {
        text: '快速扫一遍，拿走最轻便的工具就走',
        cost: {},
        reward: { sanity: 5 },
        karma: 0,
        successRate: 0.95,
      },
    ],
    resourceChanges: {},
    newItems: ['多功能工具', '铜线'],
    newCompanions: [],
  },

  // ─── e21: 野外-变异生物-战斗 ───
  {
    id: 'e21',
    context: 'explore_tile',
    title: '变异狼群',
    scene: '野外',
    encounter: '变异生物',
    eventType: '战斗',
    tags: ['野外', '战斗', '变异', '狼', '群体'],
    minDay: 4,
    dangerLevel: 5,
    narrative:
      '你正在穿越一片枯死的树林时，四周突然安静得可怕——连虫鸣声都消失了。然后你看到了它们：五只变异狼从灌木丛中缓缓现身，体型比正常狼大了一倍，皮毛下的肌肉隆起异常的结节。领头的那只歪着头盯着你，口水滴落在枯叶上冒出白烟。',
    choices: [
      {
        text: '点燃随身携带的火把，火焰应该能吓退它们',
        cost: { hp: -5 },
        reward: { sanity: 10 },
        karma: 0,
        successRate: 0.6,
      },
      {
        text: '爬上最近的大树，等狼群离开',
        cost: { food: -5, sanity: -5 },
        reward: {},
        karma: 0,
        successRate: 0.75,
      },
      {
        text: '瞄准领头狼，击杀它让狼群溃散',
        cost: { hp: -18 },
        reward: { food: 15, sanity: 15 },
        karma: 0,
        successRate: 0.3,
      },
    ],
    resourceChanges: { hp: -5 },
    newItems: ['狼皮'],
    newCompanions: [],
  },

  // ─── e22: 野外-无人-搜索 ───
  {
    id: 'e22',
    context: 'explore_tile',
    title: '发现药草',
    scene: '野外',
    encounter: '无人',
    eventType: '搜索',
    tags: ['野外', '搜索', '药草', '自然', '治疗'],
    minDay: 1,
    dangerLevel: 1,
    narrative:
      '溪流边的湿地上长满了你认识的草药——金银花、车前草、还有几株珍贵的黄芩。末日之后，这些野生植物反而长得比以前更加茂盛。这是难得的天然药材来源。',
    choices: [
      {
        text: '花时间仔细采集和分类，确保每种药草都正确保存',
        cost: { sanity: -2 },
        reward: { hp: 15 },
        karma: 0,
        successRate: 0.9,
      },
      {
        text: '快速采一些最常见的，赶路要紧',
        cost: {},
        reward: { hp: 8 },
        karma: 0,
        successRate: 0.95,
      },
      {
        text: '在这里扎营半天，除了采药还可以钓鱼补充食物',
        cost: { sanity: -3 },
        reward: { hp: 10, food: 10 },
        karma: 0,
        successRate: 0.8,
      },
    ],
    resourceChanges: {},
    newItems: ['草药包'],
    newCompanions: [],
  },

  // ─── e23: 野外-受伤的人-NPC遭遇 ───
  {
    id: 'e23',
    context: 'explore_tile',
    title: '有人倒在路边',
    scene: '野外',
    encounter: '受伤的人',
    eventType: 'NPC遭遇',
    tags: ['野外', 'NPC', '受伤', '救援', '道德'],
    minDay: 2,
    dangerLevel: 2,
    narrative:
      '路边的草丛里伸出一只手。你拨开杂草，发现一个中年女人蜷缩着，小腿上有明显的动物咬伤，已经开始发炎。她勉强睁开眼，声音沙哑："求你……有水吗？"她的背包里翻出了一本日记和一张标注详细的地图。',
    choices: [
      {
        text: '给她水和药品，处理伤口后带她同行',
        cost: { food: -5, hp: -5 },
        reward: { sanity: 15 },
        karma: 3,
        successRate: 0.7,
      },
      {
        text: '给她水和基本急救，但不带她走',
        cost: { food: -3 },
        reward: { sanity: 8 },
        karma: 1,
        successRate: 0.9,
      },
      {
        text: '拿走她的地图和有用的东西就离开',
        cost: { sanity: -15 },
        reward: { food: 5 },
        karma: -4,
        successRate: 0.95,
      },
    ],
    resourceChanges: {},
    newItems: ['详细地图'],
    newCompanions: ['向导阿梅'],
  },

  // ─── e24: 桥梁-AI机器人-战斗 ───
  {
    id: 'e24',
    context: 'explore_tile',
    title: '桥上AI检查站',
    scene: '桥梁',
    encounter: 'AI机器人',
    eventType: '战斗',
    tags: ['桥梁', '战斗', 'AI', '检查站', '封锁'],
    minDay: 5,
    dangerLevel: 5,
    narrative:
      '大桥是通往河对岸的唯一通道，但桥头被一排自动炮塔和两台人形机器人封锁了。它们头顶的扬声器循环播放着："非授权人员禁止通行。请出示身份芯片。"桥面上散落着几具没能通过检查的尸体。',
    choices: [
      {
        text: '从桥下的钢结构攀爬过去，绕过检查站',
        cost: { hp: -10, sanity: -5 },
        reward: { sanity: 12 },
        karma: 0,
        successRate: 0.5,
      },
      {
        text: '用捡到的身份芯片（如果有）尝试骗过扫描',
        cost: {},
        reward: { sanity: 15 },
        karma: 0,
        successRate: 0.4,
      },
      {
        text: '放弃过桥，沿河岸寻找其他渡口',
        cost: { food: -5, sanity: -3 },
        reward: {},
        karma: 0,
        successRate: 0.85,
      },
    ],
    resourceChanges: {},
    newItems: ['身份芯片'],
    newCompanions: [],
  },

  // ─── e25: 桥梁-无人-环境灾害 ───
  {
    id: 'e25',
    context: 'explore_tile',
    title: '桥面坍塌',
    scene: '桥梁',
    encounter: '无人',
    eventType: '环境灾害',
    tags: ['桥梁', '灾害', '坍塌', '求生'],
    minDay: 3,
    dangerLevel: 4,
    narrative:
      '你走到桥中间时脚下突然传来令人牙酸的金属断裂声。裂缝从你脚下向两侧蔓延，混凝土碎块开始坠入几十米下的河流。整座桥在晃动——你只有几秒钟做出决定。',
    choices: [
      {
        text: '全力冲刺跑向对岸，赌桥不会马上塌',
        cost: { hp: -8 },
        reward: { sanity: 10 },
        karma: 0,
        successRate: 0.5,
      },
      {
        text: '立即转身往回跑，回到安全的这一端',
        cost: { sanity: -8 },
        reward: {},
        karma: 0,
        successRate: 0.75,
      },
      {
        text: '抓住桥侧的钢缆，等晃动停止后再移动',
        cost: { hp: -5, sanity: -5 },
        reward: { sanity: 5 },
        karma: 0,
        successRate: 0.6,
      },
    ],
    resourceChanges: { hp: -3, sanity: -5 },
    newItems: [],
    newCompanions: [],
  },

  // ─── e26: 幸存者营地-商人-NPC遭遇 ───
  {
    id: 'e26',
    context: 'explore_tile',
    title: '营地老工匠',
    scene: '幸存者营地',
    encounter: '商人',
    eventType: 'NPC遭遇',
    tags: ['营地', 'NPC', '工匠', '制造', '交易'],
    minDay: 3,
    dangerLevel: 1,
    narrative:
      '营地深处传来叮叮当当的敲打声。一个白发苍苍的老人正在简易工作台前锻造刀具，旁边摆满了他的作品——刀具、鱼钩、箭头，做工精良得不像末世产物。"年轻人，有好材料就拿来，我给你做点实用的东西。"',
    choices: [
      {
        text: '用你的金属零件交换一把好刀',
        cost: { food: -5 },
        reward: { sanity: 12, hp: 5 },
        karma: 0,
        successRate: 0.9,
      },
      {
        text: '请他教你基本的锻造技巧',
        cost: { food: -8 },
        reward: { sanity: 15 },
        karma: 1,
        successRate: 0.8,
      },
      {
        text: '只是聊聊天，打听营地的情况',
        cost: {},
        reward: { sanity: 5 },
        karma: 0,
        successRate: 1.0,
      },
    ],
    resourceChanges: {},
    newItems: ['锻造短刀'],
    newCompanions: [],
  },

  // ─── e27: 幸存者营地-独行幸存者-线索 ───
  {
    id: 'e27',
    context: 'explore_tile',
    title: '有人声称知道安全区',
    scene: '幸存者营地',
    encounter: '独行幸存者',
    eventType: '发现线索',
    tags: ['营地', '线索', '安全区', '情报', '信任'],
    minDay: 5,
    dangerLevel: 2,
    narrative:
      '营地篝火旁，一个独臂男人正在对几个人低声说着什么。你凑近一听——他声称自己来自南方，那里有一个由军方建立的安全区，有电有水还有医疗设施。但他需要一队人护送他回去，因为路上太危险了。',
    choices: [
      {
        text: '详细询问安全区的位置和路线，考虑加入护送队',
        cost: { food: -3 },
        reward: { sanity: 15 },
        karma: 1,
        successRate: 0.7,
      },
      {
        text: '私下打听他的背景，确认消息是否可靠',
        cost: {},
        reward: { sanity: 8 },
        karma: 0,
        successRate: 0.8,
      },
      {
        text: '不相信，末世里这种故事听太多了',
        cost: { sanity: -3 },
        reward: {},
        karma: 0,
        successRate: 1.0,
      },
    ],
    resourceChanges: {},
    newItems: ['安全区坐标'],
    newCompanions: ['独臂老兵'],
  },

  // ─── e28: 废弃医院-神秘电台-线索 ───
  {
    id: 'e28',
    context: 'explore_tile',
    title: '医院广播突然响了',
    scene: '废弃医院',
    encounter: '神秘电台',
    eventType: '发现线索',
    tags: ['医院', '线索', '电台', '广播', '神秘'],
    minDay: 4,
    dangerLevel: 3,
    narrative:
      '你正在医院走廊搜索时，天花板上的广播喇叭突然爆出一阵刺耳的电流声，接着一个沙哑的男声响起："……重复，这是中央避难所……坐标……37度……所有幸存者……48小时内……"信号断断续续，但分明是有人在呼叫。',
    choices: [
      {
        text: '赶紧找到广播室，看能不能回复信号或获取完整信息',
        cost: { sanity: -3 },
        reward: { sanity: 18 },
        karma: 0,
        successRate: 0.55,
      },
      {
        text: '记下你听到的所有碎片信息，之后慢慢拼凑',
        cost: {},
        reward: { sanity: 10 },
        karma: 0,
        successRate: 0.9,
      },
      {
        text: '这可能是陷阱，忽略它继续搜索药品',
        cost: {},
        reward: { hp: 8 },
        karma: 0,
        successRate: 0.85,
      },
    ],
    resourceChanges: {},
    newItems: ['残缺的频率记录'],
    newCompanions: [],
  },

  // ─── e29: 工厂-商人-NPC遭遇 ───
  {
    id: 'e29',
    context: 'explore_tile',
    title: '有人在造东西',
    scene: '工厂',
    encounter: '商人',
    eventType: 'NPC遭遇',
    tags: ['工厂', 'NPC', '商人', '制造', '改装'],
    minDay: 3,
    dangerLevel: 2,
    narrative:
      '工厂的一角被人收拾得干干净净，一个穿着油污工装的女人正在用车床加工什么东西。她身后的架子上摆满了自制的净水器、简易发电机和改装武器。她抬头看了你一眼："看上什么了？我不收钱，只换材料。"',
    choices: [
      {
        text: '用你收集的零件换一台便携净水器',
        cost: { food: -5 },
        reward: { hp: 10, sanity: 8 },
        karma: 0,
        successRate: 0.9,
      },
      {
        text: '请她帮忙改装你的装备，提升防护',
        cost: { food: -8 },
        reward: { hp: 5, sanity: 12 },
        karma: 0,
        successRate: 0.8,
      },
      {
        text: '和她交流制造技术，互相学习',
        cost: { food: -3 },
        reward: { sanity: 10 },
        karma: 1,
        successRate: 0.85,
      },
    ],
    resourceChanges: {},
    newItems: ['便携净水器'],
    newCompanions: ['机械师小吴'],
  },

  // ─── e30: 野外-神秘电台-线索 ───
  {
    id: 'e30',
    context: 'explore_tile',
    title: '收音机突然有信号',
    scene: '野外',
    encounter: '神秘电台',
    eventType: '发现线索',
    tags: ['野外', '线索', '电台', '信号', '希望'],
    minDay: 5,
    dangerLevel: 2,
    narrative:
      '你在野外扎营休息时，背包里那台一直只有噪音的老式收音机突然清晰了一瞬——一个女声在播报："……北方第七区已确认安全……疫苗试验成功……请所有听到广播的幸存者向信号塔方向集结……"然后又被淹没在白噪音中。',
    choices: [
      {
        text: '调整天线方向，试图用信号强度判断信号源位置',
        cost: { sanity: -2 },
        reward: { sanity: 18 },
        karma: 0,
        successRate: 0.6,
      },
      {
        text: '记录下频率和时间，以后定时收听',
        cost: {},
        reward: { sanity: 12 },
        karma: 0,
        successRate: 0.9,
      },
      {
        text: '可能只是旧录音在自动循环播放，不要抱太大希望',
        cost: { sanity: -5 },
        reward: {},
        karma: 0,
        successRate: 1.0,
      },
    ],
    resourceChanges: {},
    newItems: ['电台频率'],
    newCompanions: [],
  },
];
