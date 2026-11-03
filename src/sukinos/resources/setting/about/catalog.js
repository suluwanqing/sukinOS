/**
 * 设置-组件页的组件文档数据。
 *
 * keys 里的每个名字都必须是 AppSDK.Components（publicSdkComponents）上的真实导出；
 * 页面渲染时用 publicSdkComponents 反查这份清单，两边不一致会直接暴露出来。
 * 示例统一按应用侧口径写：沙箱里没有 ES import，组件只能从 AppSDK.Components 取。
 */

export const GROUPS = [
  { id: 'controls', label: '交互控件' },
  { id: 'layout', label: '容器布局' },
  { id: 'feedback', label: '反馈浮层' },
  { id: 'misc', label: '其他' },
  { id: 'keepalive', label: '保活' },
];

export const ENTRIES = [
  {
    id: 'button',
    name: 'Button',
    keys: ['Button'],
    group: 'controls',
    kind: '组件',
    desc: '通用按钮。variant 是新口径，type 保留旧名映射；both 同时给时 variant 优先。',
    props: [
      { name: 'children', type: 'ReactNode', default: '-', desc: '按钮内容' },
      { name: 'variant', type: 'string', default: "'default'", desc: 'default | outline | secondary | ghost | destructive | link | success | warning | info' },
      { name: 'type', type: 'string', default: '-', desc: '旧名快捷方式：primary→default、danger→destructive、dark→default、text→ghost' },
      { name: 'size', type: 'string', default: "'default'", desc: 'default | sm | lg | xs | icon | icon-sm | icon-lg | icon-xs；旧名 mini/small/medium/large 自动映射' },
      { name: 'plain', type: 'boolean', default: 'false', desc: '透明底 + 描边的朴素样式' },
      { name: 'round', type: 'boolean', default: 'false', desc: '全圆角' },
      { name: 'block', type: 'boolean', default: 'false', desc: '占满父容器宽度' },
      { name: 'loading', type: 'boolean', default: 'false', desc: '左侧转圈，同时禁用点击' },
      { name: 'disabled', type: 'boolean', default: 'false', desc: '禁用' },
      { name: 'icon', type: 'ReactNode', default: '-', desc: '图标；loading 时让位给转圈' },
      { name: 'iconPosition', type: 'string', default: "'left'", desc: 'left | right' },
      { name: 'asChild', type: 'boolean', default: 'false', desc: '样式交给唯一子元素（Slot）' },
    ],
    usage: `const { Button } = AppSDK.Components;

export default () => (
  <>
    <Button variant="default">提交</Button>
    <Button variant="outline" size="sm">取消</Button>
    <Button variant="destructive" plain round>删除</Button>
  </>
);`,
  },
  {
    id: 'input',
    name: 'Input',
    keys: ['Input'],
    group: 'controls',
    kind: '组件',
    desc: '组合式输入框，支持受控/非受控、清空、密码显隐与前后置图标。',
    props: [
      { name: 'value / defaultValue', type: 'string', default: '-', desc: '受控与非受控两种用法' },
      { name: 'onChange', type: 'function', default: '-', desc: '(event) => void，原生事件' },
      { name: 'size', type: 'string', default: "'medium'", desc: 'small | medium | large（sm / lg 是同义写法）' },
      { name: 'clearable', type: 'boolean', default: 'false', desc: '有值时显示清空按钮' },
      { name: 'showPassword', type: 'boolean', default: 'false', desc: '密码显隐切换（按 type=password 渲染）' },
      { name: 'prefixIcon / suffixIcon', type: 'ReactNode', default: '-', desc: '前后置图标' },
      { name: 'maxLength / minLength', type: 'number', default: '-', desc: '长度限制，透传给原生 input' },
      { name: 'isRound', type: 'boolean', default: 'false', desc: '全圆角' },
      { name: 'disabled', type: 'boolean', default: 'false', desc: '禁用' },
      { name: 'ref', type: 'ref', default: '-', desc: 'forwardRef 到原生 input 元素' },
    ],
    usage: `const { Input } = AppSDK.Components;

export default ({ state, dispatch }) => (
  <Input
    clearable
    size="medium"
    value={state.keyword}
    placeholder="请输入关键词"
    onChange={(e) => dispatch({ type: 'SET_KEYWORD', value: e.target.value })}
  />
);`,
  },
  {
    id: 'check',
    name: 'Check',
    keys: ['Check'],
    group: 'controls',
    kind: '组件',
    desc: '开关切换器。自带 role=switch / aria-checked，空格与回车可切换；配色只有 dark 与主色两套。',
    props: [
      { name: 'checked', type: 'boolean', default: 'false', desc: '当前状态' },
      { name: 'onChange', type: 'function', default: '-', desc: '(checked) => void' },
      { name: 'type', type: 'string', default: "'default'", desc: 'dark 走前景色轨道，其余一律主色' },
      { name: 'size', type: 'string', default: "'medium'", desc: 'large | medium | small' },
      { name: 'plain', type: 'boolean', default: 'false', desc: '透明轨道 + 带色边框' },
      { name: 'round', type: 'boolean', default: '-', desc: '全圆角轨道' },
      { name: 'dot', type: 'boolean', default: 'false', desc: '圆点模式：更矮的轨道 + 大圆点' },
      { name: 'disabled', type: 'boolean', default: 'false', desc: '禁用交互' },
    ],
    usage: `const { Check } = AppSDK.Components;

export default () => {
  const [on, setOn] = useState(true);
  return <Check checked={on} onChange={setOn} type="default" />;
};`,
  },
  {
    id: 'check-group',
    name: 'CheckGroup',
    keys: ['CheckGroup'],
    group: 'controls',
    kind: '组件',
    desc: '开关组合：单选或多选，可限制数量；选项可逐项覆盖配色与尺寸。',
    props: [
      { name: 'value', type: 'Array', default: '[]', desc: '当前选中值数组（受控）' },
      { name: 'onChange', type: 'function', default: '-', desc: '(values) => void' },
      { name: 'options', type: 'Array', default: '[]', desc: '字符串/数字，或 { value, label, disabled, type, size, plain, round }' },
      { name: 'mode', type: 'string', default: "'multiple'", desc: 'single | multiple' },
      { name: 'min / max', type: 'number', default: '-', desc: '选择数量限制，达到边界后对应项变灰' },
      { name: 'type / size / plain / round', type: '-', default: '-', desc: '同 Check，作为所有选项的默认值，选项内可覆盖' },
      { name: 'disabled', type: 'boolean', default: 'false', desc: '整组禁用' },
    ],
    usage: `const { CheckGroup } = AppSDK.Components;

export default () => {
  const [picked, setPicked] = useState(['mail']);
  return (
    <CheckGroup
      mode="multiple"
      max={2}
      options={[
        { value: 'mail', label: '邮件' },
        { value: 'sms', label: '短信', type: 'dark' },
        { value: 'push', label: '推送' },
      ]}
      value={picked}
      onChange={setPicked}
    />
  );
};`,
  },
  {
    id: 'check-card-bar',
    name: 'CheckCardBar',
    keys: ['CheckCardBar'],
    group: 'controls',
    kind: '组件',
    desc: '设置项列表：把 Check 与 CheckGroup 封装成「标题 + 描述 + 开关」的配置条。',
    props: [
      { name: 'options', type: 'Array', default: '[]', desc: '[{ key, label, desc, icon, type: "switch" | "group", theme, disabled, mode, min, max, subOptions }]' },
      { name: 'values', type: 'Object', default: '{}', desc: '按 key 取值的状态映射；switch 存布尔，group 存数组' },
      { name: 'onUpdate', type: 'function', default: '-', desc: '(key, nextValue) => void' },
    ],
    usage: `const { CheckCardBar } = AppSDK.Components;

export default ({ state, dispatch }) => (
  <CheckCardBar
    options={[
      { key: 'sync', label: '自动同步', desc: '保存时上传到云端' },
      { key: 'notify', label: '通知渠道', type: 'group', subOptions: ['邮件', '短信'] },
    ]}
    values={state.settings}
    onUpdate={(key, val) => dispatch({ type: 'SET_SETTING', key, value: val })}
  />
);`,
  },
  {
    id: 'select',
    name: 'Select',
    keys: ['Select'],
    group: 'controls',
    kind: '组件',
    desc: '下拉选择。支持搜索、异步分页与上下方向展开；下拉面板绝对定位在容器内。',
    props: [
      { name: 'value', type: 'any', default: '-', desc: '当前选中值' },
      { name: 'options', type: 'Array', default: '[]', desc: '[{ value, label }]' },
      { name: 'onChange', type: 'function', default: '() => {}', desc: '(value) => void' },
      { name: 'size', type: 'string', default: "'default'", desc: 'small | default | large' },
      { name: 'direction', type: 'string', default: "'bottom'", desc: 'bottom | top' },
      { name: 'placeholder', type: 'string', default: "'请选择'", desc: '无选中时的占位' },
      { name: 'searchable', type: 'boolean', default: 'false', desc: '开启搜索框' },
      { name: 'optionsAsync', type: 'function', default: 'null', desc: '({ page, pageSize, searchQuery }) => Promise<{ items, total }>，需配合 searchable' },
      { name: 'showTitle', type: 'boolean', default: 'false', desc: '默认选中项的 title 提示，用于长文本' },
      { name: 'maxHeight', type: 'number | string', default: '-', desc: '下拉面板最大高度' },
      { name: 'hideScrollbar', type: 'boolean', default: 'false', desc: '隐藏下拉滚动条' },
      { name: 'boxStyle / dropdownStyle / optionStyle', type: 'object', default: '{}', desc: '三段内联样式覆盖' },
    ],
    usage: `const { Select } = AppSDK.Components;

export default () => {
  const [val, setVal] = useState('b');
  return (
    <Select
      value={val}
      onChange={setVal}
      options={[{ value: 'a', label: '选项 A' }, { value: 'b', label: '选项 B' }]}
    />
  );
};`,
  },
  {
    id: 'board-selection',
    name: 'BoardSelection',
    keys: ['BoardSelection'],
    group: 'controls',
    kind: '组件',
    desc: '「选择打开方式」中央面板，portal 到 document.body；Esc 关闭。',
    props: [
      { name: 'visible', type: 'boolean', default: 'false', desc: '显隐' },
      { name: 'title', type: 'string', default: "'选择打开方式'", desc: '面板标题' },
      { name: 'options', type: 'Array', default: '[]', desc: '[{ id, label, icon }]' },
      { name: 'onSelect', type: 'function', default: '-', desc: '(option) => void' },
      { name: 'onClose', type: 'function', default: '-', desc: '关闭回调，点遮罩或 Esc 触发' },
      { name: 'noneInfo', type: 'string', default: "'无可用选择'", desc: 'options 为空时的提示' },
    ],
    usage: `const { BoardSelection, Button } = AppSDK.Components;

export default () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>打开</Button>
      <BoardSelection
        visible={open}
        options={[{ id: 'view', label: '查看器' }]}
        onSelect={(opt) => { setOpen(false); }}
        onClose={() => setOpen(false)}
      />
    </>
  );
};`,
  },
  {
    id: 'date-google',
    name: 'DateGoogle',
    keys: ['DateGoogle'],
    group: 'controls',
    kind: '组件',
    desc: '月历式日期选择，选中项与今天分色显示。',
    props: [
      { name: 'initialDate', type: 'Date', default: 'new Date()', desc: '初始选中日期' },
      { name: 'onDateChange', type: 'function', default: '-', desc: '(date) => void，挂载即回调一次' },
      { name: 'className', type: 'string', default: "''", desc: '外层类名' },
    ],
    usage: `const { DateGoogle } = AppSDK.Components;

export default () => {
  const [date, setDate] = useState(new Date());
  return <DateGoogle initialDate={date} onDateChange={setDate} />;
};`,
  },
  {
    id: 'page',
    name: 'Page',
    keys: ['Page'],
    group: 'layout',
    kind: '组件',
    desc: '分页器：页码、跳页、每页条数与总数；翻页后可按配置滚动页面。',
    props: [
      { name: 'total', type: 'number', default: '0', desc: '总条数' },
      { name: 'pageSize', type: 'number', default: '10', desc: '每页条数' },
      { name: 'current', type: 'number', default: '1', desc: '当前页' },
      { name: 'sizeOptions', type: 'Array', default: '[10, 20, 50, 100]', desc: '每页条数候选' },
      { name: 'showElevator', type: 'boolean', default: 'true', desc: '显示跳页输入' },
      { name: 'showTotal', type: 'boolean', default: 'true', desc: '显示总条数' },
      { name: 'scrollTo', type: 'string', default: "'top'", desc: 'top | bottom | none，翻页后的滚动目标' },
      { name: 'onPageChange', type: 'function', default: '() => {}', desc: '(page) => void' },
      { name: 'onPageSizeChange', type: 'function', default: '() => {}', desc: '(size) => void' },
    ],
    usage: `const { Page } = AppSDK.Components;

export default () => {
  const [current, setCurrent] = useState(1);
  return <Page total={235} pageSize={20} current={current} onPageChange={setCurrent} />;
};`,
  },
  {
    id: 'page-list',
    name: 'PageList',
    keys: ['PageList'],
    group: 'layout',
    kind: '组件',
    desc: '数据表格：列配置、操作列、行选择、展开行、列显隐与远程分页（isAuto + request）。',
    props: [
      { name: 'columns', type: 'Array', default: '[]', desc: '[{ prop, label, type, width, minWidth, maxWidth, render, deep, responsive, ellipsis, placeholder }]；type 支持 image/img、video、link/url，其余按文本' },
      { name: 'actions', type: 'Array', default: '[]', desc: '操作列：[{ label, icon, onClick(record), style, showText }]' },
      { name: 'data / total', type: 'Array / number', default: '[] / 0', desc: '受控数据与总条数' },
      { name: 'current / pageSize', type: 'number', default: '1 / 10', desc: '受控分页' },
      { name: 'isAuto + request', type: 'boolean + function', default: 'false / null', desc: '内置请求：request({ current, pageSize }) => 结果，配合 requestDataPath 取列表' },
      { name: 'selectable', type: 'boolean', default: 'false', desc: '显示行选择列' },
      { name: 'selectedRowKeys', type: 'Array', default: '-', desc: '受控选中行；不给则内部维护' },
      { name: 'childrenColumnName', type: 'string', default: "'children'", desc: '展开行数据字段' },
      { name: 'theme', type: 'string', default: "'default'", desc: '表格配色档' },
      { name: 'rowKey', type: 'string', default: "'id'", desc: '行唯一键字段' },
      { name: 'actionTitle / actionWidth / actionFixed / actionTextTrigger', type: '-', default: "'操作' / 'auto' / true / 'hover'", desc: '操作列标题、宽度、右侧固定、hover 或 always 显示文字' },
      { name: 'scrollX / textMaxLength', type: 'number', default: '- / 0', desc: '横向最小宽度、单元格截断长度' },
      { name: 'onPageChange / onPageSizeChange / onSelectionChange', type: 'function', default: '() => {}', desc: '分页与选择回调' },
    ],
    usage: `const { PageList, alert } = AppSDK.Components;

export default () => (
  <PageList
    columns={[
      { prop: 'name', label: '名称' },
      { prop: 'size', label: '大小', width: 120 },
    ]}
    actions={[{ label: '查看', onClick: (record) => alert.success(record.name) }]}
    data={[{ id: 1, name: 'a.txt', size: '12 KB' }]}
    total={1}
    pageSize={10}
    current={1}
  />
);`,
  },
  {
    id: 'info-list',
    name: 'InfoList',
    keys: ['InfoList'],
    group: 'layout',
    kind: '组件',
    desc: '左侧导航 + 右侧分组内容的两栏列表页。',
    props: [
      { name: 'menuData', type: 'Array', default: '[]', desc: '[{ nav: { text, active, hot }, content: [{ title, items: [{ text, isNew, sub }], subGroup }] }]' },
      { name: 'onItemClick', type: 'function', default: '() => {}', desc: '(item) => void，点击右侧条目' },
      { name: 'onMouseLeave', type: 'function', default: '() => {}', desc: '鼠标离开整个列表' },
      { name: 'className / style', type: '-', default: '-', desc: '外层覆盖' },
    ],
    usage: `const { InfoList, alert } = AppSDK.Components;

export default () => (
  <InfoList
    menuData={[
      {
        nav: { text: '账户', active: true },
        content: [{ title: '基础', items: [{ text: '昵称' }, { text: '头像', isNew: true }] }],
      },
    ]}
    onItemClick={(item) => alert.success(item.text)}
  />
);`,
  },
  {
    id: 'nav',
    name: 'Nav',
    keys: ['Nav'],
    group: 'layout',
    kind: '组件',
    desc: '纵向/横向导航，支持分组展开、收起只留图标与标题栏。',
    props: [
      { name: 'items', type: 'Array', default: '[]', desc: '[{ id, label, icon, children }]' },
      { name: 'activeId', type: 'string', default: '-', desc: '当前激活项' },
      { name: 'onChange', type: 'function', default: '-', desc: '(id) => void' },
      { name: 'mode', type: 'string', default: "'vertical'", desc: 'vertical | horizontal' },
      { name: 'theme', type: 'string', default: "'light'", desc: 'light | dark' },
      { name: 'collapsed', type: 'boolean', default: 'false', desc: '收起为图标条' },
      { name: 'onCollapse', type: 'function', default: '-', desc: '(next) => void；提供后才出现底部收起按钮' },
      { name: 'header', type: 'ReactNode', default: 'null', desc: '纵向模式顶部标题区' },
      { name: 'width / collapsedWidth', type: 'number | string', default: '-', desc: '展开/收起宽度' },
    ],
    usage: `const { Nav } = AppSDK.Components;

export default () => {
  const [active, setActive] = useState('home');
  return (
    <Nav
      items={[{ id: 'home', label: '首页' }, { id: 'more', label: '更多', children: [{ id: 'about', label: '关于' }] }]}
      activeId={active}
      onChange={setActive}
      header="我的应用"
    />
  );
};`,
  },
  {
    id: 'general-purpose-page',
    name: 'GeneralPurposePage',
    keys: ['GeneralPurposePage'],
    group: 'layout',
    kind: '组件',
    desc: '通用状态页：404 / 500 / 403 / 无数据 / 升级中 / 跳转中。参数可从 Props、路由 state、URL query 三处取，Props 优先。',
    props: [
      { name: 'type', type: 'string', default: "'404'", desc: '404 | 500 | 403 | no-data | redirect | update' },
      { name: 'imageUrl / title / description', type: 'string', default: '-', desc: '覆盖内置文案与插图' },
      { name: 'actionText', type: 'string', default: "'返回'", desc: '按钮文字；传空串可不显示按钮' },
      { name: 'onActionClick', type: 'function | string', default: '-', desc: '传函数直接执行；传路径则跳转；不传则 navigate(-1) / 回首页' },
      { name: 'autoRedirect', type: 'object', default: '-', desc: '{ enabled, path, delay } 倒计时自动跳转' },
    ],
    usage: `const { GeneralPurposePage } = AppSDK.Components;

export default () => (
  <GeneralPurposePage
    type="no-data"
    title="暂无记录"
    actionText="返回首页"
    onActionClick="/"
  />
);`,
  },
  {
    id: 'rool-wrapper',
    name: 'RoolWrapper',
    keys: ['RoolWrapper'],
    group: 'layout',
    kind: '容器',
    desc: '只透传 children 与 className 的容器，没有内建样式与行为。',
    props: [
      { name: 'children', type: 'ReactNode', default: '-', desc: '内容' },
      { name: 'className', type: 'string', default: '-', desc: '原样挂到 div' },
    ],
    usage: `const { RoolWrapper } = AppSDK.Components;

export default () => (
  <RoolWrapper className="my-class">内容</RoolWrapper>
);`,
  },
  {
    id: 'code',
    name: 'Code',
    keys: ['Code'],
    group: 'layout',
    kind: '组件',
    desc: '内联代码标签，只透传 children 与 className，没有内建样式。',
    props: [
      { name: 'children', type: 'ReactNode', default: '-', desc: '代码文本' },
      { name: 'className', type: 'string', default: '-', desc: '原样挂到 code' },
    ],
    usage: `const { Code } = AppSDK.Components;

export default () => <Code className="my-code">npm run dev</Code>;`,
  },
  {
    id: 'alert',
    name: 'alert',
    keys: ['alert'],
    group: 'feedback',
    kind: '命令式',
    desc: '全局轻提示。命令式对象，不是 JSX 组件；渲染节点由宿主根节点挂载。',
    props: [
      { name: 'alert.success / failure / warning / dark', type: 'function', default: '-', desc: '(info, options) => void' },
      { name: 'options.duration', type: 'number', default: '2500', desc: '显示时长(ms)' },
      { name: 'options.multiLine', type: 'boolean', default: 'false', desc: '允许换行显示' },
      { name: 'options.allowMultiple', type: 'boolean', default: 'false', desc: '允许向下堆叠多条' },
    ],
    usage: `const { alert, Button } = AppSDK.Components;

export default () => (
  <Button onClick={() => alert.success('保存成功', { duration: 2000 })}>保存</Button>
);`,
  },
  {
    id: 'confirm',
    name: 'confirm',
    keys: ['confirm'],
    group: 'feedback',
    kind: '命令式',
    desc: '全局确认框。命令式对象，支持输入模式与自定义内容；同一时间只保留一个实例。',
    props: [
      { name: 'confirm.show(config)', type: 'function', default: '-', desc: '打开确认框' },
      { name: 'config.title / content', type: 'string', default: "'提示' / '确定要执行此操作吗？'", desc: '标题与正文' },
      { name: 'config.showInput', type: 'boolean', default: 'false', desc: '正文位置显示输入框' },
      { name: 'config.inputPlaceholder / inputDefaultValue', type: 'string', default: '-', desc: '输入框占位与默认值' },
      { name: 'config.showCancel', type: 'boolean', default: 'true', desc: '是否显示取消按钮' },
      { name: 'config.confirmText / cancelText', type: 'string', default: "'确定' / '取消'", desc: '按钮文字' },
      { name: 'config.onConfirm / onCancel', type: 'function', default: '-', desc: 'onConfirm 收到输入框当前值' },
      { name: 'confirm.hide()', type: 'function', default: '-', desc: '手动关闭' },
    ],
    usage: `const { confirm, alert, Button } = AppSDK.Components;

export default () => (
  <Button onClick={() => confirm.show({
    title: '重命名',
    showInput: true,
    inputDefaultValue: '旧名字',
    onConfirm: (val) => alert.success('新名字：' + val),
  })}>重命名</Button>
);`,
  },
  {
    id: 'alert-confirm',
    name: 'AlertConfirm',
    keys: ['AlertConfirm'],
    group: 'feedback',
    kind: '组件',
    desc: '内嵌在页面里的「未保存更改」确认条，不 portal、不遮挡页面。',
    props: [
      { name: 'visible', type: 'boolean', default: 'false', desc: '显隐（用高度/透明度过渡）' },
      { name: 'title', type: 'string', default: "'检测到未保存的更改'", desc: '提示文案' },
      { name: 'confirmText / cancelText', type: 'string', default: "'保存更改' / '放弃'", desc: '两个按钮的文字' },
      { name: 'confirmType', type: 'string', default: "'primary'", desc: '确认按钮色调' },
      { name: 'loading', type: 'boolean', default: 'false', desc: '确认按钮转圈并禁用' },
      { name: 'icon', type: 'Component', default: 'null', desc: '确认按钮左侧图标' },
      { name: 'onConfirm / onCancel', type: 'function', default: '-', desc: '两个按钮的回调' },
    ],
    usage: `const { AlertConfirm } = AppSDK.Components;

export default () => {
  const [dirty, setDirty] = useState(true);
  return (
    <AlertConfirm
      visible={dirty}
      onConfirm={() => setDirty(false)}
      onCancel={() => setDirty(false)}
    />
  );
};`,
  },
  {
    id: 'notification',
    name: 'Notification',
    keys: ['Notification'],
    group: 'feedback',
    kind: '组件',
    desc: '固定在视口四角或顶中的通知卡，fixed 定位，通常由页面自己控制显隐。',
    props: [
      { name: 'position', type: 'string', default: "'top-right'", desc: 'top-right | top-left | bottom-right | bottom-left | top-center' },
      { name: 'title / icon', type: 'ReactNode', default: '-', desc: '标题与图标' },
      { name: 'content / children / footer', type: 'ReactNode', default: '-', desc: '主体内容（children 优先）与底部区' },
      { name: 'showClose', type: 'boolean', default: 'true', desc: '显示关闭按钮' },
      { name: 'onClose / onClick', type: 'function', default: '-', desc: '关闭与整体点击' },
    ],
    usage: `const { Notification } = AppSDK.Components;

export default () => {
  const [open, setOpen] = useState(false);
  return open ? (
    <Notification
      position="bottom-right"
      title="同步完成"
      content="3 个文件已更新"
      onClose={() => setOpen(false)}
    />
  ) : null;
};`,
  },
  {
    id: 'over-play',
    name: 'OverPlay',
    keys: ['OverPlay'],
    group: 'feedback',
    kind: '组件',
    desc: '遮罩层容器：点遮罩或按 Esc 关闭，可加模糊背景。',
    props: [
      { name: 'children', type: 'ReactNode', default: '-', desc: '遮罩里的内容' },
      { name: 'closeFunc', type: 'function', default: '() => {}', desc: '遮罩点击与 Esc 触发（内部另有 keydown 监听）' },
      { name: 'isBlur', type: 'boolean', default: 'false', desc: '背景模糊' },
      { name: 'isFixed', type: 'boolean', default: 'false', desc: '固定定位铺满视口' },
      { name: 'style / styleC', type: 'object', default: '{}', desc: '遮罩层与内容层内联样式' },
    ],
    usage: `const { OverPlay, Button } = AppSDK.Components;

export default () => {
  const [open, setOpen] = useState(false);
  if (!open) return <Button onClick={() => setOpen(true)}>打开</Button>;
  return (
    <OverPlay isFixed isBlur closeFunc={() => setOpen(false)}>
      <div>这里放任意内容</div>
    </OverPlay>
  );
};`,
  },
  {
    id: 'loading',
    name: 'Loading',
    keys: ['Loading'],
    group: 'feedback',
    kind: '组件',
    desc: '全屏加载态：fixed inset-0，带方块跳动与阴影动画。',
    props: [
      { name: 'text', type: 'string', default: "'System Loading'", desc: '底部大写小字' },
      { name: 'className', type: 'string', default: '-', desc: '覆盖定位与尺寸（cn 合并，可改成内联展示）' },
    ],
    usage: `const { Loading } = AppSDK.Components;

export default ({ state }) => (
  state.loading ? <Loading text="LOADING" /> : null
);`,
  },
  {
    id: 'modal',
    name: 'Modal',
    keys: ['Modal'],
    group: 'feedback',
    kind: '组件',
    desc: '标准弹窗外壳：标题栏 + 关闭按钮 + 可滚动内容区，支持两栏布局。',
    props: [
      { name: 'visible', type: 'boolean', default: 'false', desc: '显隐（受控）' },
      { name: 'title', type: 'string', default: '-', desc: '标题栏文字' },
      { name: 'onClose', type: 'function', default: '-', desc: '点关闭按钮或遮罩关闭时回调' },
      { name: 'children', type: 'ReactNode', default: '-', desc: '内容区' },
      { name: 'width', type: 'number', default: '820', desc: '宽度，最大不超过视口减 32px' },
      { name: 'layout', type: 'string', default: "'standard'", desc: 'standard 单栏 | split 220px 左栏 + 内容' },
      { name: 'minHeight', type: 'number', default: '-', desc: '内容区最小高度；split 默认 420，standard 默认 320' },
    ],
    usage: `const { Modal, Button } = AppSDK.Components;

export default () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>打开弹窗</Button>
      <Modal visible={open} title="编辑" onClose={() => setOpen(false)}>
        内容区
      </Modal>
    </>
  );
};`,
  },
  {
    id: 'context-menu',
    name: 'ContextMenu',
    keys: [
      'ContextMenu', 'ContextMenuTrigger', 'ContextMenuContent', 'ContextMenuItem',
      'ContextMenuCheckboxItem', 'ContextMenuRadioItem', 'ContextMenuLabel',
      'ContextMenuSeparator', 'ContextMenuShortcut', 'ContextMenuSub',
      'ContextMenuSubTrigger', 'ContextMenuSubContent', 'ContextMenuRadioGroup',
      'ContextMenuPortal',
    ],
    group: 'feedback',
    kind: '组件组',
    desc: '右键菜单。Root / Trigger / Content / Item / Separator / Sub 等 14 个部件成套使用；Content 内置 Portal。',
    props: [
      { name: 'ContextMenu', type: 'component', default: '-', desc: 'Root，包住触发区与菜单' },
      { name: 'ContextMenuTrigger', type: 'component', default: '-', desc: '右键触发区，可渲染为任意元素' },
      { name: 'ContextMenuContent', type: 'component', default: '-', desc: '菜单面板，内置 Portal；用 className 改宽高' },
      { name: 'ContextMenuItem', type: 'component', default: '-', desc: '菜单项；variant="destructive" 走危险色，inset 留缩进' },
      { name: 'ContextMenuCheckboxItem / RadioItem / RadioGroup', type: 'component', default: '-', desc: '勾选型与单选型菜单项' },
      { name: 'ContextMenuSub / SubTrigger / SubContent', type: 'component', default: '-', desc: '二级菜单' },
      { name: 'ContextMenuLabel / Separator / Shortcut / Portal', type: 'component', default: '-', desc: '分组标题、分隔线、快捷键提示、自定义传送点' },
    ],
    usage: `const {
  ContextMenu, ContextMenuTrigger, ContextMenuContent,
  ContextMenuItem, ContextMenuSeparator, alert,
} = AppSDK.Components;

export default () => (
  <ContextMenu>
    <ContextMenuTrigger className="rounded border p-6">右键我</ContextMenuTrigger>
    <ContextMenuContent>
      <ContextMenuItem onClick={() => alert.success('打开')}>打开</ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem variant="destructive">删除</ContextMenuItem>
    </ContextMenuContent>
  </ContextMenu>
);`,
  },
  {
    id: 'logo',
    name: 'Logo',
    keys: ['Logo'],
    group: 'misc',
    kind: '组件',
    desc: 'SukinOS 标志（内联 SVG），四组颜色可改。',
    props: [
      { name: 'size', type: 'number | string', default: "'100%'", desc: '宽高（正方形）' },
      { name: 'primaryColor', type: 'string', default: "'#004ea8'", desc: '主体色' },
      { name: 'secondaryColor', type: 'string', default: "'#00f2ff'", desc: '高光色' },
      { name: 'glowColor', type: 'string', default: "'#d4f9ff'", desc: '光晕色' },
      { name: 'shadowColor', type: 'string', default: "'#00081a'", desc: '阴影色' },
      { name: 'className / style', type: '-', default: '-', desc: '外层覆盖' },
    ],
    usage: `const { Logo } = AppSDK.Components;

export default () => <Logo size={120} />;`,
  },
  {
    id: 'get-logo-base64',
    name: 'getLogoBase64Url',
    keys: ['getLogoBase64Url'],
    group: 'misc',
    kind: '函数',
    desc: '把 Logo 转成 data URL 字符串，用于图标、favicon 或存进配置。',
    props: [
      { name: 'options', type: 'object', default: '{}', desc: '{ primaryColor, secondaryColor, glowColor, shadowColor }' },
      { name: '返回值', type: 'string', default: '-', desc: 'data:image/svg+xml;base64,...（同参数命中缓存）' },
    ],
    usage: `const { getLogoBase64Url } = AppSDK.Components;

const url = getLogoBase64Url({ primaryColor: '#7c3aed' });
// 存进应用图标配置，或直接 <img src={url} />`,
  },
  {
    id: 'keep-alive',
    name: 'KeepAlive',
    keys: ['KeepAlive'],
    group: 'keepalive',
    kind: '保活',
    desc: '面板级保活：只挂载访问过的面板，切换时用 display 隐藏，滚动位置与表单输入原地保留。',
    props: [
      { name: 'activeKey', type: 'string | number', default: '-', desc: '当前显示的面板标识' },
      { name: 'children', type: 'ReactNode', default: '-', desc: '各面板；标识优先取 tabKey，其次取 React key' },
      { name: 'className / style', type: '-', default: '-', desc: '外层覆盖，默认撑满并定位' },
    ],
    usage: `const { KeepAlive, Input } = AppSDK.Components;

export default () => {
  const [tab, setTab] = useState('a');
  return (
    <KeepAlive activeKey={tab}>
      <div tabKey="a"><Input placeholder="切走再回来，输入还在" /></div>
      <div tabKey="b">面板 B</div>
    </KeepAlive>
  );
};`,
  },
];
