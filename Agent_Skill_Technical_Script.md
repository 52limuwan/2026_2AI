# Agent Skill 智能技能识别系统 - 技术方向逐字稿

## 开场介绍 (30秒)

大家好,今天我要为大家介绍的是智膳伙伴项目中的一个创新功能——Agent Skill 智能技能识别系统。

这是一个基于关键词匹配的AI角色动态切换系统,能够根据用户提问的内容,自动识别用户意图,并激活相应的专业技能角色,为用户提供更精准、更专业的服务。

简单来说,就是让AI助手能够"读懂"用户的需求,自动切换到最合适的专家角色来回答问题。

## 核心技术架构 (1分钟)

### 1. 系统设计理念

Agent Skill 系统的核心设计理念是"智能识别、动态切换、专业响应"。

我们在监护人端配置了9个专业技能角色,在政府端配置了10个专业技能角色。每个角色都有自己的专业领域和关键词库。

当用户输入消息时,系统会实时扫描消息内容,匹配预设的关键词库,一旦匹配成功,就会激活对应的技能角色,并以该角色的专业视角来回答用户的问题。

### 2. 技术实现层次

整个系统分为三个技术层次:

**第一层是关键词匹配引擎**。我们为每个技能角色配置了10-20个高频关键词,这些关键词覆盖了该领域的核心概念。比如"营养分析师"的关键词包括:营养分析、营养报告、蛋白质、脂肪、碳水、维生素等。

**第二层是技能激活机制**。当检测到关键词匹配时,系统会触发技能激活流程,包括状态更新、动画展示、AI角色切换等一系列操作。

**第三层是视觉反馈系统**。我们设计了优雅的模糊动画效果,让用户能够清晰地感知到AI正在切换到专业角色。

## 关键词匹配算法 (1分30秒)


现在让我详细讲解关键词匹配算法的实现。

### 算法核心代码

我们使用了一个简单但高效的关键词匹配算法:

```javascript
const skillKeywords = {
  '营养分析师': [
    '营养分析', '营养报告', '营养评估', '蛋白质', '脂肪', '碳水',
    '维生素', '矿物质', '热量', '卡路里', '营养不良', '营养缺口'
  ],
  '健康监护顾问': [
    '健康监测', '血压', '血糖', '血脂', '心率', '异常', '不正常',
    '症状', '风险', '就医', '看医生', '去医院'
  ]
  // ... 其他技能角色
};

const detectSkill = (message) => {
  for (const [skill, keywords] of Object.entries(skillKeywords)) {
    for (const keyword of keywords) {
      if (message.includes(keyword)) {
        return skill;
      }
    }
  }
  return '';
};
```

### 算法特点

这个算法有三个显著特点:

**第一,实时性**。算法采用简单的字符串包含判断,时间复杂度为O(n×m),其中n是技能数量,m是关键词数量。在实际应用中,匹配速度在毫秒级别,用户感知不到延迟。

**第二,优先级机制**。我们按照技能的重要性排序,越重要的技能越靠前。一旦匹配成功,立即返回,不再继续匹配。这样可以确保最相关的技能被优先激活。

**第三,可扩展性**。新增技能角色只需要在配置对象中添加一个键值对,无需修改核心算法代码。

### 关键词库设计原则

关键词库的设计遵循三个原则:

1. **高频原则** - 选择用户最常使用的词汇
2. **专业原则** - 包含领域专业术语
3. **覆盖原则** - 覆盖该领域的核心概念

比如"营养分析师"的关键词库,我们不仅包含了"营养"这个核心词,还包含了"蛋白质"、"脂肪"、"碳水"等具体营养素名称,以及"营养不良"、"营养缺口"等问题描述词。

这样设计的好处是,无论用户用什么方式提问,只要涉及营养相关的内容,都能被准确识别。

## 技能激活流程 (1分30秒)


接下来讲解技能激活的完整流程。

### 激活时序设计

当检测到关键词匹配后,系统会启动一个精心设计的时序流程:

```javascript
const startSkillAnimation = () => {
  // T+0ms: 设置激活状态
  activeSkill.value = detectedSkill;
  
  // T+3000ms: 显示"查看技能"
  setTimeout(() => {
    currentSkillText.value = `查看技能 ${activeSkill.value}`;
    showSkillIndicator.value = true;
  }, 3000);
  
  // T+4800ms: 切换到"读取技能"
  setTimeout(() => {
    currentSkillText.value = `读取技能 ${activeSkill.value}`;
  }, 4800);
  
  // T+6400ms: 隐藏动画
  setTimeout(() => {
    showSkillIndicator.value = false;
    setTimeout(() => {
      activeSkill.value = '';
      currentSkillText.value = '';
    }, 600);
  }, 6400);
};
```

### 时序设计的考量

这个时序设计有几个关键考量点:

**第一,延迟3秒显示**。为什么要延迟3秒?因为AI的响应通常需要2-4秒,我们在3秒时显示技能识别动画,正好是AI开始输出内容的时候,这样用户会感觉技能识别和AI响应是同步的。

**第二,两阶段文字切换**。从"查看技能"到"读取技能",这个切换给用户一种"AI正在加载专业知识"的感觉,增强了技术感和专业感。

**第三,总时长6.4秒**。这个时长经过多次测试,既不会太短让用户看不清,也不会太长影响用户体验。

### 状态管理

我们使用Vue 3的响应式系统来管理技能状态:

```javascript
const activeSkill = ref('');           // 当前激活的技能
const showSkillIndicator = ref(false); // 是否显示技能指示器
const currentSkillText = ref('');      // 当前显示的文字
const isThinking = ref(false);         // AI是否正在思考
```

这四个状态变量协同工作,控制整个技能识别的视觉呈现。

特别要注意的是`isThinking`状态,只有当AI正在思考时,技能动画才会显示。这样可以避免在用户浏览历史消息时误触发动画。

## 视觉反馈系统 (2分钟)


视觉反馈是Agent Skill系统的一大亮点,我们设计了优雅的模糊动画效果。

### 双层动画架构

我们采用了双层动画架构:

**外层容器动画** - 控制整个技能指示器的出现和消失
**内层文字动画** - 控制文字内容的切换

这种双层设计的好处是,外层动画只执行一次(出现和消失),而内层动画可以多次执行(文字切换),互不干扰。

### CSS动画实现

外层容器使用模糊渐入渐出效果:

```css
.skill-blur-enter-active,
.skill-blur-leave-active {
  transition: opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1),
              filter 0.6s cubic-bezier(0.4, 0, 0.2, 1),
              transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.skill-blur-enter-from {
  opacity: 0;
  filter: blur(10px);
  transform: translateY(8px);
}
```

这里有三个关键的CSS属性:

1. **opacity** - 控制透明度,从0到1渐变
2. **filter: blur** - 控制模糊度,从10px到0渐变,营造"从模糊到清晰"的效果
3. **transform: translateY** - 控制垂直位移,从下往上移动8px,增加动感

### 缓动函数选择

我们使用了`cubic-bezier(0.4, 0, 0.2, 1)`这个缓动函数,这是Material Design推荐的标准缓动曲线,也叫"Fast Out Slow In"。

这个曲线的特点是:开始时加速较快,结束时减速较慢,给人一种自然流畅的感觉,非常适合UI动画。

### 内层文字切换动画

内层文字使用更强的模糊效果:

```css
.skill-text-blur-enter-active,
.skill-text-blur-leave-active {
  transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1),
              filter 0.5s cubic-bezier(0.4, 0, 0.2, 1),
              transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.skill-text-blur-enter-from {
  opacity: 0;
  filter: blur(8px);
  transform: translateY(10px);
}
```

注意这里的时长是0.5秒,比外层的0.6秒稍短,这样可以让文字切换更加干脆利落。

### Vue Transition组件

我们使用Vue 3的Transition组件来实现动画:

```vue
<transition name="skill-blur">
  <div v-if="showSkillIndicator && isThinking" class="skill-indicator-container">
    <transition name="skill-text-blur" mode="out-in">
      <div class="skill-indicator" :key="currentSkillText">
        <svg class="skill-book-icon" viewBox="0 0 24 24">
          <!-- 书本图标 -->
        </svg>
        <span class="skill-indicator-text">{{ currentSkillText }}</span>
      </div>
    </transition>
  </div>
</transition>
```

这里有两个关键点:

1. **mode="out-in"** - 这个模式确保旧内容先消失,新内容再出现,避免重叠
2. **:key绑定** - 通过key的变化触发动画,这是Vue动画的核心机制

### 图标设计

我们使用了一个书本图标来象征"知识"和"专业",这个图标是用SVG绘制的,具有良好的缩放性和清晰度。

图标的颜色使用了渐变效果,从蓝色到紫色,营造科技感和专业感。

## 多端差异化配置 (1分30秒)


Agent Skill系统的一个重要特性是多端差异化配置。

### 监护人端技能配置

监护人端配置了9个专业技能角色,聚焦家庭养老护理:

1. **营养分析师** - 深度营养分析、膳食结构评估
2. **健康监护顾问** - 健康指标监测、异常识别
3. **慢病协同管理师** - 慢性病管理、用药监督
4. **心理关怀指导师** - 情绪识别、心理疏导
5. **居家安全顾问** - 居家安全评估、环境改造
6. **护理技能培训师** - 日常护理指导、专业技能培训
7. **就医陪诊助手** - 就医准备、流程指导
8. **康复计划师** - 康复评估、训练计划
9. **养老资源顾问** - 养老方式咨询、机构对比

这9个角色覆盖了家庭养老的方方面面,从营养健康到心理关怀,从日常护理到就医陪诊。

### 政府端技能配置

政府端配置了10个专业技能角色,聚焦社区健康管理:

1. **社区健康管理师** - 社区健康评估、人群管理
2. **慢病防控专家** - 慢病防控策略、筛查体系
3. **营养政策顾问** - 政策制定、方案设计
4. **健康教育专家** - 教育活动组织、行为干预
5. **养老服务监管师** - 服务质量监管、标准制定
6. **应急响应协调师** - 应急预案制定、快速响应
7. **数据分析师** - 数据统计分析、趋势预测
8. **资源配置优化师** - 资源需求分析、配置方案设计
9. **政策法规顾问** - 政策解读、合规指导
10. **社区协作促进师** - 协作机制建设、资源整合

这10个角色体现了政府端的管理视角,从宏观政策到微观执行,从数据分析到资源配置。

### 配置化设计

我们采用了配置化设计,每个端的技能配置都是独立的:

```javascript
// 监护人端配置
const guardianSkillKeywords = {
  '营养分析师': [...],
  '健康监护顾问': [...],
  // ...
};

// 政府端配置
const govSkillKeywords = {
  '社区健康管理师': [...],
  '慢病防控专家': [...],
  // ...
};
```

这种设计的好处是:

1. **灵活性** - 每个端可以独立调整技能配置
2. **可维护性** - 修改一个端的配置不影响其他端
3. **可扩展性** - 新增端只需要添加新的配置对象

### 角色专业度设计

每个技能角色都有明确的专业定位和知识边界。

比如"营养分析师"专注于营养数据分析和膳食建议,不会涉及医疗诊断。而"健康监护顾问"则专注于健康指标的监测和异常识别,会给出就医建议。

这种明确的角色定位,可以让AI的回答更加专业和聚焦,避免泛泛而谈。

## 与AI系统的集成 (1分30秒)


Agent Skill系统与AI聊天系统是无缝集成的。

### 消息发送流程

当用户发送消息时,完整的流程是这样的:

```javascript
const sendMessage = async () => {
  // 1. 检测技能
  const detectedSkill = detectSkill(userMessage.value);
  
  // 2. 如果检测到使用技能
  if (detectedSkill) {
    activeSkill.value = detectedSkill;
    startSkillAnimation();
  }
  
  // 3. 设置AI思考状态
  isThinking.value = true;
  
  // 4. 调用AI API
  const response = await callAI({
    message: userMessage.value,
    skill: detectedSkill  // 传递技能信息
  });
  
  // 5. 显示AI回复
  messages.value.push({
    role: 'ai',
    content: response.content,
    skill: detectedSkill
  });
  
  // 6. 结束思考状态
  isThinking.value = false;
};
```

### AI Prompt工程

当检测到技能后,我们会在AI的System Prompt中注入角色信息:

```javascript
const buildSystemPrompt = (skill) => {
  const basePrompt = '你是智膳伙伴的AI助手...';
  
  if (skill) {
    const rolePrompt = `当前你正在以"${skill}"的角色回答问题。
请以该角色的专业视角提供建议,展现专业性和针对性。`;
    return basePrompt + '\n\n' + rolePrompt;
  }
  
  return basePrompt;
};
```

这样,AI就能理解自己当前的角色定位,并以相应的专业视角来回答问题。

### 上下文管理

我们在消息对象中保存了技能信息:

```javascript
{
  role: 'user',
  content: '老人最近营养够吗?',
  skill: '营养分析师'
}
```

这样做有两个好处:

1. **历史回溯** - 用户可以看到每条消息是由哪个技能角色回答的
2. **上下文连续性** - 如果用户继续追问,AI可以保持同一个角色视角

### 流式响应处理

我们使用SSE(Server-Sent Events)实现流式响应:

```javascript
const eventSource = new EventSource(
  `/api/ai/chat-stream?message=${encodeURIComponent(message)}&skill=${skill}`
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'content') {
    // 追加内容
    currentMessage.content += data.content;
  } else if (data.type === 'done') {
    // 完成
    eventSource.close();
    isThinking.value = false;
  }
};
```

流式响应的好处是用户可以实时看到AI的输出,不需要等待完整响应,体验更好。

### 错误处理

如果AI调用失败,我们会优雅降级:

```javascript
try {
  const response = await callAI(params);
  return response;
} catch (error) {
  console.error('AI调用失败:', error);
  
  // 返回友好的错误提示
  return {
    content: '抱歉,我暂时无法回答您的问题,请稍后再试。',
    error: true
  };
}
```

即使AI服务出现问题,用户也能得到明确的反馈,而不是卡在加载状态。

## 性能优化策略 (1分钟)


在性能优化方面,我们做了几个关键优化。

### 关键词匹配优化

虽然关键词匹配算法很简单,但我们还是做了优化:

```javascript
// 优化前: 每次都遍历所有技能和关键词
const detectSkill = (message) => {
  for (const [skill, keywords] of Object.entries(skillKeywords)) {
    for (const keyword of keywords) {
      if (message.includes(keyword)) {
        return skill;
      }
    }
  }
  return '';
};

// 使用缓存和早期返回
const skillCache = new Map();

const detectSkill = (message) => {
  // 检查缓存
  if (skillCache.has(message)) {
    return skillCache.get(message);
  }
  
  // 匹配技能
  for (const [skill, keywords] of Object.entries(skillKeywords)) {
    for (const keyword of keywords) {
      if (message.includes(keyword)) {
        skillCache.set(message, skill);
        return skill;
      }
    }
  }
  
  skillCache.set(message, '');
  return '';
};
```

通过缓存,相同的消息不需要重复匹配,性能提升明显。

### 动画性能优化

CSS动画使用了GPU加速:

```css
.skill-indicator-container {
  will-change: opacity, filter, transform;
  transform: translateZ(0); /* 强制GPU加速 */
}
```

`will-change`属性告诉浏览器这些属性会变化,浏览器会提前优化。`translateZ(0)`是一个经典的GPU加速技巧。

### 内存管理

我们限制了技能缓存的大小:

```javascript
const MAX_CACHE_SIZE = 100;

const detectSkill = (message) => {
  // 如果缓存过大,清空
  if (skillCache.size > MAX_CACHE_SIZE) {
    skillCache.clear();
  }
  
  // ... 匹配逻辑
};
```

这样可以避免缓存无限增长导致内存泄漏。

### 防抖处理

对于快速连续的消息,我们使用防抖:

```javascript
import { debounce } from 'lodash-es';

const debouncedDetect = debounce((message) => {
  const skill = detectSkill(message);
  if (skill) {
    activeSkill.value = skill;
    startSkillAnimation();
  }
}, 300);
```

这样可以避免用户快速输入时频繁触发技能检测。

### 懒加载技能配置

对于大型技能配置,我们使用懒加载:

```javascript
// 不是一次性加载所有配置
const skillKeywords = {
  '营养分析师': () => import('./skills/nutrition-analyst'),
  '健康监护顾问': () => import('./skills/health-monitor'),
  // ...
};

// 使用时才加载
const loadSkillKeywords = async (skill) => {
  if (typeof skillKeywords[skill] === 'function') {
    skillKeywords[skill] = await skillKeywords[skill]();
  }
  return skillKeywords[skill];
};
```

这样可以减少初始加载时间。

## 扩展性设计 (1分钟)


Agent Skill系统具有良好的扩展性。

### 添加新技能

添加新技能非常简单,只需要三步:

**第一步,定义关键词**:

```javascript
const skillKeywords = {
  // ... 现有技能
  '新技能名称': [
    '关键词1', '关键词2', '关键词3',
    '关键词4', '关键词5'
  ]
};
```

**第二步,配置AI Prompt**:

```javascript
const skillPrompts = {
  '新技能名称': `你是一位专业的XXX专家,擅长...
请以专业的视角为用户提供建议。`
};
```

**第三步,测试验证**:

```javascript
// 测试关键词匹配
console.log(detectSkill('包含关键词1的消息')); // 应该返回'新技能名称'

// 测试AI响应
const response = await callAI({
  message: '测试消息',
  skill: '新技能名称'
});
```

就这么简单,不需要修改任何核心代码。

### 动态技能配置

我们还支持从后端动态加载技能配置:

```javascript
const loadSkillsFromServer = async () => {
  const response = await fetch('/api/skills/config');
  const config = await response.json();
  
  // 合并到本地配置
  Object.assign(skillKeywords, config.keywords);
  Object.assign(skillPrompts, config.prompts);
};

// 应用启动时加载
onMounted(async () => {
  await loadSkillsFromServer();
});
```

这样管理员可以在后台配置技能,无需修改前端代码。

### 技能组合

我们还支持技能组合,一个消息可以激活多个技能:

```javascript
const detectSkills = (message) => {
  const skills = [];
  
  for (const [skill, keywords] of Object.entries(skillKeywords)) {
    for (const keyword of keywords) {
      if (message.includes(keyword)) {
        skills.push(skill);
        break;
      }
    }
  }
  
  return skills;
};
```

比如用户问"老人血压高,饮食上要注意什么?",这个问题同时涉及"健康监护顾问"和"营养分析师"两个技能。

### 技能优先级

对于技能组合,我们可以设置优先级:

```javascript
const skillPriority = {
  '营养分析师': 10,
  '健康监护顾问': 9,
  '慢病协同管理师': 8,
  // ...
};

const selectPrimarySkill = (skills) => {
  return skills.sort((a, b) => 
    skillPriority[b] - skillPriority[a]
  )[0];
};
```

这样可以确保最相关的技能被优先使用。

### 插件化架构

未来我们计划支持插件化架构:

```javascript
class SkillPlugin {
  constructor(name, keywords, prompt) {
    this.name = name;
    this.keywords = keywords;
    this.prompt = prompt;
  }
  
  detect(message) {
    return this.keywords.some(kw => message.includes(kw));
  }
  
  buildPrompt(basePrompt) {
    return basePrompt + '\n\n' + this.prompt;
  }
}

// 注册插件
const registerSkill = (plugin) => {
  skillPlugins.push(plugin);
};

// 使用插件
const nutritionPlugin = new SkillPlugin(
  '营养分析师',
  ['营养', '蛋白质', '脂肪'],
  '你是一位专业的营养分析师...'
);

registerSkill(nutritionPlugin);
```

这样第三方开发者也可以开发自己的技能插件。

## 实际应用场景 (1分30秒)


让我通过几个实际场景来展示Agent Skill系统的应用效果。

### 场景一: 监护人咨询营养问题

**用户输入**: "妈妈最近营养够吗?需要补充什么?"

**系统处理**:
1. 检测到关键词"营养"、"补充"
2. 激活"营养分析师"技能
3. 显示动画: "查看技能 营养分析师" → "读取技能 营养分析师"
4. AI以营养分析师的角色回答

**AI回复**: "作为营养分析师,我来为您分析妈妈的营养状况。根据近7天的饮食记录,妈妈的蛋白质摄入略显不足,平均每天只有35克,建议增加到50-60克。可以考虑增加以下食物..."

**效果**: 用户清楚地知道AI正在以专业营养师的角色回答,回答内容也更加专业和具体。

### 场景二: 监护人询问就医问题

**用户输入**: "老人血压一直偏高,需要去医院吗?"

**系统处理**:
1. 检测到关键词"血压"、"去医院"
2. 激活"健康监护顾问"技能
3. 显示技能识别动画
4. AI以健康监护顾问的角色回答

**AI回复**: "作为健康监护顾问,我建议您关注以下几点:1. 血压具体数值是多少?如果收缩压持续>140或舒张压>90,建议尽快就医。2. 是否伴有头晕、胸闷等症状?如有,请立即就医。3. 建议每天早晚测量血压并记录..."

**效果**: AI不仅给出了就医建议,还提供了具体的判断标准和监测方法,体现了健康监护顾问的专业性。

### 场景三: 政府端分析社区数据

**用户输入**: "如何分析社区居民的整体健康趋势?"

**系统处理**:
1. 检测到关键词"分析"、"数据"、"趋势"
2. 激活"数据分析师"技能
3. 显示技能识别动画
4. AI以数据分析师的角色回答

**AI回复**: "作为数据分析师,我建议从以下维度分析社区健康趋势:1. 时间序列分析 - 对比不同时期的健康指标变化。2. 人群分层分析 - 按年龄、性别、慢性病类型分组。3. 相关性分析 - 分析饮食习惯与健康指标的关联..."

**效果**: AI提供了专业的数据分析方法论,而不是泛泛而谈,体现了数据分析师的专业视角。

### 场景四: 政府端制定干预方案

**用户输入**: "发现多位居民营养摄入不足,如何制定干预方案?"

**系统处理**:
1. 检测到关键词"营养"、"干预"、"方案"
2. 激活"营养政策顾问"技能
3. 显示技能识别动画
4. AI以营养政策顾问的角色回答

**AI回复**: "作为营养政策顾问,我建议制定分层干预方案:1. 高风险人群(营养不良) - 一对一营养咨询+营养补充计划。2. 中风险人群(摄入不均衡) - 小组营养教育+菜单优化建议。3. 低风险人群(预防为主) - 社区营养讲座+健康饮食宣传..."

**效果**: AI从政策制定的角度给出了系统性的解决方案,而不是简单的个人建议,体现了政策顾问的宏观视角。

### 用户反馈

根据内部测试,Agent Skill系统获得了积极反馈:

1. **专业性提升** - 用户感觉AI的回答更加专业和可信
2. **针对性增强** - AI的建议更加具体和可操作
3. **体验优化** - 技能识别动画让用户感知到AI的"思考过程"
4. **信任度提高** - 明确的角色定位增强了用户对AI的信任

## 技术挑战与解决方案 (1分30秒)


在开发过程中,我们遇到了一些技术挑战。

### 挑战一: 关键词冲突

**问题**: 不同技能的关键词可能重叠,导致误判。

比如"营养分析师"和"营养政策顾问"都包含"营养"这个关键词,如何区分?

**解决方案**: 我们采用了"长关键词优先"策略:

```javascript
const detectSkill = (message) => {
  let matchedSkill = '';
  let maxKeywordLength = 0;
  
  for (const [skill, keywords] of Object.entries(skillKeywords)) {
    for (const keyword of keywords) {
      if (message.includes(keyword) && keyword.length > maxKeywordLength) {
        matchedSkill = skill;
        maxKeywordLength = keyword.length;
      }
    }
  }
  
  return matchedSkill;
};
```

这样,"营养政策"(4个字)会优先于"营养"(2个字)被匹配。

### 挑战二: 动画时序同步

**问题**: AI响应时间不固定,如何确保动画和AI响应同步?

**解决方案**: 我们使用了"延迟显示"策略:

```javascript
// 不是立即显示动画,而是延迟3秒
setTimeout(() => {
  if (isThinking.value) {  // 只有AI还在思考时才显示
    showSkillIndicator.value = true;
  }
}, 3000);
```

如果AI在3秒内就响应了,动画就不会显示,避免了"动画还在,AI已经回答完了"的尴尬情况。

### 挑战三: 移动端性能

**问题**: 在低端移动设备上,模糊动画可能导致卡顿。

**解决方案**: 我们实现了性能检测和降级:

```javascript
// 检测设备性能
const isLowEndDevice = () => {
  const memory = navigator.deviceMemory; // GB
  const cores = navigator.hardwareConcurrency;
  
  return memory < 4 || cores < 4;
};

// 根据性能调整动画
const animationConfig = isLowEndDevice() ? {
  duration: 0.3,  // 缩短动画时长
  blur: 5,        // 减少模糊程度
} : {
  duration: 0.6,
  blur: 10,
};
```

在低端设备上,我们使用更简单的动画效果,确保流畅性。

### 挑战四: 多语言支持

**问题**: 如何支持多语言环境?

**解决方案**: 我们设计了多语言关键词映射:

```javascript
const skillKeywords = {
  'zh-CN': {
    '营养分析师': ['营养', '蛋白质', '脂肪'],
    // ...
  },
  'en-US': {
    'Nutrition Analyst': ['nutrition', 'protein', 'fat'],
    // ...
  }
};

// 根据用户语言选择关键词库
const currentKeywords = skillKeywords[userLocale] || skillKeywords['zh-CN'];
```

这样可以轻松扩展到其他语言。

### 挑战五: AI幻觉问题

**问题**: AI可能不遵守角色设定,给出不相关的回答。

**解决方案**: 我们在Prompt中加强了角色约束:

```javascript
const buildSystemPrompt = (skill) => {
  return `你是智膳伙伴的AI助手。

当前角色: ${skill}

重要约束:
1. 你必须严格以"${skill}"的角色回答问题
2. 只回答该角色专业领域内的问题
3. 如果问题超出该角色的专业范围,请明确告知用户
4. 回答时要体现该角色的专业性和针对性

请开始回答用户的问题。`;
};
```

通过明确的约束,减少了AI的幻觉问题。

### 挑战六: 技能切换的连续性

**问题**: 用户连续提问时,如何保持技能的连续性?

**解决方案**: 我们实现了"技能上下文"机制:

```javascript
let lastSkill = '';
let skillContext = [];

const detectSkillWithContext = (message) => {
  const newSkill = detectSkill(message);
  
  // 如果没有检测到新技能,但有上一个技能,继续使用
  if (!newSkill && lastSkill) {
    return lastSkill;
  }
  
  // 如果检测到新技能,更新上下文
  if (newSkill) {
    lastSkill = newSkill;
    skillContext.push({
      skill: newSkill,
      timestamp: Date.now()
    });
  }
  
  return newSkill || lastSkill;
};
```

这样,用户追问时不需要重复关键词,AI也能保持同一个角色视角。

## 未来展望 (1分钟)


最后,让我分享一下Agent Skill系统的未来发展方向。

### 方向一: 机器学习增强

目前我们使用的是基于规则的关键词匹配,未来我们计划引入机器学习:

```javascript
// 使用NLP模型进行意图识别
const detectSkillWithML = async (message) => {
  const response = await fetch('/api/ml/intent-detection', {
    method: 'POST',
    body: JSON.stringify({ message })
  });
  
  const { skill, confidence } = await response.json();
  
  // 只有置信度高于阈值才使用ML结果
  if (confidence > 0.8) {
    return skill;
  }
  
  // 否则回退到规则匹配
  return detectSkill(message);
};
```

这样可以更准确地识别用户意图,特别是对于复杂的、隐含的意图。

### 方向二: 多模态技能识别

未来我们计划支持多模态输入:

```javascript
// 支持语音输入
const detectSkillFromVoice = async (audioBlob) => {
  // 1. 语音转文字
  const text = await speechToText(audioBlob);
  
  // 2. 分析语音特征(语气、情绪)
  const emotion = await analyzeEmotion(audioBlob);
  
  // 3. 综合判断技能
  if (emotion === 'anxious' && text.includes('健康')) {
    return '健康监护顾问';
  }
  
  return detectSkill(text);
};

// 支持图片输入
const detectSkillFromImage = async (imageBlob) => {
  // 1. 图片识别
  const objects = await detectObjects(imageBlob);
  
  // 2. 根据识别结果判断技能
  if (objects.includes('food')) {
    return '营养分析师';
  }
  
  return '';
};
```

通过多模态识别,可以更全面地理解用户需求。

### 方向三: 个性化技能推荐

基于用户历史行为,推荐最相关的技能:

```javascript
// 分析用户历史
const analyzeUserHistory = (userId) => {
  const history = getUserChatHistory(userId);
  
  // 统计技能使用频率
  const skillFrequency = {};
  history.forEach(msg => {
    if (msg.skill) {
      skillFrequency[msg.skill] = (skillFrequency[msg.skill] || 0) + 1;
    }
  });
  
  // 返回最常用的技能
  return Object.entries(skillFrequency)
    .sort((a, b) => b[1] - a[1])
    .map(([skill]) => skill);
};

// 个性化技能检测
const detectSkillPersonalized = (message, userId) => {
  const detectedSkill = detectSkill(message);
  
  // 如果没有明确匹配,使用用户最常用的技能
  if (!detectedSkill) {
    const preferredSkills = analyzeUserHistory(userId);
    return preferredSkills[0] || '';
  }
  
  return detectedSkill;
};
```

这样可以提供更加个性化的服务体验。

### 方向四: 技能协作

未来我们计划支持多个技能协作回答:

```javascript
// 检测需要协作的技能
const detectCollaborativeSkills = (message) => {
  const skills = detectSkills(message); // 返回多个技能
  
  if (skills.length > 1) {
    return {
      primary: skills[0],
      secondary: skills.slice(1),
      mode: 'collaborative'
    };
  }
  
  return {
    primary: skills[0],
    mode: 'single'
  };
};

// 协作式AI回答
const callAICollaborative = async (message, skills) => {
  const prompt = `这个问题需要多个专业角色协作回答:
主要角色: ${skills.primary}
辅助角色: ${skills.secondary.join(', ')}

请以主要角色为主导,结合辅助角色的专业知识,给出综合性的回答。`;

  return await callAI({ message, prompt });
};
```

通过技能协作,可以回答更复杂的跨领域问题。

### 方向五: 技能市场

我们计划建立技能市场,让开发者可以发布和分享技能:

```javascript
// 技能包格式
const skillPackage = {
  name: '中医养生顾问',
  version: '1.0.0',
  author: 'developer@example.com',
  keywords: ['中医', '养生', '调理', '体质'],
  prompt: '你是一位专业的中医养生顾问...',
  icon: 'https://example.com/icon.png',
  price: 0, // 免费或付费
};

// 安装技能包
const installSkill = async (packageId) => {
  const pkg = await fetchSkillPackage(packageId);
  
  // 验证和安装
  if (validateSkillPackage(pkg)) {
    skillKeywords[pkg.name] = pkg.keywords;
    skillPrompts[pkg.name] = pkg.prompt;
    
    console.log(`技能"${pkg.name}"安装成功`);
  }
};
```

通过技能市场,可以快速扩展系统能力,形成生态。

## 总结 (30秒)

Agent Skill智能技能识别系统是一个创新的AI交互增强方案。

通过关键词匹配、动态角色切换、优雅的视觉反馈,我们实现了更专业、更精准的AI服务。

系统采用了配置化、模块化的设计,具有良好的扩展性和可维护性。

未来,我们将继续优化算法,引入机器学习,支持多模态交互,打造更智能的AI助手。

谢谢大家!

---

## 附录: 核心代码示例

### 完整的技能检测函数

```javascript
/**
 * Agent Skill 智能技能识别系统
 * 核心检测函数
 */

// 技能关键词配置
const skillKeywords = {
  '营养分析师': [
    '营养分析', '营养报告', '营养评估', '营养够', '营养不良',
    '蛋白质', '脂肪', '碳水', '维生素', '矿物质',
    '热量', '卡路里', '营养缺口', '饮食建议', '营养建议',
    '改善方案', '怎么改善', '如何调整', '膳食结构', '营养均衡'
  ],
  '健康监护顾问': [
    '健康监测', '血压', '血糖', '血脂', '心率', '体温',
    '异常', '不正常', '偏高', '偏低', '症状',
    '风险', '预警', '就医', '看医生', '去医院',
    '健康指标', '体检', '检查结果'
  ],
  '慢病协同管理师': [
    '慢性病', '慢病', '三高', '高血压', '糖尿病', '高血脂',
    '用药', '服药', '吃药', '药物', '遵医嘱',
    '指标控制', '病情', '并发症', '预防', '管理'
  ],
  // ... 其他技能
};

// 技能缓存
const skillCache = new Map();
const MAX_CACHE_SIZE = 100;

/**
 * 检测消息中的技能
 * @param {string} message - 用户消息
 * @returns {string} - 检测到的技能名称,无匹配返回空字符串
 */
export function detectSkill(message) {
  if (!message || typeof message !== 'string') {
    return '';
  }
  
  // 检查缓存
  if (skillCache.has(message)) {
    return skillCache.get(message);
  }
  
  // 清理过大的缓存
  if (skillCache.size > MAX_CACHE_SIZE) {
    skillCache.clear();
  }
  
  let matchedSkill = '';
  let maxKeywordLength = 0;
  
  // 遍历所有技能
  for (const [skill, keywords] of Object.entries(skillKeywords)) {
    // 遍历该技能的所有关键词
    for (const keyword of keywords) {
      // 检查消息是否包含关键词
      if (message.includes(keyword)) {
        // 使用最长关键词优先策略
        if (keyword.length > maxKeywordLength) {
          matchedSkill = skill;
          maxKeywordLength = keyword.length;
        }
      }
    }
  }
  
  // 缓存结果
  skillCache.set(message, matchedSkill);
  
  return matchedSkill;
}

/**
 * 启动技能识别动画
 * @param {string} skill - 技能名称
 */
export function startSkillAnimation(skill) {
  const activeSkill = ref(skill);
  const showSkillIndicator = ref(false);
  const currentSkillText = ref('');
  
  // T+3000ms: 显示"查看技能"
  setTimeout(() => {
    currentSkillText.value = `查看技能 ${activeSkill.value}`;
    showSkillIndicator.value = true;
  }, 3000);
  
  // T+4800ms: 切换到"读取技能"
  setTimeout(() => {
    currentSkillText.value = `读取技能 ${activeSkill.value}`;
  }, 4800);
  
  // T+6400ms: 隐藏动画
  setTimeout(() => {
    showSkillIndicator.value = false;
    setTimeout(() => {
      activeSkill.value = '';
      currentSkillText.value = '';
    }, 600);
  }, 6400);
  
  return {
    activeSkill,
    showSkillIndicator,
    currentSkillText
  };
}
```

### 完整的动画样式

```css
/* Agent Skill 技能识别动画样式 */

/* 外层容器 */
.skill-indicator-container {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 9999;
  pointer-events: none;
  will-change: opacity, filter, transform;
}

/* 技能指示器 */
.skill-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4);
  backdrop-filter: blur(10px);
}

/* 书本图标 */
.skill-book-icon {
  width: 24px;
  height: 24px;
  fill: white;
  flex-shrink: 0;
}

/* 技能文字 */
.skill-indicator-text {
  color: white;
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
  letter-spacing: 0.5px;
}

/* 外层容器的模糊动画 */
.skill-blur-enter-active,
.skill-blur-leave-active {
  transition: opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1),
              filter 0.6s cubic-bezier(0.4, 0, 0.2, 1),
              transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.skill-blur-enter-from {
  opacity: 0;
  filter: blur(10px);
  transform: translate(-50%, calc(-50% + 8px));
}

.skill-blur-leave-to {
  opacity: 0;
  filter: blur(10px);
  transform: translate(-50%, calc(-50% - 8px));
}

/* 内层文字的模糊动画 */
.skill-text-blur-enter-active,
.skill-text-blur-leave-active {
  transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1),
              filter 0.5s cubic-bezier(0.4, 0, 0.2, 1),
              transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.skill-text-blur-enter-from {
  opacity: 0;
  filter: blur(8px);
  transform: translateY(10px);
}

.skill-text-blur-leave-to {
  opacity: 0;
  filter: blur(8px);
  transform: translateY(-10px);
}

/* 移动端适配 */
@media (max-width: 768px) {
  .skill-indicator {
    padding: 12px 20px;
  }
  
  .skill-book-icon {
    width: 20px;
    height: 20px;
  }
  
  .skill-indicator-text {
    font-size: 14px;
  }
}

/* 低端设备优化 */
@media (prefers-reduced-motion: reduce) {
  .skill-blur-enter-active,
  .skill-blur-leave-active,
  .skill-text-blur-enter-active,
  .skill-text-blur-leave-active {
    transition-duration: 0.3s;
  }
  
  .skill-blur-enter-from,
  .skill-blur-leave-to,
  .skill-text-blur-enter-from,
  .skill-text-blur-leave-to {
    filter: none;
  }
}
```

---

**文档版本**: 1.0  
**最后更新**: 2026-01-29  
**总时长**: 约15分钟  
**适用场景**: 技术分享、项目汇报、技术文档
