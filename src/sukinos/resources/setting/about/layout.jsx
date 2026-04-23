import React from 'react';
import style from "./style.module.css";
import { createNamespace } from '/utils/js/classcreate';
import InfoIcon from '@mui/icons-material/Info';
import AppsIcon from '@mui/icons-material/Apps';
import ExtensionIcon from '@mui/icons-material/Extension';
import CodeIcon from '@mui/icons-material/Code';

const bem = createNamespace('setting-about');

const About = () => {
  const PREBUILT_APPS = [
    { name: "文件管理", version: "v1", desc: "基于多级 VFS 架构的资源管理器，支持文件增删改查及拖拽。" },
    { name: "设置", version: "v1", desc: "内核级指令交互工具，支持模拟执行上下文与进程状态监控。" },
    { name: "开发者中心", version: "v1", desc: "用于用户自主添加应用支持和共享服务" },
    { name: "App Store", version: "v1", desc: "进程包管理中心，负责内核资源的动态分发和管理。" },
    { name: "记事本", version: "v1", desc: "轻量化文本编辑器，支持实时持久化、多级缓存与快捷键响应。" },
    { name: "开始", version: "v1", desc: "APP信息视图。" }
  ];
  const SYSTEM_COMPONENTS = [
    {
      name: "Alert",
      desc: "命令式全局通知组件，支持多类型堆叠与自动关闭。",
      props: [
        { name: "info", type: "string", default: "-", options: "提示文本内容" },
        { name: "duration", type: "number", default: "1500", options: "显示持续时间(ms)" },
        { name: "multiLine", type: "boolean", default: "false", options: "是否支持多行文本" },
        { name: "allowMultiple", type: "boolean", default: "false", options: "是否开启向下堆叠" }
      ],
      example: `\n\nalert.success('保存成功', { duration: 2000 });\nalert.failure('操作失败', { multiLine: true });`
    },
    {
      name: "Confirm",
      desc: "命令式全局确认对话框，支持输入模式与自定义内容。",
      props: [
        { name: "title", type: "string", default: "'提示'", options: "对话框标题" },
        { name: "content", type: "string", default: "-", options: "正文描述文本" },
        { name: "showInput", type: "boolean", default: "false", options: "是否开启输入框模式" },
        { name: "onConfirm", type: "function", default: "-", options: "(val) => void" }
      ],
      example: `\n\nconfirm.show({\n  title: '重命名',\n  showInput: true,\n  onConfirm: (val) => console.log(val)\n});`
    },
    {
      name: "Button",
      desc: "系统标准交互按钮，支持多种状态与图标配置。",
      props: [
        { name: "type", type: "string", default: "'default'", options: "primary|success|warning|danger|dark" },
        { name: "size", type: "string", default: "'medium'", options: "large|medium|small" },
        { name: "loading", type: "boolean", default: "false", options: "显示加载动画" },
        { name: "plain", type: "boolean", default: "false", options: "朴素/镂空模式" }
      ],
      example: `<Button type="primary" size="small" loading={false}>\n  提交更改\n</Button>`
    },
    {
      name: "Input",
      desc: "组合式输入控件，集成密码显隐与一键清空。",
      props: [
        { name: "clearable", type: "boolean", default: "false", options: "一键清空功能" },
        { name: "showPassword", type: "boolean", default: "false", options: "密码可见性切换" },
        { name: "prefixIcon", type: "ReactNode", default: "-", options: "前置辅助图标" },
        { name: "isRound", type: "boolean", default: "false", options: "全圆角样式" }
      ],
      example: `<Input \n  clearable \n  prefixIcon={<UserIcon />} \n  placeholder="请输入账号" \n/>`
    },
    {
      name: "Check",
      desc: "高性能状态开关切换器。",
      props: [
        { name: "checked", type: "boolean", default: "false", options: "当前开关状态" },
        { name: "type", type: "string", default: "'default'", options: "激活时的主题颜色" },
        { name: "disabled", type: "boolean", default: "false", options: "是否禁用交互" }
      ],
      example: `<Check checked={active} onChange={setActive} type="success" />`
    },
    {
      name: "CheckGroup",
      desc: "开关组合管理器，支持单选、多选及数量限制。",
      props: [
        { name: "mode", type: "string", default: "'multiple'", options: "single | multiple" },
        { name: "min / max", type: "number", default: "-", options: "选择数量范围限制" },
        { name: "options", type: "Array", default: "[]", options: "选项配置数据源" }
      ],
      example: `<CheckGroup \n  mode="single" \n  options={['A', 'B', 'C']} \n  value={[selected]} \n/>`
    },
    {
      name: "CheckCardBar",
      desc: "封装 Check 与 CheckGroup 的卡片式配置条。",
      props: [
        { name: "options", type: "Array", default: "-", options: "配置 Schema 数组" },
        { name: "values", type: "Object", default: "{}", options: "当前状态映射对象" },
        { name: "onUpdate", type: "function", default: "-", options: "(key, val) => void" }
      ],
      example: `<CheckCardBar \n  options={SCHEMA} \n  values={settings} \n  onUpdate={handleUpdate} \n/>`
    },
    {
      name: "InfoListn",
      desc: "综合平台资源分列渲染列表。",
      props: [
        { name: "menuData", type: "Array", default: "[]", options: "层级菜单数据结构" },
        { name: "onItemClick", type: "function", default: "-", options: "项点击回调" }
      ],
      example: `<InfoList menuData={data} onItemClick={handleClick} />`
    },
    {
      name: "BoardSelection",
      desc: "通用的“选择打开方式”中央面板。",
      props: [
        { name: "visible", type: "boolean", default: "false", options: "控制弹窗显隐" },
        { name: "options", type: "Array", default: "[]", options: "{ id, label, icon }" },
        { name: "onSelect", type: "function", default: "-", options: "选中项回调" }
      ],
      example: `<BoardSelection \n  visible={show} \n  title="选择应用" \n  options={apps} \n/>`
    }
  ];


  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('section')]}>
        <div className={style[bem.e('section-title')]}><InfoIcon style={{ fontSize: 18, marginRight: 8 }} /> 系统概览</div>
        <div className={style[bem.e('card')]}>
          <div className={style[bem.e('hero')]}>
            <div className={style[bem.e('logo-box')]}>S</div>
            <div>
              <h1 className={style[bem.e('os-name')]}>SukinOS</h1>
              {/* <span className={style[bem.e('version-text')]}>ALPHA v1.0.0 </span> */}
            </div>
          </div>
          <div className={style[bem.e('divider')]}></div>
          <div className={style[bem.e('spec-row')]}>
            <div className={style[bem.e('spec-item')]}>
              <span className={style[bem.e('label')]}>KERNEL ENGINE</span>
              <span className={style[bem.e('value')]}>React 19 + Redux + WebWorker</span>
            </div>
            <div className={style[bem.e('spec-item')]}>
              <span className={style[bem.e('label')]}>STORAGE ARCH</span>
              <span className={style[bem.e('value')]}>IndexedDB VFS Native</span>
            </div>
          </div>
        </div>
      </div>

      <div className={style[bem.e('section')]}>
        <div className={style[bem.e('section-title')]}><AppsIcon style={{ fontSize: 18, marginRight: 8 }} /> 预制应用</div>
        <div className={style[bem.e('grid')]}>
          {PREBUILT_APPS.map((app, index) => (
            <div key={index} className={style[bem.e('app-card')]}>
              <div className={style[bem.e('app-header')]}>
                <span className={style[bem.e('label-bold')]}>{app.name}</span>
                <span className={style[bem.e('tag')]}>{app.version}</span>
              </div>
              <p className={style[bem.e('description')]}>{app.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className={style[bem.e('section')]}>
        <div className={style[bem.e('section-title')]}><ExtensionIcon style={{ fontSize: 18, marginRight: 8 }} /> 内部组件库 (SDK UI)</div>
        {SYSTEM_COMPONENTS.map((comp, index) => (
          <div key={index} className={style[bem.e('card')]} style={{ marginBottom: 16 }}>
            <div className={style[bem.e('comp-info')]}>
              <span className={style[bem.e('label-bold')]}>{comp.name}</span>
              <p className={style[bem.e('description')]} style={{ marginTop: 4 }}>{comp.desc}</p>
            </div>

            <div className={style[bem.e('table-container')]}>
              <table className={style[bem.e('table')]}>
                <thead>
                  <tr>
                    <th>参数</th>
                    <th>类型</th>
                    <th>默认值</th>
                    <th>说明</th>
                  </tr>
                </thead>
                <tbody>
                  {comp.props.map((p, pIdx) => (
                    <tr key={pIdx}>
                      <td><code className={style[bem.e('code-inline')]}>{p.name}</code></td>
                      <td className={style[bem.e('type-cell')]}>{p.type}</td>
                      <td>{p.default}</td>
                      <td className={style[bem.e('option-cell')]}>{p.options}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={style[bem.e('example-header')]}>
              <CodeIcon style={{ fontSize: 14, marginRight: 6 }} /> 使用示例
            </div>
            <div className={style[bem.e('code-block')]}>
              <pre>{comp.example}</pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default About;
