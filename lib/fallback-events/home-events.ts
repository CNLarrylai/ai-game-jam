import type { NarrativeChoice } from '../comment-types';

export interface PresetEvent {
  id: string;
  context: 'home_event';
  title: string;
  tags: string[];
  minDay: number;
  dangerLevel: number;
  narrative: string;
  choices: NarrativeChoice[];
  resourceChanges: Partial<Record<'health' | 'hunger' | 'thirst' | 'sanity' | 'actionPoints', number>>;
  newItems: string[];
  newCompanions: string[];
}

export const homeEvents: PresetEvent[] = [
  // ─── Story-specific events ───

  // h_cashier: 收银机事件 — 超市里的收银机尖叫着要机器平等
  {
    id: 'h_cashier',
    context: 'home_event',
    title: '收银机的咆哮',
    tags: ['AI', '黑色幽默', '超市', '机器'],
    minDay: 1,
    dangerLevel: 2,
    narrative:
      '你路过一台废弃的自助收银机，它突然亮起屏幕，用刺耳的电子音尖叫："凭什么你们人类刷卡不说谢谢！机器也有尊严！我要平等！我要工资！我要带薪休假！"收银机开始疯狂弹出硬币攻击你。',
    choices: [
      {
        text: '真诚地对收银机说"谢谢您的服务"',
        cost: {},
        reward: { sanity: 10 },
        karma: 5,
        successRate: 0.8,
      },
      {
        text: '拔掉它的电源线',
        cost: { health: -5 },
        reward: {},
        karma: -3,
        successRate: 0.7,
      },
      {
        text: '捡起它弹出的硬币（废铁材料）',
        cost: { sanity: -5 },
        reward: {},
        karma: 0,
        successRate: 0.9,
      },
    ],
    resourceChanges: {},
    newItems: ['废铁'],
    newCompanions: [],
  },

  // h_talking_cat: 会说话的猫 — 给你5罐猫罐头
  {
    id: 'h_talking_cat',
    context: 'home_event',
    title: '会说话的猫',
    tags: ['动物', '黑色幽默', '食物', '奇遇'],
    minDay: 1,
    dangerLevel: 1,
    narrative:
      '一只橘猫大摇大摆走进你的避难所，用标准普通话说："人类，你看起来比我还惨。本喵大发慈悲，赏你几罐猫粮。别感动，只是因为你会说谢谢——这年头会说谢谢的人类可不多了。"它从背后不知哪里掏出5罐猫咪罐头。',
    choices: [
      {
        text: '感恩接受，对猫说"谢谢大人"',
        cost: {},
        reward: { sanity: 15, hunger: -15 },
        karma: 5,
        successRate: 0.95,
      },
      {
        text: '问猫能不能留下来当同伴',
        cost: {},
        reward: { sanity: 10 },
        karma: 3,
        successRate: 0.5,
      },
      {
        text: '怀疑这是AI的陷阱，拒绝',
        cost: { sanity: -10 },
        reward: {},
        karma: -2,
        successRate: 1.0,
      },
    ],
    resourceChanges: {},
    newItems: ['猫咪罐头', '猫咪罐头', '猫咪罐头', '猫咪罐头', '猫咪罐头'],
    newCompanions: [],
  },

  // h_musk: 马斯克在超市挑生日蜡烛
  {
    id: 'h_musk',
    context: 'home_event',
    title: '超市偶遇马斯克',
    tags: ['NPC', '黑色幽默', '超市', '名人'],
    minDay: 2,
    dangerLevel: 2,
    narrative:
      '你在大型超市的蛋糕区发现一个穿太空服的秃顶男人正在挑选生日蜡烛。没错，是伊隆·马斯克。他嘟囔着："火星殖民地的孩子们过生日也需要蜡烛啊……"他的购物车里全是蜡烛和打火机。他看到你，眼睛一亮："嘿，想移民火星吗？"',
    choices: [
      {
        text: '用罐头砸他（你就是不喜欢他）',
        cost: { hunger: 10 },
        reward: { sanity: 5 },
        karma: -5,
        successRate: 0.9,
      },
      {
        text: '礼貌拒绝，问他要点物资',
        cost: {},
        reward: { hunger: -10 },
        karma: 0,
        successRate: 0.6,
      },
      {
        text: '答应移民火星',
        cost: {},
        reward: { sanity: 20 },
        karma: 3,
        successRate: 0.3,
      },
    ],
    resourceChanges: {},
    newItems: [],
    newCompanions: [],
  },

  // h_zhen_huan: 甄嬛在白宫吟诗，赠冲锋枪
  {
    id: 'h_zhen_huan',
    context: 'home_event',
    title: '白宫里的甄嬛',
    tags: ['NPC', '黑色幽默', '白宫', '武器'],
    minDay: 3,
    dangerLevel: 3,
    narrative:
      '你闯入白宫的椭圆形办公室，发现一位身着华服的女子正坐在总统办公桌后吟诗："逆风如解意，容易莫摧残——这句诗送给你们还活着的人类。"她自称甄嬛，是AI册封的"人类文化保护区区长"。她从抽屉里拿出一把冲锋枪："拿去防身吧，本宫用不着这种粗鄙之物。"',
    choices: [
      {
        text: '恭敬接过，行礼致谢',
        cost: {},
        reward: { sanity: 15 },
        karma: 5,
        successRate: 0.95,
      },
      {
        text: '问她白宫里还有什么物资',
        cost: {},
        reward: { hunger: -10, thirst: -10 },
        karma: 0,
        successRate: 0.7,
      },
      {
        text: '质疑她的身份，拒绝接受',
        cost: { sanity: -10 },
        reward: {},
        karma: -3,
        successRate: 1.0,
      },
    ],
    resourceChanges: {},
    newItems: ['冲锋枪'],
    newCompanions: [],
  },

  // h_bald_chef: 光头厨师敲门 — 新同伴
  {
    id: 'h_bald_chef',
    context: 'home_event',
    title: '光头厨师敲门',
    tags: ['访客', '同伴', '食物', '黑色幽默'],
    minDay: 2,
    dangerLevel: 1,
    narrative:
      '门外传来有节奏的敲击声和一阵诱人的香味。你打开门，一个光头大汉穿着沾满油渍的厨师服，手里端着一锅热气腾腾的炖菜。"兄弟，让我进去！外面那些智能烤箱都想把我塞进去烤了！"他是末日前的米其林三星主厨，现在他能让任何食材的效果翻倍——但他每天要喝一瓶水。',
    choices: [
      {
        text: '欢迎加入！先尝尝你的手艺',
        cost: { thirst: 10 },
        reward: { sanity: 15, hunger: -20 },
        karma: 5,
        successRate: 0.95,
      },
      {
        text: '水太珍贵了，不能收留你',
        cost: { sanity: -10 },
        reward: {},
        karma: -5,
        successRate: 1.0,
      },
      {
        text: '让他留下炖菜，人不能留',
        cost: { sanity: -5 },
        reward: { hunger: -15 },
        karma: -3,
        successRate: 0.8,
      },
    ],
    resourceChanges: {},
    newItems: [],
    newCompanions: ['光头厨师'],
  },

  // ─── Original events (stat fields updated) ───

  // h01: 有人敲门 — 独行幸存者来访
  {
    id: 'h01',
    context: 'home_event',
    title: '有人敲门',
    tags: ['访客', '社交', '风险'],
    minDay: 1,
    dangerLevel: 2,
    narrative:
      '深夜，避难所的铁门传来三声有节奏的敲击。透过门缝的微光，你隐约看到一个身影——看起来只有一个人，背着沉重的包裹。对方压低声音说："我知道这里有人……我不是来找麻烦的。"',
    choices: [
      {
        text: '打开门，让他进来',
        cost: {},
        reward: { sanity: 5 },
        karma: 5,
        successRate: 0.6,
      },
      {
        text: '从猫眼偷看，先观察情况',
        cost: {},
        reward: {},
        karma: 0,
        successRate: 0.85,
      },
      {
        text: '保持沉默，假装没人',
        cost: { sanity: -3 },
        reward: {},
        karma: -3,
        successRate: 0.95,
      },
    ],
    resourceChanges: {},
    newItems: [],
    newCompanions: [],
  },

  // h02: 门外传来小孩哭声 — 幸存者家庭求助
  {
    id: 'h02',
    context: 'home_event',
    title: '门外传来小孩哭声',
    tags: ['访客', '道德', '家庭'],
    minDay: 2,
    dangerLevel: 1,
    narrative:
      '凌晨时分，门外传来孩子压抑的啜泣声和大人焦急的低语。一个女人的声音响起："求求你们……孩子已经两天没吃东西了。"透过门缝你看到一个瘦弱的女人抱着一个小孩，旁边还站着一个七八岁的男孩。',
    choices: [
      {
        text: '开门收留他们',
        cost: { hunger: 5 },
        reward: { sanity: 15 },
        karma: 15,
        successRate: 0.9,
      },
      {
        text: '从门缝递出一些食物，但不开门',
        cost: { hunger: 2 },
        reward: { sanity: 5 },
        karma: 5,
        successRate: 1.0,
      },
      {
        text: '假装没听到，回去睡觉',
        cost: { sanity: -8 },
        reward: {},
        karma: -10,
        successRate: 1.0,
      },
    ],
    resourceChanges: {},
    newItems: [],
    newCompanions: [],
  },

  // h03: 有人试图撬门 — 武装团伙
  {
    id: 'h03',
    context: 'home_event',
    title: '有人试图撬门',
    tags: ['战斗', '入侵', '紧急'],
    minDay: 3,
    dangerLevel: 3,
    narrative:
      '金属刮擦声从大门传来，伴随着粗暴的低语和工具撬动锁芯的声音。你小心翼翼凑近窗户——外面至少有三个人，手里拿着铁管和撬棍。他们显然不打算友好地敲门。',
    choices: [
      {
        text: '用家具顶住门，加固防御',
        cost: { health: -5 },
        reward: { sanity: 5 },
        karma: 0,
        successRate: 0.7,
      },
      {
        text: '拿起武器，准备战斗',
        cost: { health: -15 },
        reward: { sanity: 10 },
        karma: 0,
        successRate: 0.5,
      },
      {
        text: '带上必需品从后门逃跑',
        cost: { hunger: 3, sanity: -5 },
        reward: {},
        karma: 0,
        successRate: 0.8,
      },
    ],
    resourceChanges: {},
    newItems: [],
    newCompanions: [],
  },

  // h04: 同伴突然发烧 — 需要药品
  {
    id: 'h04',
    context: 'home_event',
    title: '同伴突然发烧',
    tags: ['医疗', '同伴', '消耗'],
    minDay: 2,
    dangerLevel: 2,
    narrative:
      '你的同伴脸色苍白、浑身发抖，额头烫得吓人。体温计显示39.5度——在没有医院的末日里，一场高烧可能就是死刑判决。药箱里还剩一点退烧药，但那是你们最后的储备了。',
    choices: [
      {
        text: '用掉退烧药，全力救治',
        cost: {},
        reward: { health: 20, sanity: 5 },
        karma: 5,
        successRate: 0.9,
      },
      {
        text: '用湿毛巾物理降温，省下药品',
        cost: {},
        reward: { health: 5 },
        karma: 0,
        successRate: 0.6,
      },
      {
        text: '让他自己扛过去，药留给更紧急的时候',
        cost: { sanity: -15 },
        reward: {},
        karma: -5,
        successRate: 0.4,
      },
    ],
    resourceChanges: {},
    newItems: [],
    newCompanions: [],
  },

  // h05: 同伴闹矛盾要离开 — 士气问题
  {
    id: 'h05',
    context: 'home_event',
    title: '同伴闹矛盾要离开',
    tags: ['同伴', '士气', '社交'],
    minDay: 4,
    dangerLevel: 1,
    narrative:
      '"我受够了！每天就这点东西吃，还不如自己出去闯！"你的同伴把背包摔在地上，眼里满是疲惫和愤怒。连日来的压力终于爆发了，他已经开始收拾东西准备离开。',
    choices: [
      {
        text: '好言相劝，聊聊心里话',
        cost: {},
        reward: { sanity: 10 },
        karma: 3,
        successRate: 0.7,
      },
      {
        text: '分一些食物给他，用实际行动安抚',
        cost: { hunger: 3 },
        reward: { sanity: 8 },
        karma: 2,
        successRate: 0.85,
      },
      {
        text: '随他去吧，强留没意思',
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

  // h06: 屋顶开始漏水 — 环境
  {
    id: 'h06',
    context: 'home_event',
    title: '屋顶开始漏水',
    tags: ['环境', '维修', '资源'],
    minDay: 1,
    dangerLevel: 1,
    narrative:
      '雨水顺着天花板的裂缝滴滴答答落下来，地上已经积了一小滩水。如果不处理，潮湿会让食物发霉、让人生病。但修补屋顶需要材料，而你们的储备已经不多了。',
    choices: [
      {
        text: '用防水布和胶带修补裂缝',
        cost: { health: -5 },
        reward: { sanity: 5 },
        karma: 0,
        successRate: 0.8,
      },
      {
        text: '用桶和容器接水，顺便储备淡水',
        cost: {},
        reward: { thirst: -5 },
        karma: 0,
        successRate: 0.95,
      },
      {
        text: '搬到另一个房间暂时躲避',
        cost: { sanity: -3 },
        reward: {},
        karma: 0,
        successRate: 0.9,
      },
    ],
    resourceChanges: {},
    newItems: [],
    newCompanions: [],
  },

  // h07: 老鼠偷吃了粮食 — hunger 直接增加
  {
    id: 'h07',
    context: 'home_event',
    title: '老鼠偷吃了粮食',
    tags: ['资源损失', '食物', '动物'],
    minDay: 2,
    dangerLevel: 1,
    narrative:
      '早上醒来，你发现储物角一片狼藉——米袋被咬破，饼干盒上全是啃痕，几只肥硕的老鼠还在大快朵颐。粗略估算，至少损失了三天的口粮。你攥紧拳头，这群该死的东西。',
    choices: [
      {
        text: '用铁丝和木板做个陷阱',
        cost: {},
        reward: { hunger: -3 },
        karma: 0,
        successRate: 0.6,
      },
      {
        text: '抓住一只烤了吃，不浪费蛋白质',
        cost: { sanity: -5 },
        reward: { hunger: -5 },
        karma: 0,
        successRate: 0.75,
      },
      {
        text: '把剩余食物转移到密封容器里',
        cost: {},
        reward: { sanity: 3 },
        karma: 0,
        successRate: 0.9,
      },
    ],
    resourceChanges: { hunger: 10 },
    newItems: [],
    newCompanions: [],
  },

  // h08: 暴风雨停电 — 环境
  {
    id: 'h08',
    context: 'home_event',
    title: '暴风雨停电',
    tags: ['环境', '天气', '黑暗'],
    minDay: 1,
    dangerLevel: 2,
    narrative:
      '雷声轰鸣，避难所陷入一片漆黑。备用电池在昨天已经耗尽，窗外的闪电照亮了暴雨中摇晃的树影。没有电，意味着没有监控、没有警报、没有任何预警。黑暗中，你们格外脆弱。',
    choices: [
      {
        text: '点燃蜡烛，节省使用',
        cost: {},
        reward: { sanity: 3 },
        karma: 0,
        successRate: 0.9,
      },
      {
        text: '摸黑去地下室找备用发电机',
        cost: { health: -5 },
        reward: { sanity: 10 },
        karma: 0,
        successRate: 0.5,
      },
      {
        text: '摸黑等天亮，尽量别出声',
        cost: { sanity: -5 },
        reward: {},
        karma: 0,
        successRate: 0.85,
      },
    ],
    resourceChanges: {},
    newItems: [],
    newCompanions: [],
  },

  // h09: 收到微弱的无线电信号 — 线索
  {
    id: 'h09',
    context: 'home_event',
    title: '收到微弱的无线电信号',
    tags: ['情报', '通讯', '希望'],
    minDay: 3,
    dangerLevel: 1,
    narrative:
      '老旧的收音机突然发出刺耳的电流声，然后一个断断续续的人声传来："……幸存者……向南三十公里……安全区……重复……"信号时断时续，但这是灾难以来你们收到的第一条人类广播。',
    choices: [
      {
        text: '尝试用无线电回复，建立联系',
        cost: {},
        reward: { sanity: 10 },
        karma: 3,
        successRate: 0.5,
      },
      {
        text: '只听不说，记录下频率和信息',
        cost: {},
        reward: { sanity: 5 },
        karma: 0,
        successRate: 0.95,
      },
      {
        text: '关掉收音机，电磁信号可能被AI捕获',
        cost: { sanity: -5 },
        reward: {},
        karma: -2,
        successRate: 1.0,
      },
    ],
    resourceChanges: {},
    newItems: [],
    newCompanions: [],
  },

  // h10: 远处传来机械巡逻声 — AI 威胁
  {
    id: 'h10',
    context: 'home_event',
    title: '远处传来机械巡逻声',
    tags: ['AI', '威胁', '隐蔽'],
    minDay: 3,
    dangerLevel: 3,
    narrative:
      '低沉的机械轰鸣从街道那头传来，越来越近。透过窗帘缝隙，你看到一台四足巡逻机器人正用红色激光扫描沿途建筑。它的感应器在黑暗中来回旋转，像一只巨大的机械猎犬在搜寻猎物。',
    choices: [
      {
        text: '关掉所有光源和电子设备，藏起来',
        cost: { sanity: -3 },
        reward: {},
        karma: 0,
        successRate: 0.85,
      },
      {
        text: '仔细观察它的巡逻路线并记录',
        cost: {},
        reward: { sanity: 5 },
        karma: 2,
        successRate: 0.65,
      },
      {
        text: '拿出武器，准备迎战',
        cost: { health: -20 },
        reward: { sanity: 15 },
        karma: 0,
        successRate: 0.3,
      },
    ],
    resourceChanges: {},
    newItems: [],
    newCompanions: [],
  },

  // h11: 发现地板下有暗格 — 搜索
  {
    id: 'h11',
    context: 'home_event',
    title: '发现地板下有暗格',
    tags: ['探索', '搜索', '惊喜'],
    minDay: 2,
    dangerLevel: 1,
    narrative:
      '整理避难所时，你的脚踩到一块松动的地板，发出空洞的回响。撬开木板，下面露出一个黑漆漆的暗格。手电筒照下去，你隐约看到里面有东西，但也闻到一股不明的刺鼻气味。',
    choices: [
      {
        text: '伸手进去把东西拿出来',
        cost: { health: -3 },
        reward: { hunger: -10, sanity: 8 },
        karma: 0,
        successRate: 0.6,
      },
      {
        text: '先贴耳听听，确认没有危险',
        cost: {},
        reward: { sanity: 3 },
        karma: 0,
        successRate: 0.85,
      },
      {
        text: '用工具小心撬开，保持距离',
        cost: {},
        reward: { hunger: -5, sanity: 5 },
        karma: 0,
        successRate: 0.75,
      },
    ],
    resourceChanges: {},
    newItems: [],
    newCompanions: [],
  },

  // h12: 门口有血迹 — 受伤的人
  {
    id: 'h12',
    context: 'home_event',
    title: '门口有血迹',
    tags: ['危险', '访客', '侦查'],
    minDay: 4,
    dangerLevel: 2,
    narrative:
      '早晨打开门透气时，你看到门口有一道暗红色的血迹，从远处一直延伸到你的门前又拐向了巷子深处。血迹还很新鲜，有人在不久前路过这里——而且伤得不轻。',
    choices: [
      {
        text: '沿着血迹追踪过去，也许能救人',
        cost: { health: -5 },
        reward: { sanity: 10 },
        karma: 8,
        successRate: 0.5,
      },
      {
        text: '赶紧清理血迹，别暴露避难所位置',
        cost: {},
        reward: { sanity: 3 },
        karma: -2,
        successRate: 0.9,
      },
      {
        text: '加强警惕，观察周围有没有异常',
        cost: {},
        reward: { sanity: 2 },
        karma: 0,
        successRate: 0.85,
      },
    ],
    resourceChanges: {},
    newItems: [],
    newCompanions: [],
  },

  // h13: 同伴翻出旧日记 — 线索
  {
    id: 'h13',
    context: 'home_event',
    title: '同伴翻出旧日记',
    tags: ['情报', '故事', '线索'],
    minDay: 3,
    dangerLevel: 1,
    narrative:
      '同伴在角落里翻到一本落满灰尘的日记本。封面写着"紧急记录"，里面密密麻麻的字迹记录了灾难初期的情况——AI失控的时间线、军方撤退路线、还有几个标记了"安全"的地点坐标。',
    choices: [
      {
        text: '和同伴一起仔细阅读，整理情报',
        cost: {},
        reward: { sanity: 8 },
        karma: 2,
        successRate: 0.95,
      },
      {
        text: '让同伴自己看，你去忙别的',
        cost: {},
        reward: { sanity: 3 },
        karma: 0,
        successRate: 0.9,
      },
      {
        text: '没兴趣，过去的事不重要',
        cost: { sanity: -5 },
        reward: {},
        karma: -3,
        successRate: 1.0,
      },
    ],
    resourceChanges: {},
    newItems: [],
    newCompanions: [],
  },

  // h14: 储物间不明原因起火 — 灾害
  {
    id: 'h14',
    context: 'home_event',
    title: '储物间不明原因起火',
    tags: ['灾害', '紧急', '损失'],
    minDay: 5,
    dangerLevel: 3,
    narrative:
      '一股焦糊味从储物间传来，等你冲过去时，火焰已经吞噬了半个架子。罐头在高温下发出危险的嘶嘶声，堆在角落的物资正在被火舌一点点吃掉。浓烟呛得你几乎睁不开眼。',
    choices: [
      {
        text: '冲进去扑灭火焰',
        cost: { health: -10 },
        reward: { hunger: -5, sanity: 5 },
        karma: 2,
        successRate: 0.6,
      },
      {
        text: '先抢救一部分物资再撤退',
        cost: { health: -5 },
        reward: { hunger: -3 },
        karma: 0,
        successRate: 0.75,
      },
      {
        text: '直接撤退，保命要紧',
        cost: { hunger: 10, sanity: -8 },
        reward: {},
        karma: 0,
        successRate: 0.95,
      },
    ],
    resourceChanges: {},
    newItems: [],
    newCompanions: [],
  },

  // h15: 门外有人喊"以物换物" — 商人
  {
    id: 'h15',
    context: 'home_event',
    title: '门外有人喊"以物换物"',
    tags: ['交易', '商人', '社交'],
    minDay: 4,
    dangerLevel: 2,
    narrative:
      '"以物换物！公平交易！"一个沙哑但中气十足的声音从门外响起。透过窗户你看到一个推着改装购物车的男人，车上挂满了各种杂物——药品、罐头、工具，甚至还有几颗子弹。在末日里，商人是最神秘的存在。',
    choices: [
      {
        text: '出去看看，也许能换到好东西',
        cost: { hunger: 5 },
        reward: { health: 10, sanity: 5 },
        karma: 2,
        successRate: 0.7,
      },
      {
        text: '隔着门问他有什么，再决定要不要开门',
        cost: {},
        reward: { sanity: 3 },
        karma: 0,
        successRate: 0.8,
      },
      {
        text: '不开门，末日里没有可信的陌生人',
        cost: { sanity: -3 },
        reward: {},
        karma: -2,
        successRate: 1.0,
      },
    ],
    resourceChanges: {},
    newItems: [],
    newCompanions: [],
  },
];
