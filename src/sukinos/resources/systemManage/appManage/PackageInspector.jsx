import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  FileDown,
  FolderOpen,
  Image as ImageIcon,
  PackageCheck,
  Pencil,
  Play,
  RefreshCw,
  RotateCcw,
  Upload
} from "lucide-react";

import Modal from "@/component/modal/layout";
import Button from "@/component/button/layout";
import Select from "@/component/select/drowSelection/layout";
import { alert } from "@/component/alert/layout";
import FileSystemView from "@/sukinos/components/fileSystemView/layout";
import PreviewSandbox from "@/sukinos/sandbox/PreviewSandbox";
import PreviewWindow from "@/sukinos/sandbox/PreviewWindow";
import { buildWorkerFileTree, safeNameSegment, splitDataUrl } from "@/sukinos/utils/process/workerFiles";
import { generateWorker, parseWorkerCode } from "@/sukinos/utils/process/generateWorker";
import {
  buildLogicModuleGraph,
  compileSource,
  isCodeKey,
  isHtmlKey,
  toModuleSources
} from "@/sukinos/utils/process/sourceMapper";
import {
  ENV_KEY_RESOURCE_ID,
  ENV_KEY_NAME,
  ENV_KEY_IS_BUNDLE,
  ENV_KEY_LOGIC,
  ENV_KEY_LOGIC_PRECOMPILED,
  ENV_KEY_CONTENT,
  ENV_KEY_CONTENT_PRECOMPILED,
  ENV_KEY_META_INFO
} from "@/sukinos/utils/config";
import sukinosAppManageAPI from "@/apis/system/sukinosAppManage";
import sysConfigAPI from "@/apis/system/config";
import { usePermission } from "@/hooks/usePermission/main";
import { createNamespace } from "/utils/js/classcreate";
import style from "./style.module.css";

const bem = createNamespace("system-app");

const PREVIEW_LIMIT = 200000;

const DOWNLOAD_MODE_OPTIONS = [
  { label: "原始内联包（单文件，逐字无损）", value: "raw" },
  { label: "解析后的源文件（多文件 zip）", value: "parsed" }
];

const TEXT_EXT_RE = /\.(jsx?|tsx?|mjs|cjs|css|scss|less|html?|json|md|txt|svg|xml|yml|yaml|vue|svelte)$/i;
const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|bmp|ico|avif)$/i;
const SYSTEM_RES_ID_RE = /^sys-/;

const saveBlob = (blob, filename) => {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
};

const readBlobError = async (blob) => {
  try {
    const body = JSON.parse(await blob.text());
    return body?.message || "下载失败";
  } catch {
    return "下载失败：响应不是应用包";
  }
};

const VERSION_STATUS_LABEL = {
  active: "正常上架",
  disabled: "禁用下架",
  under_review: "审核中"
};

//已清除、缺失或 0 字节的包后端也取不回来，不列入可选版本
const isDownloadableVersion = (item) => (
  !item.filePurged && item.fileExists !== false && !item.fileEmpty
);

function versionOptionLabel(item) {
  const tag = item.isCurrent
    ? "当前版"
    : item.isPending ? "待审" : item.isDeleted ? "已删除" : "历史";
  const status = item.isCurrent && item.status !== "active"
    ? ` · ${VERSION_STATUS_LABEL[item.status] || item.status}`
    : "";
  return `${tag} v${item.version || "-"}${status}`;
}

//按虚拟路径切出当前目录的直接子项，交给通用文件浏览器渲染
const buildPackageDir = (paths, files, dir, dirty) => {
  const prefix = dir ? `${dir}/` : "";
  const dirs = new Map();
  const items = [];
  paths.forEach((path) => {
    if (!path.startsWith(prefix)) return;
    const rest = path.slice(prefix.length);
    if (!rest) return;
    const slash = rest.indexOf("/");
    if (slash === -1) {
      const value = files[path];
      items.push({
        id: path,
        name: rest,
        type: "file",
        size: typeof value === "string" ? value.length : 0,
        mtime: null,
        badge: dirty.has(path) ? "已修改" : undefined,
      });
      return;
    }
    const segment = rest.slice(0, slash);
    const full = prefix ? `${prefix}${segment}` : segment;
    if (!dirs.has(segment)) {
      dirs.set(segment, {
        id: `dir:${full}`,
        path: full,
        name: segment,
        type: "directory",
        size: 0,
        mtime: null,
      });
    }
  });
  const dirItems = [...dirs.values()].sort((a, b) => a.name.localeCompare(b.name));
  items.sort((a, b) => a.name.localeCompare(b.name));
  dirItems.forEach((item) => {
    const hit = [...dirty].some((path) => path.startsWith(`${item.path}/`));
    item.badge = hit ? "包含已修改文件" : undefined;
  });
  const segments = dir ? dir.split("/") : [];
  const breadcrumbs = [{ id: "", name: "包根目录" }];
  segments.forEach((segment, index) => {
    breadcrumbs.push({ id: segments.slice(0, index + 1).join("/"), name: segment });
  });
  return { items: [...dirItems, ...items], breadcrumbs };
};

//选中文件所在目录，浏览器据此定位到对应层级
const dirOf = (path) => (path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "");

const fileMeta = (path, value) => {
  if (typeof value !== "string") {
    return { kind: "unknown", detail: typeof value };
  }
  const data = splitDataUrl(value);
  if (data) {
    if (data.isBase64 && (IMAGE_EXT_RE.test(path) || data.mime.startsWith("image/"))) {
      return { kind: "image", detail: data.mime };
    }
    return { kind: "binary", detail: data.mime, size: data.body.length };
  }
  if (IMAGE_EXT_RE.test(path)) return { kind: "image", detail: "图片" };
  if (TEXT_EXT_RE.test(path) || path === "main.jsx") return { kind: "text", detail: "源码" };
  return { kind: "text", detail: "文本" };
};

const lineStat = (before, after) => {
  const a = String(before ?? "").split("\n");
  const b = String(after ?? "").split("\n");
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start += 1;
  let endA = a.length - 1;
  let endB = b.length - 1;
  while (endA >= start && endB >= start && a[endA] === b[endB]) {
    endA -= 1;
    endB -= 1;
  }
  return { added: endB - start + 1, removed: endA - start + 1 };
};

const rebuildWorkerCode = async (sourceText, tree, drafts) => {
  const parsed = parseWorkerCode(sourceText);
  const files = { ...tree.files, ...drafts };
  const failures = [];
  let content;
  if (tree.isBundle) {
    content = {};
    Object.entries(files).forEach(([display, value]) => {
      if (display === tree.logicFileName) return;
      content[tree.keyMap?.[display] || display] = value;
    });
  } else {
    const mainKey = files["main.jsx"] != null ? "main.jsx" : Object.keys(files)[0];
    content = mainKey ? files[mainKey] : "";
  }
  const logic = tree.logicFileName ? files[tree.logicFileName] : (parsed[ENV_KEY_LOGIC] || "");

  //预编译失败等于运行时必崩，直接阻断重提，不再静默留空
  let precompiledContent = null;
  if (typeof content === "string") {
    try {
      precompiledContent = await compileSource(content, { filename: "main.jsx" });
    } catch (e) {
      failures.push(`main.jsx（${e?.message || "编译失败"}）`);
    }
  } else if (content && typeof content === "object") {
    const compiledMap = {};
    for (const [key, code] of Object.entries(content)) {
      if (typeof code !== "string" || !isCodeKey(key, code)) continue;
      try {
        compiledMap[key] = await compileSource(code, { filename: key });
      } catch (e) {
        failures.push(`${key}（${e?.message || "编译失败"}）`);
      }
    }
    precompiledContent = compiledMap;
  }

  let precompiledLogic = null;
  if (logic) {
    try {
      precompiledLogic = await compileSource(logic, {
        filename: `${tree.entries?.logicMain || "logic"}.jsx`
      });
    } catch (e) {
      failures.push(`${tree.entries?.logicMain || "logic"}（${e?.message || "编译失败"}）`);
    }
  }

  if (failures.length) {
    throw new Error(`预编译失败，已阻止重提：${failures.join("；")}`);
  }

  const code = generateWorker({
    [ENV_KEY_RESOURCE_ID]: parsed[ENV_KEY_RESOURCE_ID],
    [ENV_KEY_NAME]: parsed[ENV_KEY_NAME],
    [ENV_KEY_IS_BUNDLE]: tree.isBundle,
    [ENV_KEY_LOGIC]: logic || null,
    [ENV_KEY_LOGIC_PRECOMPILED]: precompiledLogic,
    [ENV_KEY_CONTENT]: content,
    [ENV_KEY_CONTENT_PRECOMPILED]: precompiledContent,
    [ENV_KEY_META_INFO]: parsed[ENV_KEY_META_INFO]
  });

  //回读校验：内容里若混入块标记或序列化损坏，这里必须发现并拒绝提交
  const check = parseWorkerCode(code);
  const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  if (check.parseError) {
    throw new Error(`重建后的包无法解析（${check.parseError}），请检查编辑内容是否包含保留块标记`);
  }
  if (!same(check[ENV_KEY_CONTENT], content)) {
    throw new Error("重建后内容块与提交内容不一致，请检查编辑内容是否包含保留块标记");
  }
  if (!same(check[ENV_KEY_LOGIC], logic || null)) {
    throw new Error("重建后逻辑块与提交内容不一致，请检查编辑内容是否包含保留块标记");
  }
  if (!same(check[ENV_KEY_CONTENT_PRECOMPILED], precompiledContent)) {
    throw new Error("重建后预编译内容块不一致，请重新解析后再提交");
  }
  if (!same(check[ENV_KEY_LOGIC_PRECOMPILED], precompiledLogic)) {
    throw new Error("重建后预编译逻辑块不一致，请重新解析后再提交");
  }

  return code;
};

function FileView({ path, value }) {
  const meta = fileMeta(path, value);
  if (meta.kind === "image") {
    return (
      <div className={style[bem.e("inspector-image")]}>
        <img src={value} alt={path} />
        <p>{path} · {meta.detail}</p>
      </div>
    );
  }
  if (meta.kind === "binary") {
    const data = splitDataUrl(value);
    return (
      <div className={style[bem.e("inspector-empty")]}>
        <ImageIcon size={22} />
        <p>{path}</p>
        <p>{meta.detail}{data?.body ? ` · ${data.body.length} 字符` : ""}</p>
        <p>二进制资源不做内联预览，下载后查看</p>
      </div>
    );
  }
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  const truncated = text.length > PREVIEW_LIMIT;
  return (
    <pre className={style[bem.e("inspector-code")]}>
      {truncated ? `${text.slice(0, PREVIEW_LIMIT)}\n\n… 已截断，完整内容请下载源文件` : text}
    </pre>
  );
}

export default function PackageInspector({ row, onClose, onSubmitted }) {
  //后端重提只认 root，这里同步收口编辑与提交入口
  const { isRoot } = usePermission();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tree, setTree] = useState(null);
  const [selected, setSelected] = useState("");
  const [currentDir, setCurrentDir] = useState("");
  const [tab, setTab] = useState("files");
  const [mode, setMode] = useState("raw");
  const [packing, setPacking] = useState(false);
  const [drafts, setDrafts] = useState({});
  const [editorValue, setEditorValue] = useState("");
  const [editing, setEditing] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [submitNote, setSubmitNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [previewArmed, setPreviewArmed] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPreparing, setPreviewPreparing] = useState(false);
  const [previewPayload, setPreviewPayload] = useState(null);
  const [pkgMeta, setPkgMeta] = useState(null);
  const [versionMeta, setVersionMeta] = useState(row.metaInfo ?? row.meta_info ?? null);
  const [maxRevisions, setMaxRevisions] = useState(20);
  const [versions, setVersions] = useState(null);
  const [versionKey, setVersionKey] = useState(row.revisionId ? String(row.revisionId) : "current");
  //每个版本只取一次包体与 meta，来回切换不重复请求
  const cacheRef = useRef(new Map());

  useEffect(() => {
    //读设置只为确认弹窗文案，失败就按默认 20 显示，不阻塞审核流程
    sysConfigAPI.getRevisionRetention()
      .then(res => {
        if (res?.code === 200 && Number.isInteger(res.data?.maxRevisions)) {
          setMaxRevisions(res.data.maxRevisions);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    //版本列表是 root-only 接口，非 root 不发请求，直接给出只读提示
    if (!isRoot) return undefined;
    let cancelled = false;
    //版本列表失败不阻断：退回传入行上的当前版或指定历史版本
    const fallback = {
      current: {
        revisionId: null,
        version: row.version,
        appName: row.appName,
        fileName: row.fileName,
        size: row.size,
        status: row.status,
        isCurrent: true,
        filePurged: false,
        fileExists: true,
        fileEmpty: false
      },
      items: row.revisionId
        ? [{
          revisionId: row.revisionId,
          version: row.version,
          appName: row.appName,
          fileName: row.fileName,
          size: row.size,
          status: row.status,
          isCurrent: false,
          filePurged: false,
          fileExists: true,
          fileEmpty: false
        }]
        : []
    };
    sukinosAppManageAPI.getAppVersions({ resourceId: row.resourceId, includeDeleted: true })
      .then(res => {
        if (cancelled) return;
        setVersions(res?.code === 200 && res.data?.current ? res.data : fallback);
      })
      .catch(() => {
        if (!cancelled) setVersions(fallback);
      });
    return () => { cancelled = true; };
  }, [isRoot, row.resourceId, row.revisionId, row.version, row.appName, row.fileName, row.size, row.status]);

  const { versionOptions, activeKey } = useMemo(() => {
    if (!versions) return { versionOptions: [], activeKey: "" };
    const all = [versions.current, ...(versions.items || [])].filter(Boolean);
    //不可用的版本仍列出来，选中后由后端给出“已清除/不存在”的明确报错，避免静默切回当前版
    const options = all.map(item => ({
      value: item.revisionId == null ? "current" : String(item.revisionId),
      label: isDownloadableVersion(item)
        ? versionOptionLabel(item)
        : `${versionOptionLabel(item)}（文件不可用）`,
      item
    }));
    const key = options.some(opt => opt.value === versionKey) ? versionKey : (options[0]?.value || "");
    return { versionOptions: options, activeKey: key };
  }, [versions, versionKey]);

  const selectedVersion = versionOptions.find(opt => opt.value === activeKey)?.item || null;
  const activeRevisionId = selectedVersion?.revisionId ?? null;
  const activeCacheKey = activeRevisionId == null ? "current" : String(activeRevisionId);

  useEffect(() => {
    if (!versions) return undefined;
    if (!isRoot) {
      setLoading(false);
      setError("仅 root 可查看包");
      return undefined;
    }
    if (!selectedVersion) {
      setTree(null);
      setLoading(false);
      setError("没有可查看的版本包");
      return undefined;
    }

    const applyTree = (nextTree, metaInfo) => {
      setTree(nextTree);
      setPkgMeta(nextTree.metaInfo);
      setVersionMeta(metaInfo);
      const first = nextTree.entries?.view && nextTree.files[nextTree.entries.view]
        ? nextTree.entries.view
        : Object.keys(nextTree.files)[0] || "";
      setSelected(first);
      setCurrentDir(dirOf(first));
    };

    setDrafts({});
    setEditing(false);
    setEditorValue("");

    const cached = cacheRef.current.get(activeCacheKey);
    if (cached) {
      applyTree(cached.tree, cached.meta);
      setError("");
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const [res, detailRes] = await Promise.all([
          sukinosAppManageAPI.downloadAppPackage({
            resourceId: row.resourceId,
            revisionId: activeRevisionId ?? undefined
          }),
          activeRevisionId == null
            ? Promise.resolve(null)
            : sukinosAppManageAPI.getAppVersionDetail({
              resourceId: row.resourceId,
              revisionId: activeRevisionId
            }).catch(() => null)
        ]);
        if (cancelled) return;
        if (!(res instanceof Blob)) {
          setError(res?.message || "下载失败");
          return;
        }
        if (res.type.includes("json")) {
          setError(await readBlobError(res));
          return;
        }
        const text = await res.text();
        const nextTree = buildWorkerFileTree(text);
        const metaInfo = activeRevisionId == null
          ? (row.metaInfo ?? row.meta_info ?? null)
          : (detailRes?.code === 200 ? (detailRes.data?.metaInfo ?? null) : null);
        cacheRef.current.set(activeCacheKey, { blob: res, text, tree: nextTree, meta: metaInfo });
        applyTree(nextTree, metaInfo);
      } catch (e) {
        if (!cancelled) setError(e?.message || "下载失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [versions, selectedVersion, activeCacheKey, activeRevisionId, isRoot, row.resourceId, row.metaInfo, row.meta_info]);

  const paths = useMemo(() => (tree ? Object.keys(tree.files).sort((a, b) => a.localeCompare(b)) : []), [tree]);
  const parsedUsable = Boolean(tree?.recognized) && !tree?.parseError;
  const fileCount = paths.length;
  const readOnly = SYSTEM_RES_ID_RE.test(row.resourceId || "");
  const canEditPackage = parsedUsable && !readOnly && isRoot;
  const viewAppName = selectedVersion?.appName || row.appName || "app";
  const viewVersion = selectedVersion?.version ?? row.version;
  const viewFileName = selectedVersion?.fileName || row.fileName;
  const baseName = safeNameSegment(`${viewAppName}-v${viewVersion ?? ""}`);
  const packageExt = /\.[^.]+$/.exec(viewFileName || "")?.[0] || ".js";

  const changedPaths = useMemo(
    () => (tree ? Object.keys(drafts).filter((path) => drafts[path] !== tree.files[path]) : []),
    [drafts, tree]
  );
  const dirtySet = useMemo(() => new Set(changedPaths), [changedPaths]);
  const dirView = useMemo(
    () => buildPackageDir(paths, tree?.files || {}, currentDir, dirtySet),
    [paths, tree, currentDir, dirtySet]
  );

  const entriesWarning = useMemo(() => {
    if (!tree?.isBundle) return "";
    const view = tree.entries?.view;
    if (!view) return "";
    const hit = ["", ".jsx", ".js"].some((ext) => tree.files[`${view}${ext}`] != null);
    return hit ? "" : `入口 ${view} 未在文件树中命中，预览与运行可能找不到入口`;
  }, [tree]);

  const rowMeta = versionMeta;
  const metaDiffKeys = useMemo(() => {
    if (!pkgMeta || !rowMeta || typeof rowMeta !== "object") return [];
    const keys = new Set([...Object.keys(rowMeta), ...Object.keys(pkgMeta)]);
    return [...keys].filter(
      (key) => key !== "version" && JSON.stringify(rowMeta[key] ?? null) !== JSON.stringify(pkgMeta[key] ?? null)
    );
  }, [pkgMeta, rowMeta]);

  const mergedFiles = useMemo(() => {
    if (!tree) return {};
    return changedPaths.length ? { ...tree.files, ...drafts } : tree.files;
  }, [tree, drafts, changedPaths.length]);

  const previewApp = useMemo(() => {
    if (!tree) return null;
    const files = { ...mergedFiles };
    let logicCode = "";
    if (tree.logicFileName) {
      logicCode = files[tree.logicFileName] || "";
      delete files[tree.logicFileName];
    }
    return {
      isBundle: tree.isBundle,
      files,
      viewCode: tree.isBundle ? undefined : (files["main.jsx"] || Object.values(files)[0] || ""),
      logicCode,
      entries: tree.entries
    };
  }, [tree, mergedFiles]);

  //草稿或文件变动后旧预编译产物就过期了，必须重新点一次启动预览
  useEffect(() => {
    setPreviewArmed(false);
    setPreviewPayload(null);
    setPreviewOpen(false);
  }, [previewApp]);

  const startPreview = async () => {
    if (!previewApp) return;
    if (isHtmlKey(tree?.entries?.view)) {
      alert.warning("文档档预览依赖宿主窗口登记表，本轮隔离预览不支持，请走生产同源预览");
      return;
    }

    setPreviewPreparing(true);
    try {
      const files = previewApp.files || {};
      const entries = previewApp.entries || {};
      const failures = [];
      const skipped = [];
      //失败但允许跳过的文件要单独告诉预览运行器，否则它会当成“缺少预编译产物”报红色错误
      const skippedKeys = [];
      //入口与显式代码后缀编译失败直接阻断，附属文件失败只跳过
      const entryKeys = new Set();
      [entries.view, entries.logicMain, ...(Array.isArray(entries.logicAux) ? entries.logicAux : [])]
        .filter(Boolean)
        .forEach((key) => {
          entryKeys.add(key);
          entryKeys.add(`${key}.jsx`);
          entryKeys.add(`${key}.js`);
        });
      const isCriticalFile = (key) => entryKeys.has(key) || /\.(jsx|js)$/i.test(key);

      //隔离运行时没有 Babel，页面与逻辑模块都在宿主这里一次编完
      const precompiledFiles = {};
      for (const [key, code] of Object.entries(files)) {
        if (typeof code !== "string" || !isCodeKey(key, code)) continue;
        try {
          precompiledFiles[key] = await compileSource(code, { filename: key });
        } catch (e) {
          const reason = `${key}（${e?.message || "编译失败"}）`;
          if (isCriticalFile(key)) {
            failures.push(reason);
          } else {
            skipped.push(reason);
            skippedKeys.push(key);
          }
        }
      }

      let precompiledLogic = null;
      if (previewApp.logicCode) {
        const logicName = entries.logicMain || "logic";
        try {
          precompiledLogic = await compileSource(previewApp.logicCode, { filename: `${logicName}.jsx` });
        } catch (e) {
          failures.push(`${logicName}（${e?.message || "编译失败"}）`);
        }
      }

      const logicModules = buildLogicModuleGraph(
        toModuleSources(files),
        { logicMain: entries.logicMain || null, logicAux: entries.logicAux || [] },
        previewApp.logicCode || ""
      );
      const precompiledLogicModules = {};
      for (const [key, code] of Object.entries(logicModules)) {
        try {
          precompiledLogicModules[key] = await compileSource(code, { filename: `${key}.jsx` });
        } catch (e) {
          failures.push(`${key}（${e?.message || "编译失败"}）`);
        }
      }

      if (failures.length) {
        alert.failure(`预编译失败，无法启动预览：${failures.join("；")}`);
        return;
      }
      if (skipped.length) {
        alert.warning(`以下文件无法编译，已跳过：${skipped.join("；")}`);
      }

      setPreviewPayload({
        ...previewApp,
        precompiledFiles,
        precompiledLogic,
        precompiledLogicModules,
        precompiledSkipped: skippedKeys
      });
      setPreviewArmed(true);
      setPreviewOpen(true);
    } catch (e) {
      alert.failure(`预览准备失败：${e?.message || "未知错误"}`);
    } finally {
      setPreviewPreparing(false);
    }
  };

  const selectedValue = selected ? mergedFiles[selected] : null;
  const selectedMeta = selected ? fileMeta(selected, selectedValue) : null;

  const cancelEdit = () => {
    setEditing(false);
    setEditorValue("");
  };

  const startEdit = () => {
    setEditorValue(typeof selectedValue === "string" ? selectedValue : "");
    setEditing(true);
  };

  const commitEdit = () => {
    if (!selected) return;
    setDrafts((prev) => ({ ...prev, [selected]: editorValue }));
    cancelEdit();
  };

  const revertOne = () => {
    if (!selected) return;
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[selected];
      return next;
    });
    cancelEdit();
  };

  const revertAll = () => {
    setDrafts({});
    cancelEdit();
  };

  const handleVersionChange = (key) => {
    if (changedPaths.length) {
      alert.warning("有未提交的修改，请先提交或放弃修改后再切换版本");
      return;
    }
    setVersionKey(key);
  };

  const handleDownload = async () => {
    const cache = cacheRef.current.get(activeCacheKey);
    if (!cache) return;
    if (mode === "raw") {
      saveBlob(cache.blob, `${baseName}${packageExt}`);
      return;
    }
    setPacking(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const root = zip.folder(`${baseName}-source`);
      Object.entries(mergedFiles).forEach(([path, value]) => {
        const data = splitDataUrl(value);
        if (data?.isBase64) root.file(path, data.body, { base64: true });
        else if (data) root.file(path, decodeURIComponent(data.body));
        else root.file(path, value);
      });
      saveBlob(await zip.generateAsync({ type: "blob" }), `${baseName}-source.zip`);
    } catch (e) {
      alert.failure(`打包失败：${e?.message || "未知错误"}`);
    } finally {
      setPacking(false);
    }
  };

  const changeSummary = useMemo(
    () => changedPaths.map((path) => {
      const stat = lineStat(tree?.files[path], drafts[path]);
      return `${path} +${stat.added}/-${stat.removed}`;
    }).join("；"),
    [changedPaths, drafts, tree]
  );

  const handleResubmit = async () => {
    const cache = cacheRef.current.get(activeCacheKey);
    if (!isRoot || !cache || !tree || !changedPaths.length) return;
    setSubmitting(true);
    try {
      const sourceText = cache.text ?? await cache.blob.text();
      const code = await rebuildWorkerCode(sourceText, tree, drafts);
      const parsedMeta = parseWorkerCode(sourceText)[ENV_KEY_META_INFO] || {};
      const blob = new Blob([code], { type: "application/javascript" });
      const fileName = `${safeNameSegment(viewAppName)}-v${viewVersion ?? ""}.js`;
      const res = await sukinosAppManageAPI.resubmitAppPackage({
        file: blob,
        fileName,
        resourceId: row.resourceId,
        appName: viewAppName || parsedMeta.name || "未命名应用",
        metaInfo: parsedMeta,
        replaceExisting: Boolean(selectedVersion?.isPending),
        note: `${submitNote ? `${submitNote} ` : ""}[${changeSummary}]`.trim()
      });
      if (res?.code === 200) {
        alert.success(res.data?.version
          ? `已生成待审版本 v${res.data.version}，线上版本保持可用`
          : (res.message || "已生成待审版本，线上版本保持可用"));
        setConfirmVisible(false);
        setSubmitNote("");
        setDrafts({});
        onSubmitted?.();
        onClose?.();
      } else {
        alert.failure(res?.message || "提交修订失败");
      }
    } catch (e) {
      alert.failure(`提交修订失败：${e?.message || "未知错误"}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReparse = () => {
    const cache = cacheRef.current.get(activeCacheKey);
    if (!cache) return;
    //重新解析会重建文件树并清空草稿，有未提交修改时必须先拦下来
    if (changedPaths.length) {
      alert.warning("有未提交的修改，请先重提或放弃修改后再重新解析");
      return;
    }
    const nextTree = buildWorkerFileTree(cache.text);
    cacheRef.current.set(activeCacheKey, { ...cache, tree: nextTree });
    setTree(nextTree);
    setPkgMeta(nextTree.metaInfo);
    setDrafts({});
    cancelEdit();
    const first = Object.keys(nextTree.files)[0] || "";
    setSelected(first);
    setCurrentDir(dirOf(first));
  };

  //目录进层，文件只选中，双击目录同样进层
  const handleOpenItem = (item) => {
    if (item?.type === "directory") {
      setCurrentDir(item.path || "");
      return;
    }
    setSelected(item.id);
    cancelEdit();
  };

  return (
    <Modal title={`包检查 · ${viewAppName || row.resourceId}${viewVersion ? ` · v${viewVersion}` : ""}`} visible onClose={onClose} width={980} bodyScroll={false}>
      {loading && <p className={style[bem.e("code-text")]}>正在取回包体…</p>}

      {!loading && error && <p className={style[bem.e("code-text")]}>{error}</p>}

      {!loading && !error && tree && (
        <>
          <div className={style[bem.e("inspector-toolbar")]}>
            <div className={style[bem.e("inspector-tabs")]}>
              <Button
                variant={tab === "files" ? "default" : "outline"}
                size="sm"
                icon={<FolderOpen size={15} />}
                onClick={() => setTab("files")}
              >文件 {fileCount}</Button>
              <Button
                variant={tab === "preview" ? "default" : "outline"}
                size="sm"
                icon={<Play size={15} />}
                disabled={!previewApp}
                onClick={() => setTab("preview")}
              >预览</Button>
            </div>
            <div className={style[bem.e("inspector-actions")]}>
              {readOnly && (
                <span className={style[bem.e("inspector-readonly")]}>
                  <AlertTriangle size={12} />系统包只读
                </span>
              )}
              {!isRoot && (
                <span className={style[bem.e("inspector-readonly")]}>
                  <AlertTriangle size={12} />仅 root 可改包
                </span>
              )}
              {isRoot && changedPaths.length > 0 && (
                <>
                  <span className={style[bem.e("inspector-dirty")]}>{changedPaths.length} 个文件已修改</span>
                  <Button variant="ghost" size="sm" icon={<RotateCcw size={14} />} onClick={revertAll}>放弃修改</Button>
                  <Button
                    variant="default"
                    size="sm"
                    icon={<Upload size={14} />}
                    onClick={() => setConfirmVisible(true)}
                  >提交待审版本</Button>
                </>
              )}
              {versionOptions.length > 1 && (
                <div className={style[bem.e("inspector-mode")]}>
                  <Select
                    size="small"
                    value={activeKey}
                    onChange={handleVersionChange}
                    options={versionOptions.map(({ value, label }) => ({ value, label }))}
                    direction="bottom"
                  />
                </div>
              )}
              <div className={style[bem.e("inspector-mode")]}>
                <Select size="small" value={mode} onChange={setMode} options={DOWNLOAD_MODE_OPTIONS} direction="bottom" />
              </div>
              <Button
                variant="outline"
                size="sm"
                icon={<FileDown size={14} />}
                loading={packing}
                disabled={mode === "parsed" && !parsedUsable}
                onClick={handleDownload}
              >{mode === "raw" ? "下载原始包" : "打包源文件"}</Button>
            </div>
          </div>

          {tab === "preview" ? (
            <>
              <p className={style[bem.e("inspector-note")]}>
                预览运行在 sandbox=&quot;allow-scripts&quot; 的 opaque origin 子文档里，读不到管理页 DOM、Cookie 与宿主存储；
                使用 dev SDK，网络与持久化能力都不可用，依赖内核或接口的应用在预览里会报错。
              </p>
              {previewArmed && previewPayload ? (
                <div className={style[bem.e("inspector-empty")]}>
                  <Play size={24} />
                  <p>预览已编译，可在独立窗口中打开；改动源码后需要重新编译预览</p>
                  <div className={style[bem.e("preview-actions")]}>
                    <Button
                      variant="default"
                      size="sm"
                      icon={<Play size={13} />}
                      onClick={() => setPreviewOpen(true)}
                    >打开预览窗口</Button>
                    <Button variant="ghost" size="sm" loading={previewPreparing} onClick={startPreview}>
                      重新编译预览
                    </Button>
                  </div>
                </div>
              ) : (
                <div className={style[bem.e("inspector-empty")]}>
                  <Play size={24} />
                  <p>启动前会先在宿主预编译全部页面与逻辑模块；文档档不支持隔离预览</p>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Play size={13} />}
                    loading={previewPreparing}
                    onClick={startPreview}
                  >
                    {previewPreparing ? "预编译中…" : "启动预览"}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className={style[bem.e("inspector-shell")]}>
              <div className={style[bem.e("inspector")]}>
                <div className={style[bem.e("inspector-files")]}>
                  {paths.length ? (
                    <FileSystemView
                      items={dirView.items}
                      breadcrumbs={dirView.breadcrumbs}
                      selectedId={selected}
                      onBack={() => setCurrentDir(dirOf(currentDir))}
                      onRefresh={handleReparse}
                      onBreadcrumbClick={setCurrentDir}
                      onItemClick={handleOpenItem}
                      onItemDoubleClick={handleOpenItem}
                      defaultLayout="grid"
                      orientation="vertical"
                      width="100%"
                      height="100%"
                      showBreadcrumbs={false}
                      showParentEntry
                    />
                  ) : (
                    <p className={style[bem.e("code-text")]}>没有可展示的文件</p>
                  )}
                </div>
                <div className={style[bem.e("inspector-view")]}>
                  {selectedValue != null ? (
                    <>
                      <div className={style[bem.e("inspector-file-head")]}>
                        <span>{selected}</span>
                        <span className={style[bem.e("inspector-file-ops")]}>
                          {dirtySet.has(selected) && <em>已修改</em>}
                          <i>{selectedMeta?.detail}</i>
                          {editing ? (
                            <>
                              <Button variant="ghost" size="xs" icon={<RotateCcw size={12} />} onClick={revertOne}>还原</Button>
                              <Button variant="default" size="xs" icon={<Check size={12} />} onClick={commitEdit}>完成</Button>
                            </>
                          ) : (
                            <>
                              {dirtySet.has(selected) && (
                                <Button variant="ghost" size="xs" icon={<RotateCcw size={12} />} onClick={revertOne}>还原</Button>
                              )}
                              {canEditPackage && selectedMeta?.kind === "text" && (
                                <Button variant="outline" size="xs" icon={<Pencil size={12} />} onClick={startEdit}>编辑</Button>
                              )}
                            </>
                          )}
                        </span>
                      </div>
                      {editing ? (
                        <textarea
                          className={style[bem.e("inspector-editor")]}
                          value={editorValue}
                          onChange={(e) => setEditorValue(e.target.value)}
                          spellCheck={false}
                        />
                      ) : (
                        <FileView path={selected} value={selectedValue} />
                      )}
                    </>
                  ) : (
                    <div className={style[bem.e("inspector-empty")]}>
                      <PackageCheck size={24} />
                      <p>从左侧选择一个文件</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {!parsedUsable && (
            <p className={style[bem.e("code-text")]}>
              {tree.parseError
                ? `内联包未能解析（${tree.parseError}），只能下载原始文件。`
                : "不识别为 SukinOS 内联包（没有取到配置块与内容块），只能下载原始文件。"}
            </p>
          )}

          <div className={style[bem.e("inspector-foot")]}>
            <span className={style[bem.e("inspector-summary")]}>
              物理文件 {viewFileName || "-"} · {fileCount} 个源文件
              {tree.hasLogic ? ` · 主逻辑 ${tree.logicFileName}` : " · 无主逻辑块"}
              {tree.pathAdjusted ? ` · ${tree.pathAdjusted} 个路径已规整` : ""}
            </span>
            <Button variant="ghost" size="sm" icon={<RefreshCw size={13} />} onClick={handleReparse}>重新解析</Button>
          </div>
        </>
      )}

      <Modal
        title="提交修改为新待审版本"
        visible={confirmVisible}
        onClose={() => setConfirmVisible(false)}
        width={560}
      >
        <p className={style[bem.e("inspector-note")]}>
          修改会重建整包并提交为待审版本，线上当前版本保持在线，审核通过后才会切换；旧版本留档。
          重建时同步预编译，任一模块编译失败都会阻止提交。
          提交成功后该应用最多保留最近 {maxRevisions} 条历史修订，更旧的会被清理（可在系统配置 → 包修订保留调整）。
        </p>
        {entriesWarning && (
          <p className={style[bem.e("inspector-danger")]}>
            <AlertTriangle size={13} />{entriesWarning}
          </p>
        )}
        {metaDiffKeys.length > 0 && (
          <div className={style[bem.e("inspector-changes")]}>
            <p><span>包内元数据与审核记录不一致</span><em>{metaDiffKeys.length} 个字段</em></p>
            {metaDiffKeys.slice(0, 8).map((key) => (
              <p key={key}><span>{key}</span><em>以包内值为准</em></p>
            ))}
            <p><span>说明</span><em>运行时读取包内元数据，提交后记录按包内值重建</em></p>
          </div>
        )}
        <div className={style[bem.e("inspector-changes")]}>
          {changedPaths.map((path) => {
            const stat = lineStat(tree?.files[path], drafts[path]);
            return (
              <p key={path}>
                <span>{path}</span>
                <em>+{stat.added} / -{stat.removed}</em>
              </p>
            );
          })}
        </div>
        <div className={style[bem.e("form-item")]}>
          <label>修改说明</label>
          <textarea
            className={style[bem.e("input-textarea")]}
            style={{ minHeight: 88 }}
            value={submitNote}
            onChange={(e) => setSubmitNote(e.target.value)}
            placeholder="说明为什么在审核端直接改包，将随修订留档"
          />
        </div>
        <div className={style[bem.e("audit-actions")]} style={{ marginTop: 12 }}>
          <Button variant="outline" size="sm" onClick={() => setConfirmVisible(false)}>取消</Button>
          <Button variant="default" size="sm" loading={submitting} onClick={handleResubmit}>提交待审版本</Button>
        </div>
      </Modal>

      <PreviewWindow
        open={previewOpen}
        title={`预览 · ${viewAppName || row.resourceId}`}
        onClose={() => setPreviewOpen(false)}
      >
        {previewArmed && previewPayload && (
          <PreviewSandbox app={previewPayload} onEscape={() => setPreviewOpen(false)} />
        )}
      </PreviewWindow>
    </Modal>
  );
}
