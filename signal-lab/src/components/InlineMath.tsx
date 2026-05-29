import katex from 'katex';

interface InlineMathProps {
  math: string;
}

export default function InlineMath({ math }: InlineMathProps) {
  const html = katex.renderToString(math, { throwOnError: false });
  return <span className="katex-inline" dangerouslySetInnerHTML={{ __html: html }} />;
}
