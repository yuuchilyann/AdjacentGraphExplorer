import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export type MathProps = {
  tex: string;
  display?: boolean;
};

export function Math({ tex, display = false }: MathProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    katex.render(tex, ref.current, {
      displayMode: display,
      throwOnError: false,
      strict: 'ignore',
      output: 'html',
    });
  }, [tex, display]);

  return (
    <span
      ref={ref}
      style={display ? { display: 'block', textAlign: 'left', margin: '0.5em 0' } : undefined}
    />
  );
}
