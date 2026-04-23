const getLanguageFromExtension = filePath => {
  const extension = filePath.split('.').pop()?.toLowerCase() || ''

  const languageMap = {
    // JavaScript/TypeScript
    js: 'javascript',
    jsx: 'javascriptreact',
    mjs: 'javascript',
    cjs: 'javascript',
    ts: 'typescript',
    tsx: 'typescriptreact',

    // Vue.js
    vue: 'vue',

    // Stylesheets
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',
    styl: 'stylus',

    // HTML/XHTML
    html: 'html',
    htm: 'html',
    xhtml: 'html',

    // Python
    py: 'python',
    pyw: 'python',
    pyi: 'python',

    // Java/Kotlin
    java: 'java',
    kt: 'kotlin',
    kts: 'kotlin',

    // C/C++
    c: 'c',
    h: 'c',
    cpp: 'cpp',
    hpp: 'cpp',
    cc: 'cpp',

    // C#
    cs: 'csharp',

    // Go
    go: 'go',

    // Ruby
    rb: 'ruby',
    gemspec: 'ruby',

    // Rust
    rs: 'rust',

    // SQL
    sql: 'sql',

    // Swift
    swift: 'swift',

    // Markdown/Docs
    md: 'markdown',
    markdown: 'markdown',

    // YAML
    yml: 'yaml',
    yaml: 'yaml',

    // Shell
    sh: 'shell',
    bash: 'shell',
    zsh: 'shell',

    // Batch
    bat: 'batcmd',
    cmd: 'batcmd',

    // Config files
    ini: 'ini',
    conf: 'ini',
    properties: 'ini',
    toml: 'toml',

    // Docker
    dockerfile: 'dockerfile',

    // Git
    gitignore: 'gitignore',
    gitattributes: 'gitignore',
    gitmodules: 'gitignore',

    // Makefile
    makefile: 'makefile',
    mk: 'makefile',

    // Text
    txt: 'text',
    text: 'text',

    // XML
    xml: 'xml',

    // PHP
    php: 'php',

    // Perl
    pl: 'perl',
    pm: 'perl',

    // Lua
    lua: 'lua',

    // R
    r: 'r',
    rmd: 'r',

    // Scala
    scala: 'scala',
    sc: 'scala',

    // Dart
    dart: 'dart',

    // Elixir
    ex: 'elixir',
    exs: 'elixir',

    // Haskell
    hs: 'haskell',
    lhs: 'haskell',

    // Clojure
    clj: 'clojure',
    cljs: 'clojure',
    cljc: 'clojure',

    // Groovy
    groovy: 'groovy',
    gvy: 'groovy',

    // PowerShell
    ps1: 'powershell',
    psm1: 'powershell',

    // Visual Basic
    vb: 'vb',

    // JSON
    json: 'json',

    // Other
    lock: 'text',
    log: 'text',
    env: 'text',
    example: 'text',

    //特殊开发语言支持
    cshtml: 'razor', // ASP.NET Razor
    fs: 'fsharp', // F#
    fsx: 'fsharp',
    cl: 'opencl', // OpenCL
    cu: 'cuda', // CUDA
    ml: 'ocaml', // OCaml
    mli: 'ocaml',
    erl: 'erlang', // Erlang
    hrl: 'erlang',
    pro: 'prolog', // Prolog
    p: 'pascal', // Pascal
    pp: 'pascal',
    pas: 'pascal',
    adb: 'ada', // Ada
    ads: 'ada',
    cob: 'cobol', // COBOL
    cbl: 'cobol',
    for: 'fortran', // Fortran
    f90: 'fortran',
    f95: 'fortran',
    vhdl: 'vhdl', // VHDL
    sv: 'systemverilog', // SystemVerilog
    svh: 'systemverilog',
    v: 'verilog', // Verilog
  }

  return languageMap[extension] || 'other'
}

export default getLanguageFromExtension
