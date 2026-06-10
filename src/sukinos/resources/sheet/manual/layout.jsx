import React, { useState } from 'react';
import style from './style.module.css';
import { createNamespace } from '/utils/js/classcreate';
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import ImportExportOutlinedIcon from '@mui/icons-material/ImportExportOutlined';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import BookOutlinedIcon from '@mui/icons-material/BookOutlined';

const bem = createNamespace('br-manual');

function ManualView() {
  const [activeTab, setActiveTab] = useState('intro');

  const menuItems = [
    { id: 'intro', label: '快速入门', icon: <AutoStoriesOutlinedIcon sx={{ fontSize: 18 }} /> },
    { id: 'tables', label: '表格管理', icon: <TableChartOutlinedIcon sx={{ fontSize: 18 }} /> },
    { id: 'tree', label: '树状层级', icon: <AccountTreeOutlinedIcon sx={{ fontSize: 18 }} /> },
    { id: 'fields', label: '字段定义', icon: <TuneOutlinedIcon sx={{ fontSize: 18 }} /> },
    { id: 'views', label: '多重视图', icon: <DashboardOutlinedIcon sx={{ fontSize: 18 }} /> },
    { id: 'impexp', label: '数据备份', icon: <ImportExportOutlinedIcon sx={{ fontSize: 18 }} /> },
    { id: 'storage', label: '离线保存', icon: <StorageOutlinedIcon sx={{ fontSize: 18 }} /> },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'intro':
        return (
          <div className={style[bem.e('doc')]}>
            <h2>快速入门</h2>
            <p>欢迎使用现代化多维表格系统。本系统结合了电子表格的灵活性与多维数据库的强大层级关系，为您提供全新的行数据组织方式。</p>
            <div className={style[bem.e('alert')]}>
              <strong>提示：</strong>本页面为独立的说明书路由视图。您可以点击左侧菜单随时查阅各项高级功能。
            </div>
            <h3>核心特点</h3>
            <ul>
              <li><strong>多视角切换：</strong>可在表格、看板、统计大盘间一键变换。</li>
              <li><strong>无限树状层级：</strong>支持在任意记录下建立任意深度的子节点，轻松拆解复杂工作。</li>
              <li><strong>状态自动同步：</strong>无需手动保存，基于 IndexedDB 底层支持离线持久化存储。</li>
              <li><strong>视窗滚动转换：</strong>优化增强用户交互体验。</li>
            </ul>
          </div>
        );
      case 'tables':
        return (
          <div className={style[bem.e('doc')]}>
            <h2>数据表管理</h2>
            <p>管理整个工作空间中的多个数据源。每一张数据表都拥有完全独立的字段Schema设计与记录存储空间。</p>
            <h3>新建数据表</h3>
            <p>在左侧边栏顶部的"数据表管理"中，点击右侧的 <strong>+</strong> 按钮，系统会即刻为您分配全新数据表并自动定位至当前工作视图。</p>
            <h3>重命名数据表</h3>
            <p>为了极简高效的交互体验，本系统支持<strong>原位双击重命名</strong>：</p>
            <ul>
              <li>双击左侧边栏对应表格项，即可将其转化为文本输入状态。</li>
              <li>双击顶部主标题也可以对当前活跃的表格直接重命名。</li>
              <li>修改完成后，失去焦点 (Blur) 或按下键盘 <strong>Enter</strong> 键即刻保存变动。</li>
            </ul>
          </div>
        );
      case 'tree':
        return (
          <div className={style[bem.e('doc')]}>
            <h2>树形无限层级</h2>
            <p>树形层级打破了传统二维表格扁平排列的局限性，特别适用于需求拆解、WBS 项目管理和组织架构编排。</p>
            <h3>操作指南</h3>
            <ul>
              <li><strong>建立下级关系</strong>：将鼠标悬停在对应行开头的序号列上，点击出现的 <strong>子树图标 (右下折拐箭头)</strong> 即可直接在当前行下方建立新的子项记录。</li>
              <li><strong>折叠展开</strong>：如果行存在下属节点，其左侧将自动生成  三角状态符，点击即可折叠或展开整个子孙树。</li>
              <li><strong>删除树分支</strong>：点击序号上的垃圾桶图标将触发安全校验，确认删除后，该记录与其下的子级节点都将被一次性安全清空。</li>
            </ul>
          </div>
        );
      case 'fields':
        return (
          <div className={style[bem.e('doc')]}>
            <h2>自定义字段（列属性）</h2>
            <p>每一列代表数据表中的一个特定维度。双击表头或点击表头右侧的 <strong>设置 (Tune)</strong> 按钮即可唤醒属性配置面板。</p>
            <h3>可用数据类型</h3>
            <ul>
              <li><strong>单行文本</strong>：最通用、最简单的纯文本。</li>
              <li><strong>数字</strong>：仅允许输入数值，底部的状态栏将自动计算此列的<strong>求和值与平均值</strong>。</li>
              <li><strong>单选 (Select)</strong>：绑定标签并关联特定背景色。可在 modal 中新增/修改/删除色板选项，提供干净清爽的分类选择。</li>
              <li><strong>复选框 (Boolean)</strong>：开/关（选中/未选中）的逻辑类型。</li>
              <li><strong>日期</strong>：调起标准系统级日期选择器。</li>
            </ul>
          </div>
        );
      case 'views':
        return (
          <div className={style[bem.e('doc')]}>
            <h2>多重视角转换</h2>
            <p>表格支持三种高级转化形态，完全由您的数据自适应生成，点击表头下方页签即刻转化：</p>
            <ul>
              <li><strong>表格视图：</strong>传统的无限层级树表展示，支持快捷行子项和排序拉伸。</li>
              <li><strong>看板卡片：</strong>自适应单选标签，将任务生成磁贴。磁贴左边框线自动继承状态标签的斑斓色彩。</li>
              <li><strong>统计图表：</strong>自适应首个数字列字段，生成极简现代的大数字汇总看板。同时渲染柱状图，若配备单选标签则还会自动生成环形分类占比饼图。</li>
            </ul>
          </div>
        );
      case 'impexp':
        return (
          <div className={style[bem.e('doc')]}>
            <h2>导入与导出</h2>
            <p>多维表格支持高兼容性的 <strong>JSON / CSV</strong> 标准格式文件交互，方便您在 Excel 或第三方系统间自由流转数据。</p>
            <h3>导入操作</h3>
            <p>点击顶部控制栏的"导入"按钮，上传您的 JSON 或 CSV 文件：系统将全自动解析字段，并将对应的行列映射导入，并为您在当前空间自动生成一个以文件名称命名的全新数据表。</p>
            <h3>导出操作</h3>
            <p>点击"导出"按钮可自主选择生成 CSV 文件或原汁原味的树级 JSON。CSV 格式对 Excel 极为亲和，而 JSON 格式则可完美留存本系统的无限树状嵌套关联，利于无缝恢复重构。</p>
          </div>
        );
      case 'storage':
        return (
          <div className={style[bem.e('doc')]}>
            <h2>自动保存 (IndexedDB)</h2>
            <p>本系统采用先进的客户端 IndexedDB 本地数据库存储架构，数据持久稳健。</p>
            <h3>持久化优势</h3>
            <ul>
              <li><strong>无感保存</strong>：您修改的每一个单元格、每一次展开折叠、重命名，都会在毫秒级自动写入底层。</li>
              <li><strong>完全离线运行</strong>：无需依赖联网服务器。哪怕在离线、网络波动、意外断电、或关闭页面后，下次打开依然能完整恢复您离开时的最后状态。</li>
              <li><strong>零并发延迟</strong>：本地读写秒级响应。</li>
            </ul>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('aside')]}>
        <div className={style[bem.e('menu-title')]}>
          <BookOutlinedIcon sx={{ fontSize: 18, marginRight: '8px' }} />
          使用指南目录
        </div>
        <div className={style[bem.e('menu')]}>
          {menuItems.map(item => (
            <div
              key={item.id}
              className={`${style[bem.e('menu-item')]} ${activeTab === item.id ? style['is-active'] : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className={style[bem.e('body')]}>
        <div className={style[bem.e('article')]}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

export default ManualView;
