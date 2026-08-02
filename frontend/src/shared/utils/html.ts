/** Decode HTML entities (e.g. "&amp;" -> "&") in plain text pulled from email snippets. */
export const decodeHtmlEntities = (str: string): string => {
  const txt = document.createElement('textarea')
  txt.innerHTML = str
  return txt.value
}
