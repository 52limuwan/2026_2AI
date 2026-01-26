<template>
  <div class="card-list">
    <div class="card" :class="{ blurred: generating }">
      <button v-if="!editingDish" class="ai-capsule-btn" @click="generateSeasonalDishes" :disabled="generating">
        <span>AI生成节气菜品</span>
      </button>
      
      <!-- AI 思考中遮罩 -->
      <div v-if="generating" class="ai-thinking-overlay">
        <div class="thinking-container">
          <div class="thinking-spinner"></div>
          <div class="thinking-text">AI 思考中</div>
          <div class="thinking-subtext">正在生成节气菜品和图片...</div>
        </div>
      </div>
      
      <div class="muted">菜品管理</div>
      <h3>{{ editingDish ? '编辑菜品' : '新增菜品' }}</h3>
      <input v-model="form.name" placeholder="菜品名称" class="input" />
      <input type="number" v-model.number="form.price" placeholder="价格（元）" class="input" inputmode="decimal" />
      <input type="number" v-model.number="form.member_price" placeholder="会员价格（元，可选）" class="input" inputmode="decimal" />
      <input type="number" v-model.number="form.stock" placeholder="库存" class="input" inputmode="numeric" />
      <textarea v-model="form.description" placeholder="描述" class="input textarea"></textarea>
      
      <!-- 营养元素编辑 -->
      <div class="nutrition-section">
        <button type="button" class="nutrition-edit-btn" @click="openNutritionModal">
          <span v-if="hasNutrition">编辑营养元素</span>
          <span v-else>添加营养元素</span>
        </button>
      </div>

      <!-- 图片上传 -->
      <div class="image-upload-section">
        <div class="image-upload-container">
          <input 
            type="file" 
            ref="fileInput" 
            accept="image/*" 
            @change="handleImageSelect" 
            class="file-input"
            id="dish-image-input"
          />
          <label for="dish-image-input" class="image-upload-btn">
            <span v-if="!imagePreview">选择图片</span>
            <span v-else>更换图片</span>
          </label>
          <div v-if="imagePreview" class="image-preview">
            <img :src="imagePreview" alt="预览" />
            <button type="button" class="remove-image-btn" @click="removeImage">×</button>
          </div>
        </div>
      </div>

      <!-- 营养元素编辑弹窗 -->
      <div v-if="showNutritionModal" class="modal-overlay" @click="showNutritionModal = false">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>编辑营养元素</h3>
            <button type="button" class="modal-close" @click="showNutritionModal = false">×</button>
          </div>
          <div class="modal-body">
            <div class="nutrition-form">
              <div class="nutrition-item">
                <label>热量 (kcal)</label>
                <input type="number" v-model.number="nutritionForm.calories" placeholder="0" class="input" />
              </div>
              <div class="nutrition-item">
                <label>蛋白质 (g)</label>
                <input type="number" v-model.number="nutritionForm.protein" placeholder="0" class="input" />
              </div>
              <div class="nutrition-item">
                <label>脂肪 (g)</label>
                <input type="number" v-model.number="nutritionForm.fat" placeholder="0" class="input" />
              </div>
              <div class="nutrition-item">
                <label>碳水 (g)</label>
                <input type="number" v-model.number="nutritionForm.carbs" placeholder="0" class="input" />
              </div>
              <div class="nutrition-item">
                <label>膳食纤维 (g)</label>
                <input type="number" v-model.number="nutritionForm.fiber" placeholder="0" class="input" />
              </div>
              <div class="nutrition-item">
                <label>钙 (mg)</label>
                <input type="number" v-model.number="nutritionForm.calcium" placeholder="0" class="input" />
              </div>
              <div class="nutrition-item">
                <label>维生素C (mg)</label>
                <input type="number" v-model.number="nutritionForm.vitaminC" placeholder="0" class="input" />
              </div>
              <div class="nutrition-item">
                <label>铁 (mg)</label>
                <input type="number" v-model.number="nutritionForm.iron" placeholder="0" class="input" />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="ghost-btn" @click="cancelNutritionEdit">取消</button>
            <button type="button" class="primary-btn" @click="saveNutrition">确定</button>
          </div>
        </div>
      </div>

      <div class="form-actions">
        <button class="primary-btn" @click="save" :disabled="uploading">
          <span v-if="uploading">上传中...</span>
          <span v-else>{{ editingDish ? '更新' : '保存' }}</span>
        </button>
        <button v-if="editingDish" class="ghost-btn" @click="cancelEdit">取消</button>
      </div>
      <p class="muted">{{ message }}</p>
    </div>

    <div class="card dish-item" v-for="dish in dishes" :key="dish.id">
      <div class="dish-content">
        <div class="dish-image-wrapper" v-if="dish.image">
          <img :src="getImageUrl(dish.image)" :alt="dish.name" @error="onImageError" />
        </div>
        <div class="dish-info">
          <div class="row">
            <div>
              <strong>{{ dish.name }}</strong>
              <p class="muted">库存 {{ dish.stock }}</p>
            </div>
            <span class="status">{{ statusText(dish.status) }}</span>
          </div>
          <p>￥{{ dish.price }}</p>
          <p class="muted dish-description">{{ dish.description || '暂无描述' }}</p>
        </div>
      </div>
      <div class="actions">
        <button class="ghost-btn" @click="edit(dish)">编辑</button>
        <button class="ghost-btn" @click="toggle(dish)">{{ dish.status === 'available' ? '下架' : '上架' }}</button>
        <button class="primary-btn" @click="remove(dish.id)">删除</button>
      </div>
    </div>
    <p v-if="!dishes.length" class="muted">暂无菜品，请先新增。</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getDishes, createDish, updateDish, updateDishStatus, deleteDish, uploadImage, generateSeasonalDishes as generateSeasonalDishesAPI } from '../../api/merchant'

const dishes = ref([])
const message = ref('')
const uploading = ref(false)
const generating = ref(false)
const imagePreview = ref('')
const selectedFile = ref(null)
const fileInput = ref(null)
const editingDish = ref(null)

const form = ref({
  name: '',
  price: null,
  member_price: null,
  stock: null,
  description: '',
  image: '',
  nutrition: null
})

const showNutritionModal = ref(false)
const nutritionForm = ref({
  calories: null,
  protein: null,
  fat: null,
  carbs: null,
  fiber: null,
  calcium: null,
  vitaminC: null,
  iron: null
})

const hasNutrition = computed(() => {
  return form.value.nutrition && Object.keys(form.value.nutrition).length > 0
})

const load = async () => {
  const dishesData = (await getDishes()).data.data.dishes || []
  // 解析nutrition字段（从JSON字符串转为对象）
  dishes.value = dishesData.map(dish => ({
    ...dish,
    nutrition: dish.nutrition ? (typeof dish.nutrition === 'string' ? JSON.parse(dish.nutrition) : dish.nutrition) : null
  }))
}

const handleStoreChanged = () => {
  load()
}

onMounted(() => {
  load()
  window.addEventListener('merchant-store-changed', handleStoreChanged)
})

onUnmounted(() => {
  window.removeEventListener('merchant-store-changed', handleStoreChanged)
})

const statusText = (s) => (s === 'available' ? '在售' : s === 'offline' ? '已下架' : s || '')

const handleImageSelect = (event) => {
  const file = event.target.files[0]
  if (file) {
    if (!file.type.startsWith('image/')) {
      message.value = '请选择图片文件'
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      message.value = '图片大小不能超过5MB'
      return
    }
    selectedFile.value = file
    const reader = new FileReader()
    reader.onload = (e) => {
      imagePreview.value = e.target.result
    }
    reader.readAsDataURL(file)
    message.value = ''
  }
}

const removeImage = () => {
  imagePreview.value = ''
  selectedFile.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
  form.value.image = ''
}

const getImageUrl = (imagePath) => {
  if (!imagePath) return ''
  // 如果已经是完整URL，直接返回
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath
  }
  // 如果是相对路径（如 /uploads/xxx.jpg），直接返回，因为Vite代理会处理
  if (imagePath.startsWith('/')) {
    return imagePath
  }
  // 如果没有前导斜杠，添加它
  return `/${imagePath}`
}

const onImageError = (event) => {
  event.target.style.display = 'none'
}

const resetForm = () => {
  form.value = { name: '', price: null, member_price: null, stock: null, description: '', image: '', nutrition: null }
  nutritionForm.value = {
    calories: null,
    protein: null,
    fat: null,
    carbs: null,
    fiber: null,
    calcium: null,
    vitaminC: null,
    iron: null
  }
  editingDish.value = null
  removeImage()
  showNutritionModal.value = false
}

const saveNutrition = () => {
  // 将营养表单数据保存到form.nutrition
  form.value.nutrition = {
    calories: nutritionForm.value.calories ?? 0,
    protein: nutritionForm.value.protein ?? 0,
    fat: nutritionForm.value.fat ?? 0,
    carbs: nutritionForm.value.carbs ?? 0,
    fiber: nutritionForm.value.fiber ?? 0,
    calcium: nutritionForm.value.calcium ?? 0,
    vitaminC: nutritionForm.value.vitaminC ?? 0,
    iron: nutritionForm.value.iron ?? 0
  }
  showNutritionModal.value = false
}

const cancelNutritionEdit = () => {
  // 恢复之前的营养数据
  if (form.value.nutrition) {
    nutritionForm.value = {
      calories: form.value.nutrition.calories ?? null,
      protein: form.value.nutrition.protein ?? null,
      fat: form.value.nutrition.fat ?? null,
      carbs: form.value.nutrition.carbs ?? null,
      fiber: form.value.nutrition.fiber ?? null,
      calcium: form.value.nutrition.calcium ?? null,
      vitaminC: form.value.nutrition.vitaminC ?? null,
      iron: form.value.nutrition.iron ?? null
    }
  }
  showNutritionModal.value = false
}

// 打开营养编辑弹窗时，初始化表单数据
const openNutritionModal = () => {
  if (form.value.nutrition) {
    nutritionForm.value = {
      calories: form.value.nutrition.calories ?? null,
      protein: form.value.nutrition.protein ?? null,
      fat: form.value.nutrition.fat ?? null,
      carbs: form.value.nutrition.carbs ?? null,
      fiber: form.value.nutrition.fiber ?? null,
      calcium: form.value.nutrition.calcium ?? null,
      vitaminC: form.value.nutrition.vitaminC ?? null,
      iron: form.value.nutrition.iron ?? null
    }
  } else {
    nutritionForm.value = {
      calories: null,
      protein: null,
      fat: null,
      carbs: null,
      fiber: null,
      calcium: null,
      vitaminC: null,
      iron: null
    }
  }
  showNutritionModal.value = true
}

const edit = (dish) => {
  editingDish.value = dish
  form.value = {
    name: dish.name || '',
    price: dish.price ?? null,
    member_price: dish.member_price ?? null,
    stock: dish.stock ?? null,
    description: dish.description || '',
    image: dish.image || '',
    nutrition: dish.nutrition || null
  }
  // 如果有图片，显示预览
  if (dish.image) {
    imagePreview.value = getImageUrl(dish.image)
  } else {
    imagePreview.value = ''
  }
  selectedFile.value = null
  // 初始化营养表单
  if (form.value.nutrition) {
    nutritionForm.value = {
      calories: form.value.nutrition.calories ?? null,
      protein: form.value.nutrition.protein ?? null,
      fat: form.value.nutrition.fat ?? null,
      carbs: form.value.nutrition.carbs ?? null,
      fiber: form.value.nutrition.fiber ?? null,
      calcium: form.value.nutrition.calcium ?? null,
      vitaminC: form.value.nutrition.vitaminC ?? null,
      iron: form.value.nutrition.iron ?? null
    }
  } else {
    nutritionForm.value = {
      calories: null,
      protein: null,
      fat: null,
      carbs: null,
      fiber: null,
      calcium: null,
      vitaminC: null,
      iron: null
    }
  }
  // 滚动到表单顶部
  document.querySelector('.card')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const cancelEdit = () => {
  resetForm()
  message.value = ''
}

const save = async () => {
  if (!form.value.name || form.value.price === null || form.value.price === undefined || form.value.price === '') {
    message.value = '请填写菜品名称和价格'
    return
  }

  uploading.value = true
  message.value = ''

  try {
    let imageUrl = form.value.image

    // 如果有选择的图片文件，先上传
    if (selectedFile.value) {
      try {
        const uploadRes = await uploadImage(selectedFile.value)
        imageUrl = uploadRes.data.data.imageUrl
      } catch (err) {
        message.value = '图片上传失败：' + (err.message || '未知错误')
        uploading.value = false
        return
      }
    }

    const dishData = {
      name: form.value.name,
      price: Number(form.value.price) || 0,
      member_price: form.value.member_price !== null && form.value.member_price !== undefined && form.value.member_price !== '' ? Number(form.value.member_price) : null,
      stock: form.value.stock !== null && form.value.stock !== undefined && form.value.stock !== '' ? Number(form.value.stock) : 0,
      description: form.value.description || '',
      image: imageUrl,
      nutrition: form.value.nutrition || {}
    }

    if (editingDish.value) {
      // 更新菜品
      await updateDish(editingDish.value.id, dishData)
      message.value = '已更新'
    } else {
      // 创建菜品
      await createDish(dishData)
      message.value = '已保存'
    }

    resetForm()
    load()
  } catch (err) {
    message.value = '保存失败：' + (err.message || '未知错误')
  } finally {
    uploading.value = false
  }
}

const toggle = async (dish) => {
  await updateDishStatus(dish.id, dish.status === 'available' ? 'offline' : 'available')
  message.value = '状态已更新'
  load()
}

const remove = async (id) => {
  await deleteDish(id)
  message.value = '已删除'
  load()
}

const generateSeasonalDishes = async () => {
  if (generating.value) return
  
  generating.value = true
  message.value = '正在生成节气菜品和图片，请稍候...'
  
  try {
    const response = await generateSeasonalDishesAPI()
    const result = response.data
    
    if (result.success) {
      const { dishes, imagesGenerated } = result.data
      message.value = result.message || `已生成${dishes.length}道节气菜品${imagesGenerated > 0 ? `（含${imagesGenerated}张图片）` : ''}`
      
      // 重新加载菜品列表
      await load()
      
      // 滚动到菜品列表顶部，显示新生成的菜品
      setTimeout(() => {
        const firstDish = document.querySelector('.dish-item')
        if (firstDish) {
          firstDish.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
    } else {
      message.value = result.message || '生成失败'
    }
  } catch (err) {
    message.value = '生成失败：' + (err.response?.data?.message || err.message || '未知错误')
  } finally {
    generating.value = false
  }
}
</script>

<style scoped>
.card {
  position: relative;
  transition: filter 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.card.blurred > *:not(.ai-thinking-overlay) {
  filter: blur(4px);
  pointer-events: none;
  user-select: none;
}

.ai-thinking-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  animation: fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.thinking-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.thinking-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 1s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.thinking-text {
  font-size: 18px;
  font-weight: var(--fw-semibold);
  color: var(--text);
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.thinking-subtext {
  font-size: 14px;
  color: var(--muted);
  animation: fadeInOut 3s ease-in-out infinite;
}

@keyframes fadeInOut {
  0%, 100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

.ai-capsule-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 6px 14px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 20px;
  font-size: 13px;
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
}

.ai-capsule-btn:hover:not(:disabled) {
  background: var(--bg-hover);
  border-color: var(--accent);
  color: var(--accent);
  transform: translateY(-1px);
}

.ai-capsule-btn:active:not(:disabled) {
  transform: translateY(0);
}

.ai-capsule-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.card > h3 {
  margin-top: 16px;
  margin-bottom: 16px;
}

.card input.input {
  margin-bottom: 12px;
}

.card textarea.input {
  margin-bottom: 12px;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.status {
  padding: 6px 12px;
  background: #eef7f4;
  border-radius: 10px;
  color: var(--accent-strong);
  font-weight: var(--fw-semibold);
}
.actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.textarea {
  min-height: 90px;
}

.image-upload-section {
  margin-top: 20px;
  margin-bottom: 20px;
}

.nutrition-section {
  margin-top: 20px;
  margin-bottom: 20px;
}

.nutrition-edit-btn {
  display: inline-block;
  padding: 10px 16px;
  background: var(--border);
  border: 1px dashed var(--border-strong);
  border-radius: 8px;
  cursor: pointer;
  text-align: center;
  color: var(--text);
  font-size: 14px;
  transition: all 0.2s;
  width: 100%;
}

.nutrition-edit-btn:hover {
  background: var(--bg-hover);
  border-color: var(--accent);
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: var(--bg);
  border-radius: 12px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: var(--fw-semibold);
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--text);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background 0.2s;
}

.modal-close:hover {
  background: var(--bg-hover);
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border);
}

.nutrition-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.nutrition-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nutrition-item label {
  font-size: 14px;
  color: var(--text);
  font-weight: var(--fw-medium);
}

.nutrition-item .input {
  margin-bottom: 0;
}

.image-upload-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: var(--text);
  font-weight: var(--fw-medium);
}

.image-upload-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.file-input {
  display: none;
}

.image-upload-btn {
  display: inline-block;
  padding: 10px 16px;
  background: var(--border);
  border: 1px dashed var(--border-strong);
  border-radius: 8px;
  cursor: pointer;
  text-align: center;
  color: var(--text);
  font-size: 14px;
  transition: all 0.2s;
}

.image-upload-btn:hover {
  background: var(--bg-hover);
  border-color: var(--accent);
}

.image-preview {
  position: relative;
  width: 100%;
  max-width: 300px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border);
}

.image-preview img {
  width: 100%;
  height: auto;
  display: block;
}

.remove-image-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.remove-image-btn:hover {
  background: rgba(0, 0, 0, 0.8);
}

.dish-item {
  margin-bottom: 16px;
}

.dish-content {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.dish-image-wrapper {
  width: 100px;
  height: 100px;
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border);
  background: var(--bg-subtle);
}

.dish-image-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.dish-info {
  flex: 1;
  min-width: 0;
}

.dish-description {
  margin: 4px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-word;
  line-height: 1.4;
}

.primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-actions {
  display: flex;
  gap: 8px;
  margin-top: 20px;
  margin-bottom: 12px;
}
</style>
