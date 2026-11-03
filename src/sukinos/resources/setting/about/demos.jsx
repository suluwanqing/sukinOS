import { useState } from 'react';
import style from './style.module.css';
import { createNamespace } from '/utils/js/classcreate';
import { Search as SearchIcon, Plus as PlusIcon, FileText as FileIcon, Eye as EyeIcon, Folder as FolderIcon } from 'lucide-react';
import { publicSdkComponents as C } from '@/sukinos/resources/sdkComponents';

const bem = createNamespace('setting-about');

const {
  Button, Input, Check, CheckGroup, CheckCardBar, Select, BoardSelection, DateGoogle,
  Page, PageList, InfoList, Nav, GeneralPurposePage, RoolWrapper, Code,
  alert, confirm, AlertConfirm, Notification, OverPlay, Loading, Modal, ContextMenu,
  ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuLabel,
  ContextMenuSeparator, ContextMenuShortcut, ContextMenuSub, ContextMenuSubTrigger,
  ContextMenuSubContent, Logo, getLogoBase64Url, KeepAlive,
} = C;

const shell = style[bem.e('preview-shell')];
const row = style[bem.e('demo-row')];
const stack = style[bem.e('demo-stack')];
const hint = style[bem.e('demo-hint')];

function ButtonDemo() {
  const [loading, setLoading] = useState(false);
  const fakeLoad = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1200);
  };
  return (
    <div className={stack}>
      <div className={row}>
        <Button variant="default">默认</Button>
        <Button variant="outline">描边</Button>
        <Button variant="secondary">次要</Button>
        <Button variant="ghost">幽灵</Button>
        <Button variant="destructive">危险</Button>
        <Button variant="success">成功</Button>
        <Button variant="warning" plain>警告</Button>
        <Button variant="info" round>圆角</Button>
      </div>
      <div className={row}>
        <Button variant="outline" size="sm">小号</Button>
        <Button variant="outline" size="lg">大号</Button>
        <Button variant="default" icon={<PlusIcon size={15} />}>带图标</Button>
        <Button variant="outline" loading={loading} onClick={fakeLoad}>点击加载</Button>
        <Button variant="outline" disabled>禁用</Button>
      </div>
    </div>
  );
}

function InputDemo() {
  const [keyword, setKeyword] = useState('');
  const [pwd, setPwd] = useState('sukin-os');
  return (
    <div className={stack}>
      <Input
        clearable
        prefixIcon={<SearchIcon size={15} />}
        placeholder="可清空，输入试试"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
      />
      <div className={row}>
        <Input showPassword type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} style={{ maxWidth: 220 }} />
        <Input size="small" placeholder="small" style={{ maxWidth: 140 }} />
        <Input size="large" isRound placeholder="圆角" style={{ maxWidth: 160 }} />
        <Input disabled placeholder="禁用" style={{ maxWidth: 140 }} />
      </div>
      <span className={hint}>当前值：{keyword || '（空）'}</span>
    </div>
  );
}

function CheckDemo() {
  const [a, setA] = useState(true);
  const [b, setB] = useState(false);
  const [c, setC] = useState(true);
  return (
    <div className={stack}>
      <div className={row}>
        <Check checked={a} onChange={setA} />
        <Check checked={b} onChange={setB} type="dark" />
        <Check checked={c} onChange={setC} dot />
      </div>
      <div className={row}>
        <Check checked onChange={() => {}} plain />
        <Check checked onChange={() => {}} size="small" />
        <Check checked onChange={() => {}} size="large" />
        <Check checked={false} onChange={() => {}} disabled />
      </div>
    </div>
  );
}

const CHANNEL_OPTIONS = [
  { value: 'mail', label: '邮件' },
  { value: 'sms', label: '短信', type: 'dark' },
  { value: 'push', label: '推送' },
  { value: 'webhook', label: 'Webhook', disabled: true },
];

function CheckGroupDemo() {
  const [single, setSingle] = useState(['mail']);
  const [multi, setMulti] = useState(['mail', 'push']);
  return (
    <div className={stack}>
      <div>
        <span className={hint}>单选（mode="single"）</span>
        <CheckGroup mode="single" options={CHANNEL_OPTIONS} value={single} onChange={setSingle} />
      </div>
      <div>
        <span className={hint}>多选，最多 2 项（max=2）</span>
        <CheckGroup options={CHANNEL_OPTIONS} value={multi} onChange={setMulti} max={2} />
      </div>
    </div>
  );
}

const BAR_SCHEMA = [
  { key: 'sync', label: '自动同步', desc: '保存时上传到云端' },
  { key: 'notify', label: '通知渠道', type: 'group', subOptions: ['邮件', '短信', '推送'] },
  { key: 'beta', label: '参与内测', desc: '接收未稳定版本', theme: 'dark' },
];

function CheckCardBarDemo() {
  const [values, setValues] = useState({ sync: true, notify: ['邮件'], beta: false });
  return (
    <CheckCardBar
      options={BAR_SCHEMA}
      values={values}
      onUpdate={(key, val) => setValues((prev) => ({ ...prev, [key]: val }))}
    />
  );
}

const SELECT_OPTIONS = [
  { value: 'local', label: '本地存储' },
  { value: 'cloud', label: '云端同步' },
  { value: 'hybrid', label: '混合模式（较长文本用于测试截断）' },
];

function SelectDemo() {
  const [value, setValue] = useState('cloud');
  const [searchValue, setSearchValue] = useState('');
  return (
    <div className={stack} style={{ maxWidth: 260 }}>
      <Select value={value} onChange={setValue} options={SELECT_OPTIONS} showTitle />
      <Select
        searchable
        placeholder="可搜索"
        value={searchValue}
        onChange={setSearchValue}
        options={SELECT_OPTIONS}
      />
    </div>
  );
}

function BoardSelectionDemo() {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState('');
  const options = [
    { id: 'view', label: '通用查看器', icon: <EyeIcon size={18} /> },
    { id: 'editor', label: '文本编辑器', icon: <FileIcon size={18} /> },
  ];
  return (
    <div className={stack}>
      <div className={row}>
        <Button variant="outline" onClick={() => setOpen(true)}>打开选择面板</Button>
        {picked && <span className={hint}>已选：{picked}</span>}
      </div>
      <BoardSelection
        visible={open}
        options={options}
        onSelect={(opt) => { setPicked(opt.label); setOpen(false); }}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}

function DateGoogleDemo() {
  const [date, setDate] = useState(new Date());
  return (
    <div className={stack}>
      <DateGoogle initialDate={date} onDateChange={setDate} />
      <span className={hint}>已选：{date.toLocaleDateString()}</span>
    </div>
  );
}

function PageDemo() {
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  return (
    <Page
      total={235}
      current={current}
      pageSize={pageSize}
      onPageChange={setCurrent}
      onPageSizeChange={setPageSize}
    />
  );
}

const TABLE_DATA = [
  { id: 1, name: 'layout.jsx', type: '视图入口', size: '2.1 KB', updated: '2026-11-01' },
  { id: 2, name: 'logic.jsx', type: '逻辑入口', size: '1.4 KB', updated: '2026-10-28' },
  { id: 3, name: 'store/counter.js', type: '状态', size: '0.6 KB', updated: '2026-10-20' },
  { id: 4, name: 'styles/global.css', type: '样式', size: '3.2 KB', updated: '2026-10-12' },
];

const TABLE_COLUMNS = [
  { prop: 'name', label: '文件名' },
  { prop: 'type', label: '类型', width: 110 },
  { prop: 'size', label: '大小', width: 90 },
  { prop: 'updated', label: '修改时间', width: 130 },
];

function PageListDemo() {
  const [current, setCurrent] = useState(1);
  return (
    <PageList
      columns={TABLE_COLUMNS}
      data={TABLE_DATA}
      total={TABLE_DATA.length}
      current={current}
      pageSize={4}
      selectable
      actions={[{ label: '查看', icon: <EyeIcon size={13} />, onClick: (record) => alert.success(record.name) }]}
      onPageChange={setCurrent}
    />
  );
}

const INFO_MENU = [
  {
    nav: { text: '账户', active: true },
    content: [
      { title: '基础资料', items: [{ text: '昵称' }, { text: '头像', isNew: true }, { text: '签名', sub: true }] },
      { title: '安全', items: [{ text: '登录设备' }, { text: '双重验证' }] },
    ],
  },
  {
    nav: { text: '通知', hot: true },
    content: [
      { title: '推送', items: [{ text: '桌面通知' }, { text: '角标提醒' }] },
    ],
  },
  {
    nav: { text: '存储' },
    content: [
      { title: '空间', items: [{ text: '已用空间' }], subGroup: { title: '清理', items: [{ text: '缓存' }] } },
    ],
  },
];

function InfoListDemo() {
  return (
    <InfoList
      menuData={INFO_MENU}
      onItemClick={(item) => alert.success(item.text)}
      style={{ maxHeight: 300, borderRadius: 8, overflow: 'hidden' }}
    />
  );
}

const NAV_ITEMS = [
  { id: 'home', label: '首页', icon: <FolderIcon size={16} /> },
  {
    id: 'more',
    label: '更多',
    icon: <FileIcon size={16} />,
    children: [
      { id: 'about', label: '关于' },
      { id: 'help', label: '帮助' },
    ],
  },
  { id: 'settings', label: '设置' },
];

function NavDemo() {
  const [active, setActive] = useState('home');
  return (
    <div className={shell} style={{ height: 240 }}>
      <Nav items={NAV_ITEMS} activeId={active} onChange={setActive} header="我的应用" />
    </div>
  );
}

function GeneralPurposePageDemo() {
  return (
    <div className={shell} style={{ height: 280, overflow: 'auto' }}>
      <GeneralPurposePage
        type="no-data"
        title="暂无记录"
        description="这里空空如也，新建一条后会出现在这里。"
        actionText=""
      />
    </div>
  );
}

function RoolWrapperDemo() {
  return (
    <RoolWrapper className={style[bem.e('demo-box')]}>
      只有 children 和 className，没有任何内建样式
    </RoolWrapper>
  );
}

function CodeDemo() {
  return (
    <div className={stack}>
      <span>执行 <Code className={style[bem.e('demo-code')]}>npm run dev</Code> 启动开发服务器</span>
      <span className={hint}>组件只渲染 code 标签，样式需要自己给</span>
    </div>
  );
}

function AlertDemo() {
  return (
    <div className={row}>
      <Button variant="outline" onClick={() => alert.success('保存成功')}>success</Button>
      <Button variant="outline" onClick={() => alert.failure('操作失败')}>failure</Button>
      <Button variant="outline" onClick={() => alert.warning('警告')}>warning</Button>
      <Button variant="outline" onClick={() => alert.dark('通知', { duration: 3000 })}>dark</Button>
    </div>
  );
}

function ConfirmDemo() {
  return (
    <div className={row}>
      <Button
        variant="outline"
        onClick={() => confirm.show({
          title: '删除文件',
          content: '删除后不可恢复，确定继续吗？',
          onConfirm: () => alert.success('已删除'),
        })}
      >
        普通确认
      </Button>
      <Button
        variant="outline"
        onClick={() => confirm.show({
          title: '重命名',
          showInput: true,
          inputPlaceholder: '输入新名字',
          inputDefaultValue: '旧名字',
          onConfirm: (val) => alert.success('新名字：' + val),
        })}
      >
        输入式确认
      </Button>
    </div>
  );
}

function AlertConfirmDemo() {
  const [dirty, setDirty] = useState(true);
  const [savedTip, setSavedTip] = useState('');
  return (
    <div className={stack}>
      <AlertConfirm
        visible={dirty}
        onConfirm={() => { setDirty(false); setSavedTip('已保存'); }}
        onCancel={() => { setDirty(false); setSavedTip('已放弃'); }}
      />
      <div className={row}>
        <Button variant="outline" size="sm" onClick={() => { setDirty(true); setSavedTip(''); }}>重新显示</Button>
        {savedTip && <span className={hint}>{savedTip}</span>}
      </div>
    </div>
  );
}

function NotificationDemo() {
  const [open, setOpen] = useState(false);
  return (
    <div className={shell} style={{ height: 200 }}>
      {!open && (
        <div className={style[bem.e('demo-center')]}>
          <Button variant="outline" onClick={() => setOpen(true)}>弹出通知</Button>
        </div>
      )}
      {open && (
        <Notification
          position="bottom-right"
          title="同步完成"
          icon={<FileIcon size={18} />}
          content="3 个文件已更新"
          footer={<Button variant="link" size="sm" onClick={() => setOpen(false)}>知道了</Button>}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function OverPlayDemo() {
  const [open, setOpen] = useState(false);
  return (
    <div className={shell} style={{ height: 200 }}>
      <div className={style[bem.e('demo-center')]}>
        <Button variant="outline" onClick={() => setOpen(true)}>打开遮罩层</Button>
      </div>
      {open && (
        <OverPlay
          isFixed
          closeFunc={() => setOpen(false)}
          style={{ background: 'rgba(15, 23, 42, 0.45)' }}
          styleC={{ background: '#fff', color: '#303133', borderRadius: 10, padding: '18px 24px' }}
        >
          <div style={{ fontSize: 13 }}>点遮罩或按 Esc 关闭</div>
        </OverPlay>
      )}
    </div>
  );
}

function LoadingDemo() {
  return (
    <div className={shell} style={{ height: 220 }}>
      <Loading className="relative inset-auto h-full w-full" text="LOADING" />
    </div>
  );
}

function ModalDemo() {
  const [open, setOpen] = useState(false);
  return (
    <div className={row}>
      <Button variant="outline" onClick={() => setOpen(true)}>打开弹窗</Button>
      <Modal visible={open} title="编辑应用信息" onClose={() => setOpen(false)} width={520}>
        <div className={stack}>
          <Input placeholder="应用名称" />
          <Input placeholder="一句话描述" />
          <span className={hint}>内容区可滚动；layout="split" 会变成左栏 + 内容两栏</span>
        </div>
      </Modal>
    </div>
  );
}

function ContextMenuDemo() {
  const [lastAction, setLastAction] = useState('');
  return (
    <div className={stack}>
      <ContextMenu>
        <ContextMenuTrigger className={style[bem.e('demo-target')]}>
          在此区域右键
        </ContextMenuTrigger>
        <ContextMenuContent className="w-44">
          <ContextMenuLabel>文件操作</ContextMenuLabel>
          <ContextMenuItem onClick={() => setLastAction('打开')}>
            打开 <ContextMenuShortcut>Enter</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem onClick={() => setLastAction('重命名')}>重命名</ContextMenuItem>
          <ContextMenuSub>
            <ContextMenuSubTrigger>更多</ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-40">
              <ContextMenuItem onClick={() => setLastAction('复制路径')}>复制路径</ContextMenuItem>
              <ContextMenuItem onClick={() => setLastAction('导出')}>导出</ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSeparator />
          <ContextMenuItem variant="destructive" onClick={() => setLastAction('删除')}>删除</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <span className={hint}>{lastAction ? `触发：${lastAction}` : '菜单由 14 个部件组合，Content 自带 Portal'}</span>
    </div>
  );
}

function LogoDemo() {
  return (
    <div className={row} style={{ gap: 24 }}>
      <Logo size={96} />
      <Logo size={96} primaryColor="#7c3aed" secondaryColor="#22d3ee" glowColor="#ede9fe" shadowColor="#1e1b4b" />
    </div>
  );
}

function LogoBase64Demo() {
  const url = getLogoBase64Url({ primaryColor: '#0f766e', secondaryColor: '#5eead4' });
  return (
    <div className={stack}>
      <img src={url} alt="logo" width={96} height={96} />
      <span className={hint}>返回值直接可作 img src 或图标配置</span>
    </div>
  );
}

function KeepAliveDemo() {
  const [tab, setTab] = useState('a');
  return (
    <div className={stack}>
      <div className={row}>
        <Button variant={tab === 'a' ? 'default' : 'outline'} size="sm" onClick={() => setTab('a')}>面板 A</Button>
        <Button variant={tab === 'b' ? 'default' : 'outline'} size="sm" onClick={() => setTab('b')}>面板 B</Button>
      </div>
      <div style={{ height: 120 }}>
        <KeepAlive activeKey={tab}>
          <div tabKey="a" className={stack}>
            <Input placeholder="输入点内容，切到 B 再切回来" />
            <span className={hint}>面板 A 的输入会被保留</span>
          </div>
          <div tabKey="b" className={stack}>
            <span className={hint}>面板 B 首次切到才挂载</span>
          </div>
        </KeepAlive>
      </div>
    </div>
  );
}

export const DEMOS = {
  button: ButtonDemo,
  input: InputDemo,
  check: CheckDemo,
  'check-group': CheckGroupDemo,
  'check-card-bar': CheckCardBarDemo,
  select: SelectDemo,
  'board-selection': BoardSelectionDemo,
  'date-google': DateGoogleDemo,
  page: PageDemo,
  'page-list': PageListDemo,
  'info-list': InfoListDemo,
  nav: NavDemo,
  'general-purpose-page': GeneralPurposePageDemo,
  'rool-wrapper': RoolWrapperDemo,
  code: CodeDemo,
  alert: AlertDemo,
  confirm: ConfirmDemo,
  'alert-confirm': AlertConfirmDemo,
  notification: NotificationDemo,
  'over-play': OverPlayDemo,
  loading: LoadingDemo,
  modal: ModalDemo,
  'context-menu': ContextMenuDemo,
  logo: LogoDemo,
  'get-logo-base64': LogoBase64Demo,
  'keep-alive': KeepAliveDemo,
};
