<template>
  <div class="ai-chat-container">
    <!-- 对话消息区域 -->
    <div class="messages-area" ref="messagesRef">
      <!-- 消息列表 -->
      <div class="messages-list">
        <!-- 特殊的自我介绍消息框（始终显示，不会保存到数据库） -->
        <div class="message-item message-ai welcome-message">
          <div class="message-bubble">
            <div class="message-content markdown-content" v-html="renderMarkdown(welcomeMessage.content)"></div>
            <div class="message-time">{{ formatTime(welcomeMessage.timestamp) }}</div>
            <!-- 快捷提问按钮 -->
            <div class="quick-questions">
              <button
                v-for="(question, idx) in quickQuestions"
                :key="idx"
                class="quick-question-btn"
                @click="handleQuickQuestion(question)"
              >
                {{ question }}
              </button>
            </div>
          </div>
        </div>

        <!-- 普通聊天消息（从数据库加载或新发送的） -->
        <div
          v-for="(msg, index) in messages"
          :key="msg.id || index"
          class="message-item"
          :class="{ 'message-user': msg.role === 'user', 'message-ai': msg.role === 'ai' }"
        >
          <div class="message-bubble">
            <div class="message-content markdown-content" v-html="renderMarkdown(msg.content)"></div>
            <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
          </div>
        </div>

        <!-- Agent Skill 技能调用展示 -->
        <div v-if="skillCallSteps.length > 0" class="skill-call-container">
          <div
            v-for="(step, index) in skillCallSteps"
            :key="`skill-${index}-${step.type}`"
            class="skill-call-item"
          >
            <div class="skill-call-header">
              <span 
                class="skill-call-title" 
                :class="{ 
                  'thinking-shimmer': step.type === 'thinking',
                  'text-transition': step.isTransitioning
                }"
              >{{ step.title }}</span>
              <span 
                v-if="step.skillName" 
                class="skill-call-name"
                :class="{ 
                  'text-transition': step.isTransitioning,
                  'fade-in': step.isFadingIn
                }"
              >{{ step.skillName }}</span>
            </div>
          </div>
        </div>

        <!-- AI 正在输入中（备用，流式输出时不显示） -->
        <div v-if="isLoading && !isStreaming && !isThinking" class="message-item message-ai">
          <div class="message-bubble">
            <div class="message-content typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 胶囊输入框 - 固定在底部栏上方 -->
    <div class="input-wrapper">
      <div class="input-container">
        <!-- 电话按钮胶囊 -->
        <button class="phone-capsule" @click="handlePhoneCall" title="语音通话">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M21 15.46l-5.27-.61-2.52 2.52a15.045 15.045 0 01-6.59-6.59l2.53-2.53L8.54 3H3.03C2.45 13.18 10.82 21.55 21 20.97v-5.51z"
              fill="currentColor"
            />
          </svg>
        </button>
        <!-- 输入框胶囊 -->
        <div class="capsule-input">
          <input
            v-model="inputText"
            type="text"
            placeholder="输入消息..."
            class="input-field"
            :disabled="isLoading || isThinking"
            @keydown.enter.prevent="handleSend"
          />
          <button
            class="send-btn"
            :disabled="!inputText.trim() || isLoading || isThinking"
            @click="handleSend"
          >
            {{ isThinking ? '思考中...' : isLoading ? '发送中...' : '发送' }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- 历史对话列表 -->
  <BottomSheet :open="showHistoryDialog" @close="showHistoryDialog = false">
    <div class="sheet-content">
      <h3>历史对话</h3>
      <div v-if="conversations.length > 0" class="conversations-list">
        <div
          v-for="conv in conversations"
          :key="conv.conversation_id"
          class="conversation-item"
          :class="{ active: conv.conversation_id === conversationId }"
          @click="switchConversation(conv.conversation_id)"
        >
          <div class="conversation-info">
            <div class="conversation-title">{{ conv.title || `对话 ${conv.conversation_id.slice(-8)}` }}</div>
            <div class="conversation-meta">
              <span class="conversation-time">{{ formatConversationTime(conv.last_message_time) }}</span>
              <span class="conversation-count">{{ conv.message_count }}条消息</span>
            </div>
          </div>
          <button
            v-if="conv.conversation_id === conversationId"
            class="conversation-active-indicator"
            title="当前对话"
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
      <p v-else class="muted empty-conversations">暂无历史对话</p>
    </div>
  </BottomSheet>

  <!-- 电话通话界面 -->
  <Teleport to="body">
    <div
      v-if="showPhoneCall || phoneCallAnimating"
      class="phone-call-overlay"
      :class="{ 'phone-call-visible': showPhoneCall, 'phone-call-animating': phoneCallAnimating }"
    >
      <!-- 动画遮罩层 -->
      <div
        ref="phoneCallMask"
        class="phone-call-mask"
        :style="maskStyle"
      ></div>
      
      <!-- 通话界面内容 -->
      <div class="phone-call-content">
        <div class="phone-call-header">
          <button class="phone-close-btn" @click="handleClosePhoneCall">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        
        <div class="phone-call-body">
          <div class="caller-avatar">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
            </svg>
          </div>
          
          <div class="caller-info">
            <h2 class="caller-name">膳食伙伴</h2>
            <p class="call-status" :class="{ 'calling': callStatus === 'calling', 'connected': callStatus === 'connected' }">
              {{ callStatusText }}
            </p>
          </div>
          
          <div class="call-controls">
            <button class="call-control-btn hangup-btn" @click="handleHangup">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M21 15.46l-5.27-.61-2.52 2.52a15.045 15.045 0 01-6.59-6.59l2.53-2.53L8.54 3H3.03C2.45 13.18 10.82 21.55 21 20.97v-5.51z"
                  fill="currentColor"
                  transform="rotate(135 12 12)"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Skill管理器 -->
  <SkillManager v-model="showSkillManager" />
</template>

<script setup>
import { ref, onMounted, nextTick, computed, onUnmounted } from 'vue'
import { marked } from 'marked'
import { sendXiaozhiMessage, getChatMessages, getConversations, createNewConversation, saveWebSocketMessage } from '../../api/ai'
import { useUserStore } from '../../stores/user'
import { showToast } from '../../utils/toast'
import BottomSheet from '../../components/BottomSheet.vue'
import SkillManager from '../../components/SkillManager.vue'
import { getXiaozhiWebSocket, getDeviceConfig, getOtaUrl } from '../../utils/xiaozhi-websocket'

const userStore = useUserStore()

// WebSocket 实例 - 政府端专用
const ws = getXiaozhiWebSocket('gov')
const wsConnected = ref(false)
const wsConnecting = ref(false)

// 政府端专属的 OTA URL
const GOV_OTA_URL = getOtaUrl('gov')

// Skill管理器状态
const showSkillManager = ref(false)

const inputText = ref('')
const messagesRef = ref(null)
const isLoading = ref(false)
const isThinking = ref(false)
const isStreaming = ref(false)
const conversationId = ref('')
const messages = ref([])
// 欢迎消息始终显示，不允许隐藏
const showWelcomeMessage = ref(true)
const showHistoryDialog = ref(false)
const conversations = ref([])

// Agent Skill 技能调用展示相关状态
const activeSkill = ref('')
const skillCallSteps = ref([])
let skillAnimationTimer = null

// Gov端技能关键词映射 - 全面扩充版
const skillKeywords = {
  '社区健康管理师': [
    // 社区管理
    '社区健康', '社区管理', '人群健康', '整体健康', '健康管理', '健康水平', '健康状况',
    '社区居民', '老年人群', '重点人群', '目标人群', '服务对象', '覆盖人群',
    // 数据分析
    '健康数据', '统计', '分析', '评估', '监测', '调查', '摸底',
    '趋势', '变化', '对比', '同比', '环比', '增长', '下降',
    // 风险管理
    '高危人群', '重点人群', '风险人群', '筛查', '识别', '发现',
    '分层管理', '分类管理', '精准管理', '个性化', '差异化',
    // 干预措施
    '干预', '改善', '提升', '优化', '促进', '推动', '落实',
    '措施', '方案', '计划', '项目', '活动', '行动', '工程',
    // 工作规划
    '如何提升', '怎么管理', '管理方案', '工作计划', '实施方案',
    '目标', '指标', '任务', '要求', '标准', '考核', '评价'
  ],
  
  '慢病防控专家': [
    // 慢性病类型
    '慢性病', '慢病', '三高', '高血压', '糖尿病', '高血脂', '心脑血管',
    '冠心病', '脑卒中', '中风', '癌症', '肿瘤', '慢阻肺', '哮喘',
    // 防控策略
    '防控', '预防', '控制', '管理', '干预', '治疗', '康复',
    '防控策略', '防控方案', '防控措施', '防控体系', '防控网络',
    // 筛查发现
    '筛查', '早期发现', '早期诊断', '早期治疗', '早诊早治',
    '体检', '检查', '化验', '测量', '监测', '随访', '追踪',
    // 健康教育
    '健康教育', '宣传', '宣教', '讲座', '培训', '咨询', '指导',
    '知识普及', '科普', '宣传栏', '宣传册', '宣传片', '公众号',
    // 效果评估
    '发病率', '患病率', '控制率', '知晓率', '治疗率', '达标率',
    '并发症', '致残率', '死亡率', '效果', '成效', '改善',
    // 工作推进
    '如何防控', '怎么预防', '防控重点', '工作重点', '难点', '痛点',
    '推进', '落实', '执行', '实施', '开展', '组织', '协调'
  ],
  
  '营养政策顾问': [
    // 政策制定
    '营养政策', '政策', '政策制定', '政策设计', '政策规划', '政策文件',
    '营养改善', '营养干预', '营养项目', '营养计划', '营养工程',
    // 现状分析
    '营养状况', '营养水平', '营养问题', '营养不良', '营养过剩',
    '现状', '问题', '短板', '不足', '差距', '挑战',
    // 方案设计
    '方案', '计划', '规划', '设计', '制定', '编制', '起草',
    '目标', '任务', '措施', '路径', '步骤', '时间表', '路线图',
    // 资源配置
    '资源', '资源配置', '资金', '经费', '预算', '投入', '保障',
    '人力', '物力', '设施', '设备', '场地', '条件',
    // 效果监测
    '监测', '评估', '评价', '考核', '检查', '督导', '验收',
    '效果', '成效', '成果', '产出', '影响', '效益',
    // 持续改进
    '改进', '优化', '完善', '调整', '修订', '更新', '升级',
    '如何制定', '怎么设计', '制定依据', '参考标准', '经验借鉴'
  ],
  
  '健康教育专家': [
    // 教育形式
    '健康教育', '健康宣教', '健康促进', '健康传播', '健康科普',
    '讲座', '培训', '课程', '活动', '义诊', '咨询', '指导',
    // 教育内容
    '健康知识', '保健知识', '养生知识', '疾病预防', '自我保健',
    '内容', '主题', '专题', '课题', '话题', '重点', '要点',
    // 教育材料
    '宣传', '宣传材料', '宣传品', '宣传册', '折页', '海报', '展板',
    '手册', '读本', '指南', '视频', '动画', '图片', '漫画',
    // 教育对象
    '老年人', '居民', '群众', '社区', '家庭', '个人', '目标人群',
    '覆盖', '参与', '受益', '触达', '影响', '辐射',
    // 行为改变
    '行为', '行为改变', '生活方式', '健康行为', '不良行为',
    '知晓率', '知识知晓', '行为形成', '习惯养成', '依从性',
    // 效果评价
    '效果', '效果评价', '满意度', '参与率', '覆盖率', '知晓率',
    '如何开展', '怎么组织', '活动方案', '实施方案', '创新形式'
  ],
  
  '养老服务监管师': [
    // 监管对象
    '服务监管', '质量监管', '机构监管', '养老机构', '养老服务',
    '养老院', '护理院', '日间照料', '居家服务', '社区服务',
    // 监管内容
    '服务质量', '服务标准', '服务规范', '服务要求', '服务流程',
    '人员', '设施', '设备', '环境', '安全', '卫生', '消防',
    // 监管方式
    '检查', '督查', '巡查', '抽查', '暗访', '飞检', '专项检查',
    '评估', '评价', '考核', '打分', '排名', '通报', '公示',
    // 问题处理
    '投诉', '举报', '问题', '隐患', '违规', '违法', '不合格',
    '整改', '处罚', '警告', '罚款', '停业', '吊销', '取缔',
    // 标准制定
    '标准', '规范', '制度', '办法', '细则', '指南', '要求',
    '如何监管', '怎么检查', '监管重点', '监管难点', '监管创新',
    // 质量提升
    '质量提升', '服务改进', '规范管理', '标准化', '专业化',
    '培训', '指导', '帮扶', '示范', '典型', '经验'
  ],
  
  '应急响应协调师': [
    // 应急类型
    '应急', '突发', '紧急', '事件', '事故', '意外', '危机',
    '突发事件', '突发情况', '紧急情况', '意外事件', '安全事故',
    // 应急准备
    '应急预案', '预案', '方案', '流程', '机制', '体系', '网络',
    '准备', '储备', '物资', '装备', '队伍', '人员', '培训', '演练',
    // 应急响应
    '应急响应', '快速响应', '及时响应', '启动', '响应', '处置',
    '报告', '上报', '通报', '预警', '警报', '通知', '调度',
    // 应急处置
    '处置', '处理', '应对', '救援', '救助', '疏散', '转移',
    '现场', '指挥', '协调', '配合', '联动', '支援', '增援',
    // 资源调度
    '资源', '资源调度', '人员调度', '物资调配', '车辆调派',
    '医疗', '救护', '药品', '设备', '床位', '场地',
    // 事后总结
    '总结', '复盘', '分析', '评估', '改进', '完善', '优化',
    '如何应对', '怎么处理', '应急流程', '处置要点', '注意事项'
  ],
  
  '数据分析师': [
    // 数据类型
    '数据', '数据分析', '大数据', '健康数据', '业务数据', '统计数据',
    '指标', '数值', '数字', '信息', '记录', '档案', '台账',
    // 分析方法
    '统计', '统计分析', '数据挖掘', '数据建模', '预测分析',
    '描述性分析', '诊断性分析', '预测性分析', '处方性分析',
    // 分析维度
    '趋势', '趋势分析', '对比', '对比分析', '相关性', '因果关系',
    '维度', '指标', '变量', '因素', '影响', '关联',
    // 可视化
    '可视化', '图表', '报表', '报告', '仪表盘', 'Dashboard',
    '柱状图', '折线图', '饼图', '散点图', '热力图', '地图',
    // 结论建议
    '结论', '发现', '洞察', '规律', '特征', '问题', '风险',
    '建议', '对策', '措施', '方案', '决策', '决策支持',
    // 数据应用
    '如何分析', '怎么解读', '分析方法', '分析工具', '分析模型',
    '应用', '价值', '意义', '作用', '支撑', '依据'
  ],
  
  '资源配置优化师': [
    // 资源类型
    '资源', '资源配置', '资源分配', '资源整合', '资源利用',
    '人力资源', '物力资源', '财力资源', '设施资源', '服务资源',
    // 需求分析
    '需求', '需求分析', '需求评估', '需求预测', '需求变化',
    '供给', '供需', '匹配', '平衡', '缺口', '过剩', '不足',
    // 配置方案
    '配置', '配置方案', '分配方案', '调整方案', '优化方案',
    '规划', '布局', '结构', '比例', '权重', '优先级',
    // 效率效益
    '效率', '效益', '效能', '产出', '成本', '投入产出',
    '利用率', '使用率', '周转率', '满意度', '覆盖率',
    // 优化调整
    '优化', '改进', '提升', '调整', '完善', '精准', '科学',
    '如何配置', '怎么优化', '配置原则', '配置标准', '配置依据',
    // 动态管理
    '动态', '动态调整', '灵活', '弹性', '响应', '适应',
    '监测', '评估', '反馈', '改进', '持续优化'
  ],
  
  '政策法规顾问': [
    // 政策法规
    '政策', '法规', '法律', '条例', '规定', '办法', '细则',
    '文件', '通知', '意见', '方案', '指南', '标准', '规范',
    // 政策解读
    '政策解读', '法规解释', '解读', '解释', '说明', '阐释',
    '理解', '把握', '精神', '要点', '重点', '亮点', '变化',
    // 合规管理
    '合规', '依法', '规范', '要求', '标准', '条件', '资格',
    '合法', '合规性', '规范性', '程序', '流程', '手续',
    // 申请审批
    '申请', '审批', '备案', '登记', '许可', '资质', '证照',
    '材料', '条件', '流程', '时限', '部门', '窗口', '办理',
    // 法律风险
    '风险', '法律风险', '合规风险', '违规', '违法', '责任',
    '处罚', '后果', '影响', '规避', '防范', '应对',
    // 政策应用
    '如何理解', '怎么执行', '执行要点', '注意事项', '常见问题',
    '适用', '适用范围', '适用对象', '适用条件', '例外情况'
  ],
  
  '社区协作促进师': [
    // 协作主体
    '协作', '合作', '联动', '协同', '配合', '衔接', '对接',
    '多方', '各方', '部门', '机构', '组织', '单位', '社会力量',
    // 协作内容
    '资源', '资源整合', '资源共享', '优势互补', '互利共赢',
    '信息', '信息共享', '数据共享', '经验交流', '互学互鉴',
    // 协作机制
    '机制', '机制建设', '制度', '平台', '网络', '体系',
    '联席会议', '工作组', '专班', '联络员', '协调员',
    // 协作模式
    '模式', '路径', '方式', '形式', '载体', '抓手',
    '医养结合', '社区养老', '居家养老', '智慧养老', '互助养老',
    // 问题协调
    '问题', '困难', '障碍', '瓶颈', '矛盾', '分歧',
    '协调', '沟通', '商议', '磋商', '谈判', '调解',
    // 推进落实
    '如何协作', '怎么合作', '协作方案', '合作协议', '备忘录',
    '推进', '推动', '促进', '落实', '实施', '执行',
    // 共赢发展
    '共赢', '多赢', '发展', '提升', '效果', '成效',
    '典型', '示范', '经验', '模式', '推广', '复制'
  ]
}

// 电话通话相关状态
const showPhoneCall = ref(false)
const phoneCallAnimating = ref(false)
const phoneCallMask = ref(null)
const buttonPosition = ref({ x: 0, y: 0 })
const maskScale = ref(0)
const callStatus = ref('calling') // 'calling' | 'connected' | 'ended'
let callStatusTimer = null

// 欢迎消息（特殊的，不会保存到数据库）
const welcomeMessage = computed(() => {
  const userName = userStore.profile?.name || '用户'
  return {
    role: 'ai',
    content: `**${userName}，我是您的 AI管理顾问**
请问我有什么可以帮到您的吗？
我可以为您提供以下服务：
**健康管理** - 社区居民健康数据分析     
**慢病防控** - 慢性病防控策略制定         
**数据分析** - 健康大数据深度挖掘
**政策咨询** - 养老政策法规专业解读`,
    timestamp: Date.now()
  }
})

// 渲染 Markdown
const renderMarkdown = (text) => {
  return marked(text, { breaks: true })
}

// 快捷提问选项
const quickQuestions = ref([
  '社区居民整体健康状况如何？',
  '如何识别高风险居民？',
  '制定社区健康干预计划',
  '分析居民饮食营养趋势'
])

// 格式化时间
const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}

// 加载历史聊天记录
const loadChatHistory = async () => {
  if (!userStore.profile?.id) return

  try {
    // 如果当前没有会话ID，不自动加载，保持欢迎消息状态
    // 用户可以选择从历史对话中选择，或者直接发送消息创建新对话
    if (conversationId.value) {
      // 加载指定对话的聊天记录
      const { messages: historyMessages } = await getChatMessages({ conversationId: conversationId.value })
      
      if (historyMessages && historyMessages.length > 0) {
        // 加载历史消息
        messages.value = historyMessages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp
        }))
        // 欢迎消息始终显示，不隐藏
        scrollToBottom()
      } else {
        messages.value = []
        // 欢迎消息始终显示
      }
    } else {
      // 没有会话ID，保持空消息列表，欢迎消息始终显示
      messages.value = []
    }
  } catch (err) {
    console.error('加载聊天记录失败:', err)
    messages.value = []
    showWelcomeMessage.value = true
  }
}

// 连接 WebSocket
const connectWebSocket = async () => {
  if (wsConnected.value || wsConnecting.value) return
  
  wsConnecting.value = true
  try {
    const deviceConfig = getDeviceConfig()
    
    // 检查是否配置了直接 WebSocket URL
    const directWsUrl = import.meta.env.VITE_CLIENT_WS_URL
    
    if (directWsUrl) {
      // 使用直接 WebSocket 连接
      console.log('使用直接 WebSocket 连接:', directWsUrl)
      await ws.connect(null, deviceConfig, directWsUrl)
    } else {
      // 使用 OTA 方式连接
      console.log('使用 OTA 连接:', GOV_OTA_URL)
      await ws.connect(GOV_OTA_URL, deviceConfig)
    }
    
    wsConnected.value = true
    
    // 注册消息处理器
    ws.onMessage(handleWebSocketMessage)
    
    // 注册连接状态处理器
    ws.onConnectionStateChange((isConnected) => {
      wsConnected.value = isConnected
      if (!isConnected) {
        showToast('连接已断开')
        // 3秒后尝试重连
        setTimeout(() => {
          if (!wsConnected.value) {
            connectWebSocket()
          }
        }, 3000)
      }
    })
    
    console.log('WebSocket 连接成功')
  } catch (error) {
    console.error('连接失败:', error)
    showToast('连接失败，请重试')
  } finally {
    wsConnecting.value = false
  }
}

// 处理 WebSocket 消息
const handleWebSocketMessage = (message) => {
  console.log('收到消息:', message)
  
  if (message.type === 'llm') {
    // AI 回复 - 只处理表情符号
    if (message.text && /^[\u{1F300}-\u{1F9FF}]$/u.test(message.text)) {
      console.log('收到表情:', message.text)
    }
  } else if (message.type === 'stt') {
    // 语音识别结果
    console.log('STT 识别结果:', message.text)
    
    // 只在语音模式下处理 STT 消息（避免文本消息重复）
    if (ws.getVoiceMode() && message.text && message.text.trim()) {
      const userMessage = {
        role: 'user',
        content: message.text,
        timestamp: Date.now()
      }
      messages.value.push(userMessage)
      scrollToBottom()
      
      // 保存用户消息到数据库
      saveMessageToDatabase(userMessage)
    }
    
  } else if (message.type === 'tts') {
    // TTS 状态和文本内容
    if (message.state === 'start') {
      // 开始新的 AI 回复 - 保持思考状态，等待第一个文本片段
      console.log('AI 开始回复')
      
    } else if (message.state === 'sentence_start' && message.text) {
      // 收到文本片段
      // 如果还没有创建消息，现在创建并停止思考
      if (currentAiMessageIndex.value === null) {
        isThinking.value = false
        
        const aiMessage = {
          role: 'ai',
          content: '',
          timestamp: Date.now()
        }
        messages.value.push(aiMessage)
        currentAiMessageIndex.value = messages.value.length - 1
      }
      
      // 添加到待输出队列
      pendingText.value += message.text
      
      // 如果没有正在进行的流式输出，启动它
      if (!streamingTimer.value) {
        startStreaming()
      }
      
    } else if (message.state === 'stop') {
      // TTS 结束，等待流式输出完成后保存
      isTtsComplete.value = true
    }
  }
}

// 当前正在输出的 AI 消息索引
const currentAiMessageIndex = ref(null)
// 待输出的文本
const pendingText = ref('')
// 流式输出定时器
const streamingTimer = ref(null)
// TTS 是否已完成
const isTtsComplete = ref(false)

// 开始流式输出
const startStreaming = () => {
  if (streamingTimer.value) return
  
  streamingTimer.value = setInterval(() => {
    if (currentAiMessageIndex.value === null) {
      stopStreaming()
      return
    }
    
    const message = messages.value[currentAiMessageIndex.value]
    if (!message) {
      stopStreaming()
      return
    }
    
    // 如果还有待输出的文本
    if (pendingText.value.length > 0) {
      // 每次输出一个字符
      message.content += pendingText.value[0]
      pendingText.value = pendingText.value.slice(1)
      scrollToBottom()
    } else if (isTtsComplete.value) {
      // 没有待输出文本且 TTS 已完成，停止流式输出
      stopStreaming()
      
      // 保存完整消息到数据库
      if (message.content) {
        saveMessageToDatabase(message)
      }
      
      // 重置状态
      currentAiMessageIndex.value = null
      isTtsComplete.value = false
    }
  }, 30) // 每 30ms 输出一个字符
}

// 停止流式输出
const stopStreaming = () => {
  if (streamingTimer.value) {
    clearInterval(streamingTimer.value)
    streamingTimer.value = null
  }
  isStreaming.value = false
}

// 保存消息到数据库
const saveMessageToDatabase = async (message) => {
  try {
    // 如果没有会话ID，先创建一个
    if (!conversationId.value) {
      const result = await createNewConversation()
      conversationId.value = result.conversationId
    }
    
    await saveWebSocketMessage({
      conversationId: conversationId.value,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp
    })
    
    console.log('消息已保存到数据库')
  } catch (error) {
    console.error('保存消息失败:', error)
    // 不影响用户体验，静默失败
  }
}

// 流式输出效果
const streamText = (text, messageIndex) => {
  return new Promise((resolve) => {
    isStreaming.value = true
    const fullText = text
    let currentIndex = 0
    const message = messages.value[messageIndex]
    
    const streamInterval = setInterval(() => {
      if (currentIndex < fullText.length) {
        // 逐字添加到消息内容
        message.content = fullText.slice(0, currentIndex + 1)
        currentIndex++
        scrollToBottom()
      } else {
        clearInterval(streamInterval)
        isStreaming.value = false
        // 确保最终内容是完整的
        message.content = fullText
        resolve()
      }
    }, 30) // 每30ms显示一个字符，可以调整速度
  })
}

// 识别用户消息中的技能 - 改进版：基于匹配度评分
const detectSkill = (message) => {
  let bestSkill = ''
  let maxScore = 0
  
  // 遍历所有技能，计算每个技能的匹配分数
  for (const [skill, keywords] of Object.entries(skillKeywords)) {
    let score = 0
    let matchedKeywords = []
    
    // 计算该技能匹配了多少个关键词
    for (const keyword of keywords) {
      if (message.includes(keyword)) {
        score++
        matchedKeywords.push(keyword)
      }
    }
    
    // 如果这个技能的匹配分数更高，更新最佳技能
    if (score > maxScore) {
      maxScore = score
      bestSkill = skill
    }
  }
  
  // 只有匹配分数大于0才返回技能，否则返回空
  return maxScore > 0 ? bestSkill : ''
}

// 启动技能调用展示
const startSkillAnimation = () => {
  skillCallSteps.value = []
  
  if (skillAnimationTimer) {
    clearTimeout(skillAnimationTimer)
  }
  
  // 步骤1: 立即显示"思考中"
  skillCallSteps.value.push({
    type: 'thinking',
    title: '思考中',
    skillName: ''
  })
  scrollToBottom()
  
  // 步骤2: 延迟1秒后显示"阅读 SKILL"（没有右侧文字）
  setTimeout(() => {
    const readStepIndex = skillCallSteps.value.length
    skillCallSteps.value.push({
      type: 'read',
      title: '阅读 SKILL',
      skillName: '', // 先不显示
      isTransitioning: false
    })
    scrollToBottom()
    
    // 步骤2.1: 延迟0.5秒后显示右侧的 ls 命令，带淡入动画
    setTimeout(() => {
      const readStep = skillCallSteps.value[readStepIndex]
      if (readStep) {
        readStep.skillName = 'ls /app/.sshb/skills/'
        readStep.isFadingIn = true
        // 强制Vue更新
        skillCallSteps.value = [...skillCallSteps.value]
        
        // 动画结束后移除 fade-in 类
        setTimeout(() => {
          readStep.isFadingIn = false
          skillCallSteps.value = [...skillCallSteps.value]
        }, 500)
      }
    }, 500)
    
    // 步骤2.5: 再延迟1.5秒后开始过渡动画（0.5 + 1 = 1.5）
    setTimeout(() => {
      const readStep = skillCallSteps.value[readStepIndex]
      if (readStep) {
        readStep.isTransitioning = true
        // 强制Vue更新
        skillCallSteps.value = [...skillCallSteps.value]
        
        // 步骤2.6: 延迟0.25秒后（动画中间点，完全模糊时）更新文字
        setTimeout(() => {
          readStep.title = '读取技能'
          // 从完整技能名提取文件名（去掉" - "后面的部分）
          const skillFileName = activeSkill.value.split(' - ')[0] + '.md'
          readStep.skillName = skillFileName
          // 强制Vue更新
          skillCallSteps.value = [...skillCallSteps.value]
        }, 250)
        
        // 步骤2.7: 延迟0.5秒后（动画结束）停止过渡状态
        setTimeout(() => {
          readStep.isTransitioning = false
          // 强制Vue更新
          skillCallSteps.value = [...skillCallSteps.value]
        }, 500)
      }
    }, 1500)
  }, 1000)
  
  // 步骤3: 延迟4秒后显示"使用技能"（1 + 1.5 + 0.5 + 1 = 4）
  setTimeout(() => {
    skillCallSteps.value.push({
      type: 'use',
      title: '使用技能',
      skillName: activeSkill.value
    })
    scrollToBottom()
  }, 4000)
}

// 停止技能调用展示
const stopSkillAnimation = () => {
  // 更新"思考中"为"思考已完成"
  const thinkingStep = skillCallSteps.value.find(step => step.type === 'thinking')
  if (thinkingStep) {
    thinkingStep.title = '思考已完成'
    thinkingStep.type = 'thinking-done' // 改变类型以停止动画
    scrollToBottom()
  }
  
  activeSkill.value = ''
  if (skillAnimationTimer) {
    clearTimeout(skillAnimationTimer)
    skillAnimationTimer = null
  }
}

// 发送消息
// 发送消息 - 文字聊天使用 dify API
const handleSend = async () => {
  const content = inputText.value.trim()
  if (!content || isLoading.value || isThinking.value) return

  // 添加用户消息到本地
  const userMessage = {
    role: 'user',
    content: content,
    timestamp: Date.now()
  }
  messages.value.push(userMessage)
  inputText.value = ''
  scrollToBottom()

  // 保存用户消息到数据库
  saveMessageToDatabase(userMessage)

  // 识别技能
  const detectedSkill = detectSkill(content)
  if (detectedSkill) {
    activeSkill.value = detectedSkill
    startSkillAnimation()
  }

  // 显示"思考中"状态
  isThinking.value = true
  
  try {
    // 文字聊天使用 dify API
    console.log('使用 dify API 发送文字消息')
    
    // 如果没有会话ID，先创建一个
    if (!conversationId.value) {
      const result = await createNewConversation()
      conversationId.value = result.conversationId
    }
    
    // 通过 dify API 发送消息
    const response = await sendXiaozhiMessage({
      conversationId: conversationId.value,
      message: content
    })
    
    isThinking.value = false
    
    // 停止技能动画
    stopSkillAnimation()
    
    // 添加 AI 回复
    const aiMessage = {
      role: 'ai',
      content: response.reply || '抱歉，我现在无法回答。',
      timestamp: Date.now()
    }
    messages.value.push(aiMessage)
    
    // 保存 AI 回复到数据库
    saveMessageToDatabase(aiMessage)
    
    // 流式输出效果
    const messageIndex = messages.value.length - 1
    await streamText(response.reply || '抱歉，我现在无法回答。', messageIndex)
    
    scrollToBottom()
    
  } catch (err) {
    console.error('发送消息失败:', err)
    isThinking.value = false
    isLoading.value = false
    stopSkillAnimation()
    showToast('发送失败，请稍后重试')
  }
}

// 处理快捷提问
const handleQuickQuestion = (question) => {
  inputText.value = question
  handleSend()
}

// 计算遮罩层样式
const maskStyle = computed(() => {
  if (!buttonPosition.value.x && !buttonPosition.value.y) {
    return {}
  }
  return {
    left: `${buttonPosition.value.x}px`,
    top: `${buttonPosition.value.y}px`,
    transform: `translate(-50%, -50%) scale(${maskScale.value})`
  }
})

// 计算通话状态文本
const callStatusText = computed(() => {
  switch (callStatus.value) {
    case 'calling':
      return '正在接通...'
    case 'connected':
      return '通话中'
    case 'ended':
      return '通话结束'
    default:
      return '通话中'
  }
})

// 处理电话呼叫
const handlePhoneCall = async (event) => {
  // 检查 WebSocket 是否已连接
  if (!wsConnected.value) {
    // 尝试连接 WebSocket
    try {
      await connectWebSocket()
    } catch (error) {
      console.error('WebSocket 连接失败:', error)
    }
    
    // 如果仍然未连接，提示用户
    if (!wsConnected.value) {
      showToast('语音通话功能暂不可用，请使用文字聊天')
      return
    }
  }

  // 启用语音模式
  ws.setVoiceMode(true)

  // 获取按钮位置
  const button = event.currentTarget
  const rect = button.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  
  buttonPosition.value = {
    x: centerX,
    y: centerY
  }

  // 计算需要的最大缩放值（确保覆盖整个屏幕）
  const maxDistance = Math.max(
    Math.sqrt(centerX * centerX + centerY * centerY),
    Math.sqrt((window.innerWidth - centerX) * (window.innerWidth - centerX) + centerY * centerY),
    Math.sqrt(centerX * centerX + (window.innerHeight - centerY) * (window.innerHeight - centerY)),
    Math.sqrt((window.innerWidth - centerX) * (window.innerWidth - centerX) + (window.innerHeight - centerY) * (window.innerHeight - centerY))
  )
  
  const buttonRadius = 24
  const maxScale = Math.ceil(maxDistance / buttonRadius) + 2

  // 重置状态
  maskScale.value = 0
  phoneCallAnimating.value = true
  showPhoneCall.value = false
  callStatus.value = 'calling'
  
  await nextTick()
  
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      maskScale.value = maxScale
      
      setTimeout(async () => {
        showPhoneCall.value = true
        
        // 开始语音会话
        try {
          // 开始录音会话（发送 listen start 消息）
          ws.startAudioSession()
          
          // 启动音频录制器
          const success = await ws.startRecording()
          
          if (success) {
            // 更新状态为已连接
            callStatus.value = 'connected'
          } else {
            throw new Error('启动录音失败')
          }
          
        } catch (error) {
          console.error('启动录音失败:', error)
          showToast('无法访问麦克风')
          handleClosePhoneCall()
        }
      }, 500)
    })
  })
}

// 关闭电话通话
const handleClosePhoneCall = () => {
  // 禁用语音模式
  ws.setVoiceMode(false)
  
  if (callStatusTimer) {
    clearInterval(callStatusTimer)
    callStatusTimer = null
  }
  
  // 先隐藏通话界面内容
  showPhoneCall.value = false
  
  // 然后收缩遮罩层
  setTimeout(() => {
    maskScale.value = 0
    
    // 等待收缩动画完成后清除所有状态
    setTimeout(() => {
      phoneCallAnimating.value = false
      callStatus.value = 'calling'
      buttonPosition.value = { x: 0, y: 0 }
    }, 500) // 等待收缩动画完成（与扩展动画时间相同）
  }, 100)
}

// 挂断电话
const handleHangup = () => {
  // 停止录音
  ws.stopRecording()
  
  // 停止录音会话
  ws.stopAudioSession()
  
  if (callStatusTimer) {
    clearInterval(callStatusTimer)
    callStatusTimer = null
  }
  
  callStatus.value = 'ended'
  
  setTimeout(() => {
    handleClosePhoneCall()
  }, 1000)
}

// 加载历史对话列表
const loadConversations = async () => {
  if (!userStore.profile?.id) return
  
  try {
    const { conversations: convs } = await getConversations({ limit: 50 })
    conversations.value = convs || []
  } catch (err) {
    console.error('加载对话列表失败:', err)
    conversations.value = []
  }
}

// 格式化对话时间
const formatConversationTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) {
    const hours = date.getHours()
    const minutes = date.getMinutes()
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  } else if (days === 1) {
    return '昨天'
  } else if (days < 7) {
    return `${days}天前`
  } else {
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }
}

// 创建新对话
const handleNewConversation = async () => {
  try {
    // 清空当前对话ID，不创建新ID
    // 当用户发送第一条消息时，后端会自动创建新的对话ID
    conversationId.value = ''
    
    // 清空当前消息（保留欢迎消息显示）
    messages.value = []
    
    // 欢迎消息始终显示
    
    // 重新加载对话列表（延迟一下，避免太快）
    setTimeout(async () => {
      await loadConversations()
    }, 500)
    
    // 滚动到底部
    scrollToBottom()
    
    showToast('已开启新对话')
  } catch (err) {
    console.error('创建新对话失败:', err)
    showToast('创建新对话失败，请重试')
  }
}

// 切换对话
const switchConversation = async (convId) => {
  if (convId === conversationId.value) {
    showHistoryDialog.value = false
    return
  }
  
  try {
    conversationId.value = convId
    
    // 加载该对话的消息
    const { messages: historyMessages } = await getChatMessages({ conversationId: convId })
    
    if (historyMessages && historyMessages.length > 0) {
      messages.value = historyMessages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      }))
      // 欢迎消息始终显示，不隐藏
    } else {
      messages.value = []
      // 欢迎消息始终显示
    }
    
    // 关闭历史对话列表
    showHistoryDialog.value = false
    
    // 滚动到底部
    scrollToBottom()
    
    // 重新加载对话列表，确保显示最新的状态
    setTimeout(async () => {
      try {
        await loadConversations()
      } catch (err) {
        console.error('重新加载对话列表失败:', err)
      }
    }, 300)
  } catch (err) {
    console.error('切换对话失败:', err)
    showToast('加载对话失败，请重试')
    // 即使加载失败，也关闭对话框
    showHistoryDialog.value = false
  }
}

// 打开历史对话列表
const openHistoryDialog = async () => {
  await loadConversations()
  showHistoryDialog.value = true
}

// 监听来自Layout的事件
const handleHistoryEvent = () => {
  openHistoryDialog()
}

const handleNewChatEvent = () => {
  handleNewConversation()
}

const handleSkillsEvent = () => {
  showSkillManager.value = true
}

// 组件卸载时清理
onUnmounted(() => {
  // 停止流式输出
  stopStreaming()
  
  // 停止技能动画
  stopSkillAnimation()
  
  // 停止录音
  ws.stopRecording()
  
  // 断开 WebSocket
  ws.disconnect()
  
  if (callStatusTimer) {
    clearInterval(callStatusTimer)
  }
  // 移除事件监听器
  window.removeEventListener('ai-open-history', handleHistoryEvent)
  window.removeEventListener('ai-new-chat', handleNewChatEvent)
  window.removeEventListener('ai-open-skills', handleSkillsEvent)
})

onMounted(async () => {
  // 加载历史对话列表
  try {
    await loadConversations()
  } catch (error) {
    console.error('加载对话列表失败:', error)
  }
  
  // 加载历史聊天记录
  try {
    await loadChatHistory()
  } catch (error) {
    console.error('加载聊天记录失败:', error)
  }
  
  // 连接 WebSocket
  await connectWebSocket()
  
  // 监听来自Layout的事件
  window.addEventListener('ai-open-history', handleHistoryEvent)
  window.addEventListener('ai-new-chat', handleNewChatEvent)
  window.addEventListener('ai-open-skills', handleSkillsEvent)
  
  scrollToBottom()
})
</script>

<style scoped>
/* 覆盖 .page 的默认 padding，实现无容器布局 */
.ai-chat-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  /* 覆盖 .page 的默认 padding */
  margin: 0 !important;
  max-width: none !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
  /* 顶部留出 AppHeader 的空间 (sticky, 约 72px) */
  padding-top: 72px;
  z-index: 1;
  overflow: hidden;
}

/* 对话消息区域 - 可滚动 */
.messages-area {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px 14px;
  /* 添加足够的底部 padding，让消息可以滚动到输入框上方，不被遮挡 */
  /* 输入框位置：底部栏(84px) + 输入框高度(72px) + 额外空间(24px) + safe-bottom */
  padding-bottom: calc(84px + 72px + 24px + var(--safe-bottom, 0px));
  /* 使用 flex 布局自动适应高度 */
  min-height: 0;
  /* 确保可以滚动 */
  overscroll-behavior: contain;
  /* 自定义滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}

.messages-area::-webkit-scrollbar {
  width: 6px;
}

.messages-area::-webkit-scrollbar-track {
  background: transparent;
}

.messages-area::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}

.messages-area::-webkit-scrollbar-thumb:hover {
  background: var(--muted);
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  /* 移除 min-height，让内容自然流动 */
}

/* 消息项 */
.message-item {
  display: flex;
  width: 100%;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 用户消息 - 右侧 */
.message-user {
  justify-content: flex-end;
}

.message-user .message-bubble {
  max-width: 75%;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  color: #fff;
  border-bottom-right-radius: 4px;
  align-items: flex-end;
}

.message-user .message-time {
  color: rgba(255, 255, 255, 0.85);
  opacity: 0.9;
}

/* AI消息 - 左侧 */
.message-ai {
  justify-content: flex-start;
}

.message-ai .message-bubble {
  max-width: 75%;
  background: var(--card);
  border: 1px solid var(--border);
  color: var(--text);
  border-bottom-left-radius: 4px;
  align-items: flex-start;
}

.message-ai .message-time {
  color: var(--muted);
  opacity: 0.8;
}

/* 消息气泡 */
.message-bubble {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 8px 10px;
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  word-wrap: break-word;
  word-break: break-word;
  line-height: 1.6;
}

/* 欢迎消息特殊样式 */
.welcome-message {
  margin-top: 4px;
}

.welcome-message .message-bubble {
  position: relative;
}

/* 快捷提问按钮区域 */
.quick-questions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--border);
}

.quick-question-btn {
  padding: 7px 10px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  border-radius: 8px;
  font-size: calc(var(--fs-body) * var(--font-scale) * 0.95);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  line-height: 1.4;
}

.quick-question-btn:hover {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
  transform: translateX(2px);
}

.quick-question-btn:active {
  transform: translateX(0);
  opacity: 0.9;
}

.message-content {
  font-size: calc(var(--fs-body) * var(--font-scale));
  line-height: 1.6;
  white-space: pre-wrap;
}

/* Markdown 内容样式 */
.markdown-content {
  white-space: normal;
}

.markdown-content :deep(p) {
  margin: 0.5em 0;
}

.markdown-content :deep(p:first-child) {
  margin-top: 0;
}

.markdown-content :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-content :deep(strong) {
  font-weight: 600;
  color: inherit;
}

.markdown-content :deep(em) {
  font-style: italic;
}

.markdown-content :deep(code) {
  background: rgba(0, 0, 0, 0.05);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

.markdown-content :deep(pre) {
  background: rgba(0, 0, 0, 0.05);
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 0.5em 0;
}

.markdown-content :deep(pre code) {
  background: none;
  padding: 0;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 0.5em 0;
  padding-left: 1.5em;
}

.markdown-content :deep(li) {
  margin: 0.25em 0;
}

.markdown-content :deep(a) {
  color: var(--accent);
  text-decoration: underline;
}

.markdown-content :deep(blockquote) {
  border-left: 3px solid var(--border);
  padding-left: 1em;
  margin: 0.5em 0;
  color: var(--muted);
}

/* 用户消息中的 Markdown 样式（白色背景） */
.message-user .markdown-content :deep(strong) {
  color: #fff;
}

.message-user .markdown-content :deep(code) {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.message-user .markdown-content :deep(pre) {
  background: rgba(255, 255, 255, 0.15);
}

.message-user .markdown-content :deep(a) {
  color: #fff;
  text-decoration: underline;
}

/* 流式输出光标 */
.streaming-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: var(--accent);
  margin-left: 2px;
  animation: cursorBlink 1s infinite;
  vertical-align: baseline;
}

@keyframes cursorBlink {
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0;
  }
}

.message-time {
  font-size: 11px;
  opacity: 0.7;
  align-self: flex-end;
  margin-top: 2px;
}

/* 打字指示器 */
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 4px 0;
}

.typing-indicator span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--muted);
  animation: typing 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%,
  60%,
  100% {
    opacity: 0.3;
    transform: translateY(0);
  }
  30% {
    opacity: 1;
    transform: translateY(-4px);
  }
}

/* 思考中指示器 */
.thinking-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.thinking-text {
  font-size: calc(var(--fs-body) * var(--font-scale));
  color: var(--muted);
  font-style: italic;
}

.thinking-dots {
  display: flex;
  gap: 4px;
}

.thinking-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  animation: thinking 1.4s infinite ease-in-out;
  opacity: 0.6;
}

.thinking-dots span:nth-child(1) {
  animation-delay: 0s;
}

.thinking-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.thinking-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes thinking {
  0%,
  60%,
  100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  30% {
    opacity: 1;
    transform: scale(1.2);
  }
}

/* 输入框包装器 - 固定在底部栏上方，完全透明，无背景图层，悬浮显示 */
.input-wrapper {
  position: fixed;
  left: 0;
  right: 0;
  /* 底部栏高度：56px (tab高度) + 14px*2 (padding) + safe-bottom = 84px + safe-bottom */
  bottom: calc(84px + var(--safe-bottom, 0px));
  padding: 12px 14px;
  /* 完全透明，无背景 */
  background: transparent !important;
  /* 添加半透明背景，让输入框更明显（可选，如果不需要可以删除） */
  /* backdrop-filter: blur(8px); */
  z-index: 100;
  pointer-events: none;
}

/* 输入容器 - 包含电话按钮和输入框，无背景 */
.input-container {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 960px;
  margin: 0 auto;
  background: transparent !important;
  pointer-events: auto;
}

/* 电话按钮胶囊 - 悬浮样式 */
.phone-capsule {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  min-width: 48px;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--accent);
  cursor: pointer;
  border-radius: 999px;
  transition: background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  flex-shrink: 0;
  padding: 0;
  /* 添加阴影，让胶囊悬浮更明显 */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.phone-capsule:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--accent);
}

.phone-capsule:active {
  opacity: 0.8;
}

.phone-capsule svg {
  width: 22px;
  height: 22px;
}

/* 胶囊输入框 - 悬浮样式 */
.capsule-input {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 8px 8px 8px 16px;
  /* 无阴影效果 */
  box-shadow: none;
  flex: 1;
  height: 48px;
  min-height: 48px;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.input-field {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: calc(var(--fs-body) * var(--font-scale));
  color: var(--text);
  line-height: 1.5;
  padding: 0;
  height: 32px;
  min-height: 32px;
}

.input-field::placeholder {
  color: var(--muted);
  opacity: 0.8;
}

.input-field:-webkit-autofill,
.input-field:-webkit-autofill:hover,
.input-field:-webkit-autofill:focus {
  -webkit-text-fill-color: var(--text);
  -webkit-box-shadow: 0 0 0px 1000px transparent inset;
  transition: background-color 5000s ease-in-out 0s;
}

.send-btn {
  min-width: 60px;
  height: 36px;
  padding: 0 16px;
  border: none;
  border-radius: 999px;
  background: linear-gradient(120deg, var(--accent), var(--accent-strong));
  color: #fff;
  font-size: calc(var(--fs-body) * var(--font-scale));
  font-weight: var(--fw-medium);
  cursor: pointer;
  transition: background-color 0.2s ease, opacity 0.2s ease;
  flex-shrink: 0;
  box-shadow: none;
}

.send-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 移动端适配 */
@media (max-width: 767px) {
  .ai-chat-container {
    padding-top: 72px;
  }

  .messages-area {
    padding: 20px 14px;
    padding-bottom: calc(84px + 72px + 24px + var(--safe-bottom, 0px));
    min-height: 0;
  }

  .input-wrapper {
    padding: 12px 14px;
  }

  .message-user .message-bubble,
  .message-ai .message-bubble {
    max-width: 85%;
  }

  .message-bubble {
    padding: 10px 12px;
    font-size: 15px;
  }
}

/* 平板及以上适配 */
@media (min-width: 768px) {
  .ai-chat-container {
    padding-top: 80px;
  }

  .messages-area {
    padding-bottom: calc(84px + 72px + 24px + var(--safe-bottom, 0px));
    min-height: 0;
  }
}
/* 历史对话列表样式 */
.sheet-content {
  padding: 0 16px 16px;
}

.sheet-content h3 {
  margin: 0 0 16px;
  font-size: calc(var(--fs-title) * var(--font-scale));
  font-weight: var(--fw-semibold);
}

.conversations-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.conversation-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--card);
  cursor: pointer;
  transition: all 0.2s ease;
}

.conversation-item:hover {
  background: var(--ghost-bg);
  border-color: var(--accent);
}

.conversation-item.active {
  background: var(--ghost-bg);
  border-color: var(--accent);
}

.conversation-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.conversation-title {
  font-size: calc(var(--fs-body) * var(--font-scale));
  font-weight: var(--fw-medium);
  color: var(--text);
}

.conversation-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--muted);
}

.conversation-time {
  flex-shrink: 0;
}

.conversation-count {
  flex-shrink: 0;
}

.conversation-active-indicator {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: var(--accent);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0;
  cursor: default;
}

.conversation-active-indicator svg {
  width: 14px;
  height: 14px;
}

.empty-conversations {
  text-align: center;
  padding: 40px 20px;
  color: var(--muted);
}

/* Agent Skill 技能调用展示 */
.skill-call-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 12px 0;
  animation: fadeIn 0.3s ease;
}

.skill-call-item {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px 14px;
  transition: all 0.2s ease;
  min-height: 44px;
}

.skill-call-item:hover {
  background: var(--bg);
}

.skill-call-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.skill-call-title {
  font-size: calc(var(--fs-body) * var(--font-scale) * 0.9);
  color: var(--text);
  font-weight: 500;
  transition: filter 0.5s ease, opacity 0.5s ease;
}

/* 文本过渡动画 - 模糊渐变效果 */
.text-transition {
  animation: textBlurTransition 0.5s ease-in-out;
}

@keyframes textBlurTransition {
  0% {
    filter: blur(0px);
    opacity: 1;
  }
  50% {
    filter: blur(3px);
    opacity: 0.5;
  }
  100% {
    filter: blur(0px);
    opacity: 1;
  }
}

/* 思考中光束扫过动画 */
.thinking-shimmer {
  position: relative;
  background: linear-gradient(
    90deg,
    var(--text) 0%,
    var(--text) 40%,
    rgba(255, 255, 255, 0.9) 50%,
    var(--text) 60%,
    var(--text) 100%
  );
  background-size: 200% 100%;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shimmer 2s infinite linear;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.skill-call-name {
  font-size: calc(var(--fs-body) * var(--font-scale) * 0.85);
  color: var(--muted);
  margin-left: auto;
  transition: filter 0.5s ease, opacity 0.5s ease;
}

/* 文本淡入动画 */
.skill-call-name.fade-in {
  animation: fadeIn 0.5s ease-in-out;
}

@keyframes fadeIn {
  0% {
    opacity: 0;
    transform: translateX(-10px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

</style>

<style>
/* 暗黑模式适配 - 使用全局样式确保正确应用 */
[data-theme='dark'] .input-wrapper {
  background: transparent !important;
}

[data-theme='light'] .input-wrapper {
  background: transparent !important;
}

[data-theme='dark'] .input-container {
  background: transparent !important;
}

[data-theme='light'] .input-container {
  background: transparent !important;
}

[data-theme='dark'] .phone-capsule {
  background: var(--card) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
}

[data-theme='dark'] .phone-capsule:hover {
  background: rgba(255, 255, 255, 0.08) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
}

[data-theme='light'] .phone-capsule {
  background: var(--card) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
}

[data-theme='light'] .phone-capsule:hover {
  background: rgba(255, 255, 255, 0.95) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}

[data-theme='dark'] .capsule-input {
  background: var(--card) !important;
  border-color: var(--border) !important;
  box-shadow: none !important;
}

[data-theme='dark'] .capsule-input:hover {
  background: rgba(255, 255, 255, 0.08) !important;
  border-color: rgba(34, 197, 94, 0.3) !important;
  box-shadow: none !important;
}

[data-theme='dark'] .capsule-input:focus-within {
  background: rgba(255, 255, 255, 0.1) !important;
  border-color: rgba(34, 197, 94, 0.5) !important;
  box-shadow: none !important;
}

[data-theme='light'] .capsule-input {
  background: var(--card) !important;
  box-shadow: none !important;
}

[data-theme='light'] .capsule-input:hover {
  background: rgba(255, 255, 255, 0.95) !important;
  border-color: rgba(31, 156, 122, 0.3) !important;
  box-shadow: none !important;
}

[data-theme='light'] .capsule-input:focus-within {
  background: rgba(255, 255, 255, 1) !important;
  border-color: rgba(31, 156, 122, 0.5) !important;
  box-shadow: none !important;
}

[data-theme='dark'] .input-field {
  color: var(--text) !important;
}

[data-theme='dark'] .input-field::placeholder {
  color: #9ca3af !important;
  opacity: 0.8;
}

/* 浅色模式 placeholder */
[data-theme='light'] .input-field::placeholder {
  color: #6b7280 !important;
  opacity: 0.8;
}

[data-theme='dark'] .input-field:-webkit-autofill,
[data-theme='dark'] .input-field:-webkit-autofill:hover,
[data-theme='dark'] .input-field:-webkit-autofill:focus {
  -webkit-text-fill-color: var(--text) !important;
  -webkit-box-shadow: 0 0 0px 1000px var(--card) inset !important;
}

[data-theme='dark'] .send-btn {
  background: linear-gradient(120deg, var(--accent), var(--accent-strong)) !important;
  color: #fff !important;
}

[data-theme='dark'] .send-btn:hover:not(:disabled) {
  opacity: 0.9 !important;
  box-shadow: none !important;
}

[data-theme='dark'] .messages-area::-webkit-scrollbar-thumb {
  background: var(--border) !important;
}

[data-theme='dark'] .messages-area::-webkit-scrollbar-thumb:hover {
  background: var(--muted) !important;
}

/* 浅色模式增强 */

/* 暗黑模式消息气泡样式 */
[data-theme='dark'] .message-ai .message-bubble {
  background: var(--card) !important;
  border-color: var(--border) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
  color: var(--text) !important;
}

[data-theme='dark'] .message-ai .message-time {
  color: var(--muted) !important;
}

[data-theme='dark'] .message-user .message-bubble {
  background: linear-gradient(135deg, var(--accent), var(--accent-strong)) !important;
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3) !important;
}

[data-theme='dark'] .typing-indicator span {
  background: var(--muted) !important;
}

/* 暗黑模式思考中指示器样式 */
[data-theme='dark'] .thinking-text {
  color: var(--muted) !important;
}

[data-theme='dark'] .thinking-dots span {
  background: var(--accent) !important;
}

/* 暗黑模式流式输出光标样式 */
[data-theme='dark'] .streaming-cursor {
  background: var(--accent) !important;
}

/* 暗黑模式快捷提问按钮样式 */
[data-theme='dark'] .quick-questions {
  border-top-color: var(--border) !important;
}

[data-theme='dark'] .quick-question-btn {
  background: var(--bg) !important;
  border-color: var(--border) !important;
  color: var(--text) !important;
}

[data-theme='dark'] .quick-question-btn:hover {
  background: var(--accent) !important;
  color: #fff !important;
  border-color: var(--accent) !important;
}

[data-theme='light'] .quick-question-btn {
  background: rgba(255, 255, 255, 0.6) !important;
}

[data-theme='light'] .quick-question-btn:hover {
  background: var(--accent) !important;
  color: #fff !important;
}

/* 暗黑模式电话按钮胶囊样式 */

/* 电话通话界面样式 */
.phone-call-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  overflow: hidden;
  pointer-events: none;
}

.phone-call-overlay.phone-call-animating {
  pointer-events: auto;
}

.phone-call-overlay.phone-call-visible {
  pointer-events: auto;
}

/* 遮罩层动画 */
.phone-call-mask {
  position: absolute;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--accent);
  pointer-events: none;
  z-index: 1;
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), 
              background-color 0.3s ease 0.3s;
}

.phone-call-overlay.phone-call-visible .phone-call-mask {
  background: var(--bg);
}

/* 通话界面内容 */
.phone-call-content {
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  opacity: 0;
  transition: opacity 0.3s ease 0.2s;
}

.phone-call-overlay.phone-call-visible .phone-call-content {
  opacity: 1;
}

/* 通话界面头部 */
.phone-call-header {
  padding: 20px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.phone-close-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
}

.phone-close-btn:hover {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

.phone-close-btn svg {
  width: 20px;
  height: 20px;
}

/* 通话界面主体 */
.phone-call-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 40px;
}

/* 头像 */
.caller-avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: var(--card);
  border: 2px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  animation: pulse 2s ease-in-out infinite;
}

.caller-avatar svg {
  width: 60px;
  height: 60px;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(var(--accent-rgb, 34, 197, 94), 0.4);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 0 20px rgba(var(--accent-rgb, 34, 197, 94), 0);
  }
}

/* 通话信息 */
.caller-info {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.caller-name {
  font-size: 28px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.call-status {
  font-size: 16px;
  color: var(--muted);
  margin: 0;
  position: relative;
  padding-left: 20px;
}

.call-status::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--muted);
  animation: blink 1.5s ease-in-out infinite;
}

.call-status.calling::before {
  background: var(--accent);
}

.call-status.connected::before {
  background: #22c55e;
  animation: none;
}

@keyframes blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

/* 通话控制按钮 */
.call-controls {
  display: flex;
  gap: 24px;
  align-items: center;
  margin-top: 20px;
}

.call-control-btn {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
  background: var(--card);
  border: 1px solid var(--border);
  color: var(--text);
}

.call-control-btn:hover {
  transform: scale(1.1);
}

.call-control-btn svg {
  width: 24px;
  height: 24px;
}

.mute-btn.active,
.speaker-btn.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

.hangup-btn {
  width: 64px;
  height: 64px;
  background: #ef4444;
  color: #fff;
  border-color: #ef4444;
}

.hangup-btn:hover {
  background: #dc2626;
  border-color: #dc2626;
}

.hangup-btn svg {
  width: 28px;
  height: 28px;
}

/* 移动端适配 */
@media (max-width: 767px) {
  .caller-avatar {
    width: 100px;
    height: 100px;
  }

  .caller-avatar svg {
    width: 50px;
    height: 50px;
  }

  .caller-name {
    font-size: 24px;
  }

  .call-controls {
    gap: 20px;
  }

  .call-control-btn {
    width: 52px;
    height: 52px;
  }

  .hangup-btn {
    width: 60px;
    height: 60px;
  }
}

</style>