import style from "./style.module.css";
import { createNamespace } from '/utils/js/classcreate';
import SecurityIcon from '@mui/icons-material/Security';
import ShieldIcon from '@mui/icons-material/Shield';

const bem = createNamespace('setting-privacy');

const Privacy = () => {
  const POLICIES = [
    { title: "本地内核隔离", desc: "所有应用逻辑均在 WebWorker 物理沙箱中执行，确保宿主环境与子应用数据完全隔离。" },
    { title: "零数据云端同步", desc: "SukinOS 不设中心化服务器，您的个人文件、系统日志及配置仅存在于本机的缓存中。" },
    { title: "去中心化存储", desc: "系统使用 IndexedDB 技术。您可以随时在浏览器 Application 选项卡中物理抹除所有数据。" }
  ];

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('section')]}>
        <div className={style[bem.e('section-title')]}>
          <SecurityIcon style={{ fontSize: 18, marginRight: 8 }} /> 隐私与安全政策
        </div>
        <div className={style[bem.e('card')]}>
          <div className={style[bem.e('hero')]}>
            <ShieldIcon style={{ fontSize: 48, color: 'var(--su-text-color-primary)', marginBottom: 16 }} />
            <h2 className={style[bem.e('hero-title')]}>您的隐私是系统设计的基石。</h2>
            <p className={style[bem.e('description')]}>
              我们坚信数据所有权应回归用户。SukinOS 的每一行代码都旨在提供无感且安全的本地计算体验。
            </p>
          </div>

          <div className={style[bem.e('divider')]}></div>

          <div className={style[bem.e('policy-list')]}>
            {POLICIES.map((p, idx) => (
              <div key={idx} className={style[bem.e('policy-item')]}>
                <span className={style[bem.e('label-bold')]}>{p.title}</span>
                <p className={style[bem.e('description')]}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
