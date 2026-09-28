import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "s",
  "u",
  "a",
  "ul",
  "ol",
  "li",
  "h2",
  "h3",
  "h4",
  "blockquote",
  "pre",
  "code",
  "hr",
];

const SAFE_LINK_SCHEME = /^(https?:|mailto:)/i;

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    code: ["class"],
  },
  allowedClasses: {
    code: ["language-*", "lang-*"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs) => {
      const href = attribs.href?.trim() ?? "";
      // `javascript:` (và mọi scheme lạ) bị đổi thành text thuần: sanitizer sẽ
      // bỏ thẻ `span` vì không nằm trong allowlist, chỉ chừa lại phần chữ.
      if (!SAFE_LINK_SCHEME.test(href)) {
        return { tagName: "span", attribs: {} };
      }
      return {
        tagName,
        attribs: {
          ...attribs,
          href,
          target: "_blank",
          rel: "noopener noreferrer nofollow",
        },
      };
    },
  },
};

export function sanitizeRichText(value: string | null | undefined): string {
  if (!value) return "";
  return sanitizeHtml(value, SANITIZE_OPTIONS);
}

export function toPlainText(value: string | null | undefined): string {
  if (!value) return "";
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
}

export function isRichText(value: string | null | undefined): boolean {
  if (!value) return false;
  return /<\/?(p|ul|ol|li|h[1-6]|blockquote|pre|strong|em|a|br|hr)\b/i.test(value);
}

export function isEmptyRichText(value: string | null | undefined): boolean {
  return toPlainText(value).length === 0;
}
