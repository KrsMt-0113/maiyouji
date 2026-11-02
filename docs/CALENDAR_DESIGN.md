# 活动日历修复与设计验证

## 真实问题

2026-11-02 在真实 MCP 版本（本地 4318 端口）复现：旧界面把所有活动全文直接堆叠，缺少活动间隔、摘要、海报与披露层级；重复出现 `GOOD THINGS AHEAD`，没有使用服务返回的 `articleDto.highlights` 和 `imgList`。旧“看看这一天”还误把指定日期接口返回的邻近活动也一起展示。

已直接调用真实 `campaign-calendar`，核对当天 10 条、次日 1 条；当月完整结果为 9 个活动日、18 条活动。该数量仅为本次检查快照。

## 新的呈现方式

- 读取当月完整结果，日历标出有活动的日期；所选日期严格本地过滤，不混入临近日期。
- 月历支持收起为所选日期所在周，给列表留出空间。保留今天快捷键与刷新；只呈现服务支持的当月，不编造历史月份结果。
- 活动列表按日期分组，以实色内容面、分隔线、海报缩略图、标题、服务提供的摘要和展开箭头区分层级。
- 点开活动后显示完整多行文案与原比例海报。使用原生 `details/summary`，支持键盘展开与折叠，不叠加第二张弹窗。
- 不执行服务文案里的“立即购买”等指令，也不把活动 `price="0"` 显示成免费。所有参与条件和有效期以官方为准；日历日期不是有效期推断。
- 图片只接受 HTTPS，错误时缩略图回退到图标；内容以文本渲染，不注入远端 HTML。

## Apple Design Skill 依据

本轮查看了 accessibility、layout、typography、color、designing-for-ios、cross-platform、pickers、disclosure-controls、lists-and-tables、sheets。它们映射到 React Web，而非原生 UIKit。

- `layout.md › Visual hierarchy`：“Group related items”——月历、显示范围、日期标题、活动列表分组明确。
- `disclosure-controls.md › Best practices`：“hide details until they’re relevant”——摘要先行，全文与海报按需展开。
- `lists-and-tables.md › Best practices`：“Prefer displaying text in a list or table.”——统一行式结构，避免宣传长文挤满面板。
- `pickers.md › Best practices`：“Use predictable and logically ordered values.”——周一到周日的常见月历顺序，明确今天与所选日期。
- `accessibility.md › Vision`：“Support larger text sizes.”——以 rem 定义字体，窄屏大字号下切回单列并隐藏非必要缩略图。
- `sheets.md › Best practices`：“Display only one sheet at a time”——详情在同一面板内披露，保留关闭与 Escape。

颜色沿用 app 明暗语义色；只有日期选中和动作使用操作色。今天使用轮廓、选择使用实心圆，同时提供 `aria-current`、`aria-pressed` 与完整日期/活动数量标签，非单靠颜色。方向键可切换日期；减少动态偏好下取消箭头过渡。玻璃悬浮导航保留，日历内容没有加玻璃装饰。

自我审查：月历展开时会占用手机较多高度，因此提供明确的“收起月历”按钮保留一周视图；活动标题不截断，次级摘要最多两行，原文始终可展开。海报缩略图允许裁切，展开海报完整保留比例。

## 验证记录

- 真实版本：选 11 月 3 日，只显示 1 条活动；选 11 月 6 日，显示未发布活动提示；切换本月全部显示 9 组、18 条。
- 详情：真实海报加载成功，宽高按图片比例渲染，无面板横向溢出。
- 键盘：右方向键从 11 月 2 日切至 3 日，焦点与列表一起更新；原生披露控件支持键盘。
- 390×844 手机浅色、1440×1000 桌面深色完成视觉检查，桌面左右列为 240px / 392px。
- 360px、根字号 34px（200%）时，面板滚动宽度为 360px，无横向溢出；日期按钮宽约 46.9px。检查后修正了选中日期圆形在大字号下变窄的问题。
- 新增 4 项数据契约测试：图文结构与零价格、异常数据和重复日期、券图与正价格、跨月及闰年月历对齐。连同原业务测试共 52 项通过，TypeScript / Vite 构建通过。

检查期间只读真实活动；没有领取优惠券、抽奖、订阅、下单或支付。截图仅含公开活动内容。未做 iPhone 真机 VoiceOver 认证。
