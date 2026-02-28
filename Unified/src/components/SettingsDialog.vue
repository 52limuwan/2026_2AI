<template>
  <el-drawer
    v-model="visible"
    title="设置"
    :size="isMobile ? '100%' : '500px'"
    direction="rtl"
    @close="handleClose"
  >
    <div class="settings-container">
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="120px"
        label-position="left"
      >
        <!-- 设备配置 -->
        <div class="form-section">
          <div class="section-title">设备配置</div>
          
          <el-form-item label="设备 MAC" prop="device_mac">
            <el-input
              v-model="formData.device_mac"
              placeholder="请输入设备 MAC 地址"
              clearable
            />
            <div class="form-tip">
              设备的唯一标识符，例如：AA:BB:CC:DD:EE:FF
            </div>
          </el-form-item>

          <el-form-item label="设备 ID" prop="device_id">
            <el-input
              v-model="formData.device_id"
              placeholder="请输入设备 ID"
              clearable
            />
            <div class="form-tip">
              客户端 ID，例如：web_client_001
            </div>
          </el-form-item>

          <el-form-item label="设备名称" prop="device_name">
            <el-input
              v-model="formData.device_name"
              placeholder="请输入设备名称"
              maxlength="50"
              clearable
            />
            <div class="form-tip">
              设备的显示名称，例如：Web测试设备
            </div>
          </el-form-item>
        </div>

        <!-- 连接配置 -->
        <div class="form-section">
          <div class="section-title">连接配置</div>
          
          <el-form-item label="OTA 服务器" prop="ota_url">
            <div class="input-with-button">
              <el-input
                v-model="formData.ota_url"
                placeholder="请输入 OTA 服务器地址"
                clearable
              />
              <el-button
                type="primary"
                :loading="testing"
                @click="testOTAConnection"
              >
                测试连接
              </el-button>
            </div>
            <div class="form-tip">
              OTA 服务器地址，例如：http://127.0.0.1:8002/xiaozhi/ota/
            </div>
          </el-form-item>

          <el-form-item label="WebSocket 地址" prop="ws_url">
            <el-input
              v-model="formData.ws_url"
              placeholder="请输入 WebSocket 地址"
              clearable
            />
            <div class="form-tip">
              语音通话功能的 WebSocket 服务器地址，例如：ws://localhost:8080
              <br>
              配置后可在 AI 助手页面使用语音通话功能
            </div>
          </el-form-item>
        </div>
      </el-form>

      <div class="settings-actions">
        <el-button @click="handleClose">取消</el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="handleSave"
        >
          保存
        </el-button>
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { getUserSettings as getClientSettings, updateUserSettings as updateClientSettings } from '@/api/client';
import { getUserSettings as getGuardianSettings, updateUserSettings as updateGuardianSettings } from '@/api/guardian';
import { getUserSettings as getGovSettings, updateUserSettings as updateGovSettings } from '@/api/gov';
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();

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

const formRef = ref(null);
const saving = ref(false);
const testing = ref(false);

// 生成默认值的函数
const generateDefaults = () => {
  const role = userStore.profile?.role || 'client';
  const roleName = role === 'guardian' ? '监护人' : role === 'gov' ? '政府端' : '客户端';
  
  return {
    device_mac: 'AA:BB:CC:DD:EE:' + Math.random().toString(16).substr(2, 2).toUpperCase(),
    device_id: `web_${role}_${Date.now()}`,
    device_name: `Web ${roleName}`,
    ota_url: 'http://127.0.0.1:8002/xiaozhi/ota/',
    ws_url: 'ws://localhost:8080'
  };
};

// 初始化为空对象，等待从数据库加载
const formData = ref({
  device_mac: '',
  device_id: '',
  device_name: '',
  ota_url: '',
  ws_url: ''
});

const formRules = {
  device_mac: [
    { 
      pattern: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,
      message: '请输入有效的 MAC 地址格式（例如：AA:BB:CC:DD:EE:FF）',
      trigger: 'blur'
    }
  ],
  ota_url: [
    { 
      pattern: /^https?:\/\/.+/,
      message: '请输入有效的 HTTP 地址（以 http:// 或 https:// 开头）',
      trigger: 'blur'
    }
  ],
  ws_url: [
    { 
      pattern: /^(ws|wss):\/\/.+/,
      message: '请输入有效的 WebSocket 地址（以 ws:// 或 wss:// 开头）',
      trigger: 'blur'
    }
  ]
};

// 根据用户角色选择对应的 API
const getSettingsAPI = () => {
  const role = userStore.profile?.role;
  if (role === 'guardian') return getGuardianSettings;
  if (role === 'gov') return getGovSettings;
  return getClientSettings;
};

const updateSettingsAPI = () => {
  const role = userStore.profile?.role;
  if (role === 'guardian') return updateGuardianSettings;
  if (role === 'gov') return updateGovSettings;
  return updateClientSettings;
};

// 测试OTA连接
const testOTAConnection = async () => {
  if (!formData.value.ota_url) {
    ElMessage.warning('请先输入 OTA 服务器地址');
    return;
  }

  // 验证必填字段
  if (!formData.value.device_mac || !formData.value.device_id || !formData.value.device_name) {
    ElMessage.warning('请先填写设备 MAC、设备 ID 和设备名称');
    return;
  }

  testing.value = true;
  try {
    const response = await fetch(formData.value.ota_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Device-Id': formData.value.device_mac,  // 使用MAC地址作为Device-Id
        'Client-Id': formData.value.device_id
      },
      body: JSON.stringify({
        version: 0,
        uuid: '',
        application: {
          name: 'xiaozhi-web-client',
          version: '1.0.0',
          compile_time: new Date().toISOString(),
          idf_version: '4.4.3',
          elf_sha256: '1234567890abcdef1234567890abcdef1234567890abcdef'
        },
        ota: { label: 'xiaozhi-web-client' },
        board: {
          type: formData.value.device_name,
          ssid: 'xiaozhi-web-client',
          rssi: 0,
          channel: 0,
          ip: '192.168.1.1',
          mac: formData.value.device_mac
        },
        flash_size: 0,
        minimum_free_heap_size: 0,
        mac_address: formData.value.device_mac,
        chip_model_name: 'web',
        chip_info: { model: 0, cores: 0, revision: 0, features: 0 },
        partition_table: [{ label: '', type: 0, subtype: 0, address: 0, size: 0 }]
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('OTA 服务器返回:', result);
    
    // 检查返回的websocket信息
    if (result.websocket && result.websocket.url) {
      // 构建完整的WebSocket URL（包含token和认证参数）
      const wsUrl = new URL(result.websocket.url);
      
      // 添加token参数
      if (result.websocket.token) {
        const token = result.websocket.token.startsWith('Bearer ') 
          ? result.websocket.token 
          : 'Bearer ' + result.websocket.token;
        wsUrl.searchParams.append('authorization', token);
      }
      
      // 添加认证参数
      wsUrl.searchParams.append('device-id', formData.value.device_mac);  // 使用MAC地址
      wsUrl.searchParams.append('client-id', formData.value.device_id);
      
      // 自动填充到WebSocket地址字段
      formData.value.ws_url = wsUrl.toString();
      
      ElMessage.success({
        message: 'OTA 连接测试成功，WebSocket 地址已自动填充。请点击"保存"按钮保存设置。',
        duration: 5000
      });
    } else {
      ElMessage.warning('OTA 响应中缺少 WebSocket 信息');
    }
  } catch (error) {
    console.error('OTA 连接测试失败:', error);
    ElMessage.error(`连接失败: ${error.message}`);
  } finally {
    testing.value = false;
  }
};

// 加载设置
const loadSettings = async () => {
  const defaults = generateDefaults();
  
  try {
    const getSettings = getSettingsAPI();
    console.log('正在从数据库加载设置...');
    const res = await getSettings();
    console.log('数据库返回:', res);
    console.log('res.data:', res.data);
    console.log('res.data.code:', res.data?.code);
    console.log('res.data.data:', res.data?.data);
    console.log('res.data.data.settings:', res.data?.data?.settings);
    
    // 注意：API返回的是Axios响应，实际数据在res.data中
    const apiResponse = res.data;
    
    if (apiResponse.code === 0 && apiResponse.data?.settings) {
      const settings = apiResponse.data.settings;
      console.log('解析的设置:', settings);
      
      // 使用服务器设置，如果字段为空则使用默认值
      formData.value = {
        device_mac: settings.device_mac || defaults.device_mac,
        device_id: settings.device_id || defaults.device_id,
        device_name: settings.device_name || defaults.device_name,
        ota_url: settings.ota_url || defaults.ota_url,
        ws_url: settings.ws_url || defaults.ws_url
      };
      
      console.log('从数据库加载设置成功，formData:', formData.value);
    } else {
      // API 返回错误或无数据，使用默认值
      formData.value = defaults;
      console.log('使用默认设置，formData:', formData.value);
    }
  } catch (error) {
    console.error('加载设置失败，使用默认值:', error);
    // 加载失败时使用默认值
    formData.value = defaults;
  }
};

// 保存设置
const handleSave = async () => {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid) => {
    if (!valid) return;

    saving.value = true;
    try {
      const updateSettings = updateSettingsAPI();
      const settingsData = {
        device_mac: formData.value.device_mac,
        device_id: formData.value.device_id,
        device_name: formData.value.device_name,
        ota_url: formData.value.ota_url,
        ws_url: formData.value.ws_url
      };
      
      console.log('保存设置到数据库:', settingsData);
      
      const res = await updateSettings(settingsData);
      console.log('保存响应:', res);
      console.log('保存响应 res.data:', res.data);
      
      // 注意：API返回的是Axios响应，实际数据在res.data中
      const apiResponse = res.data;
      
      if (apiResponse.code === 0) {
        ElMessage.success('设置已保存');
        visible.value = false;
        
        // 触发事件通知其他组件设置已更新
        window.dispatchEvent(new CustomEvent('settings-updated', {
          detail: {
            device_mac: formData.value.device_mac,
            device_id: formData.value.device_id,
            device_name: formData.value.device_name,
            ota_url: formData.value.ota_url,
            ws_url: formData.value.ws_url
          }
        }));
      } else {
        ElMessage.error(apiResponse.message || '保存失败');
      }
    } catch (error) {
      console.error('保存设置失败:', error);
      ElMessage.error('保存设置失败');
    } finally {
      saving.value = false;
    }
  });
};

// 关闭对话框
const handleClose = () => {
  visible.value = false;
};

// 监听对话框打开，加载设置
watch(() => visible.value, (val) => {
  if (val) {
    loadSettings();
  }
});
</script>

<style scoped>
.settings-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0 20px;
}

.form-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid #e4e7ed;
}

.form-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}

.input-with-button {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.input-with-button .el-input {
  flex: 1;
}

.input-with-button .el-button {
  flex-shrink: 0;
  white-space: nowrap;
}

.settings-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 20px;
  margin-top: auto;
  border-top: 1px solid #e4e7ed;
}

/* 移除 wrapper 层，直接显示 input */
:deep(.el-input__wrapper) {
  box-shadow: none;
  padding: 0;
  background: transparent;
}

/* 统一输入框样式 - 直角 */
:deep(.el-input__inner) {
  border-radius: 0;
  border: 1px solid #dcdfe6;
  padding: 8px 12px;
  transition: all 0.2s;
}

:deep(.el-input__inner:hover) {
  border-color: #c0c4cc;
}

:deep(.el-input__inner:focus) {
  border-color: var(--el-color-primary);
  outline: none;
}

/* 统一按钮样式 - 直角 */
:deep(.el-button) {
  border-radius: 0;
  padding: 10px 20px;
  font-size: 14px;
}

/* 表单项间距 */
:deep(.el-form-item) {
  margin-bottom: 20px;
}

/* 标签样式 */
:deep(.el-form-item__label) {
  font-weight: 500;
  color: #606266;
}

/* 移动设备 */
@media (max-width: 768px) {
  .settings-container {
    padding: 0 12px;
  }

  :deep(.el-form-item__label) {
    width: 100px !important;
  }
  
  .section-title {
    font-size: 14px;
  }
  
  :deep(.el-button) {
    padding: 8px 16px;
    font-size: 13px;
  }
}
</style>
