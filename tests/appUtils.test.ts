import { describe, it, expect } from 'vitest';
import { htmlToMarkdown, markdownToHtml } from '../utils/appUtils';

describe('Markdown/HTML Utils', () => {
  it('converts bold HTML to markdown', () => {
    const html = '<strong>Hello</strong> world';
    expect(htmlToMarkdown(html)).toBe('**Hello** world');
  });

  it('converts italic HTML to markdown', () => {
    const html = '<em>Italic</em> text';
    expect(htmlToMarkdown(html)).toBe('*Italic* text');
  });

  it('converts markdown to HTML correctly', () => {
    const md = '**Bold** and *Italic*';
    const html = markdownToHtml(md);
    expect(html).toContain('<strong>Bold</strong>');
    expect(html).toContain('<em>Italic</em>');
  });
});

describe('Recurrence Logic', () => {
  it('should calculate date differences correctly', () => {
    const start = new Date('2024-01-01');
    const end = new Date('2024-01-05');
    const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    expect(diff).toBe(4);
  });
});
