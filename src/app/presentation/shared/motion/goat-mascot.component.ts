import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  afterNextRender,
  inject,
  input,
  signal,
  viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

export interface MascotLines {
  hello: string;
  hide: string;
  /** Câu nói theo trang: so khớp tiền tố đường dẫn dài nhất. */
  routes: Array<{ prefix: string; text: string }>;
  /** Câu ngẫu nhiên khi bấm vào linh vật. */
  clicks: string[];
}

const HIDDEN_KEY = 'goat-mascot-hidden';

/**
 * Linh vật chibi dê GOAT đi dọc đáy màn hình: đuổi theo chuột, tự đi lang thang khi chuột đứng yên,
 * nói gợi ý theo trang hiện tại, bấm vào thì vẫy tay. Ẩn được trong phiên (sessionStorage).
 * Vị trí cập nhật trực tiếp ngoài Angular zone; chỉ trạng thái (đi/đứng, hướng, lời thoại) dùng signal.
 */
@Component({
  selector: 'goat-mascot',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!hidden()) {
      <div #root class="goat-mascot" [class.is-walking]="walking()" [class.is-waving]="waving()">
        @if (bubble(); as text) {
          <p class="goat-mascot-bubble" role="status">{{ text }}</p>
        }
        <div class="goat-mascot-body">
          <button type="button" class="goat-mascot-figure" [style.transform]="'scaleX(' + facing() + ')'" (click)="wave()" aria-label="GOAT">
            <svg viewBox="0 0 100 140" aria-hidden="true">
              <ellipse class="gm-shadow" cx="50" cy="134" rx="22" ry="4" />
              <g class="gm-bob">
                <g class="gm-limb gm-leg-l">
                  <rect x="37" y="96" width="11" height="26" rx="5" fill="#1f2937" />
                  <rect x="35" y="118" width="14" height="9" rx="4" fill="#3b2f2a" />
                </g>
                <g class="gm-limb gm-leg-r">
                  <rect x="52" y="96" width="11" height="26" rx="5" fill="#1f2937" />
                  <rect x="51" y="118" width="14" height="9" rx="4" fill="#3b2f2a" />
                </g>
                <g class="gm-limb gm-arm-l">
                  <rect x="23" y="74" width="12" height="11" rx="5" fill="var(--primary-fill, #007a55)" />
                  <rect x="24.5" y="82" width="9" height="15" rx="4.5" fill="#f5f1e8" />
                  <rect x="24.5" y="94" width="9" height="5" rx="2.5" fill="#3b2f2a" />
                </g>
                <rect x="30" y="70" width="40" height="32" rx="11" fill="var(--primary-fill, #007a55)" />
                <path d="M40 70 L50 78 L60 70" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round" />
                <text x="50" y="96" text-anchor="middle" font-size="13" font-weight="900" font-style="italic" fill="#fff" font-family="Be Vietnam Pro, sans-serif">10</text>
                <g class="gm-limb gm-arm-r">
                  <rect x="65" y="74" width="12" height="11" rx="5" fill="var(--primary-fill, #007a55)" />
                  <rect x="66.5" y="82" width="9" height="15" rx="4.5" fill="#f5f1e8" />
                  <rect x="66.5" y="94" width="9" height="5" rx="2.5" fill="#3b2f2a" />
                </g>
                <g class="gm-head">
                  <path d="M33 22 C24 12 20 4 26 2 C28 10 34 15 39 19 Z" fill="#d9c49b" stroke="#b39b6c" stroke-width="1.2" />
                  <path d="M67 22 C76 12 80 4 74 2 C72 10 66 15 61 19 Z" fill="#d9c49b" stroke="#b39b6c" stroke-width="1.2" />
                  <path d="M27 34 C14 32 7 38 9 43 C16 44 23 42 29 40 Z" fill="#f5f1e8" stroke="#ddd3bf" />
                  <path d="M73 34 C86 32 93 38 91 43 C84 44 77 42 71 40 Z" fill="#f5f1e8" stroke="#ddd3bf" />
                  <path d="M12 39 C17 39 22 39 26 38" stroke="#f4b8b8" stroke-width="3" stroke-linecap="round" />
                  <path d="M88 39 C83 39 78 39 74 38" stroke="#f4b8b8" stroke-width="3" stroke-linecap="round" />
                  <ellipse cx="50" cy="42" rx="25" ry="25" fill="#f5f1e8" stroke="#ddd3bf" stroke-width="1.2" />
                  <path d="M38 19 C42 13 48 12 50 17 C52 12 58 13 62 19 C56 18 53 21 50 24 C47 21 44 18 38 19 Z" fill="#e8dfcc" />
                  <path d="M45 64 C46 72 50 76 50 76 C50 76 54 72 55 64 Z" fill="#e8dfcc" />
                  <g class="gm-eyes">
                    <ellipse cx="40" cy="42" rx="4" ry="5" fill="#111827" />
                    <ellipse cx="61" cy="42" rx="4" ry="5" fill="#111827" />
                    <circle cx="41.5" cy="40" r="1.5" fill="#fff" />
                    <circle cx="62.5" cy="40" r="1.5" fill="#fff" />
                  </g>
                  <ellipse cx="33" cy="51" rx="4" ry="2.2" fill="#f9a8a8" opacity="0.65" />
                  <ellipse cx="68" cy="51" rx="4" ry="2.2" fill="#f9a8a8" opacity="0.65" />
                  <ellipse cx="51" cy="53" rx="4" ry="2.6" fill="#f2a5a5" />
                  <path d="M47 58 Q51 61.5 55 58" stroke="#6b4f3a" stroke-width="1.8" fill="none" stroke-linecap="round" />
                </g>
              </g>
            </svg>
          </button>
          <button type="button" class="goat-mascot-hide" (click)="hide()" [attr.aria-label]="lines().hide">×</button>
        </div>
      </div>
    }
  `
})
export class GoatMascotComponent {
  readonly lines = input.required<MascotLines>();

  protected readonly hidden = signal(true);
  protected readonly walking = signal(false);
  protected readonly waving = signal(false);
  protected readonly facing = signal(1);
  protected readonly bubble = signal<string | null>(null);

  private readonly root = viewChild<ElementRef<HTMLDivElement>>('root');
  private readonly zone = inject(NgZone);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private bubbleTimer = 0;
  private stopMoving: () => void = () => {};
  private lastSaid = new Map<string, number>();

  constructor() {
    afterNextRender(() => {
      let saved: string | null = null;
      try {
        saved = sessionStorage.getItem(HIDDEN_KEY);
      } catch {
        // sessionStorage có thể bị chặn: coi như chưa ẩn.
      }
      if (saved === '1') return;
      this.hidden.set(false);
      setTimeout(() => {
        this.zone.runOutsideAngular(() => this.startMoving());
        this.say(this.lines().hello);
        this.sayForRoute(this.router.url);
      });
    });

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe((event) => this.sayForRoute(event.urlAfterRedirects));

    this.destroyRef.onDestroy(() => {
      this.stopMoving();
      clearTimeout(this.bubbleTimer);
    });
  }

  protected wave(): void {
    const clicks = this.lines().clicks;
    this.waving.set(true);
    this.say(clicks[Math.floor(Math.random() * clicks.length)]);
    setTimeout(() => this.waving.set(false), 1400);
  }

  protected hide(): void {
    this.stopMoving();
    this.hidden.set(true);
    try {
      sessionStorage.setItem(HIDDEN_KEY, '1');
    } catch {
      // Không lưu được thì chỉ ẩn tới khi tải lại trang.
    }
  }

  private say(text: string, ms = 4000): void {
    this.bubble.set(text);
    clearTimeout(this.bubbleTimer);
    this.bubbleTimer = window.setTimeout(() => this.bubble.set(null), ms);
  }

  /** Nói câu của trang hiện tại (tiền tố dài nhất), không lặp lại cùng câu trong 2 phút. */
  private sayForRoute(url: string): void {
    if (this.hidden()) return;
    const path = url.split(/[?#]/)[0];
    const match = this.lines()
      .routes.filter((route) => path === route.prefix || path.startsWith(route.prefix + '/') || route.prefix === '/')
      .sort((a, b) => b.prefix.length - a.prefix.length)[0];
    if (!match) return;
    const now = Date.now();
    if (now - (this.lastSaid.get(match.prefix) ?? 0) < 120_000) return;
    this.lastSaid.set(match.prefix, now);
    setTimeout(() => this.say(match.text), 600);
  }

  private startMoving(): void {
    const el = this.root()?.nativeElement;
    if (!el) return;
    const size = () => (window.innerWidth < 640 ? 64 : 92);
    const clamp = (value: number) => Math.max(8, Math.min(window.innerWidth - size() - 8, value));
    let pos = clamp(window.innerWidth * 0.06);
    el.style.transform = `translate3d(${pos}px, 0, 0)`;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let target = pos;
    let lastPointer = 0;
    let walkingNow = false;
    let face = 1;
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      target = clamp(event.clientX - size() / 2);
      lastPointer = performance.now();
    };
    const wander = window.setInterval(() => {
      if (performance.now() - lastPointer > 4000) target = clamp(Math.random() * window.innerWidth);
    }, 5000);

    let prev = performance.now();
    let frame = 0;
    const loop = (now: number) => {
      const dt = Math.min((now - prev) / 1000, 0.05);
      prev = now;
      const dx = target - pos;
      const moving = Math.abs(dx) > 3;
      if (moving) {
        const speed = Math.abs(dx) > 320 ? 280 : 140;
        pos += Math.sign(dx) * Math.min(Math.abs(dx), speed * dt);
        el.style.transform = `translate3d(${pos}px, 0, 0)`;
        if (Math.sign(dx) !== face) {
          face = Math.sign(dx);
          this.facing.set(face);
        }
      }
      if (moving !== walkingNow) {
        walkingNow = moving;
        this.walking.set(moving);
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    window.addEventListener('pointermove', onPointer, { passive: true });

    this.stopMoving = () => {
      cancelAnimationFrame(frame);
      clearInterval(wander);
      window.removeEventListener('pointermove', onPointer);
    };
  }
}
