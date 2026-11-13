import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import style from "./PreviewSandbox.module.css";
import { createNamespace } from "/utils/js/classcreate";

const bem = createNamespace("preview-sandbox");

const RUNTIME_JS_URL = "/sandbox/preview-runtime.js";
const RUNTIME_CSS_URL = "/sandbox/preview-runtime.css";
const READY_TIMEOUT_MS = 20000;
const ASSET_TIMEOUT_MS = 15000;
//有意的应用内刷新会很快重新发 ready，给足这段窗口再判定为跳走
const SELF_NAV_GRACE_MS = 3000;
//正常最多一次自刷新，连续多轮就是循环，不再跟着它等
const MAX_FRAME_LOADS = 4;

//预览的 base URL 继承宿主，相对资源（字体等）会落到宿主 origin；只放行这一个来源的被动资源
const assetOrigin = typeof window !== "undefined" && window.location?.origin ? window.location.origin : "";
const passiveSources = `data: blob:${assetOrigin ? ` ${assetOrigin}` : ""}`;

const PREVIEW_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline' 'unsafe-eval' blob:",
  "worker-src blob:",
  "style-src 'unsafe-inline'",
  `img-src ${passiveSources}`,
  `font-src ${passiveSources}`,
  `media-src ${passiveSources}`,
  //只放行包内 data:/blob 资源，网络请求继续关闭
  "connect-src data: blob:",
  "form-action 'none'",
  "base-uri 'none'"
].join("; ");

//挂住的请求会让预览一直停在启动遮罩，必须自己给超时；超时覆盖到响应体读完
const fetchRuntimeAsset = async (url) => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), ASSET_TIMEOUT_MS);
  try {
    const res = await fetch(url, { cache: "no-cache", signal: controller.signal });
    return { ok: res.ok, status: res.status, text: res.ok ? await res.text() : "" };
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`预览资源加载超时（${ASSET_TIMEOUT_MS / 1000} 秒）：${url}`);
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
};

//每次挂载都回源校验：部署新运行时后，已打开的审核页重开预览就能拿到最新产物
const loadRuntimeAssets = async () => {
  const [jsAsset, cssAsset] = await Promise.all([
    fetchRuntimeAsset(RUNTIME_JS_URL),
    fetchRuntimeAsset(RUNTIME_CSS_URL),
  ]);
  if (!jsAsset.ok) throw new Error(`运行时脚本加载失败（HTTP ${jsAsset.status}）`);
  //样式缺失不致命，但要告诉评审，否则预览会静默变成无样式
  return { js: jsAsset.text, css: cssAsset.text, cssMissing: !cssAsset.ok };
};

const makeNonce = () => {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

//运行时文本里若出现 </script 会提前闭合标签；转义后仍是合法 JS 字符串
const escapeScriptText = (text) => String(text).replace(/<\/script/gi, "<\\/script");

const buildSrcdoc = (assets, app, nonce) => {
  const payload = JSON.stringify({ nonce, app }).replace(/</g, "\\u003c");
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta http-equiv="Content-Security-Policy" content="${PREVIEW_CSP}" />
<style>${assets.css || ""}</style>
</head>
<body>
<div id="root"></div>
<script type="application/json" id="sukinos-preview-payload">${payload}</script>
<script>${escapeScriptText(assets.js)}</script>
</body>
</html>`;
};

/**
 * 审核页隔离预览宿主：srcdoc + sandbox="allow-scripts"（不给 allow-same-origin）。
 * 子文档是 opaque origin，读不到管理页 DOM、Cookie 与宿主存储；运行时自身不发网络请求。
 */
export default function PreviewSandbox({ app, onEscape }) {
  const [assets, setAssets] = useState(null);
  const [assetsError, setAssetsError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState("loading");
  const [errorDetail, setErrorDetail] = useState(null);
  const [compileError, setCompileError] = useState("");
  const [warning, setWarning] = useState("");
  const [assetsWarning, setAssetsWarning] = useState("");
  const iframeRef = useRef(null);
  const readyRef = useRef(false);
  const escapeRef = useRef(onEscape);
  const lastWarningRef = useRef("");
  //首次 load 属于 srcdoc 本身，之后每多一次都可能是应用自己跳转或刷新
  const loadCountRef = useRef(0);
  const navTimerRef = useRef(null);
  const selfNavRef = useRef(false);
  const [nonce, setNonce] = useState(makeNonce);

  useEffect(() => {
    escapeRef.current = onEscape;
  });

  const srcdoc = useMemo(
    () => (assets && app ? buildSrcdoc(assets, app, nonce) : ""),
    [assets, app, nonce]
  );

  //必须早于 iframe 首次 load：每次换 srcdoc 都从头计数，否则上一轮的计数会吞掉本轮的第一次加载
  useLayoutEffect(() => {
    loadCountRef.current = 0;
    selfNavRef.current = false;
    if (navTimerRef.current) {
      window.clearTimeout(navTimerRef.current);
      navTimerRef.current = null;
    }
    return () => {
      if (navTimerRef.current) {
        window.clearTimeout(navTimerRef.current);
        navTimerRef.current = null;
      }
    };
  }, [srcdoc]);

  useEffect(() => {
    let cancelled = false;
    setAssetsError("");
    loadRuntimeAssets()
      .then((loaded) => {
        if (cancelled) return;
        setAssetsWarning(
          loaded.cssMissing
            ? "预览样式资源 preview-runtime.css 加载失败（非 2xx），界面可能缺少样式"
            : ""
        );
        setAssets(loaded);
      })
      .catch((error) => {
        if (!cancelled) setAssetsError(error?.message || "预览运行时加载失败");
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => {
    //同一条警告可能来自多个被拒绝的 promise，重复到达时不再重新弹出
    const showWarning = (message) => {
      if (!message || message === lastWarningRef.current) return;
      lastWarningRef.current = message;
      setWarning(message);
    };

    const onMessage = (event) => {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      const data = event.data;
      if (!data || data.__sukinosPreview !== true || data.nonce !== nonce) return;

      //运行时还能发消息就说明文档仍是我们的预览页，应用自发刷新会走到这里撤销误判
      if (navTimerRef.current) {
        window.clearTimeout(navTimerRef.current);
        navTimerRef.current = null;
      }
      if (selfNavRef.current) {
        selfNavRef.current = false;
        setErrorDetail(null);
        //恢复后仍交给 ready/error 决定最终状态，避免仅凭一条警告就宣称已就绪
        setStatus("loading");
      }

      if (data.type === "ready") {
        readyRef.current = true;
        setStatus("ready");
        setErrorDetail(null);
      } else if (data.type === "error") {
        setStatus("error");
        setErrorDetail(data.detail || { message: "预览运行失败" });
      } else if (data.type === "compile-error") {
        setCompileError(data.detail?.message || "");
      } else if (data.type === "compile-end") {
        setCompileError("");
      } else if (data.type === "warning") {
        showWarning(data.detail?.message || "预览运行有异常");
      } else if (data.type === "runtime-error") {
        // 逻辑层异常不阻塞界面渲染，但必须让评审看到，否则状态冻结时无从排查
        showWarning(data.detail?.message || "逻辑层运行失败");
      } else if (data.type === "escape") {
        //焦点在 iframe 里时宿主收不到 keydown，由运行时转发退出请求
        escapeRef.current?.();
      } else if (data.type === "alive") {
        //确认是自己刷新后，仍要等它重新走到 ready；迟迟不来同样要给结果，不能停在加载态
        navTimerRef.current = window.setTimeout(() => {
          navTimerRef.current = null;
          setErrorDetail({ message: "应用刷新后预览运行时没有在限定时间内就绪" });
          setStatus("error");
        }, READY_TIMEOUT_MS);
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [nonce]);

  useEffect(() => {
    if (!srcdoc) return undefined;
    readyRef.current = false;
    setStatus("loading");
    setErrorDetail(null);
    setCompileError("");
    setWarning("");
    lastWarningRef.current = "";
    const timer = window.setTimeout(() => {
      if (readyRef.current) return;
      setErrorDetail({ message: "预览运行时在限定时间内没有就绪" });
      setStatus("error");
    }, READY_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [srcdoc]);

  useEffect(() => {
    if (!srcdoc || !assetsWarning) return;
    //资源层警告单独恢复，不复位 status，避免资源迟到时把已就绪的预览重新压回加载态
    lastWarningRef.current = assetsWarning;
    setWarning(assetsWarning);
  }, [srcdoc, assetsWarning]);

  const retry = () => {
    //先清掉旧运行时再换 nonce：否则 srcdoc 会先用旧资源重载一次，资源回来后再重载第二次
    setAssets(null);
    setStatus("loading");
    setErrorDetail(null);
    setCompileError("");
    setWarning("");
    setAssetsWarning("");
    lastWarningRef.current = "";
    setNonce(makeNonce());
    setAttempt((prev) => prev + 1);
  };

  const handleFrameLoad = () => {
    loadCountRef.current += 1;
    if (loadCountRef.current <= 1) return;
    if (loadCountRef.current > MAX_FRAME_LOADS) {
      //应用在刷新里循环，继续跟着等只会一直挂在加载态；正常 ready 到达后仍会自动恢复
      setErrorDetail({ message: "应用在预览里反复刷新自己，已停止等待；请修复刷新逻辑后重新加载预览" });
      setStatus("error");
      return;
    }
    //沙箱不允许改顶层地址，但应用可以让自己这一帧跳走或刷新；跨源也能收到 load
    setStatus("loading");
    const frameWindow = iframeRef.current?.contentWindow;
    //新文档解析完运行时就会响应 ping：说明只是应用自己刷新；没响应则可能跳到了别的地址
    //ping 本身不带 nonce，回复走常规信封由宿主校验，跳走的页面拿不到凭证
    frameWindow?.postMessage({ __sukinosPing: true }, "*");
    if (navTimerRef.current) window.clearTimeout(navTimerRef.current);
    navTimerRef.current = window.setTimeout(() => {
      navTimerRef.current = null;
      selfNavRef.current = true;
      setErrorDetail({ message: "应用执行了自身导航或刷新后没有恢复预览（页面可能跳到了其他地址），请重新加载预览" });
      setStatus("error");
    }, SELF_NAV_GRACE_MS);
  };

  if (assetsError) {
    return (
      <div className={style[bem.b()]}>
        <div className={style[bem.e("error")]}>
          <p>{assetsError}</p>
          <p className={style[bem.e("hint")]}>先运行 npm run sandbox:build 生成 public/sandbox 下的运行时产物</p>
          <button type="button" className={style[bem.e("retry")]} onClick={retry}>重试</button>
        </div>
      </div>
    );
  }

  return (
    <div className={style[bem.b()]}>
      {compileError && (
        <div className={style[bem.e("compile-error")]}>预览错误：{compileError}</div>
      )}
      {warning && (
        <div className={style[bem.e("warning")]} role="status">
          <span>{warning}</span>
          <button
            type="button"
            className={style[bem.e("warning-close")]}
            onClick={() => setWarning("")}
          >关闭</button>
        </div>
      )}
      <div className={style[bem.e("frame-wrap")]}>
        {srcdoc && (
          <iframe
            ref={iframeRef}
            key={attempt}
            className={style[bem.e("frame")]}
            sandbox="allow-scripts"
            referrerPolicy="no-referrer"
            title="隔离预览"
            srcDoc={srcdoc}
            onLoad={handleFrameLoad}
          />
        )}
        {status === "loading" && (
          <div className={style[bem.e("overlay")]}>正在启动隔离预览…</div>
        )}
        {status === "error" && (
          <div className={style[bem.e("overlay")]}>
            <div className={style[bem.e("error")]}>
              <p>{errorDetail?.message || "预览运行失败"}</p>
              {errorDetail?.stack && (
                <pre className={style[bem.e("stack")]}>{String(errorDetail.stack).slice(0, 1200)}</pre>
              )}
              <button type="button" className={style[bem.e("retry")]} onClick={retry}>重新加载预览</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
