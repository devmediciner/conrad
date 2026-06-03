import { useMemo } from 'react';

interface FormattedTextProps {
  content: string;
  className?: string;
}

export function FormattedText({ content, className = '' }: FormattedTextProps) {
  const isHtml = useMemo(() => {
    if (!content) return false;
    return /<[a-z][\s\S]*>/i.test(content);
  }, [content]);

  if (!content) return null;

  if (isHtml) {
    return (
      <div 
        className={`prose prose-invert prose-sm max-w-none 
          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 
          [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 
          [&_li]:my-0.5 [&_p]:my-1.5 [&_strong]:text-foreground
          ${className}`}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  return <div className={`whitespace-pre-wrap ${className}`}>{content}</div>;
}
