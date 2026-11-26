# 键盘系统与 MacBook Edition

基线为 KuroCat 5.1.2，上游提交 `93e6432949d41ca0df652da24cd75530f7e190b7`。桌宠由 Tauri 主进程、桌面 WebView 和独立菜单窗口组成。OBS 和 Android Web 也消费同一布局。以下分析以该提交为准。

| 范围 | 入口与数据流 | 本次改动 |
| --- | --- | --- |
| 原生输入 | input_hook.rs 把 Quartz 虚拟键码、IOHID usage、Linux evdev 转成应用内部 VK。Windows 使用钩子提供的 VK。原有事件处理还负责去重、隐私模式与分发 | 保留事件格式和 HID 回退，把 macOS 物理键码表移到可测试模块。单独处理左右修饰键和可观察到的 Fn。Touch ID 无绑定 |
| 键位定义 | keyboardLayout.ts 的 KeySpec 同时携带稳定 ID、键帽字符、气泡、VK 列表和以普通键宽为单位的矩形。65 布局会把功能键折叠到数字行。108 布局独立处理功能区、导航区、小键盘 | 新建独立配列表并注册到各布局自己的 VK 索引。保留旧配列和查找规则 |
| 2D | catEngine.ts 将 uStart/uWidth、rowY/rowSpan 转成梯形键盘坐标。两种方向同时变换位置和图例。静态键盘缓存到画布，仅重画活动键。爪子和尾巴复用键中心 | 为薄键帽与半高箭头调整外观，初始化 MacBook 新键动画。复用原有按键状态和投影 |
| 3D | catEngine3d.ts 调用 KeyboardAndMouse3D.rebuildBoard。机身合并为一份几何，键帽侧面和顶面分别用 InstancedMesh，所有图例共用一张 CanvasTexture。activeKeys 只更新正在运动的实例，keyTopWorld 提供爪子落点 | 新配列使用薄金属机身、圆角键帽、短键程和共享图例。每键继续使用实例矩阵 |
| 设置 | main.ts 把 AppSettings 送入所选引擎。index.html 和独立 menu.html 各有入口。menuMain.ts 发送设置修改。Rust lib.rs 持久化并广播，托盘另有原生入口 | 统一前端布局校验，同步桌宠、菜单、托盘、OBS 和 Android Web。五种语言从 locales/*.json 载入 |
| 配置与 MCP | config.rs 提供 Serde 默认值和字符串归一化，启用 layout-108 构建特性时默认 108。mcp.rs 的 get_settings 读取已有配置，update_settings 按参数更新，桌面进程接收配置变更 | 扩展原有枚举并保留字段、默认值及旧客户端的部分更新语义 |
| 构建 | package-lock.json 锁定 npm 依赖。npm run build 运行 TypeScript 和 Vite，Tauri v2 使用 Cargo.lock。release.yml 的 macOS 任务编译 Universal app，再签名、打包和校验 | 开发验收使用 aarch64-apple-darwin；保留原项目的签名和分发流程 |

## 设计与验收

参考 2021 年 14 英寸 MacBook Pro 的美式物理功能行，F4 为 Spotlight、F5 为听写、F6 为勿扰。普通字母占 1U，宽键按 ANSI 阶梯行配列。底行按 fn、control、option、command、空格、command、option、箭头排列。按需求采用全高左右箭头和半高上下箭头，这一处是产品指定的外观变体。尺寸以键距估算。

先验证各键边界、互不重叠、VK 唯一和左右修饰键释放，再检查两个方向的坐标、2D 动画和 3D 实例数量。设置需分别覆盖菜单切换、磁盘恢复和 MCP 部分更新。系统截获的功能行事件和不可见的 Fn 不产生替代按键。原生权限、实际爪子接触、缩放与安装包需要独立记录实测状态。

[上游源码](https://github.com/qianyiai/kurocat/tree/93e6432949d41ca0df652da24cd75530f7e190b7) · [Apple 技术规格](https://support.apple.com/en-hk/111902) · [Apple 功能行说明](https://support.apple.com/guide/macbook-pro/apdab672d5e9/mac)
