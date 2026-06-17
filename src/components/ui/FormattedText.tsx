import { useMemo } from 'react';

interface FormattedTextProps {
  content: string;
  className?: string;
}

function trimTrailingEmptyHtml(html: string): string {
  if (!html) return html;
  // Match trailing empty paragraphs like <p></p>, <p><br></p>, <p>&nbsp;</p>, <p>\s*</p>
  const regex = /(<p>(?:<br\s*\/?>|&nbsp;|\s)*<\/p>)+$/i;
  return html.replace(regex, '').trim();
}

export function FormattedText({ content, className = '' }: FormattedTextProps) {
  const trimmedContent = useMemo(() => {
    return content ? content.trim() : '';
  }, [content]);

  const isHtml = useMemo(() => {
    if (!trimmedContent) return false;
    return /<[a-z][\s\S]*>/i.test(trimmedContent);
  }, [trimmedContent]);

  if (!trimmedContent) return null;

  if (isHtml) {
    const cleanHtml = trimTrailingEmptyHtml(trimmedContent);
    return (
      <div 
        className={`prose prose-invert prose-sm max-w-none 
          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 
          [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 
          [&_li]:my-0.5 [&_p]:my-1.5 [&_strong]:text-foreground
          [&_p:last-child]:mb-0 [&_ul:last-child]:mb-0 [&_ol:last-child]:mb-0
          ${className}`}
        dangerouslySetInnerHTML={{ __html: cleanHtml }}
      />
    );
  }

  return <div className={`whitespace-pre-wrap ${className}`}>{trimmedContent}</div>;
}

