# WhatsApp / Telegram / Line 专用分流系统开发文档

版本：v1.0  
日期：2026-06-28  
技术栈：TypeScript / Next.js / Node.js / Cloudflare Workers / KV / Queues / D1

## 1. 项目定位

本项目是一个面向 WhatsApp、Telegram、Line 的专用极速分流 SaaS 工具，包含会员前台、客户后台、管理员后台、域名管理、套餐权限、访问统计和 Cloudflare 边缘跳转能力。

核心目标：

- 客户访问分流链接时，不经过业务服务器。
- 高频跳转逻辑全部放在 Cloudflare Worker 边缘执行。
- 分流配置由业务后台生成快照，并发布到 Cloudflare KV。
- 访问统计通过 Cloudflare Queues 异步写入，避免阻塞跳转。
- 会员、套餐、订单、权限、域名、统计查询由 Node.js 后端负责。
- 第一版聚焦 WhatsApp / Telegram / Line，不做大而全的通用短链平台。

非目标：

- 不做严格全球顺序轮询。
- 不在每次跳转时查询业务服务器或 D1。
- 不在第一版实现复杂斗篷页、多层代理链路、大型 IP 段算法。
- 不把 Analytics Engine 当作唯一业务数据库。

## 2. 总体架构

```text
用户 / 管理员后台
  |
  | 创建、编辑、发布分流服务
  v
Next.js 前端
  |
  | REST API / Server Actions
  v
Node.js 后端
  |
  | 业务数据库读写
  | 生成 Worker 可直接使用的快照
  | 调用 Cloudflare API
  v
Cloudflare KV
  |
  | 用户访问 https://domain.com/v/{shortCode}
  v
Cloudflare Worker
  |
  | 读取 KV 快照
  | 校验状态 / 到期 / 拦截
  | 选择目标账号
  | 生成平台跳转链接
  | 投递访问事件
  v
Cloudflare Queues
  |
  | 批量消费、重试
  v
Node.js 统计回写接口 / D1
  |
  v
访问明细表 / 每日汇总表
```

推荐第一版保留一台业务服务器，负责会员和后台业务。Cloudflare 负责边缘跳转、KV 配置读取、队列统计、客户域名接入和静态资源托管。

## 3. 技术选型

### 3.1 前端

- Next.js App Router
- TypeScript
- Tailwind CSS 或现有 UI 组件库
- React Hook Form + Zod
- TanStack Query 或 SWR
- qrcode 生成二维码

前端部署方式：

- 可部署在业务服务器。
- 也可部署到 Cloudflare Pages。
- 管理后台 API 不直接暴露 Cloudflare Token。

### 3.2 后端

- Node.js
- TypeScript
- 推荐框架：NestJS、Fastify 或 Next.js API Route 独立服务
- ORM：Prisma、Drizzle 或 Kysely
- 数据库：
  - MVP 可用 PostgreSQL / MySQL / SQLite 任意一种业务库。
  - 如坚持 Cloudflare 原生，可使用 D1，但不要放在高频跳转路径。

### 3.3 Cloudflare

- Workers：处理 `/v/{shortCode}` 跳转。
- KV：存储高频读取的分流快照。
- Queues：异步访问事件。
- D1：可选，存后台关系数据或统计聚合。
- Analytics Engine：可选，做趋势图和粗粒度分析。
- Cloudflare for SaaS / Custom Hostnames：客户自定义域名。

## 4. 核心设计原则

### 4.1 跳转路径必须极简

正确路径：

```text
GET /v/abc123 -> Worker -> KV -> 302
```

不推荐：

```text
GET /v/abc123 -> Worker -> D1 / 业务服务器 -> 302
```

原因：

- 跳转是最高频路径。
- 查询源站会增加延迟。
- 高并发会压垮业务数据库。
- KV 更适合读多写少的配置快照。
- D1 更适合后台管理和关系查询。

### 4.2 KV 是发布快照，不是业务主库

数据库存完整业务数据，KV 只存 Worker 可直接使用的快照。

后台每次创建、编辑、启用、禁用、到期恢复、拦截配置变化时，重新生成服务快照并发布到 KV。

### 4.3 统计异步化

Worker 只负责生成访问事件并投递 Queue，不等待数据库写入。

统计消费者批量写入：

- 访问明细
- 服务每日汇总
- 目标账号每日汇总
- IP 来源表

### 4.4 所有 Cloudflare Token 只放后端

前端不能持有：

- Cloudflare API Token
- Worker Secret
- Queue Secret
- Track Secret

## 5. 系统模块

### 5.1 用户前台

功能：

- 注册
- 登录
- 找回密码
- 套餐状态
- 账号资料
- 订单记录
- API 密钥管理，第二阶段可做

### 5.2 客户后台

功能：

- 服务列表
- 创建分流服务
- 编辑分流服务
- 删除 / 暂停 / 恢复服务
- 分流账号管理
- 平台选择：WhatsApp / Telegram / Line
- 分流规则：随机 / 顺序
- IP 锁定独立开关
- 批量问候语
- 自动去重
- 拦截配置
- IP 黑名单
- 域名选择
- 复制链接
- 二维码
- 访问统计
- 清除统计
- 发布状态查看

### 5.3 管理员后台

功能：

- 用户管理
- 套餐管理
- 订单管理
- 域名池管理
- 域名分配
- 自定义域名审核 / 检测
- Cloudflare 配置检测
- KV 发布状态
- Queue 积压监控
- Worker 版本管理
- 异常服务排查
- 统计清理
- 系统设置

### 5.4 Worker 跳转服务

功能：

- 接收 `/v/{shortCode}`
- 读取 `route:{shortCode}`
- 读取 `service:{platform}:{shortCode}`
- 检查服务状态
- 检查会员到期
- 执行拦截规则
- 选择目标账号
- 生成平台跳转 URL
- 投递统计事件
- 返回 302

### 5.5 Queue Consumer

功能：

- 批量消费访问事件
- 调用业务服务器 `/api/cf/track/batch`
- 或直接写入 D1
- 写入失败时重试
- 死信队列记录异常事件，第二阶段可做

## 6. Cloudflare KV 设计

### 6.1 Key 规范

```text
route:{shortCode}
service:{platform}:{shortCode}
domain:{hostname}
iplist:{listId}
```

### 6.2 route 快照

Key：

```text
route:abc123
```

Value：

```json
{
  "version": 1,
  "platform": "whatsapp",
  "shortCode": "abc123",
  "serviceKey": "service:whatsapp:abc123"
}
```

用途：

- Worker 快速判断短码属于哪个平台。
- 支持一个域名下共用 WhatsApp / Telegram / Line。

### 6.3 service 快照

Key：

```text
service:whatsapp:abc123
```

Value：

```json
{
  "version": 1,
  "platform": "whatsapp",
  "serviceId": 10001,
  "userId": 20001,
  "shortCode": "abc123",
  "status": true,
  "membershipExpiresAt": "2026-12-31T23:59:59Z",
  "redirectType": "phone",
  "accessRule": "random",
  "lockIP": true,
  "ipLockGroupId": "group_001",
  "greetingMode": "batch",
  "globalGreeting": "",
  "greetingPool": ["hello", "hi", "price please"],
  "edgeBlock": {
    "blockAllEnabled": false,
    "countryAllowEnabled": false,
    "allowedCountries": [],
    "countryBlockEnabled": false,
    "blockedCountries": [],
    "blockChinese": false,
    "ipBlockListIds": [],
    "action": "not_found",
    "redirectUrl": ""
  },
  "targets": [
    {
      "id": "target_1",
      "url": "60123456789",
      "enabled": true,
      "remark": "客服A",
      "greeting": "",
      "workOrderIds": [1, 2]
    }
  ],
  "updatedAt": "2026-06-28T00:00:00Z"
}
```

注意：

- KV 更新是最终一致。
- 后台发布成功后，应提示“预计 5-60 秒全球生效”。
- 同一个 key 避免并发写入，发布操作应串行化或进入发布队列。

## 7. Worker 路由设计

### 7.1 请求路径

```text
GET /v/{shortCode}
```

可选路径：

```text
GET /r/{shortCode}
GET /go/{shortCode}
```

第一版建议只保留 `/v/{shortCode}`，减少客户理解成本。

### 7.2 执行流程

```text
1. 解析 shortCode
2. 校验 shortCode 格式
3. 读取 route:{shortCode}
4. 未找到则返回 404
5. 读取 service:{platform}:{shortCode}
6. 未找到则返回 404
7. 检查 status
8. 检查 membershipExpiresAt
9. 执行拦截规则
10. 筛选 enabled targets
11. 根据 accessRule 选择目标
12. 生成平台跳转 URL
13. 投递访问事件到 Queue
14. 返回 302
```

### 7.3 拦截顺序

```text
1. 服务是否启用
2. 会员是否到期
3. 拦截全部
4. 允许国家
5. 拦截国家
6. 中文浏览器
7. IP 黑名单
8. 选择目标账号
9. 投递统计
10. 跳转
```

被拦截访问默认不计入正常分流统计。后期可单独写入 `block_events`。

## 8. 平台跳转规则

### 8.1 WhatsApp

支持输入：

- `60123456789`
- `+60123456789`
- `https://wa.me/60123456789`
- `https://www.whatsapp.com/...`
- `https://api.whatsapp.com/...`

标准生成：

```text
https://wa.me/{phone}?text={encodedGreeting}
```

校验规则：

- 手机号去除空格、括号、短横线。
- `+` 只允许出现在开头。
- 完整链接只允许：
  - `wa.me`
  - `whatsapp.com`
  - `*.whatsapp.com`
- 禁止 `javascript:`、`data:`、空协议、协议相对 URL。

问候语优先级：

```text
目标账号独立问候语 > 全局单条问候语 > 全局问候语池随机 > 空
```

### 8.2 Telegram

支持输入：

- `username`
- `@username`
- `+447...`
- `https://t.me/username`
- `https://telegram.me/username`

标准生成：

```text
https://t.me/{username}
```

校验规则：

- 完整链接只允许 `t.me`、`telegram.me`。
- 用户名移除开头 `@`。
- 特殊邀请链接可作为完整链接保存，但必须校验协议和域名。

### 8.3 Line

支持输入：

- `lineid`
- `@lineid`
- `https://line.me/ti/p/...`
- 合法外部 HTTPS 链接

标准生成：

```text
https://line.me/ti/p/{id}
```

校验规则：

- `@lineid` 保存时可保留，也可去除后生成。
- 完整链接必须是 `https`。
- 禁止 `javascript:`、`data:`、空协议。

## 9. 分流规则

### 9.1 随机

默认规则。

```text
从 enabled targets 中随机选择一个
```

优点：

- 无状态
- 速度最快
- 最适合边缘 KV 架构

### 9.2 顺序

第一版采用 Worker 实例内存计数：

```text
index = localCounter++ % targets.length
```

注意：

- 每个边缘实例有自己的内存。
- 不保证全球严格轮询。
- 后台文案必须说明“边缘近似顺序”。

如未来需要严格顺序，可考虑 Durable Objects，但会增加延迟和复杂度。

### 9.3 IP 锁定

IP 锁定不是分流规则的一种，而是独立开关。

逻辑：

```text
index = hash(ip + ipLockGroupId) % targets.length
```

效果：

- 同一 IP 固定分到同一客服。
- 不查数据库。
- 高并发稳定。

注意：

- 目标账号数量变化后，部分 IP 映射会变化。
- 多个服务共享锁定关系时，使用同一个 `ipLockGroupId`。

## 10. 拦截配置

第一版支持：

- 拦截全部
- 允许国家
- 拦截国家
- 中文浏览器拦截
- IP 黑名单
- 拦截后返回 404
- 拦截后跳转指定 URL

国家来源：

```text
request.cf.country
```

中文浏览器判断：

- `Accept-Language` 包含 `zh`
- 可选判断 UA 中常见中文环境标识

IP 获取：

```text
CF-Connecting-IP
```

IP 处理：

- 明细表可以存原始 IP。
- 统计去重建议存 `sha256(ip + secretSalt)`。
- 如业务涉及隐私合规，原始 IP 可配置保留天数。

## 11. IP 库设计

### 11.1 MVP

只做小型黑名单：

- 手动添加 IP
- 批量导入 IP
- 删除 IP
- 绑定到服务
- Worker 从 KV 读取

KV：

```text
iplist:{listId}
```

Value：

```json
{
  "version": 1,
  "listId": "list_001",
  "type": "blacklist",
  "items": ["1.1.1.1", "2.2.2.2"],
  "updatedAt": "2026-06-28T00:00:00Z"
}
```

### 11.2 第二阶段

- CIDR 支持
- IP 段压缩
- ASN 拦截
- 设备拦截
- 大 IP 库按前缀拆分 KV

## 12. 域名设计

### 12.1 公共域名

平台域名由管理员维护：

```text
go.example.com
wa.example.com
mp.example.com
```

用户创建服务时选择可用域名。

### 12.2 管理员分配域名

流程：

```text
管理员添加域名
-> 设置状态 active
-> 分配给用户
-> 用户服务选择域名
-> 生成分流链接
```

### 12.3 客户自定义子域名

第一版可由管理员协助：

```text
客户提交 mp.customer.com
-> 系统创建 Custom Hostname
-> 生成 CNAME 指引
-> 客户添加 DNS
-> 系统定时检测状态
-> active 后可用
```

第一版不支持根域名自助绑定。

### 12.4 域名与平台关系

一个域名可用于三个平台：

```text
https://mp.customer.com/v/wa123
https://mp.customer.com/v/tg123
https://mp.customer.com/v/line123
```

Worker 通过 `route:{shortCode}` 判断平台。

## 13. 后端 API 设计

### 13.1 认证

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/forgot-password
POST /api/auth/reset-password
```

### 13.2 用户服务

```text
GET    /api/services
POST   /api/services
GET    /api/services/{id}
PATCH  /api/services/{id}
DELETE /api/services/{id}
POST   /api/services/{id}/pause
POST   /api/services/{id}/resume
POST   /api/services/{id}/publish
POST   /api/services/{id}/clear-stats
```

### 13.3 目标账号

```text
GET    /api/services/{id}/targets
POST   /api/services/{id}/targets
PATCH  /api/services/{id}/targets/{targetId}
DELETE /api/services/{id}/targets/{targetId}
POST   /api/services/{id}/targets/bulk
```

### 13.4 拦截配置

```text
GET   /api/services/{id}/edge-block
PATCH /api/services/{id}/edge-block
```

### 13.5 统计

```text
GET  /api/services/{id}/stats/summary
GET  /api/services/{id}/stats/events
GET  /api/services/{id}/stats/targets
POST /api/services/{id}/stats/clear-today
POST /api/services/{id}/stats/clear-all
```

### 13.6 域名

用户侧：

```text
GET  /api/domains/available
POST /api/domains/custom-hostnames
GET  /api/domains/custom-hostnames/{id}
```

管理员侧：

```text
GET    /api/admin/domains
POST   /api/admin/domains
PATCH  /api/admin/domains/{id}
DELETE /api/admin/domains/{id}
POST   /api/admin/domains/{id}/assign
POST   /api/admin/domains/{id}/check
```

### 13.7 管理员

```text
GET   /api/admin/users
GET   /api/admin/users/{id}
PATCH /api/admin/users/{id}
POST  /api/admin/users/{id}/ban
POST  /api/admin/users/{id}/unban

GET    /api/admin/plans
POST   /api/admin/plans
PATCH  /api/admin/plans/{id}
DELETE /api/admin/plans/{id}

GET /api/admin/cf/health
GET /api/admin/cf/kv-publish-logs
GET /api/admin/cf/queue-status
```

### 13.8 Cloudflare 内部接口

```text
POST /api/cf/track/batch
```

Header：

```text
x-cf-track-secret: {secret}
```

Body：

```json
{
  "events": [
    {
      "eventId": "uuid",
      "platform": "whatsapp",
      "shortCode": "abc123",
      "serviceId": 10001,
      "targetId": "target_1",
      "targetUrl": "60123456789",
      "ipHash": "sha256",
      "ipAddress": "1.2.3.4",
      "country": "US",
      "userAgent": "...",
      "referer": "...",
      "timestamp": "2026-06-28T00:00:00Z"
    }
  ]
}
```

要求：

- 校验 secret。
- `eventId` 幂等。
- 批量写入。
- 写入失败返回非 2xx，触发 Queue 重试。

## 14. 数据库表设计

以下为逻辑表结构，可用 Prisma / Drizzle 映射。

### 14.1 users

```text
id
email
password_hash
name
role: user | admin | staff
parent_user_id
status: active | banned
plan_id
membership_expires_at
created_at
updated_at
```

### 14.2 plans

```text
id
name
price
duration_days
max_services
max_targets_per_service
max_domains
allow_custom_domain
allow_ip_lock
allow_edge_block
status
created_at
updated_at
```

### 14.3 services

```text
id
user_id
platform: whatsapp | telegram | line
name
short_code
domain_id
status
access_rule: random | sequence
lock_ip
ip_lock_group_id
greeting_mode: none | single | batch
global_greeting
greeting_pool_json
publish_status: pending | success | failed
publish_error
published_at
created_at
updated_at
deleted_at
```

唯一约束：

```text
unique(short_code)
```

### 14.4 service_targets

```text
id
service_id
target_key
url
normalized_url
remark
greeting
enabled
sort_order
work_order_ids_json
created_at
updated_at
deleted_at
```

建议约束：

```text
unique(service_id, normalized_url)
```

### 14.5 service_edge_blocks

```text
id
service_id
block_all_enabled
country_allow_enabled
allowed_countries_json
country_block_enabled
blocked_countries_json
block_chinese
ip_block_list_ids_json
action: not_found | redirect
redirect_url
created_at
updated_at
```

### 14.6 ip_lists

```text
id
user_id
name
type: blacklist
items_count
kv_key
created_at
updated_at
```

### 14.7 ip_list_items

```text
id
list_id
value
value_type: ip | cidr
created_at
```

MVP 可只支持 `ip`。

### 14.8 domains

```text
id
hostname
type: public | custom
owner_user_id
status: pending | active | failed | disabled
cf_custom_hostname_id
cf_status
cname_target
verification_errors_json
created_at
updated_at
```

### 14.9 domain_assignments

```text
id
domain_id
user_id
created_at
```

### 14.10 visit_events

```text
id
event_id
platform
service_id
short_code
target_id
target_url
ip_hash
ip_address
country
user_agent
referer
created_at
```

唯一约束：

```text
unique(event_id)
```

### 14.11 service_daily_stats

```text
date
platform
service_id
pv
uv
created_at
updated_at
```

唯一约束：

```text
unique(date, platform, service_id)
```

### 14.12 target_daily_stats

```text
date
platform
service_id
target_id
target_url
pv
uv
created_at
updated_at
```

唯一约束：

```text
unique(date, platform, service_id, target_id)
```

### 14.13 publish_logs

```text
id
service_id
platform
short_code
status: pending | success | failed
error_message
snapshot_json
created_at
completed_at
```

### 14.14 orders

```text
id
user_id
plan_id
amount
currency
status: pending | paid | failed | refunded
paid_at
created_at
updated_at
```

## 15. 发布流程

### 15.1 发布触发场景

- 新建服务
- 修改服务
- 添加账号
- 删除账号
- 启用 / 禁用账号
- 修改分流规则
- 修改问候语
- 修改拦截配置
- 修改域名
- 套餐到期或恢复
- 管理员强制下架
- 工单同步变更账号

### 15.2 发布步骤

```text
1. 标记 services.publish_status = pending
2. 读取服务、目标账号、拦截配置、会员状态、域名
3. 生成 service snapshot
4. 生成 route snapshot
5. PUT service:{platform}:{shortCode}
6. PUT route:{shortCode}
7. 写 publish_logs
8. 标记 publish_status = success
9. 记录 published_at
```

失败：

```text
1. 标记 publish_status = failed
2. 记录 publish_error
3. 后台展示重试按钮
```

### 15.3 删除服务

软删除业务数据，删除 KV：

```text
DELETE service:{platform}:{shortCode}
DELETE route:{shortCode}
```

### 15.4 暂停服务

不删除 KV，发布 `status: false` 快照。

Worker 返回：

- 403
- 或过期页
- 或指定安全页

第一版建议返回 403 或 404。

## 16. 统计设计

### 16.1 正常访问事件

Worker 投递：

```json
{
  "eventId": "uuid",
  "platform": "whatsapp",
  "shortCode": "abc123",
  "serviceId": 10001,
  "targetId": "target_1",
  "targetUrl": "60123456789",
  "ipHash": "sha256",
  "ipAddress": "1.2.3.4",
  "country": "US",
  "userAgent": "...",
  "referer": "...",
  "timestamp": "2026-06-28T00:00:00Z"
}
```

### 16.2 幂等要求

Queue 可能重试，因此必须：

```text
unique(event_id)
```

重复事件直接忽略，不重复计数。

### 16.3 UV 计算

第一版推荐按天使用：

```text
date + service_id + ip_hash
date + service_id + target_id + ip_hash
```

可以建辅助表：

```text
daily_unique_visitors
```

字段：

```text
date
service_id
target_id
ip_hash
created_at
```

通过唯一约束判断是否新增 UV。

### 16.4 后台统计展示

服务列表：

- 今日 PV
- 今日 UV
- 发布状态

统计详情：

- 1 天 / 3 天 / 7 天
- PV / UV 折线图
- 目标账号命中排行
- 访问明细分页，默认 10 条

访问明细字段：

- 时间
- 平台
- 命中账号
- 国家
- IP
- UA
- referer

### 16.5 清除访问

支持：

- 清除今日
- 清除全部历史

清除范围：

- `visit_events`
- `service_daily_stats`
- `target_daily_stats`
- `daily_unique_visitors`

不删除 KV 快照。

## 17. 权限设计

### 17.1 用户角色

```text
admin: 系统管理员
user: 主账号
staff: 员工账号
```

### 17.2 员工账号

规则：

- `staff.parent_user_id` 指向主账号。
- 可查看主账号下服务。
- 可查看主账号可用域名。
- 是否可编辑由主账号授权，第二阶段实现。

### 17.3 分享服务

第二阶段：

- 只读分享
- 可编辑分享
- 分享 token 可撤销
- 分享 token 可过期

## 18. 套餐限制

套餐可控制：

- 服务数量
- 每个服务账号数量
- 域名数量
- 是否允许自定义域名
- 是否允许 IP 锁定
- 是否允许高级拦截
- 统计保留天数

会员到期策略：

第一版使用快照中的：

```text
membershipExpiresAt
```

Worker 每次访问判断当前时间。

优点：

- 不需要每天批量改 KV。
- 到期自动生效。

恢复会员后：

- 需要重新发布用户服务快照。

## 19. 安全设计

### 19.1 输入校验

必须校验：

- 短码格式
- 平台类型
- 跳转链接协议
- WhatsApp 域名白名单
- Telegram 域名白名单
- Line 链接协议
- 空账号
- 重复账号
- 域名归属
- 拦截跳转 URL

### 19.2 后端安全

- 密码使用 bcrypt / argon2。
- 登录态使用安全 Cookie 或 JWT。
- 管理员接口必须 RBAC。
- Cloudflare Token 只放服务端环境变量。
- 统计回写接口必须校验 `x-cf-track-secret`。
- API 需要限流。
- 关键操作写审计日志。

### 19.3 Worker 安全

- 不泄露内部错误。
- 未找到服务统一返回 404。
- 拦截跳转 URL 必须校验 `https`。
- Queue 事件中避免放敏感 token。

## 20. 工单自动同步

如需要和现有工单系统同步客服账号：

```text
1. 定时或 webhook 获取客服变化
2. 新增客服 -> 添加 target
3. 删除客服 -> 禁用 target
4. 自动离线 -> 禁用 target
5. 恢复在线 -> 启用 target
6. 合并多次变化
7. 异步发布 KV
```

要求：

- 同步任务不阻塞后台请求。
- 多次变化要合并发布，避免频繁写 KV。
- 发布失败可重试。
- 同步日志可追踪。

## 21. 前端页面规划

### 21.1 用户侧页面

```text
/login
/register
/dashboard
/services
/services/new
/services/[id]
/services/[id]/stats
/domains
/billing
/account
```

### 21.2 管理员页面

```text
/admin
/admin/users
/admin/plans
/admin/orders
/admin/domains
/admin/cf
/admin/publish-logs
/admin/system
```

### 21.3 服务编辑页结构

建议 Tabs：

- 基础设置
- 账号列表
- 分流规则
- 问候语
- 拦截设置
- 域名与链接
- 统计
- 发布日志

## 22. 后端目录建议

```text
apps/
  web/
    app/
    components/
    lib/
  api/
    src/
      modules/
        auth/
        users/
        services/
        targets/
        domains/
        stats/
        plans/
        admin/
        cloudflare/
      common/
      config/
      database/
      main.ts
  worker/
    src/
      index.ts
      router.ts
      platform/
        whatsapp.ts
        telegram.ts
        line.ts
      rules/
        block.ts
        select-target.ts
      queue.ts
      types.ts
packages/
  shared/
    src/
      types/
      validators/
      snapshot.ts
```

也可以第一版使用一个 Next.js 项目承载前端和后端 API，但 Worker 建议独立目录。

## 23. 环境变量

后端：

```text
DATABASE_URL=
JWT_SECRET=
PASSWORD_SALT=
CF_ACCOUNT_ID=
CF_API_TOKEN=
CF_KV_NAMESPACE_ID=
CF_ZONE_ID=
CF_CUSTOM_HOSTNAME_ZONE_ID=
CF_TRACK_SECRET=
APP_BASE_URL=
```

Worker：

```text
TRACK_QUEUE binding
ROUTE_KV binding
IP_HASH_SECRET
```

Queue Consumer：

```text
TRACK_API_URL=
CF_TRACK_SECRET=
```

## 24. Cloudflare 资源初始化

需要创建：

- KV namespace：`fenliu_routes`
- Queue：`fenliu_track_events`
- Worker：`fenliu-router`
- 可选 D1：`fenliu_main`
- 可选 Analytics Engine dataset：`fenliu_events`

Wrangler 示例：

```toml
name = "fenliu-router"
main = "src/index.ts"
compatibility_date = "2026-06-28"

[[kv_namespaces]]
binding = "ROUTE_KV"
id = "xxxx"

[[queues.producers]]
binding = "TRACK_QUEUE"
queue = "fenliu_track_events"
```

## 25. MVP 开发顺序

第一阶段必须打通主链路：

```text
1. 初始化项目结构
2. 用户登录 / 注册
3. 服务 CRUD
4. 目标账号 CRUD
5. 短码生成
6. 快照生成
7. Cloudflare KV 发布
8. Worker 读取 KV
9. WhatsApp 跳转
10. Telegram 跳转
11. Line 跳转
12. Queue 统计事件
13. 统计回写接口
14. 后台统计列表
15. 发布状态展示
```

第二阶段：

```text
1. 拦截配置
2. IP 锁定
3. 顺序分流
4. 批量问候语
5. 二维码
6. 清除统计
7. 公共域名池
8. 管理员分配域名
9. 套餐限制
```

第三阶段：

```text
1. Custom Hostnames 自助绑定
2. IP 库导入导出
3. 设备 / ASN 拦截
4. 工单同步
5. 员工权限
6. 统计归档到 R2
7. 多 D1 / 多租户拆库
8. 多 Worker 灰度发布
```

## 26. 测试计划

### 26.1 单元测试

- 平台 URL 规范化
- WhatsApp 链接生成
- Telegram 链接生成
- Line 链接生成
- 短码校验
- 拦截规则判断
- IP hash 分配
- snapshot 生成

### 26.2 集成测试

- 创建服务后生成 KV snapshot
- 修改账号后重新发布
- 暂停服务后 Worker 返回禁用
- 会员到期后 Worker 返回过期
- Queue 事件重复消费不重复计数
- 清除统计后后台数据归零

### 26.3 端到端测试

- 用户注册登录
- 创建 WhatsApp 服务
- 添加多个账号
- 复制链接访问
- 命中目标账号
- 后台看到访问统计
- 管理员分配域名
- 服务切换域名后链接可用

## 27. 运维监控

需要监控：

- Worker 请求量
- Worker 错误率
- KV 读取失败
- KV 发布失败
- Queue 积压
- Queue 消费失败
- 统计回写失败
- 数据库容量
- D1 容量，若使用
- 自定义域名验证状态

管理员后台建议展示：

- 最近 24 小时访问量
- Queue 积压数量
- 发布失败服务数
- Custom Hostname pending 数
- Worker 当前版本

## 28. 用户提示文案

KV 发布成功：

```text
发布成功，预计 5-60 秒全球生效。
```

顺序模式：

```text
顺序模式为边缘近似顺序，不保证全球严格轮询；如需最高性能，建议使用随机模式。
```

会员到期：

```text
当前套餐已到期，分流链接已暂停，请续费后重新发布服务。
```

自定义域名第一版：

```text
因 CF 版本特殊性，绑定域名需联系管理员提供帮助。
```

自定义域名自助版：

```text
请添加 CNAME 记录，验证通过后该域名可用于 WhatsApp / Line / Telegram 极速分流。
```

## 29. 风险与注意事项

- KV 是最终一致，发布成功不代表全球节点立即更新。
- 同一个 KV key 不要高频并发写。
- D1 不适合作为每次跳转的强依赖。
- Queue 重试会导致重复事件，必须幂等。
- 顺序分流只能做到近似顺序。
- IP 锁定在账号数量变化后会有映射变化。
- 客户自定义域名依赖 Cloudflare for SaaS 能力和账号额度。
- 访问统计明细会快速增长，需要保留策略和归档策略。

## 30. 官方参考

- Cloudflare Workers KV：KV 通过缓存提升性能，读取对写入是最终一致，其他全球节点可能需要 60 秒或更久才看到更新。  
  https://developers.cloudflare.com/kv/concepts/how-kv-works/
- Cloudflare Workers KV 写入：同一 key 并发写入可能互相覆盖，建议单一写入流。  
  https://developers.cloudflare.com/kv/api/write-key-value-pairs/
- Cloudflare D1 Limits：D1 单库和账户存储有容量限制，超过规模后应拆库。  
  https://developers.cloudflare.com/d1/platform/limits/
- Cloudflare Queues：支持批量、重试和延迟消息。  
  https://developers.cloudflare.com/queues/
- Cloudflare Queues Limits：队列有消息大小、批量大小、重试次数、吞吐等限制，实施前应按当前账号计划确认。  
  https://developers.cloudflare.com/queues/platform/limits/
- Cloudflare for SaaS / Custom Hostnames：可将客户自有域名作为 custom hostname 接入 SaaS zone。  
  https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/domain-support/
