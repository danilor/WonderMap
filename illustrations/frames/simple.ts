import { defineFrame } from '../kit/define';
import { rect } from '../kit/draw';

/** Thin double rule. */
export default defineFrame({
  id: 'simple',
  name: 'Simple border',
  inset: 18,
  draw({ ctx, width, height, theme }) {
    rect(ctx, 6, 6, width - 12, height - 12, { stroke: theme.ink, width: 3.2 });
    rect(ctx, 13, 13, width - 26, height - 26, { stroke: theme.ink, width: 1 });
  },
});
