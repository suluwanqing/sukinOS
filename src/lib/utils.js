import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * 类名合并：clsx 负责条件拼接，tailwind-merge 负责同族工具类冲突裁决。
 * 用了它，外部传进来的 className 才能压过 cva 基串里的同类工具类，
 * 不必再在变体里写带 `!` 的强压类。
 * （注释里别写裸的 Tailwind 类名：global.css 的 @source 会连注释一起扫，
 *   注释里出现过的类会被当成真实用法生成 CSS。）
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
