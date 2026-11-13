//隔离运行时没有 Babel：页面与逻辑都必须由宿主预编译后传入，误调这里直接报可读错误
const reject = () => {
  throw new Error("隔离预览不提供 Babel 转译，请由宿主预编译后再传入");
};

export const BabelLoader = {
  load: async () => reject(),
  transform: () => reject()
};
