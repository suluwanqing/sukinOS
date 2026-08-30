import { useEffect, useRef } from 'react'
import style from "./style.module.css"
import { createNamespace } from '/utils/js/classcreate'
import LoginLayout from '@/sukinos/login/layout'
import gsap from 'gsap'
import {getLogoBase64Url} from "@/component/logo/layout";
const bem = createNamespace('sukinos')
const logo = getLogoBase64Url()

const PAGE_CONFIG = {
  header: { logoText: 'SUKIN OS', status: 'STATUS: ACTIVE' },
  core: {
    titleLine1: 'Pure',
    titleLine2: 'Kernel.',
    description: '摒弃繁杂，回归本质。重塑浏览器端的视窗交互体验。'
  }
};

function SukinOs() {
  const containerRef = useRef(null);
  const headerRef = useRef(null);
  const gridRef = useRef(null);
  const blob1Ref = useRef(null);
  const blob2Ref = useRef(null);


  useEffect(() => {
    const ctx = gsap.context(() => {

      gsap.from(headerRef.current, {
        opacity: 0,
        y: -15,
        duration: 0.8,
        ease: "power2.out"
      });


      gsap.from(gridRef.current, {
        opacity: 0,
        y: 30,
        scale: 0.98,
        duration: 1.0,
        ease: "power3.out"
      }, "-=0.4");


      gsap.to(blob1Ref.current, {
        x: "random(-150, 150)",
        y: "random(-120, 120)",
        scale: "random(0.95, 1.3)",
        duration: "random(16, 22)",
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });

      gsap.to(blob2Ref.current, {
        x: "random(-120, 120)",
        y: "random(-100, 100)",
        scale: "random(0.85, 1.25)",
        duration: "random(18, 25)",
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className={style[bem.b()]}>

      <div ref={blob1Ref} className={style[bem.e('bg-glow-1')]} />
      <div ref={blob2Ref} className={style[bem.e('bg-glow-2')]} />

      <header ref={headerRef} className={style[bem.e('header')]}>
        <div className={style[bem.e('logo-box')]}>
          <img src={logo} alt="logo" className={style[bem.e('logo-img')]} />
          <span className={style[bem.e('logo-text')]}>{PAGE_CONFIG.header.logoText}</span>
        </div>
        <div className={style[bem.e('status')]}>{PAGE_CONFIG.header.status}</div>
      </header>

      <main className={style[bem.e('main-wrapper')]}>

        <div ref={gridRef} className={style[bem.e('split-card')]}>

          <section className={style[bem.e('left-panel')]}>
            <div className={style[bem.e('panel-image')]} />
            <div className={style[bem.e('panel-overlay')]}>
              <h1 className={style[bem.e('title')]}>
                <div>{PAGE_CONFIG.core.titleLine1}</div>
                <div className={style[bem.e('title-accent')]}>{PAGE_CONFIG.core.titleLine2}</div>
              </h1>
              <p className={style[bem.e('desc')]}>{PAGE_CONFIG.core.description}</p>
            </div>
          </section>

          <section className={style[bem.e('right-panel')]}>
            <LoginLayout />
          </section>

        </div>
      </main>
    </div>
  );
}

export default SukinOs;
