import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function TutorMarkdown({ content }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        pre: ({ children, ...props }) => <pre className="tutor-code" {...props}>{children}</pre>,
        code: ({ className, children, ...props }) => <code className={className || undefined} {...props}>{children}</code>,
        a: ({ children, href, ...props }) => <a href={href} target="_blank" rel="noreferrer" {...props}>{children}</a>,
      }}
    >{String(content)}</ReactMarkdown>
  );
}