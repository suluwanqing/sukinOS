import React, { useState } from 'react';
import style from './style.module.css';
import { createNamespace } from '/utils/js/classcreate';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import CustomSelect from '../components/select/layout';

const bem = createNamespace('br-presets');

function PresetColumnsView({ store }) {
  const { state, dispatch, confirmAction } = store;
  const [name, setName] = useState('');
  const [type, setType] = useState('text');
  const [defaultValue, setDefaultValue] = useState('');
  const [sortable, setSortable] = useState(true);
  const [options, setOptions] = useState([]);
  const [showTypeDrop, setShowTypeDrop] = useState(false);

  const presets = state.presetColumns || [];

  const fieldTypes = [
    { label: '单行文本', value: 'text' },
    { label: '数字', value: 'number' },
    { label: '单选', value: 'select' },
    { label: '多选', value: 'multi' },
    { label: '复选框', value: 'boolean' },
    { label: '日期', value: 'date' },
    { label: '进度条', value: 'progress' }
  ];

  const handleAddPreset = () => {
    if (!name.trim()) return;
    const newPreset = {
      id: `pre_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      type,
      defaultValue: type === 'boolean' ? (defaultValue === 'true') : defaultValue,
      options: (type === 'select' || type === 'multi') ? options : [],
      isSystem: false,
      enabled: true,
      sortable
    };
    dispatch({ type: 'ADD_PRESET', payload: newPreset });
    setName('');
    setType('text');
    setDefaultValue('');
    setSortable(true);
    setOptions([]);
  };

  const handleToggle = (id) => {
    dispatch({ type: 'TOGGLE_PRESET', payload: id });
  };

  const handleDelete = (id, label) => {
    confirmAction('删除预制列', `确认要彻底删除预制列 "${label}" 吗？删除后该项将从资源库移除，无法再通过此预制快速导入。`, () => {
      dispatch({ type: 'DELETE_PRESET', payload: id });
    });
  };

  const addOption = () => {
    setOptions([...options, { id: `opt_${Date.now()}`, label: '新选项', color: '#bfdbfe' }]);
  };

  const updateOption = (idx, key, value) => {
    const next = [...options];
    next[idx][key] = value;
    setOptions(next);
  };

  const removeOption = (idx) => {
    const next = [...options];
    next.splice(idx, 1);
    setOptions(next);
  };

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('sidebar')]}>
        <div className={style[bem.e('form-title')]}>新增自定义预制</div>
        <div className={style[bem.e('form-body')]}>
          <div className={style[bem.e('form-group')]}>
            <label>预制列名称</label>
            <input
              className={style[bem.e('input')]}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例如：紧急度"
            />
          </div>

          <div className={style[bem.e('form-group')]}>
            <label>字段类型</label>
            <div className={style[bem.e('custom-select-trigger-wrap')]}>
              <div className={style[bem.e('select-trigger')]} onClick={() => setShowTypeDrop(!showTypeDrop)}>
                <span>{fieldTypes.find(t => t.value === type)?.label}</span>
                <ArrowDropDownIcon sx={{ fontSize: 18 }} />
              </div>
              {showTypeDrop && (
                <CustomSelect
                  options={fieldTypes}
                  value={type}
                  onCommit={(val) => {
                    setType(val);
                    setDefaultValue(val === 'boolean' ? 'false' : '');
                    setOptions([]);
                    setShowTypeDrop(false);
                  }}
                  onClose={() => setShowTypeDrop(false)}
                  showSearch={false}
                />
              )}
            </div>
          </div>

          <div className={style[bem.e('form-group')]}>
            <label>默认值</label>
            {type === 'boolean' ? (
              <input
                type="checkbox"
                checked={defaultValue === 'true'}
                onChange={e => setDefaultValue(e.target.checked ? 'true' : 'false')}
              />
            ) : (
              <input
                type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
                className={style[bem.e('input')]}
                value={defaultValue}
                onChange={e => setDefaultValue(e.target.value)}
                placeholder="预设默认填充值"
              />
            )}
          </div>

          <div className={style[bem.e('form-group-checkbox')]}>
            <label className={style[bem.e('checkbox-label')]}>
              <input
                type="checkbox"
                checked={sortable}
                onChange={e => setSortable(e.target.checked)}
              />
              <span>支持数据排序</span>
            </label>
          </div>

          {(type === 'select' || type === 'multi') && (
            <div className={style[bem.e('options-section')]}>
              <label>选项集</label>
              <div className={style[bem.e('options-list')]}>
                {options.map((opt, idx) => (
                  <div key={opt.id} className={style[bem.e('option-item')]}>
                    <input
                      type="color"
                      className={style[bem.e('opt-color')]}
                      value={opt.color}
                      onChange={e => updateOption(idx, 'color', e.target.value)}
                    />
                    <input
                      className={style[bem.e('opt-input')]}
                      value={opt.label}
                      onChange={e => updateOption(idx, 'label', e.target.value)}
                    />
                    <button className={style[bem.e('opt-del')]} onClick={() => removeOption(idx)}>×</button>
                  </div>
                ))}
                <button className={style[bem.e('opt-add')]} onClick={addOption}>
                  + 添加选项
                </button>
              </div>
            </div>
          )}

          <button className={style[bem.e('submit-btn')]} onClick={handleAddPreset}>
            确认并添加至预制
          </button>
        </div>
      </div>

      <div className={style[bem.e('main')]}>
        <div className={style[bem.e('header')]}>
          <ViewColumnIcon sx={{ fontSize: 22 }} />
          <span>预制列资源库</span>
        </div>
        <div className={style[bem.e('grid')]}>
          {presets.map(p => (
            <div key={p.id} className={`${style[bem.e('card')]} ${!p.enabled ? style['is-disabled'] : ''}`}>
              <div className={style[bem.e('card-header')]}>
                <div className={style[bem.e('card-title-wrap')]}>
                  <span className={style[bem.e('card-name')]}>{p.name}</span>
                  <span className={style[bem.e('card-type-badge')]}>
                    {fieldTypes.find(t => t.value === p.type)?.label}
                  </span>
                </div>
                <button className={style[bem.e('card-del-btn')]} onClick={() => handleDelete(p.id, p.name)}>
                  <DeleteIcon sx={{ fontSize: 16 }} />
                </button>
              </div>

              <div className={style[bem.e('card-body')]}>
                <div className={style[bem.e('card-meta')]}>
                  <span>默认值：</span>
                  <span className={style[bem.e('meta-val')]}>{String(p.defaultValue !== undefined ? p.defaultValue : '无')}</span>
                </div>
                <div className={style[bem.e('card-meta')]}>
                  <span>支持排序：</span>
                  <span className={style[bem.e('meta-val')]}>{p.sortable !== false ? '是' : '否'}</span>
                </div>
                {p.options && p.options.length > 0 && (
                  <div className={style[bem.e('card-tags')]}>
                    {p.options.map(o => (
                      <span key={o.id} className={style[bem.e('card-tag')]} style={{ backgroundColor: o.color }}>
                        {o.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className={style[bem.e('card-footer')]}>
                <span className={style[bem.e('system-indicator')]}>
                  {p.isSystem ? '系统预置' : '自定义预置'}
                </span>
                <div className={style[bem.e('toggle-wrap')]}>
                  <span className={style[bem.e('toggle-label')]}>{p.enabled ? '已启用' : '已停用'}</span>
                  <label className={style[bem.e('switch')]}>
                    <input
                      type="checkbox"
                      checked={p.enabled !== false}
                      onChange={() => handleToggle(p.id)}
                    />
                    <span className={style[bem.e('slider')]} />
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PresetColumnsView;
