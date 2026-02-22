<template>
  <el-drawer
    v-model="visible"
    title="AI 技能管理"
    :size="isMobile ? '100%' : '600px'"
    direction="rtl"
    @close="handleClose"
  >
    <div class="skill-manager">
      <!-- 技能列表 -->
      <div class="skill-list">
        <div class="list-header">
          <h3>我的技能</h3>
          <el-button
            type="primary"
            size="small"
            @click="showCreateDialog"
          >
            <el-icon><Plus /></el-icon>
            创建技能
          </el-button>
        </div>

        <el-scrollbar height="calc(100vh - 200px)">
          <div v-if="loading" class="loading-container">
            <el-skeleton :rows="5" animated />
          </div>

          <div v-else-if="skills.length === 0" class="empty-container">
            <el-empty description="暂无技能" />
          </div>

          <div v-else class="skills-grid">
            <div
              v-for="skill in skills"
              :key="skill.id"
              class="skill-card"
              :class="{ 'system-skill': skill.isSystem }"
            >
              <div class="skill-header">
                <div class="skill-title">
                  <el-icon v-if="skill.isSystem" class="system-icon">
                    <Star />
                  </el-icon>
                  {{ skill.name }}
                </div>
                <el-tag v-if="skill.isSystem" size="small" type="info">
                  系统
                </el-tag>
                <el-tag v-else size="small" type="success">
                  自定义
                </el-tag>
              </div>

              <div class="skill-actions">
                <el-button
                  size="small"
                  @click="viewSkill(skill)"
                >
                  查看
                </el-button>
                <el-button
                  v-if="!skill.isSystem"
                  size="small"
                  @click="editSkill(skill)"
                >
                  编辑
                </el-button>
                <el-button
                  v-if="!skill.isSystem"
                  size="small"
                  type="danger"
                  @click="confirmDelete(skill)"
                >
                  删除
                </el-button>
              </div>
            </div>
          </div>
        </el-scrollbar>
      </div>
    </div>

    <!-- 创建/编辑技能对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '创建技能' : dialogMode === 'edit' ? '编辑技能' : '查看技能'"
      :width="isMobile ? '95%' : '800px'"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item
          v-if="dialogMode === 'create'"
          label="技能名称"
          prop="name"
        >
          <el-input
            v-model="formData.name"
            placeholder="请输入技能名称"
            :disabled="dialogMode === 'view'"
          />
        </el-form-item>

        <el-form-item label="技能内容" prop="content">
          <el-input
            v-model="formData.content"
            type="textarea"
            :rows="15"
            placeholder="请输入技能提示词内容（支持Markdown格式）"
            :disabled="dialogMode === 'view'"
          />
          <div class="form-tip">
            提示：技能文件应包含"角色定位"、"分析要求/任务要求"等部分，可使用 {variableName} 格式的变量
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <div v-if="dialogMode !== 'view'">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            :loading="submitting"
            @click="handleSubmit"
          >
            {{ dialogMode === 'create' ? '创建' : '保存' }}
          </el-button>
        </div>
        <div v-else>
          <el-button @click="dialogVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </el-drawer>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Star } from '@element-plus/icons-vue';
import { getSkillsList, getSkillDetail, createSkill, updateSkill, deleteSkill } from '@/api/skills';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue']);

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const isMobile = computed(() => window.innerWidth < 768);

const loading = ref(false);
const skills = ref([]);
const dialogVisible = ref(false);
const dialogMode = ref('create'); // 'create' | 'edit' | 'view'
const submitting = ref(false);
const currentSkill = ref(null);

const formRef = ref(null);
const formData = ref({
  name: '',
  content: ''
});

const formRules = {
  name: [
    { required: true, message: '请输入技能名称', trigger: 'blur' }
  ],
  content: [
    { required: true, message: '请输入技能内容', trigger: 'blur' }
  ]
};

// 加载技能列表
const loadSkills = async () => {
  loading.value = true;
  try {
    console.log('[SkillManager] 开始加载技能列表...');
    const res = await getSkillsList();
    console.log('[SkillManager] API响应:', res);
    if (res.code === 0) {
      skills.value = res.data.skills;
      console.log('[SkillManager] 加载到的技能:', skills.value);
    } else {
      console.error('[SkillManager] API返回错误:', res);
      ElMessage.error(res.message || '加载技能列表失败');
    }
  } catch (error) {
    console.error('[SkillManager] 加载技能列表失败:', error);
    console.error('[SkillManager] 错误详情:', error.response || error);
    ElMessage.error('加载技能列表失败: ' + (error.message || '未知错误'));
  } finally {
    loading.value = false;
  }
};

// 显示创建对话框
const showCreateDialog = () => {
  console.log('[SkillManager] 打开创建对话框');
  dialogMode.value = 'create';
  currentSkill.value = null;
  formData.value = {
    name: '',
    content: `# 技能名称

## 角色定位
描述AI的角色和职责

## 任务要求
具体的任务描述和输入数据格式

## 输出内容
期望的输出内容和格式

## 语气要求
对AI回复语气的要求`
  };
  console.log('[SkillManager] 初始化 formData:', formData.value);
  dialogVisible.value = true;
};

// 查看技能
const viewSkill = async (skill) => {
  try {
    console.log('[SkillManager] 查看技能:', skill);
    const res = await getSkillDetail(skill.id);
    console.log('[SkillManager] 技能详情响应:', res);
    if (res.code === 0) {
      dialogMode.value = 'view';
      currentSkill.value = skill;
      formData.value = {
        name: res.data.name,
        content: res.data.content
      };
      dialogVisible.value = true;
    } else {
      console.error('[SkillManager] API返回错误:', res);
      ElMessage.error(res.message || '加载技能详情失败');
    }
  } catch (error) {
    console.error('[SkillManager] 加载技能详情失败:', error);
    console.error('[SkillManager] 错误详情:', error.response || error);
    ElMessage.error('加载技能详情失败: ' + (error.message || '未知错误'));
  }
};

// 编辑技能
const editSkill = async (skill) => {
  try {
    console.log('[SkillManager] 编辑技能:', skill);
    const res = await getSkillDetail(skill.id);
    console.log('[SkillManager] 获取技能详情响应:', res);
    if (res.code === 0) {
      dialogMode.value = 'edit';
      currentSkill.value = skill;
      formData.value = {
        name: res.data.name,
        content: res.data.content
      };
      dialogVisible.value = true;
    } else {
      console.error('[SkillManager] API返回错误:', res);
      ElMessage.error(res.message || '加载技能详情失败');
    }
  } catch (error) {
    console.error('[SkillManager] 加载技能详情失败:', error);
    ElMessage.error('加载技能详情失败');
  }
};

// 确认删除
const confirmDelete = (skill) => {
  ElMessageBox.confirm(
    `确定要删除技能"${skill.name}"吗？`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    handleDelete(skill);
  }).catch(() => {
    // 取消删除
  });
};

// 删除技能
const handleDelete = async (skill) => {
  try {
    console.log('[SkillManager] 删除技能:', skill);
    const res = await deleteSkill(skill.id);
    console.log('[SkillManager] 删除技能响应:', res);
    if (res.code === 0) {
      ElMessage.success('删除成功');
      console.log('[SkillManager] 重新加载技能列表');
      await loadSkills();
    } else {
      console.error('[SkillManager] 删除失败, 响应码:', res.code, '消息:', res.message);
      ElMessage.error(res.message || '删除技能失败');
    }
  } catch (error) {
    console.error('[SkillManager] 删除技能失败:', error);
    console.error('[SkillManager] 错误详情:', error.response?.data);
    const errorMsg = error.response?.data?.message || '删除技能失败';
    ElMessage.error(errorMsg);
  }
};

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid) => {
    if (!valid) return;

    submitting.value = true;
    try {
      if (dialogMode.value === 'create') {
        console.log('[SkillManager] 准备创建技能, formData:', formData.value);
        const res = await createSkill(formData.value);
        console.log('[SkillManager] 创建技能响应:', res);
        if (res.code === 0) {
          ElMessage.success('创建成功');
          dialogVisible.value = false;
          await loadSkills();
        } else {
          console.error('[SkillManager] 创建失败, 响应码:', res.code, '消息:', res.message);
          ElMessage.error(res.message || '创建失败');
        }
      } else if (dialogMode.value === 'edit') {
        console.log('[SkillManager] 准备更新技能, skillId:', currentSkill.value.id, 'content长度:', formData.value.content.length);
        const res = await updateSkill(currentSkill.value.id, {
          content: formData.value.content
        });
        console.log('[SkillManager] 更新技能响应:', res);
        if (res.code === 0) {
          ElMessage.success('保存成功');
          dialogVisible.value = false;
          await loadSkills();
        } else {
          console.error('[SkillManager] 更新失败, 响应码:', res.code, '消息:', res.message);
          ElMessage.error(res.message || '保存失败');
        }
      }
    } catch (error) {
      console.error('[SkillManager] 操作失败:', error);
      console.error('[SkillManager] 错误详情:', error.response?.data);
      const errorMsg = error.response?.data?.message || (dialogMode.value === 'create' ? '创建失败' : '保存失败');
      ElMessage.error(errorMsg);
    } finally {
      submitting.value = false;
    }
  });
};

// 关闭抽屉
const handleClose = () => {
  visible.value = false;
};

onMounted(() => {
  if (visible.value) {
    loadSkills();
  }
});

// 监听visible变化
watch(() => visible.value, (val) => {
  if (val) {
    loadSkills();
  }
});
</script>

<style scoped>
.skill-manager {
  padding: 0 20px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.list-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.loading-container,
.empty-container {
  padding: 40px 0;
}

.skills-grid {
  display: grid;
  gap: 16px;
}

.skill-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.3s;
}

.skill-card:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.skill-card.system-skill {
  background: linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%);
}

.skill-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.skill-title {
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.skill-title .system-icon {
  color: #f59e0b;
}

.skill-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.form-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}

@media (max-width: 768px) {
  .skill-manager {
    padding: 0 12px;
  }

  .skill-card {
    padding: 12px;
  }

  .skill-actions {
    flex-wrap: wrap;
  }

  .skill-actions .el-button {
    flex: 1;
    min-width: 60px;
  }
}
</style>
