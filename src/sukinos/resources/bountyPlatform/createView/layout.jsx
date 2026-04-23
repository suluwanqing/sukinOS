import { useState } from 'react';
import { createNamespace } from '/utils/js/classcreate.js';
import style from './style.module.css';
import Bounty from '@/apis/sukinOs/bounty';
import Button from '@/component/button/layout';
import Select from '@/component/select/drowSelection/layout';
import { alert } from '@/component/alert/layout';
import { getApiMessage, getErrorMessage, isApiSuccess } from '../utils/response';

const bem = createNamespace('bounty-create');
const CATEGORIES = [
  { value: 'design', label: '设计' },
  { value: 'dev', label: '开发' },
  { value: 'writing', label: '写作' },
  { value: 'other', label: '其他' }
];

function CreateView({ editBounty, onBack, onDone }) {
  const isEdit = !!editBounty;
  const [form, setForm] = useState({
    title: editBounty?.title || '',
    description: editBounty?.description || '',
    reward: editBounty?.reward || '',
    category: editBounty?.category || 'other'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.reward) {
      return alert.warning('请填写完整信息');
    }
    setLoading(true);
    try {
      let res;
      if (isEdit) {
        res = await Bounty.bountyUpdate({ id: editBounty.id, payload: form });
      } else {
        res = await Bounty.bountyCreate(form);
      }
      if (!isApiSuccess(res)) {
        alert.failure(getApiMessage(res, '操作失败'));
        return;
      }
      alert.success(getApiMessage(res, '操作成功'));
      onDone();
    } catch (e) {
      alert.failure(getErrorMessage(e, '操作失败'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={style[bem.b()]}>
      <h2 className={style[bem.e('title')]}>{isEdit ? '编辑悬赏' : '发布悬赏'}</h2>
      <div className={style[bem.e('form')]}>
        <div className={style[bem.e('item')]}>
          <label>标题</label>
          <input
            value={form.title}
            placeholder="简述您的需求..."
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
          />
        </div>
        <div className={style[bem.e('item')]}>
          <label>描述</label>
          <textarea
            value={form.description}
            placeholder="详细说明您的要求、交付标准等..."
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
          />
        </div>
        <div className={style[bem.e('row')]}>
          <div className={style[bem.e('item')]}>
            <label>分类</label>
            <div className={style[bem.e('select-wrap')]}>
              <Select
                value={form.category}
                options={CATEGORIES}
                onChange={value => setForm(p => ({ ...p, category: value }))}
                placeholder="请选择分类"
                boxStyle={{
                  height: '40px',
                  borderRadius: '6px',
                  borderColor: 'var(--su-border-color-light)',
                  backgroundColor: 'var(--su-fill-color-lighter)',
                  boxShadow: 'none'
                }}
                dropdownStyle={{
                  marginTop: '8px',
                  borderRadius: '8px',
                  border: '1px solid var(--su-border-color-light)',
                  boxShadow: '0 12px 24px rgba(var(--su-black-rgb), 0.1)'
                }}
                optionStyle={{
                  color: 'var(--su-text-color-regular)',
                  backgroundColor: 'var(--su-white)'
                }}
              />
            </div>
          </div>
          <div className={style[bem.e('item')]}>
            <label>金额 (¥)</label>
            <input
              type="number"
              value={form.reward}
              placeholder="0.00"
              onChange={e => setForm(p => ({ ...p, reward: e.target.value }))}
            />
          </div>
        </div>
        <div className={style[bem.e('footer')]}>
          <Button onClick={onBack}>取消</Button>
          <Button type="dark" loading={loading} onClick={handleSubmit}>确认提交</Button>
        </div>
      </div>
    </div>
  );
}

export default CreateView;
