-- ============================================================
-- SukinOS 数据库常用查询语句
-- ============================================================

USE sukinos;

-- ============================================================
-- 1. 用户相关查询
-- ============================================================

-- 查询所有活跃用户
SELECT id, account, username, email, permission, is_active
FROM users
WHERE is_active = TRUE;

-- 查询用户及其扩展信息（在线状态、总活跃时长）
SELECT u.id, u.account, u.username, ue.isonline, ue.total_active_time
FROM users u
LEFT JOIN user_expand ue ON u.id = ue.id
WHERE u.is_active = TRUE;

-- 查询用户本周活跃数据
SELECT u.account, u.username,
       utw.d_mon, utw.d_tue, utw.d_wed, utw.d_thu,
       utw.d_fri, utw.d_sat, utw.d_sun,
       utw.week_start_ts
FROM users u
JOIN user_time_week utw ON u.id = utw.user_id
WHERE utw.week_start_ts >= UNIX_TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY));

-- 查询用户时段活跃分布
SELECT u.account, utb.time_parts
FROM users u
JOIN user_time_behavior utb ON u.id = utb.user_id;

-- ============================================================
-- 2. 应用相关查询
-- ============================================================

-- 查询所有公开已激活的应用（应用商店列表）
SELECT resource_id, app_name, version, size, created_at, meta_info
FROM sukinos_app
WHERE is_private = FALSE AND status = 'active'
ORDER BY created_at DESC;

-- 分页查询应用（每页20条）
SELECT resource_id, app_name, version, size, status, created_at
FROM sukinos_app
WHERE is_private = FALSE AND status = 'active'
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;

-- 搜索应用
SELECT resource_id, app_name, version, size, status
FROM sukinos_app
WHERE is_private = FALSE
  AND status = 'active'
  AND (app_name LIKE '%关键词%' OR JSON_EXTRACT(meta_info, '$.description') LIKE '%关键词%');

-- 查询某用户上传的所有应用
SELECT resource_id, app_name, version, size, status, created_at, audit_opinion
FROM sukinos_app
WHERE user_id = 1
ORDER BY created_at DESC;

-- 查询待审核的应用
SELECT sa.resource_id, sa.app_name, sa.version, sa.size,
       sa.created_at, u.account AS uploader
FROM sukinos_app sa
JOIN users u ON sa.user_id = u.id
WHERE sa.status = 'under_review'
ORDER BY sa.created_at ASC;

-- 检查应用更新（批量比对版本号）
SELECT resource_id, app_name, version
FROM sukinos_app
WHERE resource_id IN ('app-001', 'app-002', 'app-003')
  AND is_private = FALSE
  AND status = 'active';

-- ============================================================
-- 3. 请求日志相关查询
-- ============================================================

-- 查询最近100条请求日志
SELECT id, created_at, method, path, status_code, duration_ms, operator_account, ip
FROM request_logs
ORDER BY created_at DESC
LIMIT 100;

-- 查询失败的请求
SELECT method, path, status_code, error_message, created_at
FROM request_logs
WHERE success = FALSE
ORDER BY created_at DESC
LIMIT 50;

-- 查询慢请求（耗时超过1秒）
SELECT method, path, duration_ms, created_at, operator_account
FROM request_logs
WHERE duration_ms > 1000
ORDER BY duration_ms DESC;

-- 按小时统计请求量
SELECT DATE_FORMAT(created_at, '%Y-%m-%d %H:00') AS hour,
       COUNT(*) AS request_count,
       AVG(duration_ms) AS avg_duration
FROM request_logs
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY hour
ORDER BY hour DESC;

-- 按路径统计请求量和平均耗时
SELECT path, method,
       COUNT(*) AS total,
       AVG(duration_ms) AS avg_ms,
       MAX(duration_ms) AS max_ms
FROM request_logs
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY path, method
ORDER BY total DESC;

-- 查询某用户的操作记录
SELECT created_at, method, path, status_code, duration_ms, ip
FROM request_logs
WHERE operator_id = 1
ORDER BY created_at DESC
LIMIT 50;

-- ============================================================
-- 4. 系统配置查询
-- ============================================================

-- 获取所有系统配置
SELECT config_key, config_value, updated_at
FROM system_configs
ORDER BY config_key;

-- 获取特定配置
SELECT config_value
FROM system_configs
WHERE config_key = 'app.upload.max_size';

-- ============================================================
-- 5. 系统更新日志查询
-- ============================================================

-- 获取所有更新日志
SELECT version, title, items, created_at
FROM system_updates
ORDER BY created_at DESC;

-- ============================================================
-- 6. 统计查询
-- ============================================================

-- 用户总数
SELECT COUNT(*) AS total_users FROM users;

-- 活跃用户数
SELECT COUNT(*) AS active_users FROM users WHERE is_active = TRUE;

-- 在线用户数
SELECT COUNT(*) AS online_users FROM user_expand WHERE isonline = TRUE;

-- 应用总数及状态分布
SELECT status, COUNT(*) AS count
FROM sukinos_app
GROUP BY status;

-- 今日请求统计
SELECT
    COUNT(*) AS total_requests,
    SUM(CASE WHEN success = TRUE THEN 1 ELSE 0 END) AS success_count,
    SUM(CASE WHEN success = FALSE THEN 1 ELSE 0 END) AS fail_count,
    AVG(duration_ms) AS avg_duration_ms
FROM request_logs
WHERE DATE(created_at) = CURDATE();

-- 用户活跃时长排行（本周）
SELECT u.account, u.username,
       (utw.d_mon + utw.d_tue + utw.d_wed + utw.d_thu +
        utw.d_fri + utw.d_sat + utw.d_sun) AS week_total_minutes
FROM users u
JOIN user_time_week utw ON u.id = utw.user_id
WHERE utw.week_start_ts >= UNIX_TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY))
ORDER BY week_total_minutes DESC
LIMIT 10;
