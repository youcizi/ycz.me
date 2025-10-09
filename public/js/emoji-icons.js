// Emoji 图标页面逻辑：分类、搜索、复制

const { createApp, computed } = Vue;

// 参照 EmojiAll/CLDR 标准九大类
const categories = [
  { name: 'smileys', label: '😀表情与情绪' },
  { name: 'people', label: '🧑人物与身体' },
  { name: 'animals', label: '🐾动物与自然' },
  { name: 'food', label: '🍔食物与饮品' },
  { name: 'travel', label: '🗺️旅行与地点' },
  { name: 'activities', label: '🎯活动' },
  { name: 'objects', label: '🧰物品' },
  { name: 'symbols', label: '🔣符号' },
  { name: 'flags', label: '🚩旗帜' }
];

// 简化的分类数据（尽量多，便于搜索与展示）
// 每项：char（emoji字符），name（英文名），cn（中文名/别名），keywords（检索关键字）
const EMOJIS = [
  // 😀 表情
  { cat:'smileys', char:'😀', name:'grinning face', cn:'露齿笑', keywords:['smile','开心','笑'] },
  { cat:'smileys', char:'😃', name:'grinning face with big eyes', cn:'大眼笑', keywords:['smile','开心'] },
  { cat:'smileys', char:'😄', name:'grinning face with smiling eyes', cn:'笑眼', keywords:['smile','开心'] },
  { cat:'smileys', char:'😁', name:'beaming face with smiling eyes', cn:'露齿笑眼', keywords:['grin','笑'] },
  { cat:'smileys', char:'😆', name:'grinning squinting face', cn:'眯眼大笑', keywords:['laugh','哈哈'] },
  { cat:'smileys', char:'😅', name:'grinning face with sweat', cn:'尴尬笑', keywords:['sweat','尴尬'] },
  { cat:'smileys', char:'🤣', name:'rolling on the floor laughing', cn:'笑到打滚', keywords:['rofl','哈哈'] },
  { cat:'smileys', char:'😂', name:'face with tears of joy', cn:'喜极而泣', keywords:['joy','哈哈'] },
  { cat:'smileys', char:'🙂', name:'slightly smiling face', cn:'浅笑', keywords:['smile'] },
  { cat:'smileys', char:'😉', name:'winking face', cn:'眨眼', keywords:['wink'] },
  { cat:'smileys', char:'😊', name:'smiling face with smiling eyes', cn:'羞涩笑', keywords:['blush'] },
  { cat:'smileys', char:'😇', name:'smiling face with halo', cn:'天使笑', keywords:['angel'] },
  { cat:'smileys', char:'🥰', name:'smiling face with hearts', cn:'爱心笑', keywords:['love'] },
  { cat:'smileys', char:'😍', name:'smiling face with heart-eyes', cn:'爱心眼', keywords:['love'] },
  { cat:'smileys', char:'🤩', name:'star-struck', cn:'星星眼', keywords:['wow'] },
  { cat:'smileys', char:'😗', name:'kissing face', cn:'亲吻', keywords:['kiss'] },
  { cat:'smileys', char:'😚', name:'kissing face with closed eyes', cn:'闭眼亲吻', keywords:['kiss'] },
  { cat:'smileys', char:'😋', name:'face savoring food', cn:'品尝美食', keywords:['food'] },
  { cat:'smileys', char:'😛', name:'face with tongue', cn:'吐舌', keywords:['tongue'] },
  { cat:'smileys', char:'😜', name:'winking face with tongue', cn:'眨眼吐舌', keywords:['wink','tongue'] },
  { cat:'smileys', char:'🤪', name:'zany face', cn:'傻笑', keywords:['crazy'] },
  { cat:'smileys', char:'😝', name:'squinting face with tongue', cn:'眯眼吐舌', keywords:['tongue'] },
  { cat:'smileys', char:'🤑', name:'money-mouth face', cn:'财迷', keywords:['money'] },
  { cat:'smileys', char:'🤗', name:'hugging face', cn:'拥抱', keywords:['hug'] },
  { cat:'smileys', char:'🤭', name:'face with hand over mouth', cn:'捂嘴笑', keywords:['oops'] },
  { cat:'smileys', char:'🤫', name:'shushing face', cn:'嘘', keywords:['quiet'] },
  { cat:'smileys', char:'🤔', name:'thinking face', cn:'思考', keywords:['think'] },
  { cat:'smileys', char:'🤐', name:'zipper-mouth face', cn:'闭嘴', keywords:['zipper'] },
  { cat:'smileys', char:'😐', name:'neutral face', cn:'平静', keywords:['neutral'] },
  { cat:'smileys', char:'😑', name:'expressionless face', cn:'面无表情', keywords:['blank'] },
  { cat:'smileys', char:'😶', name:'face without mouth', cn:'无口', keywords:['silent'] },
  { cat:'smileys', char:'🙄', name:'face with rolling eyes', cn:'翻白眼', keywords:['eyeroll'] },
  { cat:'smileys', char:'😏', name:'smirking face', cn:'坏笑', keywords:['smirk'] },
  { cat:'smileys', char:'😒', name:'unamused face', cn:'不屑', keywords:['meh'] },
  { cat:'smileys', char:'😞', name:'disappointed face', cn:'失望', keywords:['sad'] },
  { cat:'smileys', char:'😔', name:'pensive face', cn:'沉思', keywords:['sad'] },
  { cat:'smileys', char:'😟', name:'worried face', cn:'担心', keywords:['worried'] },
  { cat:'smileys', char:'😕', name:'confused face', cn:'困惑', keywords:['confused'] },
  { cat:'smileys', char:'🙁', name:'slightly frowning face', cn:'微皱眉', keywords:['sad'] },
  { cat:'smileys', char:'☹️', name:'frowning face', cn:'皱眉', keywords:['sad'] },
  { cat:'smileys', char:'😣', name:'persevering face', cn:'坚持', keywords:['persevere'] },
  { cat:'smileys', char:'😖', name:'confounded face', cn:'沮丧', keywords:['confound'] },
  { cat:'smileys', char:'😫', name:'tired face', cn:'疲惫', keywords:['tired'] },
  { cat:'smileys', char:'😩', name:'weary face', cn:'厌倦', keywords:['weary'] },
  { cat:'smileys', char:'🥺', name:'pleading face', cn:'乞求', keywords:['please'] },
  { cat:'smileys', char:'😭', name:'loudly crying face', cn:'大哭', keywords:['cry'] },
  { cat:'smileys', char:'😤', name:'face with steam from nose', cn:'生气', keywords:['angry'] },
  { cat:'smileys', char:'😡', name:'pouting face', cn:'怒气', keywords:['angry'] },
  { cat:'smileys', char:'🤯', name:'exploding head', cn:'炸裂', keywords:['mind blown'] },
  { cat:'smileys', char:'😱', name:'face screaming in fear', cn:'尖叫', keywords:['fear'] },
  { cat:'smileys', char:'😨', name:'fearful face', cn:'害怕', keywords:['fear'] },
  { cat:'smileys', char:'😰', name:'anxious face with sweat', cn:'焦虑', keywords:['anxious'] },
  { cat:'smileys', char:'😓', name:'downcast face with sweat', cn:'汗', keywords:['sweat'] },
  { cat:'smileys', char:'🤒', name:'face with thermometer', cn:'发烧', keywords:['sick'] },
  { cat:'smileys', char:'🤕', name:'face with head-bandage', cn:'受伤', keywords:['injury'] },
  { cat:'smileys', char:'🤧', name:'sneezing face', cn:'打喷嚏', keywords:['sneeze'] },
  { cat:'smileys', char:'🥵', name:'hot face', cn:'热', keywords:['hot'] },
  { cat:'smileys', char:'🥶', name:'cold face', cn:'冷', keywords:['cold'] },
  { cat:'smileys', char:'😷', name:'face with medical mask', cn:'口罩', keywords:['mask'] },

  // 🧑 人物
  { cat:'people', char:'👶', name:'baby', cn:'婴儿', keywords:['child'] },
  { cat:'people', char:'🧒', name:'child', cn:'小孩', keywords:['kid'] },
  { cat:'people', char:'👦', name:'boy', cn:'男孩', keywords:['boy'] },
  { cat:'people', char:'👧', name:'girl', cn:'女孩', keywords:['girl'] },
  { cat:'people', char:'🧑', name:'person', cn:'人', keywords:['person'] },
  { cat:'people', char:'👨', name:'man', cn:'男人', keywords:['man'] },
  { cat:'people', char:'👩', name:'woman', cn:'女人', keywords:['woman'] },
  { cat:'people', char:'👴', name:'old man', cn:'老人', keywords:['old'] },
  { cat:'people', char:'👵', name:'old woman', cn:'老太', keywords:['old'] },
  { cat:'people', char:'🧑‍💻', name:'technologist', cn:'程序员', keywords:['coder','developer'] },
  { cat:'people', char:'🧑‍🎨', name:'artist', cn:'艺术家', keywords:['artist'] },
  { cat:'people', char:'🧑‍🏫', name:'teacher', cn:'老师', keywords:['teacher'] },
  { cat:'people', char:'🧑‍🍳', name:'cook', cn:'厨师', keywords:['cook'] },
  { cat:'people', char:'🧑‍🚀', name:'astronaut', cn:'宇航员', keywords:['space'] },
  { cat:'people', char:'🧑‍🔧', name:'mechanic', cn:'技师', keywords:['mechanic'] },
  { cat:'people', char:'🧑‍⚕️', name:'health worker', cn:'医护', keywords:['doctor'] },
  { cat:'people', char:'👮', name:'police officer', cn:'警察', keywords:['police'] },
  { cat:'people', char:'💂', name:'guard', cn:'卫兵', keywords:['guard'] },
  { cat:'people', char:'🎅', name:'Santa Claus', cn:'圣诞老人', keywords:['santa'] },

  // 🐾 动物与自然
  { cat:'animals', char:'🐶', name:'dog face', cn:'狗', keywords:['dog'] },
  { cat:'animals', char:'🐱', name:'cat face', cn:'猫', keywords:['cat'] },
  { cat:'animals', char:'🐭', name:'mouse face', cn:'鼠', keywords:['mouse'] },
  { cat:'animals', char:'🐹', name:'hamster', cn:'仓鼠', keywords:['hamster'] },
  { cat:'animals', char:'🐰', name:'rabbit', cn:'兔', keywords:['rabbit'] },
  { cat:'animals', char:'🦊', name:'fox', cn:'狐', keywords:['fox'] },
  { cat:'animals', char:'🐻', name:'bear', cn:'熊', keywords:['bear'] },
  { cat:'animals', char:'🐼', name:'panda', cn:'熊猫', keywords:['panda'] },
  { cat:'animals', char:'🐨', name:'koala', cn:'考拉', keywords:['koala'] },
  { cat:'animals', char:'🐯', name:'tiger', cn:'虎', keywords:['tiger'] },
  { cat:'animals', char:'🦁', name:'lion', cn:'狮', keywords:['lion'] },
  { cat:'animals', char:'🐮', name:'cow', cn:'牛', keywords:['cow'] },
  { cat:'animals', char:'🐷', name:'pig', cn:'猪', keywords:['pig'] },
  { cat:'animals', char:'🐔', name:'chicken', cn:'鸡', keywords:['chicken'] },
  { cat:'animals', char:'🐵', name:'monkey', cn:'猴', keywords:['monkey'] },
  { cat:'animals', char:'🦄', name:'unicorn', cn:'独角兽', keywords:['unicorn'] },
  { cat:'animals', char:'🐙', name:'octopus', cn:'章鱼', keywords:['octopus'] },
  { cat:'animals', char:'🦋', name:'butterfly', cn:'蝴蝶', keywords:['butterfly'] },
  { cat:'animals', char:'🌸', name:'cherry blossom', cn:'樱花', keywords:['flower'] },
  { cat:'animals', char:'🌻', name:'sunflower', cn:'向日葵', keywords:['flower'] },
  { cat:'animals', char:'🌲', name:'evergreen tree', cn:'常青树', keywords:['tree'] },
  { cat:'animals', char:'🌳', name:'deciduous tree', cn:'阔叶树', keywords:['tree'] },
  { cat:'animals', char:'🌴', name:'palm tree', cn:'棕榈', keywords:['tree'] },
  { cat:'animals', char:'🌵', name:'cactus', cn:'仙人掌', keywords:['cactus'] },

  // 🍔 食物与饮品
  { cat:'food', char:'🍎', name:'red apple', cn:'红苹果', keywords:['apple'] },
  { cat:'food', char:'🍊', name:'tangerine', cn:'橘子', keywords:['orange'] },
  { cat:'food', char:'🍋', name:'lemon', cn:'柠檬', keywords:['lemon'] },
  { cat:'food', char:'🍉', name:'watermelon', cn:'西瓜', keywords:['watermelon'] },
  { cat:'food', char:'🍇', name:'grapes', cn:'葡萄', keywords:['grapes'] },
  { cat:'food', char:'🍓', name:'strawberry', cn:'草莓', keywords:['strawberry'] },
  { cat:'food', char:'🍒', name:'cherries', cn:'樱桃', keywords:['cherry'] },
  { cat:'food', char:'🍍', name:'pineapple', cn:'菠萝', keywords:['pineapple'] },
  { cat:'food', char:'🥭', name:'mango', cn:'芒果', keywords:['mango'] },
  { cat:'food', char:'🍔', name:'hamburger', cn:'汉堡', keywords:['burger'] },
  { cat:'food', char:'🍟', name:'french fries', cn:'薯条', keywords:['fries'] },
  { cat:'food', char:'🌭', name:'hot dog', cn:'热狗', keywords:['hotdog'] },
  { cat:'food', char:'🍕', name:'pizza', cn:'披萨', keywords:['pizza'] },
  { cat:'food', char:'🍜', name:'steaming bowl', cn:'拉面', keywords:['ramen'] },
  { cat:'food', char:'🍣', name:'sushi', cn:'寿司', keywords:['sushi'] },
  { cat:'food', char:'🍤', name:'fried shrimp', cn:'炸虾', keywords:['shrimp'] },
  { cat:'food', char:'🍨', name:'ice cream', cn:'冰淇淋', keywords:['icecream'] },
  { cat:'food', char:'🍰', name:'shortcake', cn:'蛋糕', keywords:['cake'] },
  { cat:'food', char:'🍺', name:'beer mug', cn:'啤酒', keywords:['beer'] },
  { cat:'food', char:'☕', name:'hot beverage', cn:'咖啡', keywords:['coffee'] },

  // 🗺️ 旅行地点
  { cat:'travel', char:'🚗', name:'automobile', cn:'汽车', keywords:['car'] },
  { cat:'travel', char:'🚕', name:'taxi', cn:'出租车', keywords:['taxi'] },
  { cat:'travel', char:'🚙', name:'sport utility vehicle', cn:'SUV', keywords:['car'] },
  { cat:'travel', char:'🚌', name:'bus', cn:'公交', keywords:['bus'] },
  { cat:'travel', char:'🚎', name:'trolleybus', cn:'无轨电车', keywords:['bus'] },
  { cat:'travel', char:'🏎️', name:'racing car', cn:'赛车', keywords:['race'] },
  { cat:'travel', char:'✈️', name:'airplane', cn:'飞机', keywords:['plane'] },
  { cat:'travel', char:'🚀', name:'rocket', cn:'火箭', keywords:['rocket'] },
  { cat:'travel', char:'🛸', name:'flying saucer', cn:'飞碟', keywords:['ufo'] },
  { cat:'travel', char:'⛵', name:'sailboat', cn:'帆船', keywords:['boat'] },
  { cat:'travel', char:'🗽', name:'Statue of Liberty', cn:'自由女神像', keywords:['liberty'] },
  { cat:'travel', char:'🗼', name:'Tokyo tower', cn:'东京塔', keywords:['tower'] },
  { cat:'travel', char:'🏰', name:'castle', cn:'城堡', keywords:['castle'] },
  { cat:'travel', char:'⛩️', name:'shinto shrine', cn:'神社', keywords:['shrine'] },
  { cat:'travel', char:'🗿', name:'moai', cn:'摩艾石像', keywords:['moai'] },

  // 🎯 活动
  { cat:'activities', char:'⚽', name:'soccer ball', cn:'足球', keywords:['soccer'] },
  { cat:'activities', char:'🏀', name:'basketball', cn:'篮球', keywords:['basketball'] },
  { cat:'activities', char:'🏈', name:'american football', cn:'橄榄球', keywords:['football'] },
  { cat:'activities', char:'⚾', name:'baseball', cn:'棒球', keywords:['baseball'] },
  { cat:'activities', char:'🎾', name:'tennis', cn:'网球', keywords:['tennis'] },
  { cat:'activities', char:'🏐', name:'volleyball', cn:'排球', keywords:['volleyball'] },
  { cat:'activities', char:'🏓', name:'ping pong', cn:'乒乓', keywords:['pingpong'] },
  { cat:'activities', char:'🏸', name:'badminton', cn:'羽毛球', keywords:['badminton'] },
  { cat:'activities', char:'🥊', name:'boxing glove', cn:'拳击', keywords:['boxing'] },
  { cat:'activities', char:'🎯', name:'direct hit', cn:'靶心', keywords:['target'] },
  { cat:'activities', char:'🎮', name:'video game', cn:'游戏', keywords:['game'] },
  { cat:'activities', char:'🎲', name:'game die', cn:'骰子', keywords:['dice'] },
  { cat:'activities', char:'🧩', name:'puzzle piece', cn:'拼图', keywords:['puzzle'] },

  // 🧰 物品
  { cat:'objects', char:'💡', name:'light bulb', cn:'灯泡', keywords:['idea'] },
  { cat:'objects', char:'🔦', name:'flashlight', cn:'手电', keywords:['flashlight'] },
  { cat:'objects', char:'🕹️', name:'joystick', cn:'摇杆', keywords:['joystick'] },
  { cat:'objects', char:'📱', name:'mobile phone', cn:'手机', keywords:['phone'] },
  { cat:'objects', char:'💻', name:'laptop', cn:'电脑', keywords:['laptop'] },
  { cat:'objects', char:'🖥️', name:'desktop computer', cn:'台式机', keywords:['desktop'] },
  { cat:'objects', char:'⌚', name:'watch', cn:'手表', keywords:['watch'] },
  { cat:'objects', char:'⏰', name:'alarm clock', cn:'闹钟', keywords:['alarm'] },
  { cat:'objects', char:'🎧', name:'headphone', cn:'耳机', keywords:['headphone'] },
  { cat:'objects', char:'📷', name:'camera', cn:'相机', keywords:['camera'] },
  { cat:'objects', char:'🖊️', name:'pen', cn:'钢笔', keywords:['pen'] },
  { cat:'objects', char:'📎', name:'paperclip', cn:'回形针', keywords:['clip'] },
  { cat:'objects', char:'🗑️', name:'wastebasket', cn:'垃圾桶', keywords:['trash'] },
  { cat:'objects', char:'🧰', name:'toolbox', cn:'工具箱', keywords:['toolbox'] },

  // 🔣 符号
  { cat:'symbols', char:'❤️', name:'red heart', cn:'红心', keywords:['love','heart'] },
  { cat:'symbols', char:'💔', name:'broken heart', cn:'心碎', keywords:['heart'] },
  { cat:'symbols', char:'❣️', name:'heart exclamation', cn:'心叹号', keywords:['heart'] },
  { cat:'symbols', char:'💘', name:'heart with arrow', cn:'丘比特', keywords:['love'] },
  { cat:'symbols', char:'💝', name:'heart with ribbon', cn:'礼物心', keywords:['gift'] },
  { cat:'symbols', char:'💖', name:'sparkling heart', cn:'闪亮心', keywords:['heart'] },
  { cat:'symbols', char:'💗', name:'growing heart', cn:'扩张心', keywords:['heart'] },
  { cat:'symbols', char:'💙', name:'blue heart', cn:'蓝心', keywords:['heart'] },
  { cat:'symbols', char:'💚', name:'green heart', cn:'绿心', keywords:['heart'] },
  { cat:'symbols', char:'💛', name:'yellow heart', cn:'黄心', keywords:['heart'] },
  { cat:'symbols', char:'💜', name:'purple heart', cn:'紫心', keywords:['heart'] },
  { cat:'symbols', char:'🖤', name:'black heart', cn:'黑心', keywords:['heart'] },
  { cat:'symbols', char:'💟', name:'heart decoration', cn:'心形装饰', keywords:['heart'] },
  { cat:'symbols', char:'⭐', name:'star', cn:'星星', keywords:['star'] },
  { cat:'symbols', char:'🌟', name:'glowing star', cn:'闪耀星', keywords:['star'] },
  { cat:'symbols', char:'✨', name:'sparkles', cn:'闪耀', keywords:['sparkles'] },
  { cat:'symbols', char:'🔥', name:'fire', cn:'火焰', keywords:['fire'] },
  { cat:'symbols', char:'💧', name:'droplet', cn:'水滴', keywords:['water'] },
  { cat:'symbols', char:'🌈', name:'rainbow', cn:'彩虹', keywords:['rainbow'] },

  // 🚩 旗帜（示例有限）
  { cat:'flags', char:'🏳️', name:'white flag', cn:'白旗', keywords:['flag'] },
  { cat:'flags', char:'🏴', name:'black flag', cn:'黑旗', keywords:['flag'] },
  { cat:'flags', char:'🏁', name:'chequered flag', cn:'格子旗', keywords:['race'] },
  { cat:'flags', char:'🚩', name:'triangular flag', cn:'三角旗', keywords:['flag'] },
];

// 扩充更多分类与图标，提升覆盖度
const EXTRA_EMOJIS = [
  // 😀 更多表情
  { cat:'smileys', char:'😺', name:'smiling cat face', cn:'笑猫', keywords:['cat','smile'] },
  { cat:'smileys', char:'😸', name:'grinning cat', cn:'露齿猫', keywords:['cat','grin'] },
  { cat:'smileys', char:'😻', name:'heart-eyes cat', cn:'爱心猫', keywords:['cat','love'] },
  { cat:'smileys', char:'😼', name:'smirking cat', cn:'坏笑猫', keywords:['cat','smirk'] },
  { cat:'smileys', char:'😽', name:'kissing cat', cn:'亲吻猫', keywords:['cat','kiss'] },
  { cat:'smileys', char:'🙀', name:'weary cat', cn:'惊恐猫', keywords:['cat','shock'] },
  { cat:'smileys', char:'😿', name:'crying cat', cn:'哭泣猫', keywords:['cat','cry'] },
  { cat:'smileys', char:'😹', name:'joyful cat', cn:'喜极猫', keywords:['cat','joy'] },
  { cat:'smileys', char:'🤝', name:'handshake', cn:'握手', keywords:['handshake'] },
  { cat:'smileys', char:'🙏', name:'folded hands', cn:'合十', keywords:['pray'] },
  { cat:'smileys', char:'✌️', name:'victory hand', cn:'胜利', keywords:['v'] },
  { cat:'smileys', char:'👍', name:'thumbs up', cn:'点赞', keywords:['like'] },
  { cat:'smileys', char:'👎', name:'thumbs down', cn:'踩', keywords:['dislike'] },
  { cat:'smileys', char:'👏', name:'clapping hands', cn:'鼓掌', keywords:['clap'] },
  { cat:'smileys', char:'🫶', name:'heart hands', cn:'比心', keywords:['heart','hands'] },

  // 🧑 更多人物与动作
  { cat:'people', char:'💃', name:'woman dancing', cn:'跳舞女', keywords:['dance'] },
  { cat:'people', char:'🕺', name:'man dancing', cn:'跳舞男', keywords:['dance'] },
  { cat:'people', char:'🏃', name:'person running', cn:'跑步', keywords:['run'] },
  { cat:'people', char:'🧘', name:'person in lotus position', cn:'打坐', keywords:['yoga'] },
  { cat:'people', char:'🤸', name:'person cartwheeling', cn:'侧手翻', keywords:['gym'] },
  { cat:'people', char:'⛹️', name:'person bouncing ball', cn:'拍球', keywords:['basketball'] },
  { cat:'people', char:'🏋️', name:'person lifting weights', cn:'举重', keywords:['gym'] },
  { cat:'people', char:'🚴', name:'person biking', cn:'骑行', keywords:['bike'] },
  { cat:'people', char:'🧑‍🏫', name:'teacher', cn:'老师', keywords:['teach'] },
  { cat:'people', char:'🧑‍⚖️', name:'judge', cn:'法官', keywords:['judge'] },
  { cat:'people', char:'🧑‍✈️', name:'pilot', cn:'飞行员', keywords:['pilot'] },
  { cat:'people', char:'🧑‍🌾', name:'farmer', cn:'农民', keywords:['farmer'] },
  { cat:'people', char:'🧑‍🔬', name:'scientist', cn:'科学家', keywords:['scientist'] },
  { cat:'people', char:'🧑‍💼', name:'office worker', cn:'白领', keywords:['office'] },
  { cat:'people', char:'🧑‍🎓', name:'student', cn:'学生', keywords:['student'] },

  // 🐾 更多动物
  { cat:'animals', char:'🐸', name:'frog', cn:'青蛙', keywords:['frog'] },
  { cat:'animals', char:'🐢', name:'turtle', cn:'乌龟', keywords:['turtle'] },
  { cat:'animals', char:'🐍', name:'snake', cn:'蛇', keywords:['snake'] },
  { cat:'animals', char:'🦎', name:'lizard', cn:'蜥蜴', keywords:['lizard'] },
  { cat:'animals', char:'🦂', name:'scorpion', cn:'蝎子', keywords:['scorpion'] },
  { cat:'animals', char:'🐞', name:'lady beetle', cn:'瓢虫', keywords:['bug'] },
  { cat:'animals', char:'🦗', name:'cricket', cn:'蟋蟀', keywords:['cricket'] },
  { cat:'animals', char:'🦀', name:'crab', cn:'螃蟹', keywords:['crab'] },
  { cat:'animals', char:'🦞', name:'lobster', cn:'龙虾', keywords:['lobster'] },
  { cat:'animals', char:'🦐', name:'shrimp', cn:'虾', keywords:['shrimp'] },
  { cat:'animals', char:'🦑', name:'squid', cn:'鱿鱼', keywords:['squid'] },
  { cat:'animals', char:'🐦', name:'bird', cn:'鸟', keywords:['bird'] },
  { cat:'animals', char:'🦉', name:'owl', cn:'猫头鹰', keywords:['owl'] },
  { cat:'animals', char:'🦅', name:'eagle', cn:'鹰', keywords:['eagle'] },
  { cat:'animals', char:'🕊️', name:'dove', cn:'鸽子', keywords:['dove'] },

  // 🍔 更多食物与饮品
  { cat:'food', char:'🥐', name:'croissant', cn:'羊角面包', keywords:['bread'] },
  { cat:'food', char:'🥯', name:'bagel', cn:'贝果', keywords:['bread'] },
  { cat:'food', char:'🥖', name:'baguette bread', cn:'法棍', keywords:['bread'] },
  { cat:'food', char:'🧇', name:'waffle', cn:'华夫饼', keywords:['waffle'] },
  { cat:'food', char:'🥞', name:'pancakes', cn:'薄饼', keywords:['pancake'] },
  { cat:'food', char:'🧀', name:'cheese wedge', cn:'奶酪', keywords:['cheese'] },
  { cat:'food', char:'🥗', name:'green salad', cn:'沙拉', keywords:['salad'] },
  { cat:'food', char:'🥙', name:'stuffed flatbread', cn:'夹饼', keywords:['flatbread'] },
  { cat:'food', char:'🌮', name:'taco', cn:'塔可', keywords:['taco'] },
  { cat:'food', char:'🌯', name:'burrito', cn:'卷饼', keywords:['burrito'] },
  { cat:'food', char:'🥪', name:'sandwich', cn:'三明治', keywords:['sandwich'] },
  { cat:'food', char:'🍱', name:'bento box', cn:'便当', keywords:['bento'] },
  { cat:'food', char:'🍤', name:'fried shrimp', cn:'炸虾', keywords:['shrimp'] },
  { cat:'food', char:'🍥', name:'fish cake with swirl', cn:'鸣门卷', keywords:['narutomaki'] },
  { cat:'food', char:'🍡', name:'dango', cn:'团子', keywords:['dango'] },
  { cat:'food', char:'🥟', name:'dumpling', cn:'饺子', keywords:['dumpling'] },
  { cat:'food', char:'🍢', name:'oden', cn:'关东煮', keywords:['oden'] },
  { cat:'food', char:'🍧', name:'shaved ice', cn:'刨冰', keywords:['ice'] },
  { cat:'food', char:'🍯', name:'honey pot', cn:'蜂蜜', keywords:['honey'] },
  { cat:'food', char:'🧋', name:'bubble tea', cn:'奶茶', keywords:['tea'] },
  { cat:'food', char:'🥤', name:'cup with straw', cn:'饮料', keywords:['drink'] },

  // 🗺️ 更多旅行与地点
  { cat:'travel', char:'🗺️', name:'world map', cn:'世界地图', keywords:['map'] },
  { cat:'travel', char:'🧭', name:'compass', cn:'指南针', keywords:['compass'] },
  { cat:'travel', char:'🏝️', name:'desert island', cn:'荒岛', keywords:['island'] },
  { cat:'travel', char:'🏜️', name:'desert', cn:'沙漠', keywords:['desert'] },
  { cat:'travel', char:'🏞️', name:'national park', cn:'国家公园', keywords:['park'] },
  { cat:'travel', char:'🏕️', name:'camping', cn:'露营', keywords:['camp'] },
  { cat:'travel', char:'🛤️', name:'railway track', cn:'铁轨', keywords:['railway'] },
  { cat:'travel', char:'🛣️', name:'motorway', cn:'公路', keywords:['road'] },

  // 🎯 更多活动
  { cat:'activities', char:'🥋', name:'martial arts uniform', cn:'道服', keywords:['karate'] },
  { cat:'activities', char:'🛹', name:'skateboard', cn:'滑板', keywords:['skate'] },
  { cat:'activities', char:'🛼', name:'roller skate', cn:'轮滑', keywords:['roller'] },
  { cat:'activities', char:'🥅', name:'goal net', cn:'球门', keywords:['goal'] },
  { cat:'activities', char:'🎽', name:'running shirt', cn:'跑步衫', keywords:['run'] },
  { cat:'activities', char:'🏆', name:'trophy', cn:'奖杯', keywords:['trophy'] },
  { cat:'activities', char:'🏅', name:'sports medal', cn:'奖牌', keywords:['medal'] },
  { cat:'activities', char:'🎖️', name:'military medal', cn:'军功章', keywords:['medal'] },

  // 🧰 更多物品
  { cat:'objects', char:'🧭', name:'compass', cn:'指南针', keywords:['compass'] },
  { cat:'objects', char:'🧱', name:'brick', cn:'砖块', keywords:['brick'] },
  { cat:'objects', char:'🧲', name:'magnet', cn:'磁铁', keywords:['magnet'] },
  { cat:'objects', char:'🔋', name:'battery', cn:'电池', keywords:['battery'] },
  { cat:'objects', char:'🔌', name:'electric plug', cn:'插头', keywords:['plug'] },
  { cat:'objects', char:'🪫', name:'low battery', cn:'低电', keywords:['battery'] },
  { cat:'objects', char:'💿', name:'optical disc', cn:'光盘', keywords:['disc'] },
  { cat:'objects', char:'📀', name:'dvd', cn:'DVD', keywords:['dvd'] },
  { cat:'objects', char:'🧯', name:'fire extinguisher', cn:'灭火器', keywords:['extinguisher'] },
  { cat:'objects', char:'🪒', name:'razor', cn:'剃刀', keywords:['razor'] },
  { cat:'objects', char:'🧴', name:'lotion bottle', cn:'乳液瓶', keywords:['bottle'] },
  { cat:'objects', char:'🧻', name:'roll of paper', cn:'纸卷', keywords:['paper'] },
  { cat:'objects', char:'🪥', name:'toothbrush', cn:'牙刷', keywords:['toothbrush'] },
  { cat:'objects', char:'🧹', name:'broom', cn:'扫帚', keywords:['broom'] },
  { cat:'objects', char:'🧺', name:'basket', cn:'篮子', keywords:['basket'] },
  { cat:'objects', char:'🧼', name:'soap', cn:'香皂', keywords:['soap'] },
  { cat:'objects', char:'🪑', name:'chair', cn:'椅子', keywords:['chair'] },
  { cat:'objects', char:'🛏️', name:'bed', cn:'床', keywords:['bed'] },
  { cat:'objects', char:'🛁', name:'bathtub', cn:'浴缸', keywords:['bath'] },

  // 🔣 更多符号
  { cat:'symbols', char:'♻️', name:'recycling symbol', cn:'循环', keywords:['recycle'] },
  { cat:'symbols', char:'🔞', name:'no one under eighteen', cn:'未成年禁', keywords:['18'] },
  { cat:'symbols', char:'⚠️', name:'warning', cn:'警告', keywords:['warning'] },
  { cat:'symbols', char:'🚫', name:'prohibited', cn:'禁止', keywords:['no'] },
  { cat:'symbols', char:'✅', name:'check mark button', cn:'完成', keywords:['check'] },
  { cat:'symbols', char:'❌', name:'cross mark', cn:'错误', keywords:['cross'] },
  { cat:'symbols', char:'➕', name:'heavy plus sign', cn:'加', keywords:['plus'] },
  { cat:'symbols', char:'➖', name:'heavy minus sign', cn:'减', keywords:['minus'] },
  { cat:'symbols', char:'➗', name:'division sign', cn:'除', keywords:['divide'] },
  { cat:'symbols', char:'✳️', name:'eight spoked asterisk', cn:'星号', keywords:['asterisk'] },
  { cat:'symbols', char:'✴️', name:'eight pointed star', cn:'八角星', keywords:['star'] },
  { cat:'symbols', char:'⭐️', name:'white medium star', cn:'空心星', keywords:['star'] },
  { cat:'symbols', char:'🅰️', name:'A button', cn:'A按钮', keywords:['a'] },
  { cat:'symbols', char:'🅱️', name:'B button', cn:'B按钮', keywords:['b'] },
  { cat:'symbols', char:'🆒', name:'cool button', cn:'酷', keywords:['cool'] },
  { cat:'symbols', char:'🆗', name:'ok button', cn:'好', keywords:['ok'] },

  // 🚩 更多旗帜（示例）
  { cat:'flags', char:'🇨🇳', name:'China', cn:'中国', keywords:['china','cn'] },
  { cat:'flags', char:'🇺🇸', name:'United States', cn:'美国', keywords:['usa','us'] },
  { cat:'flags', char:'🇬🇧', name:'United Kingdom', cn:'英国', keywords:['uk'] },
  { cat:'flags', char:'🇯🇵', name:'Japan', cn:'日本', keywords:['japan'] },
  { cat:'flags', char:'🇰🇷', name:'South Korea', cn:'韩国', keywords:['korea'] },
  { cat:'flags', char:'🇫🇷', name:'France', cn:'法国', keywords:['france'] },
  { cat:'flags', char:'🇩🇪', name:'Germany', cn:'德国', keywords:['germany'] },
  { cat:'flags', char:'🇮🇳', name:'India', cn:'印度', keywords:['india'] },
  { cat:'flags', char:'🇦🇺', name:'Australia', cn:'澳大利亚', keywords:['australia'] },
  { cat:'flags', char:'🇨🇦', name:'Canada', cn:'加拿大', keywords:['canada'] },
];

// 常用图标精选（优先收录，覆盖日常常见操作与UI符号）
const COMMON_EMOJIS = [
  // 🌐 互联网/通信
  { cat:'internet', char:'🌐', name:'globe with meridians', cn:'地球/互联网', keywords:['internet','web','globe'] },
  { cat:'internet', char:'📡', name:'satellite antenna', cn:'卫星天线', keywords:['satellite','antenna'] },
  { cat:'internet', char:'📶', name:'antenna bars', cn:'信号强度', keywords:['signal','wifi'] },
  { cat:'internet', char:'📧', name:'e-mail', cn:'电子邮件', keywords:['email','mail'] },
  { cat:'internet', char:'✉️', name:'envelope', cn:'信封', keywords:['mail','envelope'] },
  { cat:'internet', char:'📩', name:'envelope with arrow', cn:'收件', keywords:['incoming','mail'] },
  { cat:'internet', char:'📤', name:'outbox tray', cn:'发件箱', keywords:['outbox','send'] },
  { cat:'internet', char:'📥', name:'inbox tray', cn:'收件箱', keywords:['inbox','receive'] },
  { cat:'internet', char:'🔗', name:'link', cn:'链接', keywords:['link','hyperlink'] },
  { cat:'internet', char:'☎️', name:'telephone', cn:'电话', keywords:['telephone','call'] },
  { cat:'internet', char:'📞', name:'telephone receiver', cn:'电话听筒', keywords:['phone','receiver'] },
  { cat:'internet', char:'📱', name:'mobile phone', cn:'手机', keywords:['mobile','cell'] },
  { cat:'internet', char:'💬', name:'speech balloon', cn:'消息气泡', keywords:['chat','message'] },
  { cat:'internet', char:'💭', name:'thought balloon', cn:'思考气泡', keywords:['thought','bubble'] },
  { cat:'internet', char:'🗣️', name:'speaking head', cn:'讲话', keywords:['speak','voice'] },
  { cat:'internet', char:'📢', name:'loudspeaker', cn:'扩音器', keywords:['announce'] },

  // 💻 电脑/IT
  { cat:'computer', char:'💻', name:'laptop', cn:'笔记本电脑', keywords:['laptop','computer'] },
  { cat:'computer', char:'🖥️', name:'desktop computer', cn:'台式电脑', keywords:['desktop','computer'] },
  { cat:'computer', char:'⌨️', name:'keyboard', cn:'键盘', keywords:['keyboard'] },
  { cat:'computer', char:'🖱️', name:'computer mouse', cn:'鼠标', keywords:['mouse'] },
  { cat:'computer', char:'🖲️', name:'trackball', cn:'轨迹球', keywords:['trackball'] },
  { cat:'computer', char:'🖨️', name:'printer', cn:'打印机', keywords:['printer'] },
  { cat:'computer', char:'🕹️', name:'joystick', cn:'摇杆', keywords:['joystick','game'] },
  { cat:'computer', char:'💾', name:'floppy disk', cn:'软盘', keywords:['floppy','disk'] },
  { cat:'computer', char:'💽', name:'computer disk', cn:'磁盘', keywords:['disk'] },
  { cat:'computer', char:'💿', name:'optical disc', cn:'光盘', keywords:['cd','disc'] },
  { cat:'computer', char:'📀', name:'dvd', cn:'DVD', keywords:['dvd'] },
  { cat:'computer', char:'🔌', name:'electric plug', cn:'电源插头', keywords:['plug','power'] },
  { cat:'computer', char:'🔋', name:'battery', cn:'电池', keywords:['battery','power'] },

  // 📄 文本/文档/文件
  { cat:'text', char:'📄', name:'page facing up', cn:'文件/文档', keywords:['file','document','page'] },
  { cat:'text', char:'📃', name:'page with curl', cn:'卷边纸', keywords:['paper','page'] },
  { cat:'text', char:'📝', name:'memo', cn:'备忘录', keywords:['memo','note'] },
  { cat:'text', char:'✏️', name:'pencil', cn:'铅笔', keywords:['pencil','write'] },
  { cat:'text', char:'🖊️', name:'ballpoint pen', cn:'圆珠笔', keywords:['pen','write'] },
  { cat:'text', char:'🖋️', name:'fountain pen', cn:'钢笔', keywords:['pen','write'] },
  { cat:'text', char:'🖌️', name:'paintbrush', cn:'画笔', keywords:['brush','paint'] },
  { cat:'text', char:'🖍️', name:'crayon', cn:'蜡笔', keywords:['crayon'] },
  { cat:'text', char:'📎', name:'paperclip', cn:'回形针', keywords:['clip','attach'] },
  { cat:'text', char:'📌', name:'pushpin', cn:'图钉', keywords:['pin'] },
  { cat:'text', char:'📍', name:'round pushpin', cn:'定位图钉', keywords:['pin','location'] },
  { cat:'text', char:'📋', name:'clipboard', cn:'剪贴板', keywords:['clipboard'] },
  { cat:'text', char:'🔖', name:'bookmark', cn:'书签', keywords:['bookmark'] },
  { cat:'text', char:'🏷️', name:'label', cn:'标签', keywords:['label','tag'] },
  { cat:'text', char:'📰', name:'newspaper', cn:'报纸', keywords:['news','paper'] },
  { cat:'text', char:'📇', name:'card index', cn:'卡片索引', keywords:['index','card'] },
  { cat:'text', char:'🗃️', name:'card file box', cn:'卡片盒', keywords:['file','box'] },
  { cat:'text', char:'🗂️', name:'card index dividers', cn:'卡片分隔', keywords:['index','divider'] },
  { cat:'text', char:'📁', name:'file folder', cn:'文件夹', keywords:['folder'] },
  { cat:'text', char:'📂', name:'open file folder', cn:'打开文件夹', keywords:['folder'] },
  { cat:'text', char:'🗄️', name:'file cabinet', cn:'文件柜', keywords:['cabinet'] },
  { cat:'text', char:'🗒️', name:'spiral notepad', cn:'线圈便笺', keywords:['notepad'] },
  { cat:'text', char:'🗓️', name:'spiral calendar', cn:'线圈日历', keywords:['calendar'] },
  { cat:'text', char:'📅', name:'calendar', cn:'日历', keywords:['calendar','date'] },
  { cat:'text', char:'📆', name:'tear-off calendar', cn:'撕页日历', keywords:['calendar'] },

  // 🧰 常用物品/操作
  { cat:'objects', char:'⚙️', name:'gear', cn:'齿轮/设置', keywords:['setting','gear'] },
  { cat:'objects', char:'🔧', name:'wrench', cn:'扳手', keywords:['tool','wrench'] },
  { cat:'objects', char:'🔨', name:'hammer', cn:'锤子', keywords:['tool','hammer'] },
  { cat:'objects', char:'🪛', name:'screwdriver', cn:'螺丝刀', keywords:['tool','screwdriver'] },
  { cat:'objects', char:'🔩', name:'nut and bolt', cn:'螺母与螺栓', keywords:['bolt','nut'] },
  { cat:'objects', char:'📦', name:'package', cn:'包裹/快递', keywords:['package','box'] },
  { cat:'objects', char:'🛒', name:'shopping cart', cn:'购物车', keywords:['cart','shop'] },
  { cat:'objects', char:'💳', name:'credit card', cn:'信用卡', keywords:['card','credit'] },
  { cat:'objects', char:'💰', name:'money bag', cn:'钱袋', keywords:['money'] },
  { cat:'objects', char:'📈', name:'chart increasing', cn:'趋势上升', keywords:['chart','up'] },
  { cat:'objects', char:'📉', name:'chart decreasing', cn:'趋势下降', keywords:['chart','down'] },
  { cat:'objects', char:'📊', name:'bar chart', cn:'柱状图', keywords:['chart','bar'] },
  { cat:'objects', char:'📷', name:'camera', cn:'相机', keywords:['photo','camera'] },
  { cat:'objects', char:'📹', name:'video camera', cn:'摄像机', keywords:['video','camera'] },
  { cat:'objects', char:'🎥', name:'movie camera', cn:'电影摄影机', keywords:['movie','camera'] },
  { cat:'objects', char:'🖼️', name:'framed picture', cn:'图片/相框', keywords:['image','picture'] },
  { cat:'objects', char:'🎬', name:'clapper board', cn:'场记板', keywords:['clapper','movie'] },
  { cat:'objects', char:'🔍', name:'magnifying glass tilted left', cn:'放大镜', keywords:['search','magnify'] },
  { cat:'objects', char:'🔎', name:'magnifying glass tilted right', cn:'放大镜', keywords:['search','magnify'] },
  { cat:'objects', char:'🔔', name:'bell', cn:'铃铛/通知', keywords:['bell','notify'] },
  { cat:'objects', char:'🔕', name:'bell with slash', cn:'静音通知', keywords:['mute','bell'] },
  { cat:'objects', char:'🔑', name:'key', cn:'钥匙', keywords:['key','access'] },
  { cat:'objects', char:'🔒', name:'lock', cn:'锁/加密', keywords:['lock','secure'] },
  { cat:'objects', char:'🔓', name:'unlock', cn:'解锁', keywords:['unlock','access'] },
  { cat:'objects', char:'🗑️', name:'wastebasket', cn:'垃圾桶/删除', keywords:['trash','delete'] },
  { cat:'objects', char:'☁️', name:'cloud', cn:'云', keywords:['cloud'] },
  { cat:'objects', char:'⬇️', name:'down arrow', cn:'下载/向下', keywords:['download','down'] },
  { cat:'objects', char:'⬆️', name:'up arrow', cn:'上传/向上', keywords:['upload','up'] },
  { cat:'objects', char:'➡️', name:'right arrow', cn:'向右', keywords:['right','arrow'] },
  { cat:'objects', char:'⬅️', name:'left arrow', cn:'向左', keywords:['left','arrow'] },
  { cat:'objects', char:'✅', name:'check mark button', cn:'完成/确认', keywords:['check','ok'] },
  { cat:'objects', char:'❌', name:'cross mark', cn:'关闭/错误', keywords:['error','close'] },
  { cat:'objects', char:'ℹ️', name:'information', cn:'信息', keywords:['info'] },
  { cat:'objects', char:'⚠️', name:'warning', cn:'警告', keywords:['warning'] },
  { cat:'objects', char:'❓', name:'question mark', cn:'疑问', keywords:['question'] },
  { cat:'objects', char:'❗', name:'exclamation mark', cn:'提示', keywords:['exclamation'] },
  { cat:'objects', char:'⭐', name:'star', cn:'星标', keywords:['star','favorite'] },
  { cat:'objects', char:'❤️', name:'heart', cn:'喜欢/收藏', keywords:['heart','love'] },
];

const ALL_EMOJIS = [...EMOJIS, ...EXTRA_EMOJIS];

createApp({
  data() {
    return {
      categories,
      activeCategory: null,
      searchQuery: '',
      toast: { show: false, text: '' },
      // 预置常用清单，优先展示（后续与远端合并并去重）
      extEmojis: COMMON_EMOJIS.slice()
    };
  },
  computed: {
    allEmojis() {
      // 规范分类名称：将自定义类别合并到标准 'objects'
      const normalizeCat = (c) => (c === 'internet' || c === 'computer' || c === 'text') ? 'objects' : c;
      // 合并去重（以字符去重），并规范类别
      const seen = new Set();
      const merged = [...ALL_EMOJIS, ...this.extEmojis]
        .map(e => ({ ...e, cat: normalizeCat(e.cat) }))
        .filter(e => {
          if (!e.char) return false;
          if (seen.has(e.char)) return false;
          seen.add(e.char);
          return true;
        });
      return merged;
    },
    filteredEmojis() {
      const q = this.searchQuery.trim().toLowerCase();
      return this.allEmojis.filter(e => {
        if (this.activeCategory && e.cat !== this.activeCategory) return false;
        if (!q) return true;
        const hay = [e.char, e.name, e.cn, ...(e.keywords||[])].join(' ').toLowerCase();
        return hay.includes(q);
      });
    },
    filteredCount() {
      return this.filteredEmojis.length;
    }
  },
  methods: {
    selectCategory(cat) { this.activeCategory = cat; },
    async copyEmoji(ch, evt) {
      try {
        await navigator.clipboard.writeText(ch);
        this.showToast('已复制到剪贴板');
      } catch (err) {
        this.showToast('复制失败，请重试');
      }
      // 点击动画反馈
      const el = evt && evt.currentTarget;
      if (el) {
        // 结束按压态，触发点击动画
        el.classList.remove('is-press');
        el.classList.add('is-clicked');
        el.classList.add('is-copied');
        clearTimeout(el._clickTimer);
        el._clickTimer = setTimeout(() => {
          el.classList.remove('is-clicked');
        }, 260);
        clearTimeout(el._copiedTimer);
        el._copiedTimer = setTimeout(() => {
          el.classList.remove('is-copied');
        }, 900);
      }
    },
    pressStart(evt) {
      const el = evt && evt.currentTarget;
      if (el) {
        el.classList.add('is-press');
      }
    },
    pressEnd(evt) {
      const el = evt && evt.currentTarget;
      if (el) {
        el.classList.remove('is-press');
      }
    },
    showToast(text) {
      this.toast.text = text;
      this.toast.show = true;
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => { this.toast.show = false; }, 1500);
    }
  },
  mounted() {
    // 远程扩展数据集：emoji.json（包含 2000+ 项），并映射到本页面分类
    // 若网络不可用将静默失败，保留内置数据集
    const url = 'https://cdn.jsdelivr.net/npm/emoji.json@13.1.0/emoji.json';
    fetch(url).then(r => r.json()).then(list => {
      const baseChars = new Set(ALL_EMOJIS.map(e => e.char));
      const mapCat = (item) => {
        const category = (item.category || '').toLowerCase();
        if (category.includes('smileys')) return 'smileys';
        if (category.includes('people')) return 'people';
        if (category.includes('animals')) return 'animals';
        if (category.includes('food')) return 'food';
        if (category.includes('travel')) return 'travel';
        if (category.includes('activities')) return 'activities';
        if (category.includes('objects')) return 'objects';
        if (category.includes('symbols')) return 'symbols';
        if (category.includes('flags')) return 'flags';
        return 'objects';
      };

      const mappedRaw = list.map(item => ({
        cat: mapCat(item),
        char: item.char || '',
        name: item.name || '',
        cn: '',
        keywords: [item.subgroup || '', item.category || '']
      })).filter(e => e.char && !baseChars.has(e.char));

      // 远端数据自身去重（以字符为准）
      const seen = new Set();
      const mapped = mappedRaw.filter(e => {
        if (seen.has(e.char)) return false;
        seen.add(e.char);
        return true;
      });

      // 不再限制“人物与身体”分类，完整收录以对齐站点规模
      this.extEmojis = [...this.extEmojis, ...mapped];
    }).catch(() => {
      // 可选提示：不打扰用户
      // this.showToast('未加载到扩展图标');
    });
  }
}).mount('#app');