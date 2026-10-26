export default function WebInfo() {
  // 版心固定在深色头图上，白字不随 theme 属性翻色
  return (
    <footer className="absolute bottom-0 left-1/2 -translate-x-1/2 px-[5%] py-8 text-center text-white">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-4">
        <p>© 2026 Sukin · <a
          className="text-white/70 no-underline hover:text-white hover:underline"
          href="https://beian.miit.gov.cn"
          target="_blank"
        >豫ICP备2025146712号-1</a></p>
      </div>
    </footer>
  );
}
