# MacBook Edition · 首个预览版

基于 KuroCat 5.1.2，为原有桌宠增加一套 2021 款 14 英寸 MacBook Pro 美式键盘。

- 3D 使用薄键帽、合并的金属色机身、单张图集和两组键帽实例。2D 复用相同坐标、功能行图标与传感器图例。
- 底行采用 fn、control、option、command、空格、右 command、右 option 和方向键。上下箭头共享一列，左右箭头依本版需求使用全高。
- 设置菜单、托盘、OBS 和 MCP 共用 `keyboardLayout`。正常构建的默认配列为 65，原有 108 构建选项继续生效。
- macOS 从 Quartz 或已匹配的键盘 HID 设备读取可用按键。左右修饰键分别处理；没有可用事件时对应键帽保持静止。Touch ID 无按键输入绑定。

## 验证范围

自动检查覆盖上游紧凑和全尺寸布局、MacBook 键位边界、左右修饰键、按键下压与释放、猫爪目标、键帽实例数、两个方向、MCP 配置更新与跨进程恢复。CI 同时运行 TypeScript/Vite 构建、Rust 测试、Apple Silicon 打包和签名校验。

截图取自生产渲染器，输入来自测试夹具。内置键盘实际投递的 Fn、媒体键、按住左右修饰键时的原生行为，以及系统授权和不同缩放下的观感仍需在对应硬件上验收。

[测试记录与构建制品](https://github.com/qianyiai/kurocat/actions/workflows/macbook.yml) · [安装和本地构建](../README.md)
