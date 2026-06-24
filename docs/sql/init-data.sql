-- ============================================================
-- SukinOS 数据库初始化数据
-- 用途: 插入默认系统数据、测试数据
-- ============================================================

USE sukinos;

-- ============================================================
-- 1. 插入超级管理员用户
-- 密码: admin123 (bcrypt 哈希)
-- ============================================================
INSERT INTO `users` (`account`, `username`, `password`, `hash_ps`, `root`, `email`, `permission`, `is_active`)
VALUES ('admin', '系统管理员', 'admin123',
        '$2b$12$LJ3m4ys3uz0Gv0gMOsYmNe1QXgGBXJXGXm5GqKv7tqkIqgCJdFNu',
        TRUE, 'admin@sukinos.com',
        '{"role": "admin", "first": "all", "second": "all"}',
        TRUE);

-- ============================================================
-- 2. 插入测试普通用户
-- 密码: test123
-- ============================================================
INSERT INTO `users` (`account`, `username`, `password`, `hash_ps`, `email`, `permission`, `is_active`)
VALUES ('testuser', '测试用户', 'test123',
        '$2b$12$LJ3m4ys3uz0Gv0gMOsYmNe1QXgGBXJXGXm5GqKv7tqkIqgCJdFNu',
        'test@sukinos.com',
        '{"role": "user", "first": "", "second": ""}',
        TRUE);

-- ============================================================
-- 3. 插入用户扩展信息
-- ============================================================
INSERT INTO `user_expand` (`id`, `isonline`, `total_active_time`) VALUES
(1, FALSE, 0),
(2, FALSE, 0);

-- ============================================================
-- 4. 插入用户行为时间统计（初始空数据）
-- ============================================================
INSERT INTO `user_time_behavior` (`user_id`, `last_login`, `d_mon`, `d_tue`, `d_wed`, `d_thu`, `d_fri`, `d_sat`, `d_sun`, `time_parts`)
VALUES (1, NULL,
        '{"logout": 0, "long": 0}', '{"logout": 0, "long": 0}',
        '{"logout": 0, "long": 0}', '{"logout": 0, "long": 0}',
        '{"logout": 0, "long": 0}', '{"logout": 0, "long": 0}',
        '{"logout": 0, "long": 0}',
        '{"part_dawn": 0, "part_morning": 0, "part_afternoon": 0, "part_evening": 0}');

INSERT INTO `user_time_behavior` (`user_id`, `last_login`, `d_mon`, `d_tue`, `d_wed`, `d_thu`, `d_fri`, `d_sat`, `d_sun`, `time_parts`)
VALUES (2, NULL,
        '{"logout": 0, "long": 0}', '{"logout": 0, "long": 0}',
        '{"logout": 0, "long": 0}', '{"logout": 0, "long": 0}',
        '{"logout": 0, "long": 0}', '{"logout": 0, "long": 0}',
        '{"logout": 0, "long": 0}',
        '{"part_dawn": 0, "part_morning": 0, "part_afternoon": 0, "part_evening": 0}');

-- ============================================================
-- 5. 插入系统默认配置
-- ============================================================
INSERT INTO `system_configs` (`config_key`, `config_value`) VALUES
('app.upload.max_size', '{"value": 10485760, "unit": "bytes", "description": "应用上传最大文件大小 10MB"}'),
('app.review.auto_approve', '{"value": false, "description": "是否自动审核通过"}'),
('disk.safety_threshold', '{"value": 21474836480, "unit": "bytes", "description": "磁盘安全阈值 20GB"}'),
('session.timeout', '{"value": 30, "unit": "minutes", "description": "会话超时时间"}'),
('websocket.heartbeat_interval', '{"value": 35, "unit": "seconds", "description": "WebSocket 心跳间隔"}');

-- ============================================================
-- 6. 插入系统更新日志
-- ============================================================
INSERT INTO `system_updates` (`version`, `title`, `items`) VALUES
('1.0.0', 'SukinOS 首个正式版本发布', '[
    {"type": "feature", "description": "用户注册与登录系统"},
    {"type": "feature", "description": "JWT 双 Token 认证机制"},
    {"type": "feature", "description": "WebSocket 多标签页管理"},
    {"type": "feature", "description": "应用商店基础功能"},
    {"type": "feature", "description": "虚拟文件系统 VFS"},
    {"type": "feature", "description": "请求审计日志中间件"},
    {"type": "feature", "description": "SSE 本地开发热更新"}
]');
