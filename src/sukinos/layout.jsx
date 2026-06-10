import { useState, useEffect, useRef } from 'react'
import style from "./style.module.css"
import { createNamespace } from '/utils/js/classcreate'
import LoginLayout from '@/sukinos/login/layout'
import OverPlay from "@/component/overPlay/layout"
import gsap from 'gsap'
import { DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';

const bem = createNamespace('sukinos')

const PAGE_CONFIG = {
  header: { logoText: 'SUKIN OS', status: 'STATUS: STANDBY' },
  core: {
    titleLine1: 'Pure',
    titleLine2: 'Kernel.',
    description: '摒弃繁杂，回归本质。重塑浏览器端的视窗交互体验，以原生级的性能调度底层资源。'
  },
  modules: [
    { id: 'worker', name: 'Worker Serve ', icon: 'CPU' },
    { id: 'state', name: 'State Manager', icon: 'RAM' },
    { id: 'iframe', name: 'Iframe Render', icon: 'DOM' }
  ],
  // 将 slots 更新为包含状态文本的配置对象数组
  slots: [
    {
      id: 'slot-worker',
      moduleId: 'worker', // 对应模块ID
      emptyText: '[ AWAITING WORKER MODULE ]',
      emptyDesc: 'Required for background thread processing',
      filledText: '[ WORKER THREAD ACTIVE ]',
      filledDesc: 'Background processing queue initialized'
    },
    {
      id: 'slot-state',
      moduleId: 'state', // 对应模块ID
      emptyText: '[ AWAITING STATE MODULE ]',
      emptyDesc: 'Required for reactive memory management',
      filledText: '[ CENTRAL BUS ONLINE ]',
      filledDesc: 'State synchronized across all nodes'
    },
    {
      id: 'slot-iframe',
      moduleId: 'iframe', // 对应模块ID
      emptyText: '[ AWAITING IFRAME MODULE ]',
      emptyDesc: 'Required for secure view isolation',
      filledText: '[ ISOLATE RENDER READY ]',
      filledDesc: 'DOM container secured and mounted'
    }
  ],
  commands: {
    help: ["'status' - 查看系统状态", "'reboot' - 重置组装序列", "'login' - 进入登录界面", "'clear' - 清空控制台"],
    status: ["Worker: Thread Active", "State: Central Bus Online", "Iframe: Isolate Ready", "System: Assembly Validated"]
  }
};

// 可拖拽模块
function DraggableModule({ id, name, icon, isDropped }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const moduleRef = useRef(null);

  useEffect(() => {
    gsap.to(moduleRef.current, {
      x: transform ? transform.x : 0,
      y: transform ? transform.y : 0,
      scale: isDragging ? 1.05 : 1,
      zIndex: isDragging ? 100 : 1,
      boxShadow: isDragging ? '12px 12px 0px var(--su-black-900)' : '0px 0px 0px var(--su-black-900)',
      duration: isDragging ? 0 : 0.4,
      ease: "power2.out"
    });
  }, [transform, isDragging]);

  return (
    <div
      ref={moduleRef}
      {...listeners}
      {...attributes}
      className={`${style[bem.e('module-draggable')]} ${isDropped ? style['is-dropped'] : ''}`}
    >
      <div ref={setNodeRef} style={{ position: 'absolute', inset: 0 }}></div>
      <span className={style[bem.e('block-icon')]}>{icon}</span>
      <span className={style[bem.e('block-label')]}>{name}</span>
    </div>
  );
}


// 放置槽位 (根据对象配置去展示信息)
function DroppableSlot({ slotConfig, isFilled, isNext }) {
  const { isOver, setNodeRef } = useDroppable({ id: slotConfig.id });
  return (
    <div
      ref={setNodeRef}
      data-slot-id={slotConfig.id}
      className={`${style[bem.e('module-slot')]} ${isOver ? style['is-over'] : ''} ${isFilled ? style['is-filled'] : ''} ${isNext ? style['is-next'] : ''}`}
    >
      <div className={style[bem.e('slot-content')]}>
        <div className={style[bem.e('slot-title')]}>
          {isFilled ? slotConfig.filledText : slotConfig.emptyText}
        </div>
        <div className={style[bem.e('slot-desc')]}>
          {isFilled ? slotConfig.filledDesc : slotConfig.emptyDesc}
        </div>
      </div>
    </div>
  );
}

// 封装的终端控制台组件 (React 19 可以直接解构 ref)
function TerminalConsole({ ref, isActive, onReboot, onLogin }) {
  const [logLines, setLogLines] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef(null);
  const terminalBodyRef = useRef(null);

  // 监听 isActive 状态，开启时展示初始化文字并聚焦，关闭时清空重置状态
  useEffect(() => {
    if (isActive) {
      setLogLines([
        { type: 'log', text: ">>> SYSTEM ASSEMBLY COMPLETED." },
        { type: 'log', text: ">>> KERNEL INITIALIZED. READY." },
        { type: 'log', text: ">>> help FOR STARTING..." }
      ]);
      setTimeout(() => inputRef.current?.focus(), 1000);
    } else {
      setLogLines([]);
      setInputValue("");
    }
  }, [isActive]);

  // 当日志变化时，自动滚动到底部
  useEffect(() => {
    if (terminalBodyRef.current) {
      terminalBodyRef.current.scrollTop = terminalBodyRef.current.scrollHeight;
    }
  }, [logLines]);
  const handleClickToFocus = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // 处理控制台命令
  const handleCommand = (e) => {
    e.preventDefault();
    const cmd = inputValue.trim().toLowerCase();
    if (!cmd) return;
    let newLogs = [...logLines, { type: 'input', text: cmd }];

    if (cmd === 'help') newLogs.push(...PAGE_CONFIG.commands.help.map(t => ({ type: 'log', text: t })));
    else if (cmd === 'status') newLogs.push(...PAGE_CONFIG.commands.status.map(t => ({ type: 'log', text: t })));
    else if (cmd === 'reboot') { onReboot(); return; }
    else if (cmd === 'login') { onLogin(); }
    else if (cmd === 'clear') { setLogLines([]); setInputValue(""); return; }
    else newLogs.push({ type: 'error', text: `ERROR: COMMAND '${cmd}' NOT RECOGNIZED.` });

    setLogLines(newLogs);
    setInputValue("");
  };

  return (
    <div ref={ref} className={style[bem.e('terminal')]}>
      <div className={style[bem.e('term-head')]}>
        <div className={style[bem.e('term-dots')]}>
          <span></span><span></span><span></span>
        </div>
        SYSTEM_CONSOLE
      </div>
      <div ref={terminalBodyRef} className={style[bem.e('term-body')]} onClick={handleClickToFocus}>
        {logLines.map((l, i) => (
          <div key={i} className={style[bem.e(`log-${l.type || 'log'}`)]}>
            {l.type === 'input' && <span className={style[bem.e('term-prompt')]}>&gt;</span>} {l.text}
          </div>
        ))}
        <form onSubmit={handleCommand} className={style[bem.e('term-form')]}>
          <span className={style[bem.e('term-prompt')]}>&gt;</span>
          <input
            ref={inputRef}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            spellCheck="false"
            autoComplete="off"
            placeholder="..."
          />
        </form>
      </div>
    </div>
  );
}


function SukinOs() {
  const [isOpen, setIsOpen] = useState(false);
  const [filledSlots, setFilledSlots] = useState({});
  const [isSuccess, setIsSuccess] = useState(false);

  const containerRef = useRef(null);
  const headerRef = useRef(null);
  const leftPanelRef = useRef(null);
  const stationRef = useRef(null);
  const terminalRef = useRef(null);
  const draggableRefs = useRef({});

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // 入场动画
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from([headerRef.current, leftPanelRef.current, stationRef.current], {
        opacity: 0, y: 40, stagger: 0.2, duration: 1.2, ease: "power4.out"
      });
    }, containerRef);
    return () => { ctx.revert(); reset() }
  }, []);

  // 组装成功后的局部变换
  useEffect(() => {
    const allFilled = Object.keys(filledSlots).length === PAGE_CONFIG.slots.length;
    if (allFilled && !isSuccess) {
      setIsSuccess(true);
      const tl = gsap.timeline();

      // 仅让右侧 Station 容器缩小并左移
      tl.to(stationRef.current, {
        x: -280,
        scale: 0.5,
        duration: 0.8,
        ease: "power3.inOut"
      })
      .to(terminalRef.current, {
        display: 'flex', opacity: 1, x: 0, scale: 1, duration: 0.6, ease: "back.out(1.2)"
      }, "-=0.3");
    }
  }, [filledSlots, isSuccess]);

  // 核心拖拽吸附逻辑
  const handleDragEnd = (event) => {
    const { active, over } = event;
    const node = draggableRefs.current[active.id];
    if (!node) return;

    // 常规回弹
    const snapBack = () => {
      gsap.to(node, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.5)" });
    };

    if (!over) {
      snapBack();
      return;
    }

    // 获取当前应该被填充的槽位信息
    const currentStepIndex = Object.keys(filledSlots).length;
    const currentTargetConfig = PAGE_CONFIG.slots[currentStepIndex];

    //是否是预期的槽位  是否是预期的模块
    const isCorrectSlot = over.id === currentTargetConfig.id;
    const isCorrectModule = active.id === currentTargetConfig.moduleId;

    if (!isCorrectSlot || !isCorrectModule) {
      // 增强版错误反馈动画
      const slotEl = document.querySelector(`[data-slot-id="${over.id}"]`);

      const errorTl = gsap.timeline({
        onComplete: () => {
          // 确保动画结束后清理内联样式，避免干扰后续
          gsap.set(slotEl, { clearProps: "all" });
        }
      });

      // 槽位：变红、剧烈摇晃、缩放脉冲
      if (slotEl) {
        errorTl.to(slotEl, {
          backgroundColor: "rgba(255, 77, 77, 0.2)",
          borderColor: "#ff4d4d",
          scale: 0.98,
          duration: 0.1
        })
        .to(slotEl, {
          x: 12, // 增加摇晃幅度
          repeat: 5,
          yoyo: true,
          duration: 0.05,
          ease: "none"
        }, "<")
        .to(slotEl, {
          backgroundColor: "transparent",
          borderColor: "rgba(255,255,255,0.1)", // 这里假设原本是浅白边框
          scale: 1,
          duration: 0.3
        });
      }

      // 模块：撞击震动后回弹
      gsap.to(node, {
        x: "-=10",
        repeat: 3,
        yoyo: true,
        duration: 0.04,
        onComplete: snapBack // 震动完再回弹
      });

      return;
    }

    // 成功吸附效果
    const slotEl = document.querySelector(`[data-slot-id="${over.id}"]`);
    const nodeRect = node.getBoundingClientRect();
    const slotRect = slotEl.getBoundingClientRect();

    const moveX = (slotRect.left + slotRect.width / 2) - (nodeRect.left + nodeRect.width / 2);
    const moveY = (slotRect.top + slotRect.height / 2) - (nodeRect.top + nodeRect.height / 2);

    const curX = gsap.getProperty(node, "x");
    const curY = gsap.getProperty(node, "y");

    gsap.to(node, {
      x: curX + moveX,
      y: curY + moveY,
      scale: 0.3,
      opacity: 0,
      duration: 0.4,
      ease: "power3.in",
      onComplete: () => {
        setFilledSlots(prev => ({ ...prev, [over.id]: active.id }));
      }
    });
  };

  const reset = () => {
    setFilledSlots({});
    setIsSuccess(false);
    setIsOpen(false);
    gsap.to(stationRef.current, { x: 0, scale: 1, duration: 0.6 });
    gsap.to(terminalRef.current, { opacity: 0, display: 'none', x: 20 });
    // 恢复所有模块的可见性
    Object.values(draggableRefs.current).forEach(n => {
       if (n) gsap.to(n, { x: 0, y: 0, opacity: 1, scale: 1, duration: 0.4, clearProps: "all" });
    });
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div ref={containerRef} className={style[bem.b()]}>

        <header ref={headerRef} className={style[bem.e('header')]}>
          <div className={style[bem.e('logo-box')]}>
            <img src="/logo.jpg" alt="logo" className={style[bem.e('logo-img')]} />
            <span className={style[bem.e('logo-text')]}>{PAGE_CONFIG.header.logoText}</span>
          </div>
          <div className={style[bem.e('status')]}>{isSuccess ? 'SEQUENCE_COMPLETE' : PAGE_CONFIG.header.status}</div>
        </header>

        <div className={style[bem.e('content-grid')]}>
          <section ref={leftPanelRef} className={style[bem.e('left-panel')]}>
            <h1 className={style[bem.e('title')]}>
              <div>{PAGE_CONFIG.core.titleLine1}</div>
              <div className={style[bem.e('title-accent')]}>{PAGE_CONFIG.core.titleLine2}</div>
            </h1>
            <p className={style[bem.e('desc')]}>{PAGE_CONFIG.core.description}</p>
          </section>

          <section className={style[bem.e('right-panel')]}>
            <div ref={stationRef} className={style[bem.e('station')]}>
              <div className={style[bem.e('slots')]}>
                {PAGE_CONFIG.slots.map((slot, i) => (
                  <DroppableSlot
                    key={slot.id}
                    slotConfig={slot}
                    isFilled={!!filledSlots[slot.id]}
                    isNext={Object.keys(filledSlots).length === i}
                  />
                ))}
              </div>
              <div className={style[bem.e('tray')]}>
                {PAGE_CONFIG.modules.map(m => (
                  <div key={m.id} ref={el => draggableRefs.current[m.id] = el}>
                    <DraggableModule id={m.id} name={m.name} icon={m.icon} isDropped={Object.values(filledSlots).includes(m.id)} />
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
        <TerminalConsole
          ref={terminalRef}
          isActive={isSuccess}
          onReboot={reset}
          onLogin={() => setIsOpen(true)}
        />

        <div className={style[bem.is('login', !isOpen)]}>
          <OverPlay isFixed={true} closeFunc={reset}><LoginLayout /></OverPlay>
        </div>
      </div>
    </DndContext>
  );
}

export default SukinOs;
