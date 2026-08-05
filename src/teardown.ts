/**
 * Teardown page. The essay is static HTML; the only script is the scrollspy
 * that highlights the current section in the contents rail. No network, no
 * dependencies — the same constraint the tool ships under.
 */

import './teardown.css'

const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.toc a'))

if (links.length > 0 && 'IntersectionObserver' in window) {
  const byId = new Map<string, HTMLAnchorElement>()
  for (const link of links) {
    const id = link.getAttribute('href')?.slice(1)
    if (id) byId.set(id, link)
  }

  const visible = new Set<string>()
  const order = [...byId.keys()]

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target.id)
        else visible.delete(entry.target.id)
      }
      const first = order.find((id) => visible.has(id))
      for (const link of links) link.classList.remove('active')
      if (first) byId.get(first)?.classList.add('active')
    },
    { rootMargin: '-10% 0px -70% 0px', threshold: 0 }
  )

  for (const id of order) {
    const section = document.getElementById(id)
    if (section) observer.observe(section)
  }
}
