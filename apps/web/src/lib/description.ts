/**
 * Extract plain text from a TipTap/ProseMirror JSON document.
 * Falls back to string coercion for legacy string descriptions.
 */
export function getDescriptionText(description: unknown): string {
  if (description == null) return '';
  if (typeof description === 'string') return description;
  if (typeof description === 'object') {
    return extractTextFromNode(description as Record<string, any>);
  }
  return String(description);
}

function extractTextFromNode(node: Record<string, any>): string {
  if (!node) return '';
  if (node.text) return node.text;
  if (Array.isArray(node.content)) {
    return node.content.map(extractTextFromNode).join('');
  }
  return '';
}
