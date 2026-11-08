import { useMemo, useState } from 'react';
import style from "./style.module.css";
import { createNamespace } from '/utils/js/classcreate';
import {
  Search as SearchIcon,
  ChevronDown as ChevronDownIcon,
  ChevronRight as ChevronRightIcon,
  Code as CodeIcon,
} from 'lucide-react';
import { publicSdkComponents } from '@/sukinos/resources/sdkComponents';
import { Input } from '@/component/input/layout';
import { GROUPS, ENTRIES } from './catalog';
import { DEMOS } from './demos';

const bem = createNamespace('setting-about');

const SDK_KEYS = Object.keys(publicSdkComponents);
const coveredKeys = new Set(ENTRIES.flatMap((entry) => entry.keys));
const uncoveredKeys = SDK_KEYS.filter((key) => !coveredKeys.has(key));
const staleKeys = [...coveredKeys].filter((key) => !SDK_KEYS.includes(key));

if (staleKeys.length > 0) {
  console.warn('[setting/about] 组件文档声明了 SDK 上不存在的导出：', staleKeys.join(', '));
}

const ALL_ENTRIES = [
  ...ENTRIES,
  ...uncoveredKeys.map((key) => ({
    id: `uncovered-${key}`,
    name: key,
    keys: [key],
    group: 'misc',
    kind: '待补',
    desc: '该导出已经挂在 AppSDK.Components 上，但页面还没有对应的文档条目。',
    props: [],
    usage: '',
  })),
];

// 这些组件 portal 或 fixed 到应用根节点，预览会覆盖整个应用窗口，而不是停在卡片里
const PORTAL_NOTES = {
  'board-selection': '面板会盖住整个应用窗口，而不是这张卡片。',
  modal: '弹窗会盖住整个应用窗口，而不是这张卡片。',
  'context-menu': '菜单面板挂到应用根节点；在虚线框内右键触发。',
  alert: '提示条由宿主根节点渲染，出现在整个应用窗口的底部。',
  confirm: '确认框由宿主根节点渲染，会盖住整个应用窗口。',
};

const EntryCard = ({ entry }) => {
  const Demo = DEMOS[entry.id];
  const note = PORTAL_NOTES[entry.id];

  return (
    <div className={style[bem.e('entry')]}>
      <div className={style[bem.e('entry-head')]}>
        <span className={style[bem.e('label-bold')]}>{entry.name}</span>
        <span className={style[bem.e('badge')]}>{entry.kind}</span>
      </div>

      <p className={style[bem.e('description')]}>{entry.desc}</p>

      {entry.keys.length > 1 && (
        <p className={style[bem.e('entry-note')]}>
          同时覆盖：{entry.keys.join(' / ')}
        </p>
      )}

      <div className={style[bem.e('preview')]}>
        {Demo ? <Demo /> : <span className={style[bem.e('entry-note')]}>该组件无内嵌预览</span>}
      </div>

      {note && <p className={style[bem.e('entry-note')]}>{note}</p>}

      {entry.props.length > 0 && (
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
              {entry.props.map((item) => (
                <tr key={item.name}>
                  <td><code className={style[bem.e('code-inline')]}>{item.name}</code></td>
                  <td className={style[bem.e('type-cell')]}>{item.type}</td>
                  <td>{item.default}</td>
                  <td className={style[bem.e('option-cell')]}>{item.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {entry.usage && (
        <>
          <div className={style[bem.e('example-header')]}>
            <CodeIcon size={14} style={{ marginRight: 6 }} /> SDK 示例
          </div>
          <div className={style[bem.e('code-block')]}>
            <pre>{entry.usage}</pre>
          </div>
        </>
      )}
    </div>
  );
};

const About = () => {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState(() => new Set());

  const keyword = query.trim().toLowerCase();

  const groups = useMemo(() => GROUPS.map((group) => {
    const items = ALL_ENTRIES.filter((entry) => {
      if (entry.group !== group.id) return false;
      if (!keyword) return true;
      return [entry.name, entry.desc, ...entry.keys]
        .some((text) => String(text).toLowerCase().includes(keyword));
    });
    return { ...group, items, folded: !keyword && collapsed.has(group.id) };
  }).filter((group) => group.items.length > 0), [keyword, collapsed]);

  const hitCount = groups.reduce((sum, group) => sum + group.items.length, 0);

  const toggleGroup = (id) => {
    // 搜索时分组强制展开，点击不改变折叠状态，避免清空搜索后分组意外收起
    if (keyword) return;
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('card')]}>
        <h2 className={style[bem.e('doc-title')]}>内置组件 (AppSDK.Components)</h2>
        <p className={style[bem.e('description')]}>
          本页按应用侧真实取用方式列出内置组件与示例。
        </p>
        <div className={style[bem.e('code-block')]} style={{ marginTop: 12 }}>
          <pre>{`const { Button, Input, Modal } = AppSDK.Components;`}</pre>
        </div>
        <div className={style[bem.e('divider')]} />
        <ul className={style[bem.e('notes')]}>
          <li>应用沙箱里没有 ES import，组件只能从 <code className={style[bem.e('code-inline')]}>AppSDK.Components</code> 取。</li>
          <li>宿主已经把 <code className={style[bem.e('code-inline')]}>React</code> 与 <code className={style[bem.e('code-inline')]}>useState / useEffect / useRef / useCallback / useMemo</code> 解构到模块顶层，直接用，不要重复声明。</li>
          <li><code className={style[bem.e('code-inline')]}>alert</code> 与 <code className={style[bem.e('code-inline')]}>confirm</code> 是命令式对象，不是 JSX 组件。</li>
        </ul>
      </div>

      <div className={style[bem.e('toolbar')]}>
        <div className={style[bem.e('search')]}>
          <Input
            size="small"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索组件名、导出名或说明"
            prefixIcon={<SearchIcon size={14} />}
            spellCheck={false}
          />
        </div>
        {keyword && <span className={style[bem.e('group-count')]}>{hitCount} 项</span>}
      </div>

      {groups.map((group) => (
        <section key={group.id} className={style[bem.e('group')]}>
          <button
            type="button"
            className={style[bem.e('group-header')]}
            onClick={() => toggleGroup(group.id)}
            aria-expanded={!group.folded}
          >
            {group.folded ? <ChevronRightIcon size={14} /> : <ChevronDownIcon size={14} />}
            <span className={style[bem.e('group-title')]}>{group.label}</span>
            <span className={style[bem.e('group-count')]}>{group.items.length}</span>
          </button>

          {!group.folded && group.items.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </section>
      ))}

      {groups.length === 0 && (
        <div className={style[bem.e('empty')]}>没有匹配「{query.trim()}」的组件</div>
      )}
    </div>
  );
};

export default About;
