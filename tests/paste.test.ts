import { describe, expect, it } from 'vitest'
import { htmlToMarkdown } from '../src/paste'

describe('htmlToMarkdown: structure conversion', () => {
  it('converts h1–h3 to ATX headings', () => {
    const md = htmlToMarkdown(
      '<h1>Reset your token</h1><p>Intro.</p><h2>Steps</h2><p>Body.</p><h3>Notes</h3>'
    )
    expect(md).toContain('# Reset your token')
    expect(md).toContain('## Steps')
    expect(md).toContain('### Notes')
  })

  it('converts unordered lists with - markers', () => {
    const md = htmlToMarkdown('<ul><li>alpha</li><li>beta</li></ul>')
    expect(md).toMatch(/^-\s+alpha$/m)
    expect(md).toMatch(/^-\s+beta$/m)
  })

  it('converts ordered lists to numbered markdown', () => {
    const md = htmlToMarkdown('<ol><li>sign in</li><li>reset</li></ol>')
    expect(md).toMatch(/1\.\s+sign in/)
    expect(md).toMatch(/2\.\s+reset/)
  })

  it('converts tables via the GFM plugin', () => {
    const md = htmlToMarkdown(
      '<table><thead><tr><th>Feature</th><th>Value</th></tr></thead>' +
        '<tbody><tr><td>Refresh</td><td>Automatic</td></tr></tbody></table>'
    )
    expect(md).toContain('| Feature | Value |')
    expect(md).toContain('| Refresh | Automatic |')
  })

  it('converts strikethrough via the GFM plugin', () => {
    const md = htmlToMarkdown('<p>keep <del>drop this</del> text</p>')
    expect(md).toMatch(/~+drop this~+/)
  })
})

describe('htmlToMarkdown: page chrome is dropped', () => {
  it('drops script content', () => {
    const md = htmlToMarkdown(
      '<p>Real content.</p><script>alert("tracking")</script>'
    )
    expect(md).toContain('Real content.')
    expect(md).not.toContain('alert')
    expect(md).not.toContain('tracking')
  })

  it('drops style content', () => {
    const md = htmlToMarkdown('<style>.x{color:red}</style><p>Body.</p>')
    expect(md).not.toContain('color:red')
    expect(md).toContain('Body.')
  })

  it('drops nav, header, footer, aside and iframe chrome', () => {
    const md = htmlToMarkdown(
      '<header>Site Header</header><nav>Home | Docs</nav>' +
        '<article><p>The actual article.</p></article>' +
        '<aside>Related links</aside><footer>Copyright</footer>' +
        '<iframe src="https://ads.example.com"></iframe>'
    )
    expect(md).toBe('The actual article.')
  })
})

describe('htmlToMarkdown: images survive as text', () => {
  it('keeps an alt-less image as markdown, so image-without-alt can see it', () => {
    const md = htmlToMarkdown(
      '<p>Before.</p><img src="https://cdn.example.com/x.png"><p>After.</p>'
    )
    expect(md).toContain('![](https://cdn.example.com/x.png)')
    expect(md).toContain('Before.')
    expect(md).toContain('After.')
  })

  it('keeps the alt text when the author wrote one', () => {
    const md = htmlToMarkdown(
      '<img src="https://cdn.example.com/x.png" alt="The Reset token button">'
    )
    expect(md).toContain('![The Reset token button](https://cdn.example.com/x.png)')
  })

  it('an image inside stripped chrome still goes, with the chrome', () => {
    const md = htmlToMarkdown(
      '<header><img src="https://cdn.example.com/logo.png"></header><p>Body.</p>'
    )
    expect(md).toBe('Body.')
  })
})

describe('htmlToMarkdown: edge cases', () => {
  it('returns empty string for chrome-only clipboard payloads', () => {
    expect(htmlToMarkdown('<nav>only chrome</nav>')).toBe('')
  })

  it('keeps nested structure from a realistic KB page copy', () => {
    const md = htmlToMarkdown(
      '<div class="article-body"><h2>Before you begin</h2>' +
        '<p>Check your access.</p><ul><li>Employee ID</li><li>Registered phone</li></ul></div>'
    )
    expect(md).toContain('## Before you begin')
    expect(md).toMatch(/^-\s+Employee ID$/m)
  })
})
