import React from "react";
import { createRoot } from "react-dom/client";
import AppView from "@/sukinos/resources/developer/right/appView/layout";
import "./runtime.css";

const payloadNode = document.getElementById("sukinos-preview-payload");
const payload = payloadNode ? JSON.parse(payloadNode.textContent || "{}") : {};
const nonce = payload.nonce || "";

const post = (type, detail) => {
  try {
    parent.postMessage({ __sukinosPreview: true, nonce, type, detail }, "*");
  } catch {
    // 父窗口已卸载时没有接收方，忽略即可
  }
};

//宿主在 iframe 重新加载后 ping 一次，用来区分应用自发刷新和跳到了别的地址；
//ping 不带凭证，只有本运行时知道 nonce，回复才能被宿主认下
window.addEventListener("message", (event) => {
  const data = event?.data;
  if (!data || data.__sukinosPing !== true) return;
  post("alive", {});
});

window.addEventListener("error", (event) => {
  post("error", {
    phase: "runtime",
    message: event?.message || "未知运行时错误",
    stack: event?.error?.stack || ""
  });
});

// 未处理的异步异常大多来自被拒绝的网络请求：降级成可关闭提示，不遮住仍能正常渲染的界面
window.addEventListener("unhandledrejection", (event) => {
  const reason = event?.reason;
  //拒绝值可能为空（Promise.reject() 未带参数）或只有 name 没有 message，不能和普通错误混写
  const raw = typeof reason === "string" ? reason : String(reason?.message || reason?.name || "");
  const message = raw.includes("隔离预览不提供网络访问")
    ? "应用尝试访问网络，已被预览环境拦截；界面仍可继续查看"
    : raw
      ? `未处理的异步异常：${raw}`
      : "预览内有异步操作失败，但没有提供错误原因（可能是 Promise.reject() 未带参数），界面仍可继续查看";
  //原始拒绝值只进控制台，便于定位是哪个包在无原因拒绝
  console.warn("[preview] unhandledrejection", reason, event?.promise);
  post("warning", { phase: "runtime", message });
  //已经降级成提示条，阻止控制台再按未捕获异常重复打印
  event?.preventDefault?.();
});

//焦点在 srcdoc 里时宿主收不到 keydown，Esc 由这里转发；应用自己消费过就不再上抛
window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || event.defaultPrevented || event.isComposing) return;
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  // 只有在没有元素持有焦点时才转发，避免应用自己用 Esc 关弹层/下拉时把整个预览也关掉
  const target = event.target;
  if (target && target !== document.body && target !== document.documentElement) return;
  post("escape", {});
});

class RuntimeBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    post("error", {
      phase: "runtime",
      message: error?.message || String(error || "未知运行时错误"),
      stack: [error?.stack || "", info?.componentStack || ""].filter(Boolean).join("\n\n")
    });
  }

  render() {
    if (this.state.error) {
      const message = this.state.error?.message || String(this.state.error);
      return (
        <div className="su-preview-runtime-error">
          <div className="su-preview-runtime-error__title">运行时崩溃</div>
          <pre className="su-preview-runtime-error__body">{message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <RuntimeBoundary>
      <AppView
        app={payload.app}
        onCompileError={(message) => post("compile-error", { message })}
        onCompileEnd={() => post("compile-end")}
        onRuntimeError={(message) => post("runtime-error", { message })}
        //等编译产出和首份逻辑状态到位再撤加载遮罩，render 调用返回时界面还是空的
        onReady={() => post("ready")}
      />
    </RuntimeBoundary>
  );
} else {
  post("error", { phase: "boot", message: "预览运行器缺少挂载节点", stack: "" });
}
