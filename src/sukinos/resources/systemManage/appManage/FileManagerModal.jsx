import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, HardDrive, RefreshCw, Trash2 } from "lucide-react";

import Modal from "@/component/modal/layout";
import Button from "@/component/button/layout";
import { alert } from "@/component/alert/layout";
import { confirm } from "@/component/confirm/layout";
import { createNamespace } from "/utils/js/classcreate";
import sukinosAppManageAPI from "@/apis/system/sukinosAppManage";
import style from "./style.module.css";

const bem = createNamespace("system-app");

const CATEGORY_LABEL = {
  current: "当前版本引用",
  live: "有效历史引用",
  deletedOnly: "仅已删除版本",
  orphan: "无任何引用"
};

const CATEGORY_TONE = {
  current: "active",
  live: "review",
  deletedOnly: "deleted",
  orphan: "purged"
};

const CATEGORY_ORDER = { orphan: 0, deletedOnly: 1, live: 2, current: 3 };

const fmtBytes = (bytes) => {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const fmtTime = (val) => {
  if (!val) return "-";
  const date = new Date(val);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
};

export default function FileManagerModal({ onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purging, setPurging] = useState(false);
  const [selected, setSelected] = useState([]);

  const load = useCallback(() => {
    setLoading(true);
    return sukinosAppManageAPI.listAppFiles()
      .then(res => {
        if (res?.code === 200) {
          const list = [...(res.data || [])].sort((a, b) => {
            const order = (CATEGORY_ORDER[a.category] ?? 9) - (CATEGORY_ORDER[b.category] ?? 9);
            return order !== 0 ? order : String(a.fileName).localeCompare(String(b.fileName));
          });
          setItems(list);
          setSelected(prev => prev.filter(name => list.some(item => item.fileName === name && item.canPurge)));
        } else {
          alert.failure(res?.message || "获取文件列表失败");
        }
      })
      .catch(e => alert.failure(e?.message || "获取文件列表失败"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const purgeable = useMemo(() => items.filter(item => item.canPurge), [items]);
  const emptyCount = useMemo(() => items.filter(item => item.empty).length, [items]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const selectedSize = useMemo(
    () => items.filter(item => selectedSet.has(item.fileName)).reduce((sum, item) => sum + (item.size || 0), 0),
    [items, selectedSet]
  );
  const allSelected = purgeable.length > 0 && selected.length === purgeable.length;

  const toggle = (item) => {
    if (!item.canPurge) return;
    setSelected(prev => (
      prev.includes(item.fileName)
        ? prev.filter(name => name !== item.fileName)
        : [...prev, item.fileName]
    ));
  };

  const toggleAll = () => {
    setSelected(allSelected ? [] : purgeable.map(item => item.fileName));
  };

  const handlePurge = () => {
    if (!selected.length) return;
    confirm.show({
      title: "清理物理包文件",
      content: `将永久删除 ${selected.length} 个文件（${fmtBytes(selectedSize)}）。仅清理无引用或只被已删除版本引用的包，删除后对应历史版本不可恢复。`,
      onConfirm: async () => {
        setPurging(true);
        try {
          const res = await sukinosAppManageAPI.purgeAppFiles({ fileNames: selected });
          if (res?.code === 200) {
            const errors = res.data?.errors || [];
            if (errors.length) {
              alert.warning(`${res.message}：${errors.map(item => `${item.fileName}（${item.message}）`).join("；")}`);
            } else {
              alert.success(res.message || "文件清理完成");
            }
            setSelected([]);
            load();
          } else {
            alert.failure(res?.message || "清理失败");
          }
        } catch (e) {
          alert.failure(e?.message || "清理失败");
        } finally {
          setPurging(false);
        }
      }
    });
  };

  return (
    <Modal title="应用包文件治理" visible onClose={onClose} width={860}>
      <div className={style[bem.e("file-manager")]}>
        <div className={style[bem.e("file-toolbar")]}>
          <div className={style[bem.e("file-summary")]}>
            <HardDrive size={14} />
            磁盘共 {items.length} 个包文件 · 可清理 {purgeable.length} 个
            {emptyCount ? ` · 空包 ${emptyCount} 个` : ""}
            {selected.length ? ` · 已选 ${selected.length} 个（${fmtBytes(selectedSize)}）` : ""}
          </div>
          <div className={style[bem.e("file-actions")]}>
            <Button variant="ghost" size="xs" icon={<RefreshCw size={12} />} loading={loading} onClick={load}>
              刷新
            </Button>
            <Button
              variant="outline"
              size="xs"
              disabled={!purgeable.length}
              onClick={toggleAll}
            >
              {allSelected ? "取消全选" : "全选可清理"}
            </Button>
            <Button
              variant="default"
              size="xs"
              icon={<Trash2 size={12} />}
              disabled={!selected.length}
              loading={purging}
              onClick={handlePurge}
            >
              清理所选
            </Button>
          </div>
        </div>

        <p className={style[bem.e("file-hint")]}>
          只有“无任何引用”和“仅已删除版本”的包允许清理；仍被当前版本或有效历史引用的文件会被后端拒绝。
          要回收某个具体版本的文件，请在版本面板里删除该版本时勾选“同时删除物理文件”。
        </p>

        {loading && !items.length ? (
          <div className={style[bem.e("center")]}>
            <span className={style[bem.e("spinner")]} />
          </div>
        ) : items.length === 0 ? (
          <div className={style[bem.e("version-empty")]}>磁盘目录里没有包文件</div>
        ) : (
          <div className={style[bem.e("file-list")]}>
            {items.map(item => {
              const tone = CATEGORY_TONE[item.category] || "deleted";
              return (
                <label
                  key={item.fileName}
                  className={style[bem.e("file-row")]}
                  data-selectable={item.canPurge ? "true" : "false"}
                >
                  <input
                    type="checkbox"
                    checked={selectedSet.has(item.fileName)}
                    disabled={!item.canPurge}
                    onChange={() => toggle(item)}
                  />
                  <span className={style[bem.e("file-name")]} title={item.fileName}>{item.fileName}</span>
                  <span className={style[bem.e("version-status")]} data-tone={tone}>
                    {CATEGORY_LABEL[item.category] || item.category || "未知"}
                  </span>
                  <span className={style[bem.e("file-size")]}>{item.empty ? "0 B（空包）" : fmtBytes(item.size)}</span>
                  <span className={style[bem.e("file-time")]}>{fmtTime(item.modifiedAt)}</span>
                </label>
              );
            })}
          </div>
        )}

        {emptyCount > 0 && (
          <p className={style[bem.e("file-warning")]}>
            <AlertTriangle size={12} />
            有 {emptyCount} 个 0 字节空包：对应版本无法通过审核或激活，需要开发者重新提交后再清理旧文件。
          </p>
        )}

        <p className={style[bem.e("file-warning")]}>
          <AlertTriangle size={12} />
          清理动作直接删除磁盘文件且不可恢复，请确认对应的历史版本已不再需要。
        </p>
      </div>
    </Modal>
  );
}
