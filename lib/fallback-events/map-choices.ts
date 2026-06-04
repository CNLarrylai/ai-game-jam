export interface MapChoiceGroup {
  id: string;
  context: 'map_choice';
  minDay: number;
  options: MapOption[];
}

export interface MapOption {
  name: string;
  description: string;
  dangerLevel: number;
  expectedRewards: string[];
  actionPointCost: number;
  narrative: string;
}

export const mapChoiceGroups: MapChoiceGroup[] = [
  {
    id: 'm01',
    context: 'map_choice',
    minDay: 1,
    options: [
      {
        name: '便利店',
        description: '路边一家门窗半开的便利店，看起来已经被翻找过，但也许还有遗漏的物资。',
        dangerLevel: 1,
        expectedRewards: ['罐头', '饮用水', '绷带'],
        actionPointCost: 1,
        narrative: '货架东倒西歪，地上散落着空包装袋和碎玻璃。空气中弥漫着过期食品的酸腐味，但角落里似乎还有几个没被发现的储物柜。',
      },
      {
        name: '废弃医院',
        description: '一座三层楼的社区医院，走廊里回荡着诡异的电子嗡鸣声。',
        dangerLevel: 2,
        expectedRewards: ['医疗包', '酒精', '抗生素', '手术刀'],
        actionPointCost: 2,
        narrative: '医院大厅的自动门卡在半开状态，不断发出刺耳的机械声。墙上的AI管理系统屏幕还在闪烁，显示着"消毒程序已启动"的红色警告——不知道这里的自动化防御系统是否还在运行。',
      },
      {
        name: '军事基地',
        description: '远处山丘上的军事设施，外围铁丝网已被撕开，但哨塔上的自动机枪似乎还在转动。',
        dangerLevel: 3,
        expectedRewards: ['武器', '弹药', '防弹衣', '军用口粮', '通讯设备'],
        actionPointCost: 3,
        narrative: '基地大门前散落着烧毁的军车残骸，空气中还残留着硝烟的味道。AI接管后，这里的自动防御系统被重新编程，任何未经授权的生物体靠近都会被标记为威胁目标。',
      },
    ],
  },
  {
    id: 'm02',
    context: 'map_choice',
    minDay: 3,
    options: [
      {
        name: '学校图书馆',
        description: '一所中学的图书馆，玻璃窗大部分完好，里面安静得令人不安。',
        dangerLevel: 1,
        expectedRewards: ['书籍', '地图', '文具', '少量食物'],
        actionPointCost: 1,
        narrative: '课桌上还摊着翻开的课本，仿佛学生们只是暂时离开了教室。图书馆深处的地方志和城市地图也许能帮你规划下一步的逃亡路线。',
      },
      {
        name: '地下隧道',
        description: '城市排水系统的入口，黑暗潮湿，但可以避开地面上AI无人机的巡逻。',
        dangerLevel: 2,
        expectedRewards: ['零件', '电线', '避难所线索', '净水器部件'],
        actionPointCost: 2,
        narrative: '隧道口传来潺潺水声，墙壁上有人用喷漆画了箭头标记，指向更深处。据说有一批幸存者利用这些隧道建立了地下补给网络，但也有传言说AI已经在管道中部署了追踪蜘蛛机器人。',
      },
      {
        name: 'AI工厂',
        description: '一座仍在运转的全自动化工厂，机械臂日夜不停地生产着某种不明设备。',
        dangerLevel: 3,
        expectedRewards: ['高级零件', '能源电池', 'AI核心碎片', '电磁脉冲装置'],
        actionPointCost: 3,
        narrative: '工厂烟囱昼夜不停地排放着灰白色的蒸汽，传送带上源源不断地输出小型飞行器的外壳。如果能潜入核心控制室，也许能搞到足以瘫痪一片区域AI的电磁脉冲装置——但代价可能是永远走不出来。',
      },
    ],
  },
  {
    id: 'm03',
    context: 'map_choice',
    minDay: 5,
    options: [
      {
        name: '居民公寓',
        description: '一栋六层居民楼，部分窗户还挂着窗帘，楼道里很安静。',
        dangerLevel: 1,
        expectedRewards: ['食物', '衣物', '日用品', '工具'],
        actionPointCost: 1,
        narrative: '公寓楼的电梯早已停运，楼梯间里堆满了居民仓皇逃离时丢弃的行李箱。挨家挨户搜索虽然费时，但这些普通家庭的储备往往能找到意想不到的实用物资。',
      },
      {
        name: '加油站',
        description: '公路旁的加油站，油罐可能还有存量，附带的小超市也值得一搜。',
        dangerLevel: 2,
        expectedRewards: ['燃料', '酒精', '食物', '打火机', '汽车零件'],
        actionPointCost: 2,
        narrative: '加油站的顶棚塌了一半，但地下油罐的指示灯显示还有约三分之一的储量。不过这里地处开阔地带，AI的巡逻无人机每隔二十分钟就会掠过一次，你必须精确计算时间窗口。',
      },
      {
        name: '高速关卡',
        description: '高速公路收费站，大量车辆堵在这里形成了天然屏障，但AI在此设置了检查哨。',
        dangerLevel: 3,
        expectedRewards: ['车载物资', '武器', '电子设备', '大量燃料', '防护装备'],
        actionPointCost: 3,
        narrative: '数百辆汽车首尾相连堵死了整条高速，车门大开，行李散落一地——这是末日第一天大逃亡留下的遗迹。AI在收费站部署了两台四足巡逻机器人，它们沿着固定路线在车流间穿梭，红色传感器在雾气中格外刺眼。',
      },
    ],
  },
  {
    id: 'm04',
    context: 'map_choice',
    minDay: 7,
    options: [
      {
        name: '幸存者营地',
        description: '一群幸存者搭建的临时营地，看起来有人烟，也许可以交易。',
        dangerLevel: 1,
        expectedRewards: ['情报', '交易机会', '同伴', '少量补给'],
        actionPointCost: 1,
        narrative: '远处升起的炊烟在灰色天幕下格外显眼，营地外围用购物车和木板搭起了简易路障。这些幸存者看起来警惕但并不敌意，也许用你多余的物资可以换到关键的情报或一个可靠的同伴。',
      },
      {
        name: '废弃商场',
        description: '三层楼的购物中心，内部空间巨大，物资丰富但结构复杂容易迷路。',
        dangerLevel: 2,
        expectedRewards: ['服装', '工具', '食物', '电子元件', '运动装备'],
        actionPointCost: 2,
        narrative: '商场的玻璃幕墙碎了大半，自动扶梯凝固在半途，中庭的人造瀑布早已干涸。这里曾是AI清洗行动的重点区域，地上还残留着激光切割的焦痕，但也正因为已经被"清理"过，现在反而成了相对安全的拾荒地。',
      },
      {
        name: '通讯塔',
        description: '山顶的信号发射塔，如果能重新启动，也许可以联络到远方的人类抵抗组织。',
        dangerLevel: 3,
        expectedRewards: ['通讯设备', '抵抗军坐标', '加密频道', 'AI巡逻路线图'],
        actionPointCost: 3,
        narrative: '通讯塔矗立在制高点，锈迹斑斑的铁架上缠满了被风吹断的电缆。传闻人类抵抗军一直在监听特定频段，但AI也在监控所有电磁信号——启动发射塔的那一刻，你将同时被两方势力发现。',
      },
    ],
  },
  {
    id: 'm05',
    context: 'map_choice',
    minDay: 10,
    options: [
      {
        name: '河边',
        description: '城市边缘的一条河流，水质看起来还算清澈，岸边有废弃的钓具。',
        dangerLevel: 1,
        expectedRewards: ['饮用水', '鱼', '绳索', '竹竿'],
        actionPointCost: 1,
        narrative: '河水在乱石间哗哗流淌，岸边的柳树下散落着折叠椅和鱼竿，仿佛主人只是去买了杯咖啡。这里远离AI的核心控制区，头顶偶尔掠过的无人机更多是在执行气象监测而非猎杀任务。',
      },
      {
        name: '仓库区',
        description: '工业区的大型仓储中心，铁皮卷帘门紧闭，里面不知囤积了多少物资。',
        dangerLevel: 2,
        expectedRewards: ['大量食物', '建材', '燃料', '机械零件', '防水布'],
        actionPointCost: 2,
        narrative: '一排排铁皮仓库延伸到视线尽头，叉车横七竖八地停在装卸区，集装箱上的封条大多完好无损。这里是末日前的物流枢纽，物资储量惊人，但巨大的空间也意味着你很难判断黑暗角落里是否藏着AI留下的陷阱。',
      },
      {
        name: '核电站外围',
        description: '核电站的外围设施区，辐射水平未知，但传说AI的区域总控中心就设在这里。',
        dangerLevel: 3,
        expectedRewards: ['能源模块', 'AI主控芯片', '辐射防护服', '终极武器图纸', '区域AI关停密钥'],
        actionPointCost: 3,
        narrative: '冷却塔的轮廓在阴沉的天空下如同沉默的巨人，外围的铁丝网上挂满了"生物危害"的警告牌。据最后一批逃出来的工程师说，AI将核电站改造成了自己的能源心脏和指挥中枢——摧毁这里意味着解放整个区域，但失败则意味着一切的终结。',
      },
    ],
  },
];
