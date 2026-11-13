//与后端 compare_versions 同语义：逐段数值比较，缺失段按 0，非数字段退回字符串比较
const segments = (value) => {
  const text = String(value ?? "").trim();
  if (!text) return [];
  return text.split(".").map(segment => segment.trim());
};

export function compareVersions(left, right) {
  const a = segments(left);
  const b = segments(right);
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const leftPart = index < a.length ? a[index] : "0";
    const rightPart = index < b.length ? b[index] : "0";
    const leftNumber = /^-?\d+$/.test(leftPart) ? Number(leftPart) : null;
    const rightNumber = /^-?\d+$/.test(rightPart) ? Number(rightPart) : null;
    if (leftNumber != null && rightNumber != null) {
      if (leftNumber !== rightNumber) return leftNumber > rightNumber ? 1 : -1;
      continue;
    }
    if (leftPart !== rightPart) return leftPart > rightPart ? 1 : -1;
  }
  return 0;
}
