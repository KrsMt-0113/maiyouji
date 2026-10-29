# 麦游记 MCP 集成

真实服务固定连接 `https://mcp.mcd.cn`，通过官方 `@modelcontextprotocol/sdk` 的 Streamable HTTP 客户端接入。凭据从服务端环境变量或用户主动启动的本机配置复用脚本获取。

## 工具与界面对应

| 界面 / 流程                        | MCP Tool                                                                                                             |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 门店搜索、收藏门店、得来速         | `query-nearby-stores`                                                                                                |
| 配送地址查询与新增、可配送门店     | `delivery-query-addresses`, `delivery-create-address`, `delivery-query-stores`                                       |
| 菜单、套餐选择、特调               | `query-meals`, `query-meal-detail`                                                                                   |
| 门店券、费用、创建点餐订单         | `query-store-coupons`, `calculate-price`, `create-order`                                                             |
| 团餐服务与促销                     | `query-meal-assistance`, `query-promotions`                                                                          |
| 点餐订单、详情、取消、满意度奖券   | `order-list`, `query-order`, `cancel-order`, `query-survey-coupon`                                                   |
| 活动日历                           | `campaign-calendar`                                                                                                  |
| 麦麦省查询与领券、我的卡包         | `available-coupons`, `auto-bind-coupons`, `query-my-coupons`                                                         |
| 积分、商城、规格、兑换             | `query-my-account`, `mall-points-products`, `mall-product-detail`, `mall-create-order`                               |
| 商城订单列表与详情                 | `mall-order-list`, `mall-order-detail`                                                                               |
| 抽奖信息、一次抽奖、奖品分页       | `query-lottery-info`, `draw-lottery`, `query-my-prizes`                                                              |
| 活动的城市、门店、日期、场次与预约 | `query-party-city`, `query-party-store`, `query-party-store-date`, `query-party-store-session`, `party-order-create` |
| 营养对照与餐品详情营养参考         | `list-nutrition-foods`                                                                                               |
| 服务器时间能力与只读诊断           | `now-time-info`                                                                                                      |

共 35 项能力。工具在服务端会先通过 `tools/list` 发现，参数按上游 JSON Schema 校验；官方工具名如 `query-partystore-date` 与客户端的 `query-party-store-date` 通过规范化名称匹配。

## 一餐的完整流程

1. 用户选择到店、外送、得来速或团餐，提供搜索城市 / 关键词，或选择已保存配送地址。
2. 查询门店；展示门店编号、业务编码和全部可预约日期 / 时段。
3. 选择门店后读取菜单，点击餐品读取实际详情。
4. 用户选择套餐子项与数量；主动展开特调，按组内约束选择配料。
5. 将购物袋与门店券提交 `calculate-price`，按整数分展示费用。
6. 用户选择官方返回的取餐方式，再请求服务端生成订单预览。
7. 预览重新核价并读取详情解释选配，必要时校验已选配送地址；仅此阶段不会下单。
8. 用户点击最终确认；服务端再核价一次，价格或取餐方式变化则停止。预览失效、跨会话或重复提交会被拒绝。
9. 调用 `create-order`，原样展示实际结果，用户自行打开返回的 HTTPS 支付链接。
10. 用户在订单页刷新最新状态，或明确选择原因后取消订单。

`beType=1` 不传 `beCode`；`5` 是到店订单且必须传 `beCode`；`2/6` 是外送订单且必须传 `beCode`，并使用选择的地址。预约时间完整传递给菜单、详情、核价和创建订单。

## 特调中容易出错的地方

- 同一个饮料的标准、去冰、多冰、少冰可能具有**相同 code、不同 selectedKey**，不能按 code 做单一开关。界面与业务函数按组内索引区分选项。
- 取消某项配料后，若存在 `unselectedKey`，也会显式传递该项，数量为 0。
- 套餐子项的 `maxQuantity=-1` 是无限制哨兵，不当作负数上限。
- 选配轮次数量与组内必选范围会在本地检查；最终业务合法性由官方工具校验。

## 权益、抽奖与活动

- 卡包展示与门店可用券查询分离；没有关联当前餐品的券不会被自动套用。
- 抽奖只信 `drawDecision`，次数为零不直接判为不可抽；下一次消耗或兜底规则变化时重新确认。
- 商城只对 `shopId=2` 使用 `mall-create-order`，活动 `shopId=5` 使用单独逐步选择的预约流程。
- 商品须知按原文文本展示，不执行其中 HTML，不从人数或限购文案中提取规则推算库存。
- 活动提交前重查场次；兑换提交前重查规格与消耗。官方可能返回部分成功或失败，界面保留真实状态，不直接写“全部成功”。

## 本机数据与实测边界

趣味随机、印章、徽章、手账和胶囊不调用账户变更工具，不伪装成官方活动。公开菜单快照用于标注清楚的演示模式。真实模式不回退到演示。

实测记录见 [docs/live-verification.json](docs/live-verification.json)。真实联调全部为只读；交易变更在隔离的演示网关和测试替身中验证，未消费真实资金、积分或权益。不把模拟交易说成真实交易已经完成。
