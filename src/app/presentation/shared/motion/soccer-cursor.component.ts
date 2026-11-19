import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, NgZone, OnDestroy, afterNextRender, inject, viewChild } from '@angular/core';

const INTERACTIVE = 'a, button, [role="button"], [role="tab"], [role="menuitem"], label, select, summary, .mat-mdc-option';
const TEXT_FIELD = 'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="button"]):not([type="submit"]), textarea, [contenteditable="true"]';
const BALL_RADIUS = 11;

/**
 * Con trỏ quả bóng đá: bóng bám sát chuột và lăn theo quãng đường đi, vòng viền màu primary đuổi theo.
 * Rê vào link/nút: vòng to ra, bóng nhỏ lại. Rê vào ô nhập chữ: ẩn bóng, hiện con trỏ gõ chữ của hệ thống.
 * Chỉ bật với chuột (pointer: fine); cập nhật style trực tiếp ngoài Angular zone.
 */
@Component({
  selector: 'goat-soccer-cursor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #ring class="goat-cursor-ring" aria-hidden="true"></div>
    <div #ball class="goat-cursor-ball" aria-hidden="true">
      <svg viewBox="-50 -50 100 100" width="22" height="22">
        <defs>
          <clipPath id="goat-ball-clip"><circle r="46" /></clipPath>
        </defs>
        <circle r="46" fill="#fff" />
        <g clip-path="url(#goat-ball-clip)" fill="#101a2c">
          <polygon points="0,-17 16.2,-5.3 10,13.8 -10,13.8 -16.2,-5.3" />
          <polygon points="0,-62 15,-51 9,-34 -9,-34 -15,-51" />
          <polygon points="59,-19 64,-1 50,10 35,1 40,-16" />
          <polygon points="36,50 22,62 7,54 13,37 31,35" />
          <polygon points="-36,50 -31,35 -13,37 -7,54 -22,62" />
          <polygon points="-59,-19 -40,-16 -35,1 -50,10 -64,-1" />
        </g>
        <g stroke="#101a2c" stroke-width="3" fill="none">
          <path d="M0,-17 L0,-34 M16.2,-5.3 L35,1 M10,13.8 L13,37 M-10,13.8 L-13,37 M-16.2,-5.3 L-35,1" />
        </g>
        <circle r="46" fill="none" stroke="#101a2c" stroke-width="4" />
      </svg>
    </div>
  `,
  host: { class: 'goat-cursor-host' }
})
export class SoccerCursorComponent implements OnDestroy {
  private readonly zone = inject(NgZone);
  private readonly document = inject(DOCUMENT);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly ring = viewChild.required<ElementRef<HTMLDivElement>>('ring');
  private readonly ball = viewChild.required<ElementRef<HTMLDivElement>>('ball');
  private cleanup: () => void = () => {};

  constructor() {
    afterNextRender(() => {
      if (!window.matchMedia('(pointer: fine)').matches) return;
      this.zone.runOutsideAngular(() => this.start());
    });
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private start(): void {
    const html = this.document.documentElement;
    const ring = this.ring().nativeElement;
    const ball = this.ball().nativeElement;
    html.classList.add('goat-cursor');

    // Menu/select/dialog của CDK nằm trong top layer (popover API), z-index không vượt được.
    // Đưa con trỏ vào top layer và nâng lại lên trên cùng mỗi khi có phần tử khác mở trong top layer.
    const host = this.host.nativeElement as HTMLElement;
    const raise = () => {
      try {
        if (host.matches(':popover-open')) host.hidePopover();
        host.showPopover();
      } catch {
        // Trình duyệt không hỗ trợ popover: giữ z-index như cũ.
      }
    };
    const onToggle = (event: Event) => {
      if (event.target !== host && (event as ToggleEvent).newState === 'open') raise();
    };
    if (typeof host.showPopover === 'function') {
      host.setAttribute('popover', 'manual');
      raise();
      // 'toggle' không nổi bọt nhưng bắt được ở pha capture trên document.
      this.document.addEventListener('toggle', onToggle, true);
    }

    const pointer = { x: -100, y: -100 };
    const ringPos = { x: -100, y: -100 };
    let angle = 0;
    let visible = false;
    let frame = 0;

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      const dx = event.clientX - pointer.x;
      // Lăn: góc quay = quãng đường / bán kính (đổi sang độ), chiều theo hướng ngang.
      if (visible) angle += (dx / BALL_RADIUS) * (180 / Math.PI) * 0.5;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      if (!visible) {
        visible = true;
        ringPos.x = pointer.x;
        ringPos.y = pointer.y;
        html.classList.add('goat-cursor-visible');
      }
      const target = event.target as Element | null;
      html.classList.toggle('goat-cursor-text', !!target?.closest?.(TEXT_FIELD));
      html.classList.toggle('goat-cursor-hover', !!target?.closest?.(INTERACTIVE));
    };
    const onLeave = () => {
      visible = false;
      html.classList.remove('goat-cursor-visible');
    };
    const onDown = () => html.classList.add('goat-cursor-down');
    const onUp = () => html.classList.remove('goat-cursor-down');

    const loop = () => {
      ringPos.x += (pointer.x - ringPos.x) * 0.18;
      ringPos.y += (pointer.y - ringPos.y) * 0.18;
      ball.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0) rotate(${angle}deg)`;
      ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    html.addEventListener('pointerleave', onLeave);

    this.cleanup = () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      html.removeEventListener('pointerleave', onLeave);
      this.document.removeEventListener('toggle', onToggle, true);
      html.classList.remove('goat-cursor', 'goat-cursor-visible', 'goat-cursor-hover', 'goat-cursor-text', 'goat-cursor-down');
    };
  }
}
