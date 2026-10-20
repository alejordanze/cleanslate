import { readFile, writeFile } from 'node:fs/promises';

import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

const svgNamespace = 'http://www.w3.org/2000/svg';
const editorNamespaces = new Set([
  'http://www.inkscape.org/namespaces/inkscape',
  'http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd',
  'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  'http://purl.org/dc/elements/1.1/',
  'http://creativecommons.org/ns#',
  'http://ns.adobe.com/AdobeIllustrator/10.0/',
  'http://ns.adobe.com/xap/1.0/'
]);
const metadataElements = new Set(['metadata', 'title', 'desc']);

function isMetadataNamespace(namespace: string | null): boolean {
  return !!namespace && (editorNamespaces.has(namespace) ||
    namespace.startsWith('http://ns.adobe.com/') ||
    namespace.startsWith('http://purl.org/dc/'));
}

export function stripSvgMetadata(source: string): string {
  // A DTD can define entities or external resources. SVG drawings do not need one.
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(source)) {
    throw new Error('This SVG contains an unsupported document type.');
  }

  const parseErrors: string[] = [];
  const document = new DOMParser({
    errorHandler: {
      warning: (message) => parseErrors.push(String(message)),
      error: (message) => parseErrors.push(String(message)),
      fatalError: (message) => parseErrors.push(String(message))
    }
  }).parseFromString(source, 'image/svg+xml');

  if (parseErrors.length > 0 || document.documentElement?.localName !== 'svg' ||
      document.documentElement.namespaceURI !== svgNamespace) {
    throw new Error('This file is not a valid SVG image.');
  }

  const removedIds = new Set<string>();

  function cleanChildren(parent: Node): void {
    for (const child of Array.from(parent.childNodes)) {
      if (child.nodeType === 8 || child.nodeType === 7) {
        parent.removeChild(child);
        continue;
      }

      if (child.nodeType !== 1) continue;
      const element = child as Element;

      if (isMetadataNamespace(element.namespaceURI) ||
          (element.namespaceURI === svgNamespace && metadataElements.has(element.localName))) {
        if (element.id) removedIds.add(element.id);
        parent.removeChild(element);
        continue;
      }

      for (const attribute of Array.from(element.attributes)) {
        if (attribute.name.startsWith('data-') ||
            isMetadataNamespace(attribute.namespaceURI) ||
            (attribute.namespaceURI === 'http://www.w3.org/2000/xmlns/' && isMetadataNamespace(attribute.value))) {
          element.removeAttributeNode(attribute);
        }
      }

      cleanChildren(element);
    }
  }

  cleanChildren(document);

  // Remove accessibility references only when their target label was removed.
  function cleanLabels(parent: Node): void {
    for (const child of Array.from(parent.childNodes)) {
      if (child.nodeType !== 1) continue;
      const element = child as Element;
      const label = element.getAttribute('aria-labelledby');
      if (label) {
        const remaining = label.split(/\s+/).filter((id) => !removedIds.has(id));
        if (remaining.length) element.setAttribute('aria-labelledby', remaining.join(' '));
        else element.removeAttribute('aria-labelledby');
      }
      cleanLabels(element);
    }
  }

  cleanLabels(document);
  return new XMLSerializer().serializeToString(document).trimStart();
}

/** Clean a copied SVG so the original is untouched until the write succeeds. */
export async function cleanSvg(filePath: string): Promise<void> {
  const source = await readFile(filePath, 'utf8');
  await writeFile(filePath, stripSvgMetadata(source), 'utf8');
}
