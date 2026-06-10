import { useState, useEffect, useMemo } from "react";
import style from "./style.module.css";
import { createNamespace } from "/utils/js/classcreate";
import sysConfigAPI from "@/apis/system/config";
import CheckCardBar from "@/component/checkCardBar/layout";
import Button from "@/component/button/layout";
import Select from "@/component/select/drowSelection/layout";
import Check from "@/component/check/layout";
import { alert } from "@/component/alert/layout";

const bem = createNamespace("system-log-config");

const AddIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const DeleteOutlineIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const CloseIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const HelpOutlineIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle", marginRight: "6px", color: "#999999" }}>
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

const CONFIG_SCHEMA = [
  {
    key: "globalEnabled",
    label: "日志审计全局开关",
    desc: "一键控制整个系统的日志监控，关闭后不再收集任何接口活动记录",
    type: "switch",
    theme: "success"
  },
  {
    key: "defaultLogBody",
    label: "包体数据留存默认开关",
    desc: "全局默认设置是否留存每个接口请求体与响应体的具体包体采样",
    type: "switch",
    theme: "violet"
  }
];

const METHOD_OPTIONS = [
  { label: "GET", value: "GET" },
  { label: "POST", value: "POST" },
  { label: "PUT", value: "PUT" },
  { label: "DELETE", value: "DELETE" }
];

const AUDIT_MODE_OPTIONS = [
  { label: "白名单模式（默认仅审计前缀接口，通过个性化清单补充记录特定路由）", value: "whitelist" },
  { label: "黑名单模式（默认全部记录流量，通过个性化清单配置放行排除特定路由）", value: "blacklist" }
];

function LogConfig() {
  const [settings, setSettings] = useState({
    globalEnabled: true,
    defaultLogBody: true,
    auditMode: "whitelist",
    defaultLogPrefix: "system",
    ignoredPaths: [],
    rules: []
  });

  const [availableRoutes, setAvailableRoutes] = useState([]);
  const [newIgnorePath, setNewIgnorePath] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [rulePath, setRulePath] = useState("");
  const [ruleMethod, setRuleMethod] = useState("GET");
  const [ruleIsPrefix, setRuleIsPrefix] = useState(false);

  useEffect(() => {
    Promise.all([
      sysConfigAPI.getLogConfig(),
      sysConfigAPI.getAllRoutes()
    ]).then(([configRes, routesRes]) => {
      if (configRes?.code === 200) {
        setSettings(configRes.data);
      }
      if (routesRes?.code === 200) {
        setAvailableRoutes(routesRes.data);
      }
    }).catch(() => {
      alert.failure("配置信息加载失败");
    });
  }, []);

  const routeSelectOptions = useMemo(() => {
    const distinctPaths = Array.from(new Set(availableRoutes.map(r => r.path)));
    return [
      { label: "手动输入/选择路由路径", value: "" },
      ...distinctPaths.map(path => {
        const route = availableRoutes.find(r => r.path === path);
        return {
          label: `${path} (${route?.summary || "无说明"})`,
          value: path
        };
      })
    ];
  }, [availableRoutes]);

  const handleConfigUpdate = (key, val) => {
    setSettings(prev => ({ ...prev, [key]: val }));
  };

  const handleAddIgnorePath = () => {
    const trimmed = newIgnorePath.trim();
    if (!trimmed) return;
    if (settings.ignoredPaths.includes(trimmed)) {
      alert.warning("该路径已被忽略");
      return;
    }
    setSettings(prev => ({
      ...prev,
      ignoredPaths: [...prev.ignoredPaths, trimmed]
    }));
    setNewIgnorePath("");
  };

  const handleRemoveIgnorePath = (path) => {
    setSettings(prev => ({
      ...prev,
      ignoredPaths: prev.ignoredPaths.filter(p => p !== path)
    }));
  };

  const handleAddRule = () => {
    if (!rulePath.trim()) {
      alert.warning("请输入或选择 API 路径");
      return;
    }
    const isExisted = settings.rules.some(r => r.path === rulePath && r.method === ruleMethod);
    if (isExisted) {
      alert.warning("该接口规则已存在");
      return;
    }

    const newRule = {
      path: rulePath.trim(),
      method: ruleMethod,
      isPrefix: ruleIsPrefix,
      enabled: settings.auditMode === "whitelist",
      logBody: true
    };

    setSettings(prev => ({
      ...prev,
      rules: [...prev.rules, newRule]
    }));
    setRulePath("");
    setRuleIsPrefix(false);
  };

  const handleRuleToggle = (index, key, val) => {
    setSettings(prev => {
      const updated = [...prev.rules];
      updated[index] = { ...updated[index], [key]: val };
      return { ...prev, rules: updated };
    });
  };

  const handleRemoveRule = (index) => {
    setSettings(prev => ({
      ...prev,
      rules: prev.rules.filter((_, idx) => idx !== index)
    }));
  };

  const handleSaveConfig = () => {
    setSubmitting(true);
    sysConfigAPI.updateLogConfig(settings)
      .then(res => {
        if (res?.code === 200) {
          alert.success("配置更新成功并已同步");
        } else {
          alert.failure(res?.message || "更新配置失败");
        }
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e("section-head")]}>
        <div className={style[bem.e("section-title")]}>全局审计面板</div>
        <p className={style[bem.e("section-desc")]}>全局主开关与默认数据留存基础策略控制</p>
      </div>

      <div className={style[bem.e("switches-panel")]}>
        <CheckCardBar
          options={CONFIG_SCHEMA}
          values={settings}
          onUpdate={handleConfigUpdate}
        />
      </div>

      <div className={style[bem.e("card-section")]}>
        <div className={style[bem.e("section-head")]}>
          <div className={style[bem.e("section-title")]}>模式与前缀策略设定</div>
          <p className={style[bem.e("section-desc")]}>支持切换黑白名单模式，设定默认的白名单监控匹配路由前缀</p>
        </div>
        <div className={style[bem.e("strategy-form")]}>
          <div className={style[bem.e("form-item")]}>
            <label>当前运行模式</label>
            <div className={style[bem.e("select-mode-wrapper")]}>
              <Select
                value={settings.auditMode}
                onChange={val => handleConfigUpdate("auditMode", val)}
                options={AUDIT_MODE_OPTIONS}
                direction="bottom"
              />
            </div>
          </div>
          {settings.auditMode === "whitelist" && (
            <div className={style[bem.e("form-item")]}>
              <label>白名单默认审计匹配前缀</label>
              <div className={style[bem.e("prefix-input-container")]}>
                <span className={style[bem.e("input-prefix-slash")]}>/</span>
                <input
                  className={style[bem.e("prefix-input")]}
                  placeholder="例如 system"
                  value={settings.defaultLogPrefix}
                  onChange={e => handleConfigUpdate("defaultLogPrefix", e.target.value.trim())}
                />
              </div>
              <p className={style[bem.e("form-item-help")]}>白名单模式下，默认仅对此前缀路由记录，其余所有请求默认不审计（除非在个性化清单中额外开启强制记录）</p>
            </div>
          )}
        </div>
      </div>

      <div className={style[bem.e("card-section")]}>
        <div className={style[bem.e("section-head")]}>
          <div className={style[bem.e("section-title")]}>数据库持久化白名单（全局忽略路由）</div>
          <p className={style[bem.e("section-desc")]}>配置持久化于 MySQL，每次启动和重载时拉取生效。匹配下述前缀路径的请求将直接被拦截审计逻辑，不保存任何日志</p>
        </div>

        <div className={style[bem.e("ignore-controls")]}>
          <input
            className={style[bem.e("input-text")]}
            placeholder="输入在后端需要物理忽略审计的路径（支持级联匹配，例如 /docs）"
            value={newIgnorePath}
            onChange={e => setNewIgnorePath(e.target.value)}
          />
          <Button type="dark" plain size="medium" onClick={handleAddIgnorePath}>
            <span>加入持久化放行名单</span>
          </Button>
        </div>

        <div className={style[bem.e("ignore-list")]}>
          {settings.ignoredPaths.length > 0 ? (
            settings.ignoredPaths.map(path => (
              <div key={path} className={style[bem.e("ignore-item")]}>
                <span className={style[bem.e("ignore-path-name")]}>{path}</span>
                <button
                  className={style[bem.e("ignore-btn-remove")]}
                  onClick={() => handleRemoveIgnorePath(path)}
                >
                  <CloseIcon />
                </button>
              </div>
            ))
          ) : (
            <div className={style[bem.e("empty-tip")]}>当前未设置任何持久化忽略路径</div>
          )}
        </div>
      </div>

      <div className={style[bem.e("card-section")]}>
        <div className={style[bem.e("section-head")]}>
          <div className={style[bem.e("section-title")]}>接口个性化审计清单</div>
          <p className={style[bem.e("section-desc")]}>对指定路径进行独立监控。白名单模式下仅在此添加记录开关；黑名单模式下添加忽略开关</p>
        </div>

        <div className={style[bem.e("rule-creator")]}>
          <div className={style[bem.e("select-wrapper")]}>
            <Select
              value={rulePath}
              onChange={setRulePath}
              options={routeSelectOptions}
              placeholder="请选择已有接口路由"
              direction="bottom"
            />
          </div>
          <div className={style[bem.e("input-wrapper")]}>
            <input
              className={style[bem.e("input-text")]}
              placeholder="或在此手动键入 API 过滤通配规则"
              value={rulePath}
              onChange={e => setRulePath(e.target.value)}
            />
          </div>
          <div className={style[bem.e("method-wrapper")]}>
            <Select
              value={ruleMethod}
              onChange={setRuleMethod}
              options={METHOD_OPTIONS}
              direction="bottom"
            />
          </div>
          <div className={style[bem.e("prefix-checkbox")]}>
            <Check checked={ruleIsPrefix} onChange={setRuleIsPrefix} round type="dark" />
            <span>前缀匹配</span>
          </div>
          <Button type="dark" size="medium" onClick={handleAddRule}>
            <span>配置定制规则</span>
          </Button>
        </div>

        <div className={style[bem.e("rules-list")]}>
          {settings.rules.length > 0 ? (
            settings.rules.map((rule, idx) => {
              const ruleStatusDesc = settings.auditMode === "whitelist"
                ? (rule.enabled
                    ? `白名单模式例外的强制记录此接口配置为显式启用审计：该路径及级联前缀的请求将被强制入库。匹配方式为${rule.isPrefix ? "前缀级联" : "精准路由"}`
                    : `白名单模式放行 此接口配置为停用审计：不进行记录。匹配方式为${rule.isPrefix ? "前缀级联" : "精准路由"}`)
                : (!rule.enabled
                    ? `黑名单模式例外的强制放行此接口配置为强制忽略审计：不记录此路径任何日志。匹配方式为${rule.isPrefix ? "前缀级联" : "精准路由"}`
                    : `黑名单模式记录 此接口配置为强制记录：匹配方式为${rule.isPrefix ? "前缀级联" : "精准路由"}`);

              return (
                <div key={`${rule.method}:${rule.path}`} className={style[bem.e("rule-row-item")]}>
                  <div className={style[bem.e("rule-row-main")]}>
                    <div className={style[bem.e("rule-row-meta")]}>
                      <span className={`${style[bem.e("method-badge")]} ${style[bem.em("method-badge", rule.method.toLowerCase())]}`}>
                        {rule.method}
                      </span>
                      <span className={style[bem.e("rule-row-path")]}>
                        {rule.path}
                        {rule.isPrefix && <span className={style[bem.e("prefix-badge")]}>前缀匹配</span>}
                      </span>
                    </div>
                    <div className={style[bem.e("rule-row-effect-info")]}>
                      <HelpOutlineIcon />
                      <span>{ruleStatusDesc}</span>
                    </div>
                  </div>

                  <div className={style[bem.e("rule-row-controls")]}>
                    <div className={style[bem.e("control-switch-item")]}>
                      <span>{settings.auditMode === "whitelist" ? "强制记录" : "记录日志"}</span>
                      <Check
                        checked={rule.enabled}
                        onChange={val => handleRuleToggle(idx, "enabled", val)}
                        round
                        type="success"
                      />
                    </div>
                    <div className={[style[bem.e("control-switch-item")], style[bem.is("disabled", !rule.enabled)]].filter(Boolean).join(" ")}>
                      <span>记录报体</span>
                      <Check
                        checked={rule.logBody && rule.enabled}
                        onChange={val => handleRuleToggle(idx, "logBody", val)}
                        round
                        type="dark"
                      />
                    </div>
                    <button
                      className={style[bem.e("rule-btn-delete")]}
                      onClick={() => handleRemoveRule(idx)}
                    >
                      <DeleteOutlineIcon />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className={style[bem.e("empty-tip")]}>
              未设置任何特化过滤规则，所有配置路由遵循默认模式审计行为
            </div>
          )}
        </div>
      </div>

      <div className={style[bem.e("footer")]}>
        <Button
          type="dark"
          size="medium"
          loading={submitting}
          onClick={handleSaveConfig}
        >
          <span>应用并同步规则</span>
        </Button>
      </div>
    </div>
  );
}

export default LogConfig;
