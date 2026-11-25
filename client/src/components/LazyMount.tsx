import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

/** Renders its children only once it has scrolled into view; long palettes then draw only what is visible. */
export function LazyMount({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLSpanElement>(null);
  // Without IntersectionObserver there is no way to tell, so everything is drawn right away.
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { rootMargin: '120px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [seen]);

  return (
    <span ref={ref} className={className} style={{ display: 'block', ...style }}>
      {seen ? children : null}
    </span>
  );
}
