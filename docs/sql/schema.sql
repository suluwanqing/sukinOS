-- ============================================================
-- SukinOS 后端数据库完整建表语句
-- 数据库: MySQL 8.0+
-- 字符集: utf8mb4
-- 引擎: InnoDB
-- ============================================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS sukinos
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

USE sukinos;

-- ============================================================
-- 表1: users - 用户表
-- 对应模型: Model.DbModel.user.user.User (继承 Base_M)
-- 说明: 核心用户表，存储用户基本信息和权限
-- ============================================================
CREATE TABLE IF NOT EXISTS `users` (
    `id`          INT           NOT NULL AUTO_INCREMENT          COMMENT '用户ID，自增主键',
    `is_active`   BOOLEAN       DEFAULT TRUE                    COMMENT '账号激活状态',
    `username`    VARCHAR(20)   DEFAULT '未设置'                 COMMENT '用户名',
    `account`     VARCHAR(20)   NOT NULL                        COMMENT '登录账号，唯一',
    `password`    VARCHAR(20)   DEFAULT NULL                    COMMENT '明文密码（兼容旧系统）',
    `hash_ps`     VARCHAR(80)   DEFAULT NULL                    COMMENT 'bcrypt 哈希密码',
    `root`        BOOLEAN       DEFAULT FALSE                   COMMENT '超级管理员标志',
    `email`       VARCHAR(25)   DEFAULT NULL                    COMMENT '邮箱，唯一',
    `age`         INT           DEFAULT NULL                    COMMENT '年龄',
    `name`        VARCHAR(8)    DEFAULT NULL                    COMMENT '真实姓名',
    `sex`         VARCHAR(1)    DEFAULT NULL                    COMMENT '性别 M/F',
    `phone`       VARCHAR(11)   DEFAULT NULL                    COMMENT '手机号',
    `address`     VARCHAR(25)   DEFAULT NULL                    COMMENT '地址',
    `avatar`      MEDIUMTEXT    DEFAULT NULL                    COMMENT '头像 Base64 编码',
    `permission`  JSON          DEFAULT NULL                    COMMENT '权限配置 JSON',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_account` (`account`),
    UNIQUE KEY `uk_email` (`email`),
    KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- permission 字段默认值:
-- {
--   "role": "user",
--   "first": "",
--   "second": ""
-- }

-- ============================================================
-- 表2: user_expand - 用户扩展信息表
-- 对应模型: Model.DbModel.user.user.UserExpand
-- 说明: 用户在线状态和活跃时长，与 users 1:1 关联
-- ============================================================
CREATE TABLE IF NOT EXISTS `user_expand` (
    `id`                INT           NOT NULL                  COMMENT '用户ID，与 users.id 一一对应',
    `isonline`          BOOLEAN       DEFAULT FALSE             COMMENT '当前是否在线',
    `total_active_time` BIGINT        DEFAULT NULL              COMMENT '累计活跃时长（秒）',
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_user_expand_user` FOREIGN KEY (`id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户扩展信息表';

-- ============================================================
-- 表3: user_time_behavior - 用户行为时间统计表
-- 对应模型: Model.DbModel.user.user.UserTimeBehavior
-- 说明: 记录用户每日登录/登出和时段活跃数据，与 users 1:1 关联
-- ============================================================
CREATE TABLE IF NOT EXISTS `user_time_behavior` (
    `user_id`     INT           NOT NULL                        COMMENT '用户ID，主键',
    `last_login`  BIGINT        DEFAULT NULL                    COMMENT '最后登录时间戳（毫秒）',
    `d_mon`       JSON          DEFAULT NULL                    COMMENT '周一活跃数据 {logout, long}',
    `d_tue`       JSON          DEFAULT NULL                    COMMENT '周二活跃数据',
    `d_wed`       JSON          DEFAULT NULL                    COMMENT '周三活跃数据',
    `d_thu`       JSON          DEFAULT NULL                    COMMENT '周四活跃数据',
    `d_fri`       JSON          DEFAULT NULL                    COMMENT '周五活跃数据',
    `d_sat`       JSON          DEFAULT NULL                    COMMENT '周六活跃数据',
    `d_sun`       JSON          DEFAULT NULL                    COMMENT '周日活跃数据',
    `time_parts`  JSON          DEFAULT NULL                    COMMENT '时段分布统计 {part_dawn, part_morning, part_afternoon, part_evening}',
    PRIMARY KEY (`user_id`),
    KEY `idx_last_login` (`last_login`),
    CONSTRAINT `fk_user_time_behavior_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户行为时间统计表';

-- day_data 默认值: {"logout": 0, "long": 0}
-- time_parts 默认值: {}
-- 时段划分:
--   part_dawn     (0-6点)
--   part_morning  (7-12点)
--   part_afternoon(13-18点)
--   part_evening  (19-23点)

-- ============================================================
-- 表4: user_time_week - 用户周活跃统计表
-- 对应模型: Model.DbModel.user.user.TimeWeek
-- 说明: 按周统计用户每日活跃分钟数，与 users N:1 关联
-- ============================================================
CREATE TABLE IF NOT EXISTS `user_time_week` (
    `id`            INT           NOT NULL AUTO_INCREMENT       COMMENT '自增主键',
    `user_id`       INT           NOT NULL                      COMMENT '用户ID',
    `d_mon`         INT           DEFAULT 0                     COMMENT '周一活跃分钟数',
    `d_tue`         INT           DEFAULT 0                     COMMENT '周二活跃分钟数',
    `d_wed`         INT           DEFAULT 0                     COMMENT '周三活跃分钟数',
    `d_thu`         INT           DEFAULT 0                     COMMENT '周四活跃分钟数',
    `d_fri`         INT           DEFAULT 0                     COMMENT '周五活跃分钟数',
    `d_sat`         INT           DEFAULT 0                     COMMENT '周六活跃分钟数',
    `d_sun`         INT           DEFAULT 0                     COMMENT '周日活跃分钟数',
    `week_start_ts` BIGINT        DEFAULT NULL                  COMMENT '本周周一 0 点的时间戳',
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_week_start_ts` (`week_start_ts`),
    CONSTRAINT `fk_user_time_week_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户周活跃统计表';

-- ============================================================
-- 表5: sukinos_app - SukinOS 应用表
-- 对应模型: Model.DbModel.sukinos.sukinos.D_SukinosApp
-- 说明: 存储所有上传的 SukinOS 应用，使用乐观锁（version_id_col）
-- ============================================================
CREATE TABLE IF NOT EXISTS `sukinos_app` (
    `resource_id`   VARCHAR(120)  NOT NULL                      COMMENT '资源唯一ID，主键',
    `user_id`       INT           NOT NULL                      COMMENT '上传者用户ID',
    `app_name`      VARCHAR(20)   DEFAULT NULL                  COMMENT '应用名称',
    `created_at`    DATETIME      DEFAULT CURRENT_TIMESTAMP     COMMENT '创建时间',
    `url`           VARCHAR(120)  NOT NULL                      COMMENT '应用文件下载URL',
    `is_private`    BOOLEAN       NOT NULL DEFAULT FALSE        COMMENT '是否私有（仅上传者可见）',
    `size`          INT           DEFAULT NULL                  COMMENT '文件大小（字节）',
    `file_name`     VARCHAR(50)   NOT NULL                      COMMENT '文件名',
    `meta_info`     JSON          DEFAULT NULL                  COMMENT '应用元数据 JSON',
    `version`       VARCHAR(20)   NOT NULL DEFAULT '0.1'        COMMENT '版本号（乐观锁版本列）',
    `status`        VARCHAR(20)   NOT NULL DEFAULT 'under_review' COMMENT '审核状态',
    `audit_opinion` VARCHAR(255)  DEFAULT NULL                  COMMENT '审核意见',
    `registry_enabled` BOOLEAN   NOT NULL DEFAULT FALSE        COMMENT '是否在权限注册池中',
    PRIMARY KEY (`resource_id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_status` (`status`),
    KEY `idx_app_name` (`app_name`),
    CONSTRAINT `fk_sukinos_app_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='SukinOS 应用表';

-- status 可选值:
--   under_review  审核中
--   active        已激活（公开可见）
--   rejected      已拒绝
--   disabled      已禁用

-- 版本号自动递增规则 (increment_version):
--   null   → "0.1"
--   "0.1"  → "0.2"
--   "1.0"  → "1.1"
--   "2.9"  → "2.10"

-- ============================================================
-- 表6: request_logs - 请求审计日志表
-- 对应模型: Model.DbModel.system.requestLog.D_RequestLog
-- 说明: 记录所有 API 请求的详细信息，用于审计和监控
-- ============================================================
CREATE TABLE IF NOT EXISTS `request_logs` (
    `id`                INT           NOT NULL AUTO_INCREMENT    COMMENT '自增主键',
    `created_at`        DATETIME      NOT NULL                  COMMENT '请求时间（UTC）',
    `method`            VARCHAR(12)   NOT NULL                  COMMENT 'HTTP 方法 GET/POST/PUT/DELETE',
    `path`              VARCHAR(255)  NOT NULL                  COMMENT '请求路径',
    `full_url`          VARCHAR(512)  DEFAULT NULL              COMMENT '完整请求 URL（含参数）',
    `status_code`       INT           NOT NULL                  COMMENT 'HTTP 响应状态码',
    `success`           BOOLEAN       DEFAULT FALSE             COMMENT '请求是否成功（2xx）',
    `duration_ms`       INT           NOT NULL                  COMMENT '请求处理耗时（毫秒）',
    `operator_id`       INT           DEFAULT NULL              COMMENT '操作者用户ID',
    `operator_account`  VARCHAR(120)  DEFAULT NULL              COMMENT '操作者账号',
    `operator_username` VARCHAR(120)  DEFAULT NULL              COMMENT '操作者用户名',
    `ip`                VARCHAR(64)   DEFAULT NULL              COMMENT '客户端 IP 地址',
    `user_agent`        VARCHAR(512)  DEFAULT NULL              COMMENT '客户端 User-Agent',
    `request_query`     JSON          DEFAULT NULL              COMMENT 'URL 查询参数 JSON',
    `request_body`      TEXT          DEFAULT NULL              COMMENT '请求体（敏感信息已脱敏）',
    `response_body`     TEXT          DEFAULT NULL              COMMENT '响应体（仅 JSON）',
    `error_message`     VARCHAR(500)  DEFAULT NULL              COMMENT '错误信息（非2xx时记录）',
    PRIMARY KEY (`id`),
    KEY `idx_created_at` (`created_at`),
    KEY `idx_method` (`method`),
    KEY `idx_path` (`path`),
    KEY `idx_status_code` (`status_code`),
    KEY `idx_success` (`success`),
    KEY `idx_operator_id` (`operator_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='请求审计日志表';

-- 敏感信息脱敏字段 (12个):
--   password, token, secret, hash_ps,
--   authorization, access_token, refresh_token,
--   api_key, private_key, credential,
--   cookie, set-cookie

-- ============================================================
-- 表7: system_configs - 系统配置表
-- 对应模型: Model.DbModel.system.systemConfig.D_SystemConfig
-- 说明: 存储系统级配置项，键值对形式，值支持 JSON
-- ============================================================
CREATE TABLE IF NOT EXISTS `system_configs` (
    `id`          INT           NOT NULL AUTO_INCREMENT         COMMENT '自增主键',
    `config_key`  VARCHAR(100)  NOT NULL                        COMMENT '配置键，唯一',
    `config_value` JSON         NOT NULL                        COMMENT '配置值 JSON',
    `created_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- ============================================================
-- 表8: system_updates - 系统更新日志表
-- 对应模型: Model.DbModel.system.systemUpdate.D_SystemUpdate
-- 说明: 存储系统版本更新日志
-- ============================================================
CREATE TABLE IF NOT EXISTS `system_updates` (
    `id`          INT           NOT NULL AUTO_INCREMENT         COMMENT '自增主键',
    `version`     VARCHAR(50)   DEFAULT NULL                    COMMENT '版本号',
    `title`       VARCHAR(100)  DEFAULT NULL                    COMMENT '更新标题',
    `items`       JSON          NOT NULL                        COMMENT '更新项列表 JSON 数组',
    `created_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY `idx_version` (`version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统更新日志表';

-- items JSON 结构示例:
-- [
--   {"type": "feature", "description": "新增应用商店"},
--   {"type": "fix", "description": "修复文件系统权限问题"},
--   {"type": "optimize", "description": "优化 Worker 启动速度"}
-- ]

-- ============================================================
-- 常用查询索引优化建议
-- ============================================================

-- 用户活跃度查询（常用）
-- CREATE INDEX idx_behavior_last_login ON user_time_behavior(last_login);

-- 请求日志按时间范围查询（常用）
-- CREATE INDEX idx_request_logs_created_method ON request_logs(created_at, method);

-- 应用审核管理查询（常用）
-- CREATE INDEX idx_sukinos_app_status_created ON sukinos_app(status, created_at);

-- ============================================================
-- 表14: system_builtin_apps - 系统内置 APP 定义表
-- 对应模型: Model.DbModel.system.systemApp.D_SystemBuiltinApp
-- ============================================================
CREATE TABLE IF NOT EXISTS `system_builtin_apps` (
    `id`              INT           AUTO_INCREMENT PRIMARY KEY,
    `app_id`          VARCHAR(100)  NOT NULL UNIQUE               COMMENT 'APP唯一标识符',
    `label`           VARCHAR(100)  NOT NULL                      COMMENT 'APP显示名称',
    `description`     VARCHAR(500)  DEFAULT ''                    COMMENT 'APP描述',
    `default_visible_to` JSON       DEFAULT ('["user"]')          COMMENT '默认可见角色列表',
    `hidden`          VARCHAR(5)    DEFAULT 'false'               COMMENT '是否隐藏',
    `created_at`      INT           DEFAULT 0                     COMMENT '创建时间戳',
    `updated_at`      INT           DEFAULT 0                     COMMENT '更新时间戳'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统内置APP定义表';

-- ============================================================
-- 表15: system_roles - 角色管理表
-- 对应模型: Model.DbModel.system.role.D_Role
-- ============================================================
CREATE TABLE IF NOT EXISTS `system_roles` (
    `id`          INT           AUTO_INCREMENT PRIMARY KEY,
    `name`        VARCHAR(50)   NOT NULL UNIQUE                   COMMENT '角色标识 e.g. admin, developer',
    `label`       VARCHAR(100)  NOT NULL                          COMMENT '角色显示名 e.g. 管理员, 开发者',
    `description` VARCHAR(255)  DEFAULT ''                        COMMENT '角色描述',
    `is_system`   BOOLEAN       DEFAULT FALSE                     COMMENT '系统内置角色(不可删除)',
    `created_at`  DATETIME      DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色管理表';

-- ============================================================
-- 表16: app_permission_registry - APP 权限注册表
-- 对应模型: Model.DbModel.system.appPermission.D_AppPermissionRegistry
-- ============================================================
CREATE TABLE IF NOT EXISTS `app_permission_registry` (
    `resource_id`       VARCHAR(120)  NOT NULL PRIMARY KEY        COMMENT 'APP 资源唯一标识',
    `permission_enabled` BOOLEAN      NOT NULL DEFAULT FALSE      COMMENT '是否启用权限控制',
    `actor_rules`       JSON          DEFAULT NULL                COMMENT '权限分配规则 JSON',
    `created_at`        DATETIME      DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='APP权限注册表';
