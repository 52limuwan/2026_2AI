/**
 * 防跌监护平板系统 - 主应用逻辑
 */

class TabletOS {
    constructor() {
        this.currentApp = null;
        this.isCallActive = false;
        this.callStartTime = null;
        this.callDurationInterval = null;
        this.socket = null;
        this.audioUnlocked = false;
        this.ringtoneAudio = null;
        this.alarmAudio = null;
        
        // 从localStorage读取服务器配置，默认为localhost
        this.serverHost = localStorage.getItem('serverHost') || 'localhost';
        this.serverPort = parseInt(localStorage.getItem('serverPort') || '8765');
        
        // 壁纸配置
        this.wallpapers = [
            'Picture/Fluent-1.png',
            'Picture/Fluent-2.png',
            'Picture/Fluent-3.jpg',
            'Picture/Fluent-4.jpg',
            'Picture/Fluent-5.png',
            'Picture/Fluent-6.jpg',
            'Picture/Fluent-7.png',
            'Picture/Fluent-8.png'
        ];
        
        this.init();
    }
    
    init() {
        this.setRandomWallpaper();
        this.initAudio();
        this.setupEventListeners();
        this.updateTime();
        this.connectToServer();
        
        // 每秒更新时间
        setInterval(() => this.updateTime(), 1000);
        
        // 测试快捷键
        document.addEventListener('keydown', (e) => {
            if (e.key === 't' || e.key === 'T') {
                this.showTestCall();
            } else if (e.key === 'Escape') {
                this.rejectCall();
            } else if (e.key === 'f' || e.key === 'F') {
                this.toggleFullscreen();
            }
        });
        
        // 监听全屏状态变化
        document.addEventListener('fullscreenchange', () => {
            this.updateFullscreenButton();
        });
        
        // 解锁音频（通过用户交互）
        this.unlockAudio();
    }
    
    initAudio() {
        // 初始化音频元素
        this.ringtoneAudio = document.getElementById('ringtone-audio');
        this.alarmAudio = document.getElementById('alarm-audio');
        
        if (this.ringtoneAudio) {
            this.ringtoneAudio.preload = 'auto';
            this.ringtoneAudio.load();
        }
        
        if (this.alarmAudio) {
            this.alarmAudio.preload = 'auto';
            this.alarmAudio.load();
        }
        
        console.log('✓ 音频元素已初始化');
    }
    
    unlockAudio() {
        // 通过用户交互解锁音频播放
        const unlockHandler = () => {
            if (this.audioUnlocked) return;
            
            // 尝试播放并立即暂停来解锁音频
            const promises = [];
            
            if (this.ringtoneAudio) {
                const p1 = this.ringtoneAudio.play().then(() => {
                    this.ringtoneAudio.pause();
                    this.ringtoneAudio.currentTime = 0;
                }).catch(() => {});
                promises.push(p1);
            }
            
            if (this.alarmAudio) {
                const p2 = this.alarmAudio.play().then(() => {
                    this.alarmAudio.pause();
                    this.alarmAudio.currentTime = 0;
                }).catch(() => {});
                promises.push(p2);
            }
            
            Promise.all(promises).then(() => {
                this.audioUnlocked = true;
                console.log('✓ 音频已解锁');
                
                // 移除事件监听
                document.removeEventListener('click', unlockHandler);
                document.removeEventListener('touchstart', unlockHandler);
                document.removeEventListener('keydown', unlockHandler);
            });
        };
        
        // 监听多种用户交互事件
        document.addEventListener('click', unlockHandler, { once: true });
        document.addEventListener('touchstart', unlockHandler, { once: true });
        document.addEventListener('keydown', unlockHandler, { once: true });
    }
    
    setupEventListeners() {
        // 桌面图标点击
        document.querySelectorAll('.desktop-icon').forEach(icon => {
            icon.addEventListener('click', () => {
                const appName = icon.dataset.app;
                this.openApp(appName);
            });
        });
        
        // Dock 应用点击
        document.querySelectorAll('.dock-app').forEach(app => {
            app.addEventListener('click', () => {
                const appName = app.dataset.app;
                this.openApp(appName);
            });
        });
        
        // 来电按钮
        document.getElementById('btn-answer').addEventListener('click', () => {
            this.answerCall();
        });
        
        document.getElementById('btn-reject').addEventListener('click', () => {
            this.rejectCall();
        });
        
        // 全屏按钮
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                this.toggleFullscreen();
            });
        }
    }
    
    updateTime() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        document.getElementById('status-time').textContent = `${hours}:${minutes}`;
    }
    
    setRandomWallpaper() {
        // 随机选择壁纸
        const randomIndex = Math.floor(Math.random() * this.wallpapers.length);
        const wallpaper = this.wallpapers[randomIndex];
        
        // 设置桌面壁纸
        const desktopWallpaper = document.querySelector('.desktop-wallpaper');
        if (desktopWallpaper) {
            desktopWallpaper.style.backgroundImage = `url('${wallpaper}')`;
            desktopWallpaper.style.backgroundSize = 'cover';
            desktopWallpaper.style.backgroundPosition = 'center';
            desktopWallpaper.style.backgroundRepeat = 'no-repeat';
            console.log(`✓ 已加载壁纸: ${wallpaper.split('/').pop()}`);
        }
    }
    
    openApp(appName) {
        if (this.isCallActive) return; // 通话中不允许打开应用
        
        const appContainer = document.getElementById('app-container');
        const desktop = document.getElementById('desktop');
        
        // 清空容器
        appContainer.innerHTML = '';
        
        // 创建应用窗口
        const appWindow = document.createElement('div');
        appWindow.className = 'app-window';
        
        // 应用头部
        const header = document.createElement('div');
        header.className = 'app-header';
        header.innerHTML = `
            <div class="app-title">${this.getAppTitle(appName)}</div>
            <button class="app-close">
                <svg viewBox="0 0 24 24" fill="none">
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </button>
        `;
        
        // 应用内容
        const body = document.createElement('div');
        body.className = 'app-body';
        body.innerHTML = this.getAppContent(appName);
        
        appWindow.appendChild(header);
        appWindow.appendChild(body);
        appContainer.appendChild(appWindow);
        
        // 显示应用容器
        appContainer.classList.remove('hidden');
        desktop.style.display = 'none';
        
        // 更新 Dock 状态
        this.updateDockState(appName);
        
        // 关闭按钮事件
        header.querySelector('.app-close').addEventListener('click', () => {
            this.closeApp();
        });
        
        // 如果是设置页面，添加事件监听
        if (appName === 'settings') {
            this.setupSettingsListeners();
        }
        
        this.currentApp = appName;
    }
    
    setupSettingsListeners() {
        // 设置页面的事件监听
        // 延迟执行，确保DOM已加载
        setTimeout(() => {
            const saveBtn = document.getElementById('save-server-config');
            const testBtn = document.getElementById('test-connection');
            const hostInput = document.getElementById('server-host');
            const portInput = document.getElementById('server-port');
            const messageDiv = document.getElementById('connection-message');
            const statusDiv = document.getElementById('settings-connection-status');
            
            if (!saveBtn || !testBtn) return;
            
            // 更新连接状态显示
            if (statusDiv) {
                if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                    statusDiv.textContent = '✓ 已连接';
                    statusDiv.style.color = 'var(--success)';
                } else {
                    statusDiv.textContent = '✗ 未连接';
                    statusDiv.style.color = 'var(--danger)';
                }
            }
            
            // 保存并重连
            saveBtn.addEventListener('click', () => {
                const newHost = hostInput.value.trim();
                const newPort = parseInt(portInput.value);
                
                if (!newHost) {
                    messageDiv.textContent = '❌ 请输入服务器地址';
                    messageDiv.style.color = 'var(--danger)';
                    return;
                }
                
                if (!newPort || newPort < 1 || newPort > 65535) {
                    messageDiv.textContent = '❌ 端口号无效（1-65535）';
                    messageDiv.style.color = 'var(--danger)';
                    return;
                }
                
                // 保存到localStorage
                localStorage.setItem('serverHost', newHost);
                localStorage.setItem('serverPort', newPort.toString());
                
                // 更新实例变量
                this.serverHost = newHost;
                this.serverPort = newPort;
                
                messageDiv.textContent = '✓ 配置已保存，正在重新连接...';
                messageDiv.style.color = 'var(--success)';
                
                // 断开旧连接
                if (this.socket) {
                    this.socket.close();
                }
                
                // 重新连接
                setTimeout(() => {
                    this.connectToServer();
                    messageDiv.textContent = '✓ 已重新连接到新服务器';
                }, 500);
            });
            
            // 测试连接
            testBtn.addEventListener('click', () => {
                const testHost = hostInput.value.trim();
                const testPort = parseInt(portInput.value);
                
                if (!testHost || !testPort) {
                    messageDiv.textContent = '❌ 请输入完整的服务器信息';
                    messageDiv.style.color = 'var(--danger)';
                    return;
                }
                
                messageDiv.textContent = '⏳ 正在测试连接...';
                messageDiv.style.color = 'var(--text-secondary)';
                
                // 创建测试连接
                const testSocket = new WebSocket(`ws://${testHost}:${testPort}`);
                
                const timeout = setTimeout(() => {
                    testSocket.close();
                    messageDiv.textContent = '❌ 连接超时，请检查地址和端口';
                    messageDiv.style.color = 'var(--danger)';
                }, 5000);
                
                testSocket.onopen = () => {
                    clearTimeout(timeout);
                    messageDiv.textContent = '✓ 连接成功！可以保存配置';
                    messageDiv.style.color = 'var(--success)';
                    testSocket.close();
                };
                
                testSocket.onerror = () => {
                    clearTimeout(timeout);
                    messageDiv.textContent = '❌ 连接失败，请检查地址和端口';
                    messageDiv.style.color = 'var(--danger)';
                };
            });
        }, 100);
    }
    
    closeApp() {
        const appContainer = document.getElementById('app-container');
        const desktop = document.getElementById('desktop');
        
        appContainer.classList.add('hidden');
        desktop.style.display = 'block';
        
        this.updateDockState(null);
        this.currentApp = null;
    }
    
    updateDockState(activeApp) {
        document.querySelectorAll('.dock-app').forEach(app => {
            if (app.dataset.app === activeApp) {
                app.classList.add('active');
            } else {
                app.classList.remove('active');
            }
        });
    }
    
    getAppTitle(appName) {
        const titles = {
            'wechat': '某信',
            'qq': '某鹅',
            'dingtalk': '某钉',
            'wework': '企业某信',
            'browser': '浏览器',
            'video': '视频通话',
            'health': '健康档案',
            'settings': '系统设置'
        };
        return titles[appName] || '应用';
    }
    
    getAppContent(appName) {
        const contents = {
            'wechat': `
                <div style="text-align: center; padding: 64px 32px;">
                    <svg viewBox="0 0 120 120" fill="none" style="width: 120px; height: 120px; margin-bottom: 32px; color: var(--accent);">
                        <path d="M42 37c-11 0-20 7.3-20 16.3 0 5.3 2.8 10 7.5 13l-2.5 9.5 10.5-5.3c3 .8 6.3 1.3 9.5 1.3 11 0 20-7.3 20-16.3S53 37 42 37z" stroke="currentColor" stroke-width="3"/>
                        <circle cx="36" cy="55" r="4" fill="currentColor"/>
                        <circle cx="48" cy="55" r="4" fill="currentColor"/>
                        <path d="M78 50c-13.8 0-25 9-25 20s11.3 20 25 20c3.8 0 7.5-.8 10.8-1.8l13 6.5-3-11.8c6-3.8 9.3-9.5 9.3-15.5 0-11-11.3-20-25-20z" stroke="currentColor" stroke-width="3"/>
                        <circle cx="70" cy="72" r="4" fill="currentColor"/>
                        <circle cx="85" cy="72" r="4" fill="currentColor"/>
                    </svg>
                    <h2 style="font-size: 28px; margin-bottom: 16px; color: var(--text-primary);">某信</h2>
                    <p style="font-size: 18px; color: var(--text-secondary);">
                        与家人朋友保持联系
                    </p>
                </div>
            `,
            'qq': `
                <div style="text-align: center; padding: 64px 32px;">
                    <svg viewBox="0 0 120 120" fill="none" style="width: 120px; height: 120px; margin-bottom: 32px; color: var(--accent);">
                        <ellipse cx="60" cy="50" rx="20" ry="25" stroke="currentColor" stroke-width="3"/>
                        <path d="M40 65c-5 0-10 3.8-10 8.8 0 3.8 2.5 6.3 5 7.5-1.3 3.8-2.5 7.5-2.5 11.3 0 6.3 5 10 12.5 10h20c7.5 0 12.5-3.8 12.5-10 0-3.8-1.3-7.5-2.5-11.3 2.5-1.3 5-3.8 5-7.5 0-5-5-8.8-10-8.8" stroke="currentColor" stroke-width="3"/>
                        <circle cx="50" cy="55" r="4" fill="currentColor"/>
                        <circle cx="70" cy="55" r="4" fill="currentColor"/>
                    </svg>
                    <h2 style="font-size: 28px; margin-bottom: 16px; color: var(--text-primary);">某鹅</h2>
                    <p style="font-size: 18px; color: var(--text-secondary);">
                        即时通讯工具
                    </p>
                </div>
            `,
            'dingtalk': `
                <div style="text-align: center; padding: 64px 32px;">
                    <svg viewBox="0 0 120 120" fill="none" style="width: 120px; height: 120px; margin-bottom: 32px; color: var(--accent);">
                        <path d="M60 25L35 40v15l25 17.5 25-17.5V40L60 25z" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>
                        <path d="M35 55l25 17.5L85 55M60 72.5V87.5" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                        <rect x="50" y="87.5" width="20" height="7.5" rx="2.5" stroke="currentColor" stroke-width="3"/>
                    </svg>
                    <h2 style="font-size: 28px; margin-bottom: 16px; color: var(--text-primary);">某钉</h2>
                    <p style="font-size: 18px; color: var(--text-secondary);">
                        企业协同办公平台
                    </p>
                </div>
            `,
            'wework': `
                <div style="text-align: center; padding: 64px 32px;">
                    <svg viewBox="0 0 120 120" fill="none" style="width: 120px; height: 120px; margin-bottom: 32px; color: var(--accent);">
                        <rect x="30" y="35" width="25" height="25" rx="5" stroke="currentColor" stroke-width="3"/>
                        <rect x="65" y="35" width="25" height="25" rx="5" stroke="currentColor" stroke-width="3"/>
                        <rect x="30" y="70" width="25" height="15" rx="2.5" stroke="currentColor" stroke-width="3"/>
                        <rect x="65" y="70" width="25" height="15" rx="2.5" stroke="currentColor" stroke-width="3"/>
                    </svg>
                    <h2 style="font-size: 28px; margin-bottom: 16px; color: var(--text-primary);">企业某信</h2>
                    <p style="font-size: 18px; color: var(--text-secondary);">
                        企业级通讯工具
                    </p>
                </div>
            `,
            'browser': `
                <div style="text-align: center; padding: 64px 32px;">
                    <svg viewBox="0 0 120 120" fill="none" style="width: 120px; height: 120px; margin-bottom: 32px; color: var(--accent);">
                        <circle cx="60" cy="60" r="35" stroke="currentColor" stroke-width="3"/>
                        <path d="M60 25v70M25 60h70" stroke="currentColor" stroke-width="3"/>
                        <path d="M37.5 37.5c7.5 7.5 15 22.5 22.5 22.5s15-15 22.5-22.5M37.5 82.5c7.5-7.5 15-22.5 22.5-22.5s15 15 22.5 22.5" stroke="currentColor" stroke-width="3"/>
                    </svg>
                    <h2 style="font-size: 28px; margin-bottom: 16px; color: var(--text-primary);">浏览器</h2>
                    <p style="font-size: 18px; color: var(--text-secondary);">
                        浏览网页和资讯
                    </p>
                </div>
            `,
            'video': `
                <div style="text-align: center; padding: 64px 32px;">
                    <svg viewBox="0 0 120 120" fill="none" style="width: 120px; height: 120px; margin-bottom: 32px; color: var(--accent);">
                        <rect x="20" y="40" width="60" height="40" rx="5" stroke="currentColor" stroke-width="3"/>
                        <path d="M80 55l20-10v30l-20-10z" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>
                    </svg>
                    <h2 style="font-size: 28px; margin-bottom: 16px; color: var(--text-primary);">视频通话</h2>
                    <p style="font-size: 18px; color: var(--text-secondary);">
                        与家人视频聊天
                    </p>
                </div>
            `,
            'health': `
                <div style="text-align: center; padding: 64px 32px;">
                    <svg viewBox="0 0 120 120" fill="none" style="width: 120px; height: 120px; margin-bottom: 32px; color: var(--accent);">
                        <path d="M60 95L30 65c-7.5-7.5-7.5-20 0-27.5s20-7.5 27.5 0l2.5 2.5 2.5-2.5c7.5-7.5 20-7.5 27.5 0s7.5 20 0 27.5L60 95z" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>
                    </svg>
                    <h2 style="font-size: 28px; margin-bottom: 16px; color: var(--text-primary);">健康档案</h2>
                    <p style="font-size: 18px; color: var(--text-secondary);">
                        查看健康记录和体检报告
                    </p>
                </div>
            `,
            'settings': `
                <div style="padding: 24px;">
                    <h3 style="font-size: 24px; margin-bottom: 24px; color: var(--text-primary);">系统设置</h3>
                    <div style="display: flex; flex-direction: column; gap: 24px;">
                        <div>
                            <div style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">检测端连接</div>
                            <div style="padding: 20px; background: var(--bg-secondary); border-radius: 12px;">
                                <div style="margin-bottom: 16px;">
                                    <label style="display: block; font-size: 14px; color: var(--text-secondary); margin-bottom: 8px;">服务器地址</label>
                                    <input type="text" id="server-host" value="${this.serverHost}" 
                                           style="width: 100%; padding: 12px; font-size: 16px; border: 1px solid var(--border-color); border-radius: 8px; background: white;">
                                </div>
                                <div style="margin-bottom: 16px;">
                                    <label style="display: block; font-size: 14px; color: var(--text-secondary); margin-bottom: 8px;">端口</label>
                                    <input type="number" id="server-port" value="${this.serverPort}" 
                                           style="width: 100%; padding: 12px; font-size: 16px; border: 1px solid var(--border-color); border-radius: 8px; background: white;">
                                </div>
                                <div style="display: flex; gap: 12px;">
                                    <button id="save-server-config" style="flex: 1; padding: 12px 24px; font-size: 16px; font-weight: 600; color: white; background: var(--accent); border: none; border-radius: 8px; cursor: pointer;">
                                        保存并重连
                                    </button>
                                    <button id="test-connection" style="flex: 1; padding: 12px 24px; font-size: 16px; font-weight: 600; color: var(--accent); background: rgba(0, 120, 212, 0.1); border: none; border-radius: 8px; cursor: pointer;">
                                        测试连接
                                    </button>
                                </div>
                                <div id="connection-message" style="margin-top: 12px; font-size: 14px; text-align: center;"></div>
                            </div>
                        </div>
                        <div>
                            <div style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">当前连接</div>
                            <div style="padding: 20px; background: var(--bg-secondary); border-radius: 12px;">
                                <div style="margin-bottom: 12px;">
                                    <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 4px;">WebSocket地址</div>
                                    <div style="font-size: 16px; font-weight: 500; word-break: break-all;">ws://${this.serverHost}:${this.serverPort}</div>
                                </div>
                                <div>
                                    <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 4px;">连接状态</div>
                                    <div id="settings-connection-status" style="font-size: 16px; font-weight: 500;">检查中...</div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <div style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">通知设置</div>
                            <div style="padding: 20px; background: var(--bg-secondary); border-radius: 12px;">
                                <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
                                    <span style="font-size: 16px;">声音提醒</span>
                                    <input type="checkbox" checked style="width: 48px; height: 24px;">
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            `
        };
        return contents[appName] || '<p>应用内容</p>';
    }
    
    // ==================== 来电功能 ====================
    
    showCall(alarmData) {
        if (this.isCallActive) return;
        
        const callScreen = document.getElementById('call-screen');
        const callStatusText = document.getElementById('call-status-text');
        const callDuration = document.getElementById('call-duration');
        const btnAnswer = document.getElementById('btn-answer');
        const btnReject = document.getElementById('btn-reject');
        const callerAvatar = document.querySelector('.caller-avatar');
        
        // 保存警报数据
        this.currentAlarmData = alarmData;
        
        // 重置UI状态
        callStatusText.textContent = '来电';
        callDuration.classList.add('hidden');
        btnAnswer.disabled = false;
        btnReject.querySelector('span').textContent = '拒接';
        
        // 启动头像动画
        if (callerAvatar) {
            callerAvatar.classList.remove('answered');
        }
        
        // 显示来电界面
        callScreen.classList.remove('hidden');
        
        // 关闭当前应用
        if (this.currentApp) {
            this.closeApp();
        }
        
        // 播放来电铃声
        this.playRingtone();
        
        console.log('收到来电，等待用户接听...');
    }
    
    answerCall() {
        if (this.isCallActive) return;
        
        console.log('用户接听电话');
        this.isCallActive = true;
        this.callStartTime = Date.now();
        
        // 停止来电铃声
        this.stopRingtone();
        
        // 更新UI
        const callStatusText = document.getElementById('call-status-text');
        const callDuration = document.getElementById('call-duration');
        const btnAnswer = document.getElementById('btn-answer');
        const btnReject = document.getElementById('btn-reject');
        const callerAvatar = document.querySelector('.caller-avatar');
        
        callStatusText.textContent = '通话中';
        callDuration.classList.remove('hidden');
        btnAnswer.disabled = true;
        btnReject.querySelector('span').textContent = '挂断';
        
        // 停止头像动画
        if (callerAvatar) {
            callerAvatar.classList.add('answered');
        }
        
        // 开始更新通话时长
        this.updateCallDuration();
        this.callDurationInterval = setInterval(() => {
            this.updateCallDuration();
        }, 1000);
        
        // 开始播放警报序列
        this.playAlarmSequence();
    }
    
    async playAlarmSequence() {
        console.log('开始播放警报序列');
        
        try {
            // 固定的TTS文案
            const ttsMessage = '紧急警报，您的家属李阿姨在卫生间跌倒，检测到心率过缓，呼吸节律异常，护工已就位实施救护，请您尽快赶到现场。';
            
            // 重复3次
            for (let i = 0; i < 3; i++) {
                if (!this.isCallActive) break; // 用户挂断则停止
                
                console.log(`第 ${i + 1} 次播报`);
                
                // 步骤1: 播放警报音2秒
                console.log('播放警报音2秒...');
                await this.playAlarmSound(2000);
                
                if (!this.isCallActive) break;
                
                // 步骤2: 播放TTS
                console.log('播放TTS语音...');
                await this.playWebSpeechTTS(ttsMessage);
                
                if (!this.isCallActive) break;
                
                // 间隔500ms再进行下一次
                if (i < 2) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
            
            // 播放完成后自动挂断
            if (this.isCallActive) {
                console.log('警报序列播放完成，自动挂断');
                this.rejectCall();
            }
            
        } catch (error) {
            console.error('警报序列出错:', error);
            if (this.isCallActive) {
                this.rejectCall();
            }
        }
    }
    
    playAlarmSound(duration) {
        return new Promise((resolve) => {
            if (!this.isCallActive) {
                resolve();
                return;
            }
            
            if (!this.alarmAudio) {
                console.warn('未找到警报音频元素');
                resolve();
                return;
            }
            
            // 重置音频状态
            this.alarmAudio.pause();
            this.alarmAudio.currentTime = 0;
            
            // 播放警报音
            const playPromise = this.alarmAudio.play();
            
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log('✓ 警报音播放中');
                    
                    // 设置定时器，duration毫秒后停止
                    setTimeout(() => {
                        if (this.alarmAudio) {
                            this.alarmAudio.pause();
                            this.alarmAudio.currentTime = 0;
                        }
                        console.log('✓ 警报音播放完成');
                        resolve();
                    }, duration);
                    
                }).catch(err => {
                    console.error('✗ 警报音播放失败:', err);
                    resolve(); // 即使失败也继续
                });
            } else {
                resolve();
            }
        });
    }
    
    playWebSpeechTTS(message) {
        return new Promise((resolve) => {
            if (!this.isCallActive) {
                resolve();
                return;
            }
            
            if (!('speechSynthesis' in window)) {
                console.warn('浏览器不支持 Web Speech API');
                resolve();
                return;
            }
            
            const utterance = new SpeechSynthesisUtterance(message);
            utterance.lang = 'zh-CN';
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            
            utterance.onend = () => {
                console.log('✓ TTS播放完成');
                resolve();
            };
            
            utterance.onerror = (err) => {
                console.error('✗ TTS播放失败:', err);
                resolve(); // 即使失败也继续
            };
            
            window.speechSynthesis.speak(utterance);
            console.log('✓ TTS播放中');
        });
    }
    
    rejectCall() {
        console.log('挂断电话');
        
        // 停止来电铃声
        this.stopRingtone();
        
        // 停止所有音频
        this.stopAllAudio();
        
        // 停止通话时长更新
        if (this.callDurationInterval) {
            clearInterval(this.callDurationInterval);
            this.callDurationInterval = null;
        }
        
        // 隐藏来电界面
        document.getElementById('call-screen').classList.add('hidden');
        
        // 重置状态
        this.isCallActive = false;
        this.callStartTime = null;
        this.currentAlarmData = null;
        
        console.log('✓ 已挂断');
    }
    
    updateCallDuration() {
        if (!this.callStartTime) return;
        
        const elapsed = Math.floor((Date.now() - this.callStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        const durationText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        document.getElementById('call-duration').textContent = durationText;
    }
    
    playRingtone() {
        // 播放来电铃声
        if (!this.ringtoneAudio) {
            console.error('✗ 来电铃声音频元素未找到');
            return;
        }
        
        // 确保音频已重置
        this.ringtoneAudio.pause();
        this.ringtoneAudio.currentTime = 0;
        this.ringtoneAudio.loop = true; // 循环播放
        
        // 播放音频
        const playPromise = this.ringtoneAudio.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                console.log('✓ 来电铃声播放中');
            }).catch(err => {
                console.error('✗ 来电铃声播放失败:', err);
                
                // 如果音频未解锁，尝试再次解锁
                if (!this.audioUnlocked) {
                    console.log('尝试解锁音频...');
                    this.unlockAudio();
                }
            });
        }
    }
    
    stopRingtone() {
        // 停止来电铃声
        if (!this.ringtoneAudio) return;
        
        try {
            this.ringtoneAudio.pause();
            this.ringtoneAudio.currentTime = 0;
            this.ringtoneAudio.loop = false;
            console.log('✓ 来电铃声已停止');
        } catch (err) {
            console.error('✗ 停止铃声失败:', err);
        }
    }
    
    stopAllAudio() {
        // 停止警报音
        if (this.alarmAudio) {
            try {
                this.alarmAudio.pause();
                this.alarmAudio.currentTime = 0;
            } catch (err) {
                console.error('停止警报音失败:', err);
            }
        }
        
        // 停止 Web Speech TTS
        if ('speechSynthesis' in window) {
            try {
                window.speechSynthesis.cancel();
            } catch (err) {
                console.error('停止TTS失败:', err);
            }
        }
        
        console.log('✓ 已停止所有音频');
    }
    
    showTestCall() {
        const testData = {
            person_name: '李阿姨',
            location_name: '卫生间'
        };
        
        this.showCall(testData);
    }
    
    // ==================== 全屏功能 ====================
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            // 进入全屏
            document.documentElement.requestFullscreen().then(() => {
                console.log('✓ 已进入全屏模式');
            }).catch(err => {
                console.error('✗ 进入全屏失败:', err);
            });
        } else {
            // 退出全屏
            document.exitFullscreen().then(() => {
                console.log('✓ 已退出全屏模式');
            }).catch(err => {
                console.error('✗ 退出全屏失败:', err);
            });
        }
    }
    
    updateFullscreenButton() {
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        if (!fullscreenBtn) return;
        
        const svg = fullscreenBtn.querySelector('svg');
        if (!svg) return;
        
        if (document.fullscreenElement) {
            // 全屏状态 - 显示退出全屏图标
            svg.innerHTML = '<path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
            fullscreenBtn.title = '退出全屏';
        } else {
            // 非全屏状态 - 显示进入全屏图标
            svg.innerHTML = '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
            fullscreenBtn.title = '全屏';
        }
    }
    
    // ==================== 网络连接 ====================
    
    connectToServer() {
        // 尝试连接到检测服务器
        const wsUrl = `ws://${this.serverHost}:${this.serverPort}`;
        console.log(`正在连接到: ${wsUrl}`);
        
        try {
            this.socket = new WebSocket(wsUrl);
            
            this.socket.onopen = () => {
                console.log(`✓ 已连接到检测端: ${this.serverHost}:${this.serverPort}`);
                
                // 更新连接状态显示
                this.updateConnectionStatus(true);
                
                // 发送注册消息
                this.socket.send(JSON.stringify({
                    type: 'register',
                    device_name: '监护平板'
                }));
            };
            
            this.socket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    
                    if (message.type === 'fall_alarm') {
                        const alarmData = {
                            person_name: message.person_name || '被监护人',
                            location_name: message.location_name || '监护区域',
                            vital_signs: message.vital_signs || {},
                            time: message.time || ''
                        };
                        
                        this.showCall(alarmData);
                    } else if (message.type === 'connected') {
                        console.log('收到服务器欢迎消息:', message.message);
                    }
                } catch (e) {
                    console.error('消息解析失败:', e);
                }
            };
            
            this.socket.onerror = (error) => {
                console.error('WebSocket错误:', error);
                this.updateConnectionStatus(false);
            };
            
            this.socket.onclose = () => {
                console.log('连接已断开，5秒后重连...');
                this.updateConnectionStatus(false);
                setTimeout(() => this.connectToServer(), 5000);
            };
            
        } catch (e) {
            console.error('连接失败:', e);
            console.log(`无法连接到 ${wsUrl}`);
            console.log('请检查：');
            console.log('1. 检测端是否已启动');
            console.log('2. 服务器地址和端口是否正确');
            console.log('3. 在"系统设置"中可以修改服务器地址');
            console.log('\n按 T 键可以触发测试警报（需要先连接成功）');
            
            this.updateConnectionStatus(false);
        }
    }
    
    updateConnectionStatus(connected) {
        // 更新监控页面的状态
        const monitorStatus = document.getElementById('connection-status');
        if (monitorStatus) {
            if (connected) {
                monitorStatus.textContent = '● 已连接';
                monitorStatus.style.color = 'var(--success)';
            } else {
                monitorStatus.textContent = '● 未连接';
                monitorStatus.style.color = 'var(--danger)';
            }
        }
        
        // 更新设置页面的状态
        const settingsStatus = document.getElementById('settings-connection-status');
        if (settingsStatus) {
            if (connected) {
                settingsStatus.textContent = '✓ 已连接';
                settingsStatus.style.color = 'var(--success)';
            } else {
                settingsStatus.textContent = '✗ 未连接';
                settingsStatus.style.color = 'var(--danger)';
            }
        }
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.tabletOS = new TabletOS();
});
