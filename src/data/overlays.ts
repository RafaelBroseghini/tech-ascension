export type Lang = "python" | "go" | "ts" | "java" | "rust" | "md" | "yaml" | "toml" | "mod"
export const LANG_LABEL: Record<Lang, string> = {
  python: "Python",
  go: "Go",
  ts: "TypeScript",
  java: "Java",
  rust: "Rust",
  md: "Markdown",
  yaml: "YAML",
  toml: "TOML",
  mod: "go.mod",
}

const KEYWORDS: Record<Lang, ReadonlySet<string>> = {
  python: new Set(["def", "for", "in", "if", "elif", "else", "return", "while", "import", "from", "None", "True", "False", "assert", "as", "class", "with", "yield"]),
  go: new Set(["func", "var", "for", "range", "if", "else", "return", "go", "nil", "true", "false", "chan", "type", "struct", "package", "import"]),
  ts: new Set(["export", "function", "class", "extends", "constructor", "private", "return", "let", "const", "new", "if", "else", "this", "typeof", "false", "true", "import", "from", "type"]),
  java: new Set(["static", "while", "if", "else", "return", "new", "final", "class", "public", "for", "private"]),
  rust: new Set(["fn", "let", "if", "else", "return", "mut", "self", "match", "impl", "pub", "use", "None", "Some", "mod", "struct"]),
  md: new Set(),
  yaml: new Set(["true", "false"]),
  toml: new Set(["true", "false"]),
  mod: new Set(["module", "go", "require"]),
}

const TYPES: Record<Lang, ReadonlySet<string>> = {
  python: new Set(),
  go: new Set(["int", "bool", "string", "float64"]),
  ts: new Set(["number", "string", "boolean", "void", "any"]),
  java: new Set(["int", "long", "boolean", "void"]),
  rust: new Set(["f32", "f64", "u32", "u64", "bool"]),
  md: new Set(),
  yaml: new Set(),
  toml: new Set(),
  mod: new Set(),
}

export type TokenKind = "kw" | "str" | "num" | "fn" | "type" | "op" | "text"
export type Token = { kind: TokenKind; text: string }

const TOKEN_RE = /("(?:\\.|[^"\\])*")|(\b\d+(?:\.\d+)?f?\b|\b\d+\.f\b)|([A-Za-z_]\w*)|(=>|->|<-|::|[<>=!+\-*/%&|^@~]+)|(\s+)|(.)/g

/** Tiny lexer: strings, numbers, keywords, types, calls and operators. Joining the texts gives back the source. */
export function tokenize(code: string, lang: Lang): Token[] {
  const out: Token[] = []
  const keywords = KEYWORDS[lang]
  const types = TYPES[lang]
  for (const match of code.matchAll(TOKEN_RE)) {
    const [text, str, num, word, op] = match
    if (str) out.push({ kind: "str", text })
    else if (num) out.push({ kind: "num", text })
    else if (word) {
      const next = code[(match.index ?? 0) + text.length]
      const kind: TokenKind = keywords.has(word)
        ? "kw"
        : types.has(word) || /^[A-Z]/.test(word)
          ? "type"
          : next === "(" || next === "<"
            ? "fn"
            : "text"
      out.push({ kind, text })
    } else if (op) out.push({ kind: "op", text })
    else out.push({ kind: "text", text })
  }
  return out
}
