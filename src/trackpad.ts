export interface PadPoint { id: number; x: number; y: number }

export class Trackpad {
  enabled = false;
  points: readonly PadPoint[] = [];
  private clickPoint?: PadPoint;
  private clickUntil = 0;

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    this.points = [];
    this.clickUntil = 0;
    this.clickPoint = undefined;
  }

  press(point?: PadPoint): void {
    this.clickPoint = point;
    this.clickUntil = performance.now() + 220;
  }

  get pressed(): boolean { return performance.now() < this.clickUntil; }
  get target(): PadPoint | undefined {
    return this.pressed ? this.clickPoint : this.points.length === 1 ? this.points[0] : undefined;
  }
}

// Input is normalized from the user's top left. Both views rotate the same physical surface.
export function padPosition(point: PadPoint | undefined, catFacing: boolean, width: number, depth: number) {
  const direction = catFacing ? -1 : 1;
  return {
    x: ((point?.x ?? 0.5) - 0.5) * width * direction,
    y: ((point?.y ?? 0.5) - 0.5) * depth * direction,
  };
}
