/**
 * Gets an element from the document by its id and returns it with a tag-specific type.
 * `tagName` is used only for TypeScript inference and is not checked at runtime.
 * @param tagName - The expected tag name of the element.
 * @param id - The id of the element to look up.
 * @returns The element with the given id, typed according to `tagName`.
 */
export function get<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  id: string
): HTMLElementTagNameMap[K] {
  return document.querySelector(`#${CSS.escape(id)}`)!;
}

/**
 * Creates an HTML element with specified properties and children.
 * @param tagName - The name of the HTML tag to create.
 * @param props - An object containing properties to set on the element. Defaults to null.
 * @param children - An array of child elements or strings to append to the created element. Defaults to null.
 * @returns The created HTML element with the specified properties and children.
 */
export function create<
  K extends keyof HTMLElementTagNameMap,
>(
  tagName: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  ...children: (HTMLElement | string)[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName) as HTMLElementTagNameMap[K];

  if (props) {
    Object.assign(element, props);
  }

  if (children) {
    for (const child of children) {
      element.append(child);
    }
  }

  return element;
}

/**
 * Applies a CSS style to an HTML element by fetching the CSS from a given path.
 * @param cssPath - The path to the CSS file to be applied.
 * @param elements - The HTML elements to which the CSS will be applied.
 * @returns A wrapper element containing the styled element.
 */
const cssTextCache = new Map<string, string>();
const cssFetchCache = new Map<string, Promise<string>>();

function loadCss(cssPath: string): Promise<string> {
  if (cssTextCache.has(cssPath)) {
    return Promise.resolve(cssTextCache.get(cssPath) as string);
  }

  if (cssFetchCache.has(cssPath)) {
    return cssFetchCache.get(cssPath) as Promise<string>;
  }

  const fetchPromise = fetch(cssPath)
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          `Failed to load CSS from ${cssPath}: ${response.status}`,
        );
      }
      return response.text();
    })
    .then((cssText) => {
      cssTextCache.set(cssPath, cssText);
      cssFetchCache.delete(cssPath);
      return cssText;
    })
    .catch((error) => {
      cssFetchCache.delete(cssPath);
      throw error;
    });

  cssFetchCache.set(cssPath, fetchPromise);
  return fetchPromise;
}

export function style(
  cssPath: string,
  ...elements: HTMLElement[]
): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.style.display = "none";
  const shadow = wrapper.attachShadow({ mode: "open" });

  loadCss(cssPath)
    .then((cssText) => {
      shadow.prepend(create("style", { textContent: cssText }));
      wrapper.style.display = "block";
    });
  shadow.append(...elements);
  return wrapper;
}
