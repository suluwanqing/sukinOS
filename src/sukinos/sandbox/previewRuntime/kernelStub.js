//隔离预览不接入主内核：只保持调用形状，应用唤起其他进程等能力在这里为空
const kernel = {
  evokeApp: async () => null,
  getTypeApps: () => [],
  requestFocus: () => {},
  on: () => () => {},
  emit: () => {}
};

export default kernel;
