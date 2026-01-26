/**
 * 企业级HTTP请求封装
 * 包含：拦截器、错误处理、重试机制、请求取消
 */

import axios from 'axios';
import config from '../config';
import { showToast } from './toast';
import { useUserStore } from '../stores/user';

// 请求队列管理（防止重复请求）
const pendingRequests = new Map();

// 生成请求唯一标识
function generateRequestKey(config) {
  const { method, url, params, data } = config;
  return [method, url, JSON.stringify(params), JSON.stringify(data)].join('&');
}

// 添加请求到队列
function addPendingRequest(config) {
  const requestKey = generateRequestKey(config);
  config.cancelToken = config.cancelToken || new axios.CancelToken((cancel) => {
    if (!pendingRequests.has(requestKey)) {
      pendingRequests.set(requestKey, cancel);
    }
  });
}

// 移除请求
function removePendingRequest(config) {
  const requestKey = generateRequestKey(config);
  if (pendingRequests.has(requestKey)) {
    const cancel = pendingRequests.get(requestKey);
    cancel(requestKey);
    pendingRequests.delete(requestKey);
  }
}

// 创建axios实例
const request = axios.create({
  baseURL: config.api.baseURL,
  timeout: config.api.timeout,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 取消重复请求
    removePendingRequest(config);
    addPendingRequest(config);

    // 添加认证token
    const userStore = useUserStore();
    const token = userStore.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 添加请求时间戳（用于性能监控）
    config.metadata = { startTime: new Date().getTime() };

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    // 移除已完成的请求
    removePendingRequest(response.config);

    // 计算请求耗时
    const endTime = new Date().getTime();
    const duration = endTime - response.config.metadata.startTime;
    
    // 开发环境打印请求耗时
    if (config.app.isDevelopment && duration > 1000) {
      console.warn(`慢请求: ${response.config.url} 耗时 ${duration}ms`);
    }

    // 统一处理业务错误
    const payload = response.data;
    if (payload && typeof payload.code !== 'undefined' && payload.code !== 0) {
      const errorMessage = payload.message || '请求失败';
      showToast(errorMessage, 'error');
      
      const error = new Error(errorMessage);
      error.response = response;
      error.code = payload.code;
      return Promise.reject(error);
    }

    return response;
  },
  async (error) => {
    // 移除失败的请求
    if (error.config) {
      removePendingRequest(error.config);
    }

    // 请求被取消
    if (axios.isCancel(error)) {
      console.log('请求已取消:', error.message);
      return Promise.reject(error);
    }

    // 处理网络错误
    if (!error.response) {
      showToast('网络连接失败，请检查网络', 'error');
      return Promise.reject(error);
    }

    const { status, data } = error.response;
    const message = data?.message || error.message || '请求失败';

    // 处理不同的HTTP状态码
    switch (status) {
      case 401:
        // Token过期或无效
        showToast('登录已过期，请重新登录', 'error');
        const userStore = useUserStore();
        userStore.logout();
        window.location.href = config.routes.login;
        break;

      case 403:
        showToast('无权访问此资源', 'error');
        break;

      case 404:
        showToast('请求的资源不存在', 'error');
        break;

      case 429:
        showToast('请求过于频繁，请稍后再试', 'error');
        break;

      case 500:
      case 502:
      case 503:
      case 504:
        showToast('服务器错误，请稍后重试', 'error');
        break;

      default:
        showToast(message, 'error');
    }

    // 请求重试逻辑
    const retryConfig = error.config;
    if (!retryConfig || !retryConfig.retry) {
      return Promise.reject(error);
    }

    retryConfig.__retryCount = retryConfig.__retryCount || 0;

    if (retryConfig.__retryCount >= config.api.retryTimes) {
      return Promise.reject(error);
    }

    retryConfig.__retryCount += 1;

    // 延迟重试
    const delay = new Promise((resolve) => {
      setTimeout(resolve, config.api.retryDelay);
    });

    return delay.then(() => request(retryConfig));
  }
);

// 便捷方法
export const http = {
  get(url, params, options = {}) {
    return request.get(url, { params, ...options });
  },

  post(url, data, options = {}) {
    return request.post(url, data, options);
  },

  put(url, data, options = {}) {
    return request.put(url, data, options);
  },

  delete(url, params, options = {}) {
    return request.delete(url, { params, ...options });
  },

  // 上传文件
  upload(url, formData, onProgress) {
    return request.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      }
    });
  },

  // 下载文件
  download(url, filename) {
    return request.get(url, {
      responseType: 'blob'
    }).then((response) => {
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    });
  }
};

export default request;
